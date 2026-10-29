import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import {sesliKomutCoz} from '../src/ayristirma/komut';
import {hedefBul} from '../src/mekan/yerlesim';
import {benzerHedefler, hedefListesiMetni, hedefSecenekleri, secimCoz} from '../src/mekan/hedefListesi';
import {mekanGetir} from '../src/mekan/mekanlar';

jest.mock('../src/servisler/ses', () => ({
  ...jest.requireActual('../src/servisler/ses'),
  konusVeBekle: jest.fn(() => Promise.resolve()),
  sesiDinle: jest.fn(),
  sesliSoyele: jest.fn(),
}));
const {sesliSoyele, konusVeBekle, sesiDinle} = jest.requireMock('../src/servisler/ses');

const hastane = mekanGetir('ornek-hastane')!;

describe('yer listesi', () => {
  test('aynı adlı yerler (her kattaki tuvalet) bir kez sayılır, katlara göre okunur', () => {
    const secenekler = hedefSecenekleri(hastane);
    expect(secenekler.filter(h => h.ad === 'Tuvalet')).toHaveLength(1);
    const {metin, sonraki} = hedefListesiMetni(hastane, secenekler);
    expect(metin).toMatch(/^Burada 7 yer var\. Zemin kat: 1, Danışma; 2, Vezne; 3, Laboratuvar; 4, Tuvalet\. 1\. kat: 5, Kardiyoloji/);
    expect(metin).toContain('doktorun adını söyleyin');
    expect(sonraki).toBeNull();
  });

  test('kısa ad varsa listede o okunur ve söylenince bulunur', () => {
    const kisa = {...hastane, hedefler: hastane.hedefler.map(h =>
      (h.ad === 'Kardiyoloji Polikliniği' ? {...h, kisaAd: 'Kalp'} : h))};
    expect(hedefListesiMetni(kisa).metin).toContain('5, Kalp;');
    const sonuc = hedefBul(kisa, 'kalp');
    expect(sonuc?.tur === 'hedef' && sonuc.hedef.ad).toBe('Kardiyoloji Polikliniği');
  });

  test('uzun liste onar onar okunur, numaralar sayfalar boyunca sürer', () => {
    const buyuk = {...hastane, hedefler: Array.from({length: 23}, (_, i) =>
      ({ad: `Oda ${i + 1}`, nokta: 'danisma', tarif: '', anahtarlar: []}))};
    const ilk = hedefListesiMetni(buyuk);
    expect(ilk.metin).toMatch(/^Burada 23 yer var\. İlk 10 tanesi: 1, Oda 1; .*10, Oda 10\. Diğer 13 yer için devam deyin\.$/);
    const ikinci = hedefListesiMetni(buyuk, undefined, ilk.sonraki!);
    expect(ikinci.metin).toMatch(/^11\. yerden devam: 11, Oda 11; .*20, Oda 20\. Diğer 3 yer için devam deyin\.$/);
    const son = hedefListesiMetni(buyuk, undefined, ikinci.sonraki!);
    expect(son).toEqual({metin: '21. yerden devam: 21, Oda 21; 22, Oda 22; 23, Oda 23.', sonraki: null});
  });

  test.each([
    ['3', 2], ['üç', 2], ['üçüncü', 2], ['numara 2', 1], ['on', null], ['süt', null], ['112 numaralı oda', null],
  ])('seçim %j → %s', (metin, beklenen) => {
    expect(secimCoz(metin as string, 7)).toBe(beklenen);
  });

  test('yanlış ya da eksik söylenen ad için benzer yerler önerilir', () => {
    expect(benzerHedefler(hastane, 'kardiyolog').map(h => h.ad)).toEqual(['Kardiyoloji Polikliniği']);
    expect(benzerHedefler(hastane, 'labaratuvar').map(h => h.ad)).toEqual(['Laboratuvar']);
    expect(benzerHedefler(hastane, 'otopark')).toEqual([]);
  });

  test('farklı adlı birden fazla yer eşleşirse seçenek döner', () => {
    const sonuc = hedefBul(hastane, 'poliklinik');
    expect(sonuc?.tur).toBe('coklu');
    expect(sonuc?.tur === 'coklu' && sonuc.adaylar.map(a => a.hedef.ad))
      .toEqual(['Kardiyoloji Polikliniği', 'Dahiliye Polikliniği', 'Göz Polikliniği']);
    // Aynı adlı yerlerde (tuvalet) sorulmaz, en yakını seçilir
    expect(hedefBul(hastane, 'tuvalet')?.tur).toBe('hedef');
  });

  test.each(['neler var', 'burada neler var', 'hangi birimler var', 'nereye gidebilirim', 'bilmiyorum'])(
    '%j → neler', metin => expect(sesliKomutCoz(metin)).toEqual({tur: 'neler'}));

  test('"listede ne var" alışveriş listesi komutu olarak kalır', () => {
    expect(sesliKomutCoz('listede ne var')).toEqual({tur: 'listeyiOku'});
  });
});

