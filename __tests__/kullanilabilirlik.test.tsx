import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import Tts from 'react-native-tts';
import App from '../App';
import {sesiDinle} from '../src/servisler/ses';
import {EGITIM_ADIMLARI} from '../src/sabitler';

jest.mock('../src/servisler/ses', () => ({
  ...jest.requireActual('../src/servisler/ses'),
  konusVeBekle: jest.fn(() => Promise.resolve()),
  sesiDinle: jest.fn(),
  sesliSoyele: jest.fn(),
  konusuyorMu: jest.fn(() => false),
}));
jest.mock('../src/servisler/cihaz', () => ({
  ...jest.requireActual('../src/servisler/cihaz'),
  yardimAra: jest.fn(() => Promise.resolve('arandi')),
  ekranAcikTut: jest.fn(),
}));
const {sesliSoyele, konusuyorMu} = jest.requireMock('../src/servisler/ses');
const {yardimAra, ekranAcikTut} = jest.requireMock('../src/servisler/cihaz');
const AsyncStorage = require('@react-native-async-storage/async-storage');

type Kok = ReactTestRenderer.ReactTestRenderer;

async function uygulamayiAc() {
  let kok: Kok;
  await ReactTestRenderer.act(async () => {
    kok = ReactTestRenderer.create(<App />);
  });
  return kok!;
}

const yazilar = (kok: Kok) => kok.root.findAllByType('Text' as any).map(t => [t.props.children].flat().join(''));
const sonSoylenen = () => (sesliSoyele as jest.Mock).mock.calls.at(-1)?.[0];
const anaAlan = (kok: Kok) => kok.root.findAll(n => typeof n.props.onLongPress === 'function')[0];

async function uzunBas(kok: Kok, soylenen: string) {
  (sesiDinle as jest.Mock).mockResolvedValueOnce({metin: soylenen});
  await ReactTestRenderer.act(async () => {
    await anaAlan(kok).props.onLongPress();
  });
}

// Çoklu dokunuş 400 ms sessizlikten sonra sayılır
async function dokun(kok: Kok, kez = 1) {
  await ReactTestRenderer.act(async () => {
    for (let i = 0; i < kez; i++) anaAlan(kok).props.onPress();
    await new Promise<void>(r => setTimeout(r, 450));
  });
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.setItem('egitimTamam', 'true');
});

test('ilk açılışta eğitim başlar, yanlış harekette tekrar ister, doğru hareketlerle biter', async () => {
  await AsyncStorage.removeItem('egitimTamam');
  const kok = await uygulamayiAc();
  expect(yazilar(kok)).toContain('EĞİTİM');
  expect(sonSoylenen()).toBe(EGITIM_ADIMLARI[0].metin);

  await dokun(kok, 1);
  expect(sonSoylenen()).toBe(EGITIM_ADIMLARI[1].metin);

  await dokun(kok, 3);                                  // beklenen 2 dokunuş
  expect(sonSoylenen()).toMatch(/^Tekrar deneyelim\. .*iki kez/);

  await dokun(kok, 2);
  await dokun(kok, 3);
  await ReactTestRenderer.act(async () => { anaAlan(kok).props.onLongPress(); });
  expect(sonSoylenen()).toBe(EGITIM_ADIMLARI[4].metin);
  await dokun(kok, 1);

  expect(yazilar(kok)).toContain('⚙️ AYARLAR');
  expect(await AsyncStorage.getItem('egitimTamam')).toBe('true');
}, 15000);

test('eğitim bitmişse karşılama mesajı yeni hareketleri söyler', async () => {
  await uygulamayiAc();
  expect(sonSoylenen()).toMatch(/Bir dokunuş susturur, iki dokunuş barkod okur, üç dokunuş yol tarifi verir/);
});

test('konuşurken tek dokunuş susturur, sessizken son durumu söyler', async () => {
  const kok = await uygulamayiAc();
  (sesliSoyele as jest.Mock).mockClear();
  (konusuyorMu as jest.Mock).mockReturnValueOnce(true);
  await dokun(kok, 1);
  expect(Tts.stop).toHaveBeenCalled();
  expect(sesliSoyele).not.toHaveBeenCalled();

  await dokun(kok, 1);
  expect(sonSoylenen()).toMatch(/^Durum: Hazır\. .*Barkod için 2, yol tarifi için 3 kez dokunun/);
});

test('üç dokunuş yol tarifi ister (bina yoksa QR okutmayı söyler)', async () => {
  const kok = await uygulamayiAc();
  await dokun(kok, 3);
  expect(sonSoylenen()).toMatch(/^Önce bina ya da mağaza girişindeki QR kodu okutun/);
});

test('yardım numarası sesle kaydedilir ve "yardım çağır" o numarayı arar', async () => {
  const kok = await uygulamayiAc();
  await uzunBas(kok, 'yardım çağır');
  expect(sonSoylenen()).toMatch(/^Kayıtlı yardım numarası yok/);
  expect(yardimAra).not.toHaveBeenCalled();

  await uzunBas(kok, 'Yardım numaram 0532 123 45 67');
  expect(sonSoylenen()).toBe('Yardım numarası kaydedildi: 0 5 3 2 1 2 3 4 5 6 7.');
  expect(await AsyncStorage.getItem('ayar:yardimNumarasi')).toBe('"05321234567"');

  await uzunBas(kok, 'yardım çağır');
  expect(yardimAra).toHaveBeenCalledWith('05321234567');
});

test('"kayboldum" sakinleştirir ve ne yapılacağını söyler', async () => {
  await AsyncStorage.removeItem('ayar:yardimNumarasi');
  const kok = await uygulamayiAc();
  await uzunBas(kok, 'kayboldum');
  expect(sonSoylenen()).toMatch(/^Sakin olun. .*QR kodu okutun.*acil kişi ekle derseniz, sonra konumunuzu/);
});

