import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import {sesiDinle} from '../src/servisler/ses';

jest.mock('../src/servisler/ses', () => ({
  ...jest.requireActual('../src/servisler/ses'),
  konusVeBekle: jest.fn(() => Promise.resolve()),
  sesiDinle: jest.fn(),
  sesliSoyele: jest.fn(),
}));
const {sesliSoyele} = jest.requireMock('../src/servisler/ses');

// Sahte adım sensörü: adimAt() her çağrıldığında uygulamaya bir adım bildirilir
let adimDinleyicisi: (() => void) | null = null;
jest.mock('../src/servisler/adimSayar', () => ({
  adimSayarHazirla: jest.fn(() => Promise.resolve(true)),
  adimlariDinle: jest.fn((cb: () => void) => {
    adimDinleyicisi = cb;
    return () => { adimDinleyicisi = null; };
  }),
}));

const yazilar = (kok: ReactTestRenderer.ReactTestRenderer) =>
  kok.root.findAllByType('Text' as any).map(t => [t.props.children].flat().join(''));
const sonSoylenen = () => (sesliSoyele as jest.Mock).mock.calls.at(-1)[0] as string;

async function uzunBas(kok: ReactTestRenderer.ReactTestRenderer, soylenen: string) {
  (sesiDinle as jest.Mock).mockResolvedValueOnce({metin: soylenen});
  const alan = kok.root.findAll(n => typeof n.props.onLongPress === 'function')[0];
  await ReactTestRenderer.act(async () => {
    await alan.props.onLongPress();
  });
}

async function adimAt(n: number) {
  for (let i = 0; i < n; i++) {
    await ReactTestRenderer.act(async () => { adimDinleyicisi?.(); });
  }
}

test('hastanede adım adım rehber: geri sayım, merdivende bekleme ve "devam"', async () => {
  const {useCameraDevice} = require('react-native-vision-camera');
  (useCameraDevice as jest.Mock).mockReturnValue({id: 'arka', hasTorch: true});
  let kok: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { kok = ReactTestRenderer.create(<App />); });

  // Girişte QR
  await uzunBas(kok!, 'barkod oku');
  const tarayici = kok!.root.findAll(n => n.props.codeScanner)[0].props.codeScanner;
  (sesiDinle as jest.Mock).mockResolvedValueOnce({hata: 'anlasilmadi', kod: '7'});   // girişteki yer listesine cevap yok
  await ReactTestRenderer.act(async () => {
    await tarayici.onCodeScanned([{value: 'BAK:MEKAN:ornek-hastane'}]);
  });

  // Doktor sorulunca tüm rota değil yalnızca ilk talimat söylenir, sensör dinlenmeye başlar
  await uzunBas(kok!, 'Ayşe Yılmaz nerede');
  expect(sonSoylenen()).toBe('Dr. Ayşe Yılmaz, Kardiyoloji Polikliniği, oda 112, 1. kat. ' +
    'Kardiyoloji Polikliniği için adım adım yönlendiriyorum. Girişten düz ilerleyin, yaklaşık 10 adım. Zemin kat, Danışma noktasına ulaşacaksınız.');
  expect(adimDinleyicisi).not.toBeNull();
  expect(yazilar(kok!)).toContain('👣 ~10 adım');

  await adimAt(5);
  expect(sonSoylenen()).toBe('5 adım kaldı.');
  expect(yazilar(kok!)).toContain('👣 ~5 adım');

  await adimAt(10);   // danışma (5) + merdiven başı (5)
  expect(sonSoylenen()).toMatch(/^Yaklaşık olarak zemin kat, Merdiven başı noktasına geldiniz\. Şimdi: Dikkat, merdiven\./);
  expect(yazilar(kok!)).toContain('⏸ Bitince "devam" deyin');

  // Merdivende atılan adımlar sayılmaz
  const oncekiSayi = (sesliSoyele as jest.Mock).mock.calls.length;
  await adimAt(20);
  expect((sesliSoyele as jest.Mock).mock.calls.length).toBe(oncekiSayi);

  await uzunBas(kok!, 'merdiveni çıktım');
  expect(sonSoylenen()).toBe('Şimdi: Merdivenden çıkınca sağa dönün, yaklaşık 4 adım. 1. kat, Poliklinikler koridoru noktasına ulaşacaksınız.');

  // Kapı önündeki QR okutulunca hedefe varılır, rehber biter ve sensör kapanır
  await uzunBas(kok!, 'barkod oku');
  const tarayici2 = kok!.root.findAll(n => n.props.codeScanner)[0].props.codeScanner;
  await ReactTestRenderer.act(async () => {
    await new Promise<void>(r => setTimeout(r, 2100));   // aynı QR'ın tekrar okunmasını önleyen bekleme
    await tarayici2.onCodeScanned([{value: 'BAK:NOKTA:ornek-hastane:kardiyoloji'}]);
  });
  expect(sonSoylenen()).toMatch(/Hedefinize ulaştınız\. Kardiyoloji kapısı solunuzda, oda 112\.$/);
  expect(adimDinleyicisi).toBeNull();

  (useCameraDevice as jest.Mock).mockReturnValue(undefined);
}, 15000);

