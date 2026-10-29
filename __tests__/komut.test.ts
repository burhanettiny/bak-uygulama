import {sesliKomutCoz} from '../src/ayristirma/komut';

describe('sesli komutlar', () => {
  test.each([
    ['Barkod oku', {tur: 'kamera', mod: 'barkod'}],
    ['ürünü oku', {tur: 'kamera', mod: 'barkod'}],
    ['QR kodu tara', {tur: 'kamera', mod: 'barkod'}],
    ['tekrar barkod oku', {tur: 'kamera', mod: 'barkod'}],
    ['Son kullanma tarihini oku', {tur: 'kamera', mod: 'tarih'}],
    ['SKT', {tur: 'kamera', mod: 'tarih'}],
    ['para tanı', {tur: 'kamera', mod: 'para'}],
    ['bu kaç lira', {tur: 'kamera', mod: 'para'}],
    ['POS tutarını oku', {tur: 'kamera', mod: 'pos'}],
    ['ne kadar ödeyeceğim', {tur: 'kamera', mod: 'pos'}],
  ])('kamera: %j', (metin, komut) => {
    expect(sesliKomutCoz(metin)).toEqual(komut);
  });

  test.each([
    ['Süt nerede?', 'süt'],
    ['beyaz peynir nerde', 'beyaz peynir'],
    ['deterjan arıyorum', 'deterjan'],
    ['bana şampuan lazım', 'şampuan'],
  ])('nerede: %j → %j', (metin, aranan) => {
    expect(sesliKomutCoz(metin)).toEqual({tur: 'nerede', aranan});
  });

  test.each([
    ['Listeye süt ekle', {tur: 'ekle', ogeler: ['süt']}],
    ['ekmek ve yumurta ekle', {tur: 'ekle', ogeler: ['ekmek', 'yumurta']}],
    ['listeden sütü sil', {tur: 'sil', oge: 'sütü'}],
    ['listeyi temizle', {tur: 'temizle'}],
  ])('liste: %j', (metin, komut) => {
    expect(sesliKomutCoz(metin)).toEqual({tur: 'liste', komut});
  });

  test.each([
    ['listemi oku', {tur: 'listeyiOku'}],
    ['listemde ne var', {tur: 'listeyiOku'}],
    ['listemi aç', {tur: 'ekran', mod: 'liste'}],
    ['alışveriş listesi', {tur: 'ekran', mod: 'liste'}],
    ['son taranan ürünler', {tur: 'ekran', mod: 'gecmis'}],
    ['hakkında', {tur: 'ekran', mod: 'hakkinda'}],
    ['listeyi gez', {tur: 'gez'}],
    ['alışverişe başla', {tur: 'gez'}],
    ['vardım', {tur: 'sonrakiDurak'}],
    ['sonraki durak', {tur: 'sonrakiDurak'}],
    ['Neredeyim?', {tur: 'neredeyim'}],
    ['mağazadan çık', {tur: 'mekandanCik'}],
    ['tekrarla', {tur: 'tekrarla'}],
    ['ne dedin', {tur: 'tekrarla'}],
    ['daha hızlı konuş', {tur: 'hiz', yon: 'artir'}],
    ['yavaş konuş', {tur: 'hiz', yon: 'azalt'}],
    ['yardım', {tur: 'yardim'}],
    ['neler yapabilirim', {tur: 'yardim'}],
  ])('diğer: %j', (metin, komut) => {
    expect(sesliKomutCoz(metin)).toEqual(komut);
  });

  test.each(['', 'merhaba', 'bugün hava güzel'])('anlaşılmayan: %j', metin => {
    expect(sesliKomutCoz(metin)).toEqual({tur: 'bilinmiyor'});
  });
});

describe('bina içi komutlar', () => {
  test.each([
    ["Doktor Ayşe Yılmaz'ın odası nerede", 'doktor ayşe yılmaz'],
    ['Zeynep Demir hangi katta', 'zeynep demir'],
    ['tuvalet nerede', 'tuvalet'],
    ['kardiyolojiye nasıl giderim', 'kardiyolojiye'],
    ['112 numaralı oda', '112 numaralı oda'],
    ['oda 214', 'oda 214'],
  ])('nerede: %j', (metin, aranan) => {
    expect(sesliKomutCoz(metin)).toEqual({tur: 'nerede', aranan});
  });

  test.each([
    ['merdiven kullanma', true],
    ['merdivenden kaçın', true],
    ['asansörü tercih et', true],
    ['merdiven kullan', false],
    ['merdiven olur', false],
  ])('merdiven: %j → kaçın=%s', (metin, kacin) => {
    expect(sesliKomutCoz(metin)).toEqual({tur: 'merdiven', kacin});
  });

  test.each(['mağazadan çık', 'binadan çık', 'yönlendirmeyi kapat'])('kapat: %j', metin => {
    expect(sesliKomutCoz(metin)).toEqual({tur: 'mekandanCik'});
  });
});

describe('erişilebilirlik ve acil durum komutları', () => {
  test.each([
    ['sus', {tur: 'sustur'}],
    ['Dur.', {tur: 'sustur'}],
    ['kayboldum', {tur: 'kayboldum'}],
    ['yolumu kaybettim', {tur: 'kayboldum'}],
    ['yardım çağır', {tur: 'yardimCagir'}],
    ['acil durum', {tur: 'yardimCagir'}],
    ['yardım numaram 0532 123 45 67', {tur: 'yardimNumarasi', numara: '05321234567'}],
    ['acil numaram', {tur: 'yardimNumarasi', numara: null}],
    ['kısa anlat', {tur: 'kisaAnlatim', acik: true}],
    ['kısa anlatımı kapat', {tur: 'kisaAnlatim', acik: false}],
    ['uzun anlat', {tur: 'kisaAnlatim', acik: false}],
    ['yön uyarısını kapat', {tur: 'yonUyarisi', acik: false}],
    ['yön uyarısını aç', {tur: 'yonUyarisi', acik: true}],
    ['eğitim', {tur: 'egitim'}],
    ['nasıl kullanılır', {tur: 'egitim'}],
    ['ayarlar', {tur: 'ekran', mod: 'ayarlar'}],
    ['yardım', {tur: 'yardim'}],        // komut listesi isteği bozulmadı
  ])('%j', (metin, komut) => {
    expect(sesliKomutCoz(metin)).toEqual(komut);
  });
});
