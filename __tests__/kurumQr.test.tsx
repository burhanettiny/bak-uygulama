import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import {base45Coz, veriQrCoz} from '../src/mekan/qrVeri';
import {mekanIndir} from '../src/servisler/mekanKaynagi';

// Node tipleri projeye eklenmiyor (bkz. mekanDeposu.test.ts); yalnızca gereken kadarı:
declare const __dirname: string;
const fs = jest.requireActual<{readFileSync(yol: string, kodlama: 'utf8'): string}>('fs');
const path = jest.requireActual<{join(...parcalar: string[]): string}>('path');
const {deflateRawSync} = jest.requireActual<{deflateRawSync(veri: Uint8Array): Uint8Array}>('zlib');

// UTF-8 baytları ve geri
const baytlar = (metin: string) => Uint8Array.from([...unescape(encodeURIComponent(metin))].map(h => h.charCodeAt(0)));
const metne = (b: Uint8Array) => decodeURIComponent(escape(String.fromCharCode(...b)));

jest.mock('../src/servisler/ses', () => ({
  ...jest.requireActual('../src/servisler/ses'),
  konusVeBekle: jest.fn(() => Promise.resolve()),
  sesiDinle: jest.fn(),
  sesliSoyele: jest.fn(),
}));
const {sesliSoyele, konusVeBekle} = jest.requireMock('../src/servisler/ses');
const {sesiDinle} = jest.requireMock('../src/servisler/ses');

// Streamlit'teki BAK QR Oluşturucu'nun (mekan-deposu/olusturucu) ürettiği gerçek bir giriş QR'ı
const OLUSTURUCU_QR = fs.readFileSync(path.join(__dirname, 'veri', 'kurum-qr-hastane.txt'), 'utf8');

const BASE45 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
function base45(veri: Uint8Array): string {
  let s = '';
  for (let i = 0; i < veri.length; i += 2) {
    if (i + 1 < veri.length) {
      let n = veri[i] * 256 + veri[i + 1];
      const c = n % 45; n = Math.floor(n / 45);
      s += BASE45[c] + BASE45[n % 45] + BASE45[Math.floor(n / 45)];
    } else {
      s += BASE45[veri[i] % 45] + BASE45[Math.floor(veri[i] / 45)];
    }
  }
  return s;
}
const qrYap = (mekan: object) => 'BAK:VERI:1:' + base45(deflateRawSync(baytlar(JSON.stringify(mekan))));

const kucukMekan = {
  id: 'q-eczane-ab12', ad: 'Örnek Eczanesi', tur: 'kurum', surum: 1, giris: 'giris',
  noktalar: [{id: 'giris', ad: 'Giriş'}, {id: 'banko', ad: 'Banko'}],
  baglantilar: [{a: 'giris', b: 'banko', adim: 4, tarif: 'Düz ilerleyin', geriTarif: 'Çıkışa doğru ilerleyin'}],
  hedefler: [{ad: 'Banko', nokta: 'banko', tarif: 'Banko karşınızda.', anahtarlar: ['ilaç', 'reçete']}],
};

describe('kurum QR verisi', () => {
  test('base45 RFC 9285 örnekleri', () => {
    expect(metne(base45Coz('BB8'))).toBe('AB');
    expect(metne(base45Coz('%69 VD92EX0'))).toBe('Hello!!');
    expect(metne(base45Coz('UJCLQE7W581'))).toBe('base-45');
  });

  test('Streamlit oluşturucusunun QR\'ı çözülür ve doğrulanır', () => {
    const mekan = veriQrCoz(OLUSTURUCU_QR)!;
    expect(mekan.id).toBe('q-ornek-hastane-0000');
    expect(mekan.noktalar.length).toBeGreaterThan(10);
    expect(mekan.hedefler.some(h => h.kisiler?.includes('Dr. Ayşe Yılmaz'))).toBe(true);
  });

  test('"q-" ile başlamayan kimlik reddedilir: sahte QR doğrulanmış bir binanın yerine geçemez', () => {
    expect(veriQrCoz(qrYap({...kucukMekan, id: 'ornek-hastane'}))).toBeNull();
  });

  test('bozuk ya da eksik düzen reddedilir', () => {
    expect(veriQrCoz(qrYap({...kucukMekan, giris: 'yok'}))).toBeNull();
    expect(veriQrCoz('BAK:VERI:1:ABC???')).toBeNull();
    expect(veriQrCoz(OLUSTURUCU_QR.slice(0, 200))).toBeNull();
  });

  test('kurum binaları internetten indirilmeye çalışılmaz', async () => {
    const sahte = jest.fn();
    (globalThis as any).fetch = sahte;
    await expect(mekanIndir('q-eczane-ab12')).resolves.toBeNull();
    expect(sahte).not.toHaveBeenCalled();
  });
});

