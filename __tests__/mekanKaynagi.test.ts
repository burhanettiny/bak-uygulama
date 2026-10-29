import AsyncStorage from '@react-native-async-storage/async-storage';
import {mekanBul, mekanIndir} from '../src/servisler/mekanKaynagi';
import ornekHastane from '../src/mekan/veri/ornek-hastane.json';

const KAYNAK = 'https://ornek.github.io/bak-mekanlar/mekanlar/';
const fetchSahte = jest.fn();
globalThis.fetch = fetchSahte as unknown as typeof fetch;

// Sunucu yanıtı: veri verilirse 200 + JSON, null ise 404
function yanit(veri: unknown) {
  fetchSahte.mockResolvedValueOnce({
    ok: veri !== null,
    text: () => Promise.resolve(JSON.stringify(veri)),
  });
}

const yeniKutuphane = {
  ...ornekHastane, id: 'yeni-kutuphane', ad: 'Halk Kütüphanesi', surum: 1,
};

beforeEach(async () => {
  fetchSahte.mockReset();
  await AsyncStorage.clear();
});

describe('mekanIndir', () => {
  test('geçerli dosya indirilir', async () => {
    yanit(yeniKutuphane);
    expect((await mekanIndir('yeni-kutuphane', KAYNAK))?.ad).toBe('Halk Kütüphanesi');
    expect(fetchSahte).toHaveBeenCalledWith(`${KAYNAK}yeni-kutuphane.json`, expect.anything());
  });

  test('kaynak tanımlı değilse internete hiç çıkılmaz', async () => {
    expect(await mekanIndir('yeni-kutuphane', null)).toBeNull();
    expect(fetchSahte).not.toHaveBeenCalled();
  });

  test('geçersiz kimlikle adres oluşturulmaz', async () => {
    expect(await mekanIndir('../gizli', KAYNAK)).toBeNull();
    expect(fetchSahte).not.toHaveBeenCalled();
  });

  test('bozuk, bulunamayan ya da başka binaya ait dosya reddedilir', async () => {
    yanit(null);
    expect(await mekanIndir('yeni-kutuphane', KAYNAK)).toBeNull();
    yanit({...yeniKutuphane, giris: 'olmayan-nokta'});
    expect(await mekanIndir('yeni-kutuphane', KAYNAK)).toBeNull();
    yanit({...yeniKutuphane, id: 'baska-bina'});
    expect(await mekanIndir('yeni-kutuphane', KAYNAK)).toBeNull();
  });

  test('ağ hatasında null döner', async () => {
    fetchSahte.mockRejectedValueOnce(new Error('internet yok'));
    expect(await mekanIndir('yeni-kutuphane', KAYNAK)).toBeNull();
  });
});

describe('mekanBul', () => {
  test('telefonda kopya yoksa internetten indirilir ve saklanır', async () => {
    yanit(yeniKutuphane);
    expect((await mekanBul('yeni-kutuphane', undefined, KAYNAK))?.ad).toBe('Halk Kütüphanesi');

    // İkinci kez: internet olmasa da telefondaki kopya kullanılır
    fetchSahte.mockRejectedValueOnce(new Error('internet yok'));
    expect((await mekanBul('yeni-kutuphane', undefined, KAYNAK))?.ad).toBe('Halk Kütüphanesi');
  });

  test('ne telefonda ne internette yoksa null', async () => {
    yanit(null);
    expect(await mekanBul('yeni-kutuphane', undefined, KAYNAK)).toBeNull();
  });

  test('uygulamayla gelen düzen beklemeden döner, internetteki yeni sürüm gelince bildirilir', async () => {
    const guncellendi = jest.fn();
    let sunucuyuCevapla: (v: unknown) => void = () => {};
    fetchSahte.mockReturnValueOnce(new Promise(r => { sunucuyuCevapla = r; }));

    const ilk = await mekanBul('ornek-hastane', guncellendi, KAYNAK);
    expect(ilk?.surum).toBe(1);               // sunucu henüz cevap vermedi
    expect(guncellendi).not.toHaveBeenCalled();

    const yeni = {...ornekHastane, surum: 2, ad: 'Örnek Devlet Hastanesi (yeni)'};
    sunucuyuCevapla({ok: true, text: () => Promise.resolve(JSON.stringify(yeni))});
    await new Promise<void>(r => setTimeout(r, 0));
    expect(guncellendi).toHaveBeenCalledWith(expect.objectContaining({surum: 2}));

    // Yeni sürüm saklandı: internet olmadan da artık o kullanılır
    fetchSahte.mockRejectedValueOnce(new Error('internet yok'));
    expect((await mekanBul('ornek-hastane', undefined, KAYNAK))?.surum).toBe(2);
  });

  test('internetteki sürüm daha eski ya da aynıysa güncelleme yapılmaz', async () => {
    const guncellendi = jest.fn();
    yanit(ornekHastane);
    await mekanBul('ornek-hastane', guncellendi, KAYNAK);
    await new Promise<void>(r => setTimeout(r, 0));
    expect(guncellendi).not.toHaveBeenCalled();
  });
});