describe('uygulamada seçim', () => {
  let kok: ReactTestRenderer.ReactTestRenderer;
  const sonSoylenen = () => (sesliSoyele as jest.Mock).mock.calls.at(-1)[0];
  const sonSoru = () => (konusVeBekle as jest.Mock).mock.calls.at(-1)[0];

  // Sırayla duyulacak cümleler: ilki uzun basıştaki komut, sonrakiler uygulamanın sorularına cevaplar
  // Cevaplar zincirleme işlenir (soru → dinle → seçim → tarif); hepsi bitene kadar beklenir
  async function bitmesiniBekle() {
    for (let i = 0; i < 10; i++) {
      await ReactTestRenderer.act(async () => { await new Promise<void>(r => setTimeout(r, 0)); });
    }
  }

  async function soyle(...cumleler: string[]) {
    cumleler.forEach(c => (sesiDinle as jest.Mock).mockResolvedValueOnce({metin: c}));
    await ReactTestRenderer.act(async () => {
      await kok.root.findAll(n => typeof n.props.onLongPress === 'function')[0].props.onLongPress();
    });
    await bitmesiniBekle();
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    (sesiDinle as jest.Mock).mockReset();   // önceki testten kalmış cevap olmasın
    // Önceki testin binası hatırlanmasın: girişte yer listesi yalnızca yeni binada okunur
    await require('@react-native-async-storage/async-storage').removeItem('aktifMekan');
    const {useCameraDevice} = require('react-native-vision-camera');
    (useCameraDevice as jest.Mock).mockReturnValue({id: 'arka', hasTorch: true});
    await ReactTestRenderer.act(async () => { kok = ReactTestRenderer.create(<App />); });
    await soyle('barkod oku');
    (sesiDinle as jest.Mock).mockResolvedValueOnce({hata: 'anlasilmadi', kod: '7'});
    const tarayici = kok.root.findAll(n => n.props.codeScanner)[0].props.codeScanner;
    await ReactTestRenderer.act(async () => { await tarayici.onCodeScanned([{value: 'BAK:MEKAN:ornek-hastane'}]); });
    await bitmesiniBekle();
  });

  afterEach(() => {
    const {useCameraDevice} = require('react-native-vision-camera');
    (useCameraDevice as jest.Mock).mockReturnValue(undefined);
    ReactTestRenderer.act(() => kok.unmount());
  });

  test('"neler var" denince yerler okunur, numarasıyla seçilen yere tarif verilir', async () => {
    await soyle('neler var', 'beş');
    expect(sonSoru()).toMatch(/^Burada 7 yer var\..*numarasını ya da adını söyleyin\.$/);
    expect(sonSoylenen()).toMatch(/^Kardiyoloji Polikliniği, oda 112, 1\. kat\./);
  });

  test('birden fazla poliklinik eşleşince seçenekler sunulur, seçilen yere gidilir', async () => {
    await soyle('poliklinik nerede', 'iki');
    expect(sonSoru()).toBe('poliklinik için birden fazla sonuç var. 1, Kardiyoloji Polikliniği, oda 112, 1. kat; ' +
      '2, Dahiliye Polikliniği, oda 118, 1. kat; 3, Göz Polikliniği, oda 124, 1. kat. Hangisi? Numarasını ya da adını söyleyin.');
    expect(sonSoylenen()).toMatch(/^Dahiliye Polikliniği, oda 118, 1\. kat\./);
  });

  test('seçenekler arasından adıyla da seçilebilir', async () => {
    await soyle('poliklinik nerede', 'göz');
    expect(sonSoylenen()).toMatch(/^Göz Polikliniği, oda 124, 1\. kat\./);
  });

  test('yanlış söylenen ad için benzer yer önerilir ve seçilebilir', async () => {
    await soyle('labaratuvar nerede', 'bir');
    expect(sonSoru()).toMatch(/^labaratuvar burada kayıtlı değil\. Benzer yerler: 1, Laboratuvar, zemin kat\. Hangisi\?/);
    expect(sonSoylenen()).toMatch(/^Laboratuvar, zemin kat\. Laboratuvar için/);
  });

  test('eksik söylenen ad (kardiyolog) doğrudan bulunur', async () => {
    await soyle('kardiyolog nerede');
    expect(sonSoylenen()).toMatch(/^Kardiyoloji Polikliniği, oda 112/);
  });

  test('yer listesine cevap olarak komut söylenirse komut çalışır ("kayıtlı değil" denmez)', async () => {
    await soyle('neler var', 'kayboldum');
    expect(sonSoylenen()).toMatch(/^Sakin olun, size yardım edeceğim\./);
  });

  test('"nereye gitmek istiyorsunuz" sorusuna da komut verilebilir', async () => {
    await ReactTestRenderer.act(async () => {
      (sesiDinle as jest.Mock).mockResolvedValueOnce({metin: 'etiket ara'});
      kok.root.findAll(n => typeof n.props.onPress === 'function')[0].props.onPress();
      kok.root.findAll(n => typeof n.props.onPress === 'function')[0].props.onPress();
      kok.root.findAll(n => typeof n.props.onPress === 'function')[0].props.onPress();
      await new Promise<void>(r => setTimeout(r, 450));
    });
    await bitmesiniBekle();
    expect(sonSoru()).toBe('Nereye gitmek istiyorsunuz? Bilmiyorsanız neler var deyin.');
    expect(sonSoylenen()).toMatch(/^Etiket aranıyor\./);
  });
});

