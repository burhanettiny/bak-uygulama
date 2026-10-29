import {adimOlcumu, carpaniGuncelle} from '../src/mekan/adimKalibrasyonu';
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