test('"ayarlar" ekranı açar; kısa anlatım dokunuşla açılıp kaydedilir', async () => {
  const kok = await uygulamayiAc();
  await uzunBas(kok, 'ayarlar');
  expect(yazilar(kok)).toContain('AYARLAR');
  const kisa = () => kok.root.findAll(n => n.props.accessibilityRole === 'switch' &&
    String(n.props.accessibilityLabel).startsWith('Kısa anlatım'))[0];
  expect(kisa().props.accessibilityState).toEqual({checked: false});

  await ReactTestRenderer.act(async () => { kisa().props.onPress(); });
  expect(kisa().props.accessibilityState).toEqual({checked: true});
  expect(await AsyncStorage.getItem('ayar:kisaAnlatim')).toBe('true');
  await AsyncStorage.removeItem('ayar:kisaAnlatim');
});

test('barkod kamerası uzun süre bir şey bulamazsa ipucu verir ve sonunda vazgeçer', async () => {
  const {useCameraDevice} = require('react-native-vision-camera');
  (useCameraDevice as jest.Mock).mockReturnValue({id: 'arka', hasTorch: true});
  jest.useFakeTimers();
  try {
    const kok = await uygulamayiAc();
    await uzunBas(kok, 'barkod oku');
    expect(sonSoylenen()).toBe('Barkodu veya QR kodu kameraya tutun.');
    await ReactTestRenderer.act(async () => { jest.advanceTimersByTime(10000); });
    expect(sonSoylenen()).toMatch(/^Barkod genellikle ürünün arkasında/);
    await ReactTestRenderer.act(async () => { jest.advanceTimersByTime(30000); });
    expect(sonSoylenen()).toMatch(/^Barkod bulunamadı\./);
    expect(yazilar(kok)).toContain('⚙️ AYARLAR');
  } finally {
    (useCameraDevice as jest.Mock).mockReturnValue(undefined);
    jest.useRealTimers();
  }
});

test('kamera açıkken ekran kapanıp kilitlenmez, kapanınca telefonun ayarına dönülür', async () => {
  const {useCameraDevice} = require('react-native-vision-camera');
  (useCameraDevice as jest.Mock).mockReturnValue({id: 'arka', hasTorch: true});
  try {
    const kok = await uygulamayiAc();
    expect(ekranAcikTut).toHaveBeenLastCalledWith(false);
    await uzunBas(kok, 'barkod oku');
    expect(ekranAcikTut).toHaveBeenLastCalledWith(true);
    const kapat = () => ReactTestRenderer.act(async () => {
      kok.root.findAll(n => typeof n.props.onKapat === 'function')[0].props.onKapat();
    });
    // Açılır açılmaz gelen dokunuş (açan dokunuşların artığı) kamerayı kapatmaz
    await kapat();
    expect(ekranAcikTut).toHaveBeenLastCalledWith(true);
    const simdi = Date.now();
    const saat = jest.spyOn(Date, 'now').mockReturnValue(simdi + 1500);
    await kapat();
    saat.mockRestore();
    expect(ekranAcikTut).toHaveBeenLastCalledWith(false);
  } finally {
    (useCameraDevice as jest.Mock).mockReturnValue(undefined);
  }
});

test('kamera kodu görüp okuyamayınca yön tarif edilir, aynı tarif sık tekrarlanmaz', async () => {
  const {useCameraDevice} = require('react-native-vision-camera');
  (useCameraDevice as jest.Mock).mockReturnValue({id: 'arka', hasTorch: true});
  try {
    const kok = await uygulamayiAc();
    await uzunBas(kok, 'barkod oku');
    const kamera = () => kok.root.findAll(n => typeof n.props.onOnizlemeBoyutu === 'function')[0];
    await ReactTestRenderer.act(async () => { kamera().props.onOnizlemeBoyutu({width: 400, height: 800}); });
    const tarayici = kok.root.findAll(n => n.props.codeScanner)[0].props.codeScanner;
    const okunamayan = [{type: 'ean-13', frame: {x: 20, y: 360, width: 80, height: 40}}];
    (sesliSoyele as jest.Mock).mockClear();
    await ReactTestRenderer.act(async () => {
      await tarayici.onCodeScanned(okunamayan, {width: 1280, height: 720});
      await tarayici.onCodeScanned(okunamayan, {width: 1280, height: 720});
    });
    expect(sesliSoyele).toHaveBeenCalledTimes(1);
    expect(sonSoylenen()).toBe('Kod görünüyor. Telefonu biraz sola çevirin.');
  } finally {
    (useCameraDevice as jest.Mock).mockReturnValue(undefined);
  }
});

test('Android geri tuşu alt ekranda uygulamayı kapatmaz, ana menüye döner', async () => {
  const {BackHandler} = require('react-native');
  const dinleyiciler: (() => boolean)[] = [];
  const casus = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_olay: any, f: any) => {
    dinleyiciler.push(f);
    return {remove: () => {}};
  });
  try {
    const kok = await uygulamayiAc();
    expect(dinleyiciler.at(-1)!()).toBe(false);          // ana ekranda: sistem davranışı (uygulamadan çık)
    await uzunBas(kok, 'ayarlar');
    let sonuc = false;
    await ReactTestRenderer.act(async () => { sonuc = dinleyiciler.at(-1)!(); });
    expect(sonuc).toBe(true);                             // ayarlarda: uygulama kapanmaz
    expect(sonSoylenen()).toBe('Ana menü.');
  } finally {
    casus.mockRestore();
  }
});