test('kurum QR\'ı okutulunca bina yüklenir, doğrulanmadığı söylenir, sonraki nokta QR\'ı da tanınır', async () => {
  const {useCameraDevice} = require('react-native-vision-camera');
  (useCameraDevice as jest.Mock).mockReturnValue({id: 'arka', hasTorch: true});
  let kok: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { kok = ReactTestRenderer.create(<App />); });
  const okut = async (deger: string, cevap?: string) => {
    (sesiDinle as jest.Mock).mockResolvedValueOnce({metin: 'barkod oku'});
    await ReactTestRenderer.act(async () => {
      await kok.root.findAll(n => typeof n.props.onLongPress === 'function')[0].props.onLongPress();
    });
    // Giriş QR'ından sonra yerler okunur ve seçim dinlenir
    if (cevap) (sesiDinle as jest.Mock).mockResolvedValueOnce({metin: cevap});
    const tarayici = kok.root.findAll(n => n.props.codeScanner)[0].props.codeScanner;
    await ReactTestRenderer.act(async () => { await tarayici.onCodeScanned([{value: deger}]); });
  };

  await okut(qrYap(kucukMekan), 'bir');
  const karsilama = (konusVeBekle as jest.Mock).mock.calls.at(-1)[0];
  expect(karsilama).toMatch(/^Hoş geldiniz: Örnek Eczanesi\. Bu bina bilgisini kurum kendisi hazırladı, BAK tarafından doğrulanmadı\./);
  expect(karsilama).toContain('Burada 1 yer var. 1, Banko.');
  // "bir" denince 1 numaralı yere tarif verilir
  expect((sesliSoyele as jest.Mock).mock.calls.at(-1)[0]).toMatch(/^Banko\. Banko için/);

  const AsyncStorage = require('@react-native-async-storage/async-storage');
  expect(JSON.parse(await AsyncStorage.getItem('mekan:q-eczane-ab12')).ad).toBe('Örnek Eczanesi');

  await new Promise<void>(r => setTimeout(r, 2100));   // aynı QR'ın art arda okunmasını önleyen bekleme
  await okut('BAK:NOKTA:q-eczane-ab12:banko');
  expect((sesliSoyele as jest.Mock).mock.calls.at(-1)[0]).toMatch(/Banko/);

  (useCameraDevice as jest.Mock).mockReturnValue(undefined);
}, 15000);

describe('büyük binalar: adres taşıyan QR', () => {
  const {adresQrCoz} = jest.requireActual('../src/mekan/qrVeri');
  const {adrestenMekanIndir} = jest.requireActual('../src/servisler/mekanKaynagi');
  const ADRES = 'https://ornek-avm.com.tr/bak/duzen.json';
  const yanit = (veri: object) => Promise.resolve({ok: true, text: () => Promise.resolve(JSON.stringify(veri))});

  test('yalnızca https adresleri kabul edilir', () => {
    expect(adresQrCoz(`BAK:URL:${ADRES}`)).toBe(ADRES);
    expect(adresQrCoz('BAK:URL:http://ornek.com/a.json')).toBeNull();
    expect(adresQrCoz('BAK:URL:javascript:alert(1)')).toBeNull();
  });

  test('indirilen düzen kullanılır; sonra internet yokken telefondaki kopya bulunur', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    (globalThis as any).fetch = jest.fn(() => yanit(kucukMekan));
    const indirilen = await adrestenMekanIndir(ADRES);
    expect(indirilen?.id).toBe('q-eczane-ab12');
    await AsyncStorage.setItem('mekan:q-eczane-ab12', JSON.stringify(indirilen));   // uygulama bunu yapar

    (globalThis as any).fetch = jest.fn(() => Promise.reject(new Error('ağ yok')));
    expect((await adrestenMekanIndir(ADRES))?.ad).toBe('Örnek Eczanesi');
  });

  test('"q-" ile başlamayan düzen reddedilir', async () => {
    (globalThis as any).fetch = jest.fn(() => yanit({...kucukMekan, id: 'ornek-hastane'}));
    await expect(adrestenMekanIndir('https://baska.com/a.json')).resolves.toBeNull();
  });
});
