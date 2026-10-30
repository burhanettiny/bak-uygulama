import {kategorideKonum} from '../src/ayristirma/konum';
import {tutarBul, tutarSesliMetin} from '../src/ayristirma/tutar';
import {sonKullanmaTarihiBul, tarihAyristir, tarihDurumHesapla} from '../src/ayristirma/tarih';
import {banknotBul} from '../src/ayristirma/banknot';
import {listeKomutuCoz, listeSesliMetin, listeyleEslesir} from '../src/ayristirma/liste';
import {alerjenleriCevir, kategoriEtiketiSec, urunSesliMetin} from '../src/ayristirma/urun';

describe('reyon tahmini', () => {
  test.each([
    ['detergent', 'Ariel', 'Temizlik & Kozmetik'],         // "et" içerdiği halde Et reyonu değil
    ['orange juices', 'Portakal Suyu', 'İçecek'],
    ['', 'Pınar Süzme Peynirli Börek', 'Süt Ürünleri'],    // Türkçe ek
    ['', 'Sütaş Ayran', 'İçecek'],
    ['', 'Dana Kıyma', 'Et Ürünleri'],
    ['sweets', 'Haribo', 'Genel Market'],
  ])('%s / %s → %s', (kategori, ad, bolum) => {
    expect(kategorideKonum(kategori, ad).bolum).toBe(bolum);
  });

  test('en belirgin OpenFoodFacts etiketi seçilir', () => {
    expect(kategoriEtiketiSec(['en:plant-based-foods-and-beverages', 'en:orange-juices'])).toBe('orange juices');
    expect(kategoriEtiketiSec(undefined)).toBe('');
  });
});

describe('POS tutarı', () => {
  test.each([
    ['SATIS\nTUTAR: 1.234,50 TL', '1.234,50'],
    ['12.50 TL', '12,50'],
    ['TOPLAM 1250,00', '1.250,00'],
    ['₺ 99,90', '99,90'],
  ])('%j → %s', (metin, beklenen) => {
    expect(tutarBul(metin)).toBe(beklenen);
  });

  test('tutar yoksa null', () => {
    expect(tutarBul('Hoş geldiniz')).toBeNull();
  });

  test('sesli okuma', () => {
    expect(tutarSesliMetin('12.50')).toBe('12 lira 50 kuruş');
    expect(tutarSesliMetin('1.250,00')).toBe('1250 lira');
  });
});

describe('son kullanma tarihi', () => {
  test('üretim tarihi SKT sanılmaz', () => {
    expect(sonKullanmaTarihiBul('ÜRT: 01.01.2026 SKT: 01.06.2027')).toBe('01.06.2027');
    expect(sonKullanmaTarihiBul('Ü.T 01.01.2026 parti 12 15.03.2027')).toBe('15.03.2027');
  });

  test('T.E.T. ve AA/YYYY biçimi', () => {
    expect(sonKullanmaTarihiBul('T.E.T. 05/2027')).toBe('05/2027');
    expect(tarihAyristir('02/2027')?.getDate()).toBe(28); // ayın son günü
  });

  test('geçersiz ya da hiç tarih yoksa null', () => {
    expect(sonKullanmaTarihiBul('45.13.2026')).toBeNull();
    expect(sonKullanmaTarihiBul('31.02.2027')).toBeNull();
    expect(sonKullanmaTarihiBul('Ülker Çikolata 100 g')).toBeNull();
  });

  test('durum hesabı', () => {
    const tarih = (gun: number) => {
      const d = new Date();
      d.setDate(d.getDate() + gun);
      return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    };
    expect(tarihDurumHesapla(tarih(0))).toMatchObject({durum: 'yakin', gunKaldi: 0});
    expect(tarihDurumHesapla(tarih(-3))).toMatchObject({durum: 'gecmis', gunKaldi: -3});
    expect(tarihDurumHesapla(tarih(10))).toMatchObject({durum: 'yakin', gunKaldi: 10});
    expect(tarihDurumHesapla(tarih(90))).toMatchObject({durum: 'iyi', gunKaldi: 90});
  });
});

describe('para tanıma', () => {
  test.each([
    ['TÜRKİYE CUMHURİYET MERKEZ BANKASI\nYÜZ TÜRK LİRASI\n100', 100],
    ['IKI YUZ TURK LIRASI 200', 200],
    ['YUZ TURK LIRASI 200 200', 200],                 // OCR "İKİ"yi kaçırdı
    ['ELLİ TÜRK LİRASI', 50],
    ['ON TÜRK LİRASI 10', 10],
    ['TÜRKİYE CUMHURİYET MERKEZ BANKASI 20 20 A123456', 20],
  ])('%j → %d', (metin, deger) => {
    expect(banknotBul(metin)).toBe(deger);
  });

  test('banknot olmayan yazı', () => {
    expect(banknotBul('Ülker Çikolata 100 g')).toBeNull();
  });
});

describe('alışveriş listesi', () => {
  test.each([
    ['süt ve ekmek', {tur: 'ekle', ogeler: ['süt', 'ekmek']}],
    ['Listeme yumurta, peynir ekle', {tur: 'ekle', ogeler: ['yumurta', 'peynir']}],
    ['sütü sil', {tur: 'sil', oge: 'sütü'}],
    ['listeden ekmeği çıkar', {tur: 'sil', oge: 'ekmeği'}],
    ['Listeyi temizle', {tur: 'temizle'}],
    ['İçim süt', {tur: 'ekle', ogeler: ['içim süt']}],
  ])('%j', (metin, komut) => {
    expect(listeKomutuCoz(metin)).toEqual(komut);
  });

  test.each([
    ['süt', 'sütü', true],
    ['ekmek', 'Uno Tost Ekmeği', true],               // ünsüz yumuşaması
    ['süt', 'Pınar Tam Yağlı Süt 1L', true],
    ['beyaz peynir', 'Pınar Beyaz Peynir', true],
    ['çay', 'Çaykur Rize Çayı', true],
    ['peynir', 'Ülker Çikolata', false],
  ])('%s ~ %s → %s', (oge, metin, sonuc) => {
    expect(listeyleEslesir(oge, metin)).toBe(sonuc);
  });

  test('sesli özet', () => {
    expect(listeSesliMetin([])).toMatch(/boş/);
    expect(listeSesliMetin([{ad: 'süt', alindi: false}, {ad: 'ekmek', alindi: true}]))
      .toBe('Listede 1 ürün kaldı: süt. Alınanlar: ekmek.');
  });
});

describe('ürün bilgisi', () => {
  test('alerjenler Türkçeye çevrilir, tekrarlar atılır', () => {
    expect(alerjenleriCevir(['en:milk', 'en:gluten', 'en:milk', 'en:bilinmeyen'])).toEqual(['süt', 'gluten']);
  });

  test('sesli metin alerjen uyarısı ve konumu içerir', () => {
    const metin = urunSesliMetin({
      ad: 'Tam Yağlı Süt', marka: 'Pınar', alerjenler: ['süt'],
      konum: {bolum: 'Süt Ürünleri', koridor: '3', raf: '2', yonTarifi: '3. koridor.'},
    });
    expect(metin).toBe('Pınar, Tam Yağlı Süt. Alerjen içerir: süt. 3. koridor.');
  });
});