test('uygulama yeniden açılıp ev hafızadan hatırlanınca da (QR okutmadan) adım adım rehber çalışır', async () => {
  // Gerçek telefonda olan: QR okutulmadığı için adım sensörü hiç hazırlanmıyor, tarif tek seferde okunuyordu
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  await AsyncStorage.setItem('aktifMekan', JSON.stringify({id: 'gebze-b-tipi-3-1', zaman: Date.now()}));
  let kok: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { kok = ReactTestRenderer.create(<App />); });

  await uzunBas(kok!, 'mutfak nerede');
  expect(sonSoylenen()).toContain('Mutfak için adım adım yönlendiriyorum.');
  expect(sonSoylenen()).not.toContain('Sonra');            // tüm tarif değil, yalnızca ilk talimat
  expect(adimDinleyicisi).not.toBeNull();                   // adım sensörü dinleniyor
});

test('iki QR arasında sayılan adımlarla adım uzunluğu kendiliğinden öğrenilir', async () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  await AsyncStorage.removeItem('aktifMekan');
  await AsyncStorage.removeItem('ayar:adimCarpani');
  const {useCameraDevice} = require('react-native-vision-camera');
  (useCameraDevice as jest.Mock).mockReturnValue({id: 'arka', hasTorch: true});
  let kok: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { kok = ReactTestRenderer.create(<App />); });
  const okut = async (deger: string, girisListesi = false) => {
    await uzunBas(kok!, 'barkod oku');
    // Girişte yerler okunup seçim dinlenir; kullanıcı cevap vermiyor
    if (girisListesi) (sesiDinle as jest.Mock).mockResolvedValueOnce({hata: 'anlasilmadi', kod: '7'});
    const tarayici = kok!.root.findAll(n => n.props.codeScanner)[0].props.codeScanner;
    await ReactTestRenderer.act(async () => {
      await new Promise<void>(r => setTimeout(r, 2100));
      await tarayici.onCodeScanned([{value: deger}]);
    });
  };

  await okut('BAK:MEKAN:ornek-hastane', true);
  // Girişten vezneye haritada 24 adım (10 + 6 + 8); kısa adımlı kullanıcı 34 adım atıyor
  await uzunBas(kok!, 'vezne nerede');
  expect(sonSoylenen()).toContain('yaklaşık 10 adım');
  await adimAt(34);
  await okut('BAK:NOKTA:ornek-hastane:vezne');
  expect(sonSoylenen()).toContain('Adımlarınızı ölçtüm; adımınız şimdi yaklaşık 60 santim');
  // 0,6 × 1 + 0,4 × (34 / 24) = 1,17
  expect(await AsyncStorage.getItem('ayar:adimCarpani')).toBe('1.17');

  // Sonraki tarif yeni çarpanla verilir: vezneden laboratuvara 6 adım → 7
  await uzunBas(kok!, 'laboratuvar nerede');
  expect(sonSoylenen()).toContain('yaklaşık 7 adım');

  // Etiket olmadan da ölçülür: laboratuvara varınca "vardım" (vezne → laboratuvar haritada 6 adım; çok kısa yol
  // ölçüme katılmaz, çarpan değişmez)
  await adimAt(9);
  await uzunBas(kok!, 'vardım');
  expect(await AsyncStorage.getItem('ayar:adimCarpani')).toBe('1.17');

  (useCameraDevice as jest.Mock).mockReturnValue(undefined);
}, 20000);

test('"vardım" denince etiket olmadan da adım ölçülür', async () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  await AsyncStorage.removeItem('aktifMekan');
  await AsyncStorage.removeItem('ayar:adimCarpani');
  await AsyncStorage.removeItem('ayar:adimHizliOlcum');
  const {useCameraDevice} = require('react-native-vision-camera');
  (useCameraDevice as jest.Mock).mockReturnValue({id: 'arka', hasTorch: true});
  let kok: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { kok = ReactTestRenderer.create(<App />); });
  await uzunBas(kok!, 'barkod oku');
  (sesiDinle as jest.Mock).mockResolvedValueOnce({hata: 'anlasilmadi', kod: '7'});
  const tarayici = kok!.root.findAll(n => n.props.codeScanner)[0].props.codeScanner;
  await ReactTestRenderer.act(async () => {
    await new Promise<void>(r => setTimeout(r, 2100));
    await tarayici.onCodeScanned([{value: 'BAK:MEKAN:ornek-hastane'}]);
  });
  await uzunBas(kok!, 'vezne nerede');
  await adimAt(34);                       // haritada 24 adım
  await uzunBas(kok!, 'vardım');
  expect(sonSoylenen()).toContain('Adımlarınızı ölçtüm');
  expect(await AsyncStorage.getItem('ayar:adimCarpani')).toBe('1.17');

  // "Adımlarım değişti": sonraki ölçümler hızlı (0,75 ağırlık) — bina içinde GPS yok, hızlı ölçüme geçilir
  (useCameraDevice as jest.Mock).mockReturnValue(undefined);
}, 20000);
