import {aciFarki, yonIzleyici} from '../src/mekan/yonIzleyici';
import {numarayiOkunurYap, telefonNumarasiCoz} from '../src/ayristirma/telefon';

describe('açı farkı', () => {
  test.each([[10, 350, 20], [350, 10, -20], [90, 0, 90], [180, 0, -180], [0, 0, 0]])('%d - %d = %d', (a, b, f) => {
    expect(aciFarki(a, b)).toBe(f);
  });
});

describe('yön sapması izleyici', () => {
  // 200 ms aralıklı ölçümler ve 600 ms aralıklı adımlarla bir yürüyüş canlandırır
  function yuru(izleyici: ReturnType<typeof yonIzleyici>, yonler: number[], adimBaslangic = 0) {
    let uyari = false;
    yonler.forEach((d, i) => {
      const t = i * 200;
      if (i % 3 === 0) izleyici.adim(t, adimBaslangic + i / 3 + 1);
      uyari = izleyici.olcum(d, t) || uyari;
    });
    return uyari;
  }

  test('düz bölümde yön korunursa uyarı yok; küçük salınımlar sayılmaz', () => {
    const iz = yonIzleyici();
    iz.bolumBasladi(true);
    const yonler = Array.from({length: 60}, (_, i) => 90 + (i % 2 ? 15 : -15));
    expect(yuru(iz, yonler)).toBe(false);
  });

  test('düz bölümde 90° sapıp yürümeye devam edince bir kez uyarır', () => {
    const iz = yonIzleyici();
    iz.bolumBasladi(true);
    const yonler = [...Array(20).fill(90), ...Array(30).fill(180)];
    let uyariSayisi = 0;
    yonler.forEach((d, i) => {
      const t = i * 200;
      if (i % 3 === 0) iz.adim(t, i / 3 + 1);
      if (iz.olcum(d, t)) uyariSayisi++;
    });
    expect(uyariSayisi).toBe(1);
  });

  test('kısa süreli sapma (kol hareketi) uyarı vermez', () => {
    const iz = yonIzleyici();
    iz.bolumBasladi(true);
    expect(yuru(iz, [...Array(20).fill(90), ...Array(5).fill(200), ...Array(20).fill(90)])).toBe(false);
  });

  test('dururken (adım yokken) dönmek uyarı vermez', () => {
    const iz = yonIzleyici();
    iz.bolumBasladi(true);
    for (let i = 0; i < 10; i++) { iz.adim(i * 600, i + 1); iz.olcum(90, i * 600); }
    let uyari = false;
    for (let t = 10000; t < 20000; t += 200) uyari = iz.olcum(200, t) || uyari;
    expect(uyari).toBe(false);
  });

  test('dönüş içeren bölümde izleme yapılmaz', () => {
    const iz = yonIzleyici();
    iz.bolumBasladi(false);
    expect(yuru(iz, [...Array(20).fill(90), ...Array(30).fill(180)])).toBe(false);
  });
});

describe('yardım numarası', () => {
  test.each([
    ['0532 123 45 67', '05321234567'],
    ['yardım numaram 0 532 123 4567', '05321234567'],
    ['+90 532 123 45 67', '+905321234567'],
    ['artı 90 532 123 45 67', '+905321234567'],
  ])('%j → %s', (metin, numara) => {
    expect(telefonNumarasiCoz(metin)).toBe(numara);
  });

  test.each(['123', 'numaram yok', '0532 12'])('geçersiz: %j', metin => {
    expect(telefonNumarasiCoz(metin)).toBeNull();
  });

  test('numara rakam rakam okunur', () => {
    expect(numarayiOkunurYap('05321234567')).toBe('0 5 3 2 1 2 3 4 5 6 7');
    expect(numarayiOkunurYap('+905321234567')).toBe('9 0 5 3 2 1 2 3 4 5 6 7');
  });
});