describe('etiket arama', () => {
  test.each(['etiket ara', 'QR kodu bul', 'karekod nerede', 'etiketi bul'])('%j → etiketAra', metin => {
    expect(sesliKomutCoz(metin)).toEqual({tur: 'etiketAra'});
  });

  test('"qr oku" ve "barkod oku" kamerayı normal açar', () => {
    expect(sesliKomutCoz('qr oku')).toEqual({tur: 'kamera', mod: 'barkod'});
  });

  test('etiket ararken tarama tekniği anlatılır, ipuçları etiket yerine göre verilir', async () => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    const {useCameraDevice} = require('react-native-vision-camera');
    (useCameraDevice as jest.Mock).mockReturnValue({id: 'arka', hasTorch: true});
    try {
      let kok: ReactTestRenderer.ReactTestRenderer;
      await ReactTestRenderer.act(async () => { kok = ReactTestRenderer.create(<App />); });
      (sesiDinle as jest.Mock).mockResolvedValueOnce({metin: 'etiket ara'});
      await ReactTestRenderer.act(async () => {
        await kok!.root.findAll(n => typeof n.props.onLongPress === 'function')[0].props.onLongPress();
      });
      expect((sesliSoyele as jest.Mock).mock.calls.at(-1)[0]).toMatch(/^Etiket aranıyor\. Telefonu göğüs hizasında/);
      await ReactTestRenderer.act(async () => { jest.advanceTimersByTime(25000); });
      expect((sesliSoyele as jest.Mock).mock.calls.at(-1)[0]).toMatch(/kapının sağ kenarını bulun/);
      await ReactTestRenderer.act(async () => { jest.advanceTimersByTime(35000); });
      expect((sesliSoyele as jest.Mock).mock.calls.at(-1)[0]).toMatch(/^Etiket bulunamadı\..*kayboldum/);
      ReactTestRenderer.act(() => kok!.unmount());
    } finally {
      (useCameraDevice as jest.Mock).mockReturnValue(undefined);
      jest.useRealTimers();
    }
  });
});
