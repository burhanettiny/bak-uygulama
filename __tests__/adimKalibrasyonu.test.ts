import {
  HIZLI_AGIRLIK, adimOlcumu, carpaniGuncelle, gpsAdimOlcumu, gpsMesafesi,
} from '../src/mekan/adimKalibrasyonu';
import {mekanGetir} from '../src/mekan/mekanlar';

const hastane = mekanGetir('ornek-hastane')!;

test('düz yürünen yolda sayılan / beklenen oranı ölçülür', () => {
  expect(adimOlcumu(hastane, 'giris', 'vezne', 36)).toBeCloseTo(1.5);   // haritada 24 adım
});

test('güvenilmez ölçümler yok sayılır', () => {
  expect(adimOlcumu(hastane, 'giris', 'giris', 20)).toBeNull();          // aynı nokta
  expect(adimOlcumu(hastane, 'giris', 'danisma', 3)).toBeNull();         // çok az adım
  expect(adimOlcumu(hastane, 'giris', 'vezne', 80)).toBeNull();          // 3 kat: büyük olasılıkla dolaştı
  expect(adimOlcumu(hastane, 'giris', 'kardiyoloji', 60)).toBeNull();    // merdiven/asansör içeriyor
});

test('yeni ölçüm eskisiyle harmanlanır ve sınırlar içinde kalır', () => {
  expect(carpaniGuncelle(1, 1.5)).toBe(1.2);
  expect(carpaniGuncelle(1.7, 2)).toBe(1.8);
  expect(carpaniGuncelle(0.7, 0.6)).toBe(0.7);
});

describe('boydan başlangıç ayarı', () => {
  const {boyCoz, boydanCarpan, adimUzunluguCm} = require('../src/mekan/adimKalibrasyonu');
  const {sesliKomutCoz} = require('../src/ayristirma/komut');

  test.each([
    ['boyum 170', 170], ['boyum 1.70', 170], ['boyum 1 70', 170], ['boyum 1 metre 65 santim', 165],
    ['boyum yüz yetmiş beş', 175], ['boyum bir altmış', 160], ['boyum 182 cm', 182],
  ])('%j → %i cm', (metin, cm) => expect(sesliKomutCoz(metin)).toEqual({tur: 'boy', cm}));

  test('anlaşılmayan boy null; adım komutları karışmaz', () => {
    expect(sesliKomutCoz('boyum')).toEqual({tur: 'boy', cm: null});
    expect(sesliKomutCoz('adım boyum kısa')).toEqual({tur: 'adimBoyu', boy: 'kısa'});
    expect(sesliKomutCoz('adım ayarım ne')).toEqual({tur: 'adimAyari'});
    expect(sesliKomutCoz('adımlarım ne kadar')).toEqual({tur: 'adimAyari'});
  });

  test('kısa boylu daha çok adım atar; sınırlar dışı boy reddedilir', () => {
    expect(boydanCarpan(160)).toBeCloseTo(1.05, 2);
    expect(boydanCarpan(185)).toBeCloseTo(0.91, 2);
    expect(boydanCarpan(70)).toBeNull();
    expect(boyCoz('boyum')).toBeNull();
    expect(adimUzunluguCm(boydanCarpan(170))).toBe(71);
  });
});


test('hızlı yeniden ölçüm: mevsim ya da ayakkabı değişince yeni adıma çabuk uyulur', () => {
  expect(carpaniGuncelle(1, 1.4)).toBe(1.16);                  // normal: %40
  expect(carpaniGuncelle(1, 1.4, HIZLI_AGIRLIK)).toBe(1.3);    // hızlı: %75
});

test('GPS kalibrasyon yürüyüşü: 80 adımda 56 m → 70 cm (standart); hassasiyet ve tutarlılık denetlenir', () => {
  const bas = {enlem: 40.8, boylam: 29.43, dogruluk: 5};
  const son56 = {enlem: 40.8 + 56 / 111195, boylam: 29.43, dogruluk: 6};
  expect(Math.round(gpsMesafesi(bas, son56))).toBe(56);
  expect(gpsAdimOlcumu(bas, son56, 80)).toEqual({carpan: 1, adimCm: 70});
  const son48 = {...son56, enlem: 40.8 + 48 / 111195};            // kısa adım: 60 cm
  expect(gpsAdimOlcumu(bas, son48, 80)).toEqual({carpan: 1.17, adimCm: 60});
  expect(gpsAdimOlcumu(bas, {...son56, dogruluk: 25}, 80)).toEqual({hata: 'gps'});   // GPS hassas değil
  expect(gpsAdimOlcumu(bas, {...bas, dogruluk: 5}, 80)).toEqual({hata: 'mesafe'});   // yürünmemiş / dönülmüş
});
