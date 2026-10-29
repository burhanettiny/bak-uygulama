import {
  anahtarlaHedefBul, aramaMetniTemizle, hedefBul, hedefEtiketi, hedefKonumu, katAdi, listeRotasi, noktaAciklamasi,
  qrCoz, rotaBul, rotaTarifi, turOzeti, varisIsle, yerlesimDogrula,
} from '../src/mekan/yerlesim';
import {mekanGetir} from '../src/mekan/mekanlar';
import ornekMarket from '../src/mekan/veri/ornek-market.json';
import ornekHastane from '../src/mekan/veri/ornek-hastane.json';
import {Mekan, MekanHedefi} from '../src/tipler';

const market = mekanGetir('ornek-market') as Mekan;
const hastane = mekanGetir('ornek-hastane') as Mekan;
const hedef = (y: Mekan, ad: string, nokta?: string): MekanHedefi =>
  y.hedefler.find(h => h.ad === ad && (!nokta || h.nokta === nokta))!;
const toplamAdim = (rota: {adim: number}[]) => rota.reduce((t, a) => t + a.adim, 0);

describe('QR kodları', () => {
  test.each([
    ['BAK:MEKAN:ornek-hastane', {tur: 'mekan', mekanId: 'ornek-hastane'}],
    ['BAK:MAGAZA:ornek-market', {tur: 'mekan', mekanId: 'ornek-market'}],     // eski biçim
    ['BAK:NOKTA:ornek-market:k3', {tur: 'nokta', mekanId: 'ornek-market', noktaId: 'k3'}],
    ['  bak:mekan:kadikoy-042 ', {tur: 'mekan', mekanId: 'kadikoy-042'}],
    ['REYON-SUT', {tur: 'nokta', mekanId: 'ornek-market', noktaId: 'k3'}],     // eski sürüm QR'ı
  ])('%j', (deger, beklenen) => {
    expect(qrCoz(deger)).toEqual(beklenen);
  });

  test.each(['8690504012345', 'https://example.com', 'BAK:NOKTA:eksik'])('mekân QR\'ı değil: %s', deger => {
    expect(qrCoz(deger)).toBeNull();
  });
});

describe('yerleşim doğrulama', () => {
  test('paketli örnekler geçerli', () => {
    expect(market).not.toBeNull();
    expect(hastane).not.toBeNull();
    expect(mekanGetir('bilinmeyen')).toBeNull();
  });

  test('olmayan noktaya giden bağlantı reddedilir', () => {
    const bozuk = {...ornekMarket, baglantilar: [...ornekMarket.baglantilar,
      {a: 'k1', b: 'yok', adim: 3, tarif: 'x', geriTarif: 'y'}]};
    expect(yerlesimDogrula(bozuk)).toBeNull();
  });

  test('giriş ya da kasa noktası tanımsızsa reddedilir', () => {
    expect(yerlesimDogrula({...ornekMarket, giris: 'yok'})).toBeNull();
    expect(yerlesimDogrula({...ornekMarket, kasa: 'yok'})).toBeNull();
    expect(yerlesimDogrula(null)).toBeNull();
  });

  test('yürüme yolunda tarif şart, asansör ve merdivende değil', () => {
    const ile = (b: object) => yerlesimDogrula({...ornekHastane, baglantilar: [b]});
    expect(ile({a: 'asansor-0', b: 'asansor-1', adim: 30, tur: 'asansor'})).not.toBeNull();
    expect(ile({a: 'merdiven-0', b: 'merdiven-1', adim: 30, tur: 'merdiven'})).not.toBeNull();
    expect(ile({a: 'giris', b: 'danisma', adim: 3})).toBeNull();                        // tarifsiz yürüme
    expect(ile({a: 'giris', b: 'danisma', adim: 3, tarif: 'x'})).toBeNull();            // geri tarif yok
    expect(ile({a: 'giris', b: 'danisma', adim: 3, tarif: 'x', tekYon: true})).not.toBeNull();
    expect(ile({a: 'giris', b: 'danisma', adim: 3, tur: 'isinlanma', tarif: 'x', tekYon: true})).toBeNull();
  });
});

describe('arama metni', () => {
  test.each([
    ['süt nerede', 'süt'],
    ['Peynir arıyorum.', 'peynir'],
    ['bana deterjan lazım', 'deterjan'],
    ["Doktor Ayşe Yılmaz'ın odası nerede", 'doktor ayşe yılmaz'],
    ['Kardiyolojiye nasıl giderim', 'kardiyolojiye'],
  ])('%j → %j', (metin, aranan) => {
    expect(aramaMetniTemizle(metin)).toBe(aranan);
  });
});

describe('mağaza', () => {
  test.each([
    ['yoğurt', 'Süt Ürünleri'],
    ['portakal suyu', 'İçecek'],
    ['tavuk göğsü', 'Et Ürünleri'],
    ['şampuan', 'Temizlik ve Kozmetik'],
  ])('%s → %s', (metin, ad) => {
    expect(anahtarlaHedefBul(market, metin)?.ad).toBe(ad);
  });

  test('mağazada olmayan ürün', () => {
    expect(hedefBul(market, 'pil')).toBeNull();
    expect(hedefKonumu(market, 'Duracell Pil')).toBeNull();
  });

  test('taranan ürünün mağazadaki konumu', () => {
    expect(hedefKonumu(market, 'dairies Pınar Süt')).toMatchObject({bolum: 'Süt Ürünleri', koridor: '3', raf: '2'});
  });

  test('tek yönlü yol: 6. koridordan çıkışa kasalardan, girişten 6. koridora ön koridordan', () => {
    expect(rotaBul(market, 'k6', 'giris')!.map(a => a.varis)).toEqual(['kasa', 'giris']);
    expect(rotaBul(market, 'giris', 'k6')!.map(a => a.varis)).toEqual(['k1', 'k2', 'k3', 'k4', 'k5', 'k6']);
  });

  test('ters yönde geri tarif kullanılır', () => {
    expect(rotaBul(market, 'k2', 'k1')![0].tarif).toBe('Ön koridorda sola doğru ilerleyin');
  });

  test('aynı yöndeki adımlar tek cümlede birleşir', () => {
    expect(rotaTarifi(market, 'giris', hedef(market, 'Süt Ürünleri'))).toBe(
      'Süt Ürünleri için: Girişten düz ilerleyin, yaklaşık 8 adım. 1. koridor başı noktasına ulaşacaksınız. ' +
      'Sonra ön koridorda sağa doğru ilerleyin, yaklaşık 12 adım. 3. koridor başı noktasına ulaşacaksınız. ' +
      '3. koridora girin. Süt ürünleri sağ taraftaki soğutucu dolaplarda.');
  });

  test('hedefteyken sadece son tarif söylenir', () => {
    expect(rotaTarifi(market, 'k3', hedef(market, 'Süt Ürünleri'))).toMatch(/^Süt Ürünleri burada\./);
  });

  test('ulaşılamayan nokta', () => {
    const kopuk: Mekan = {...market, baglantilar: []};
    expect(rotaBul(kopuk, 'giris', 'k3')).toBeNull();
    expect(rotaTarifi(kopuk, 'giris', hedef(market, 'Süt Ürünleri'))).toMatch(/yol bulunamadı/);
  });

  test('nokta açıklaması', () => {
    expect(noktaAciklamasi(market, 'giris')).toBe('Giriştesiniz.');
    expect(noktaAciklamasi(market, 'k3')).toBe('Şu an 3. koridor başı noktasındasınız. Burada: Süt Ürünleri.');
  });
});

describe('alışveriş listesi turu', () => {
  test('ürünler hedeflere toplanır, duraklar yakından uzağa sıralanır', () => {
    const tur = listeRotasi(market, 'giris', ['çay', 'süt', 'domates', 'peynir', 'pil']);
    expect(tur.duraklar.map(d => d.hedef.ad)).toEqual(['Meyve Sebze', 'Süt Ürünleri', 'İçecek']);
    expect(tur.duraklar[1].ogeler).toEqual(['süt', 'peynir']);
    expect(tur.bulunamayanlar).toEqual(['pil']);
  });

  test('başlangıç noktasına göre sıra değişir', () => {
    const tur = listeRotasi(market, 'k6', ['domates', 'şampuan', 'süt']);
    expect(tur.duraklar.map(d => d.hedef.nokta)).toEqual(['k6', 'k3', 'k1']);
  });

  test('sesli özet', () => {
    expect(turOzeti(market, 'giris', listeRotasi(market, 'giris', ['süt', 'pil']))).toMatch(
      /^Listenizdeki 1 ürün 1 durakta\. Sıra: 1\. Süt Ürünleri: süt\. Burada yeri bilinmeyen: pil\. İlk durak\. Süt Ürünleri için:/);
    expect(turOzeti(market, 'giris', listeRotasi(market, 'giris', ['pil']))).toMatch(/yeri bilinmiyor/);
  });

  test('durağa varınca alınacaklar ve sonraki durak, son duraktan sonra kasa söylenir', () => {
    const {duraklar} = listeRotasi(market, 'giris', ['domates', 'süt']);
    const ilk = varisIsle(market, 'k1', duraklar)!;
    expect(ilk.metin).toMatch(/^Hedefinize ulaştınız\. 1\. koridora girin\..* Buradan alınacaklar: domates\. Sonraki durak\. Süt Ürünleri için:/);
    const son = varisIsle(market, 'k3', ilk.kalan)!;
    expect(son.kalan).toEqual([]);
    expect(son.metin).toMatch(/Listedeki tüm duraklar tamamlandı\. Kasalar için:/);
  });

  test('tek hedef aramasında kasa tarifi verilmez; durak olmayan noktada null', () => {
    expect(varisIsle(market, 'k3', [{hedef: hedef(market, 'Süt Ürünleri'), ogeler: []}])!.metin).not.toMatch(/Kasalar/);
    expect(varisIsle(market, 'k5', listeRotasi(market, 'giris', ['süt']).duraklar)).toBeNull();
  });
});

describe('hastane: birim, kişi ve oda arama', () => {
  test('birim adıyla', () => {
    expect(hedefBul(hastane, 'kardiyoloji')).toMatchObject({tur: 'hedef', hedef: {ad: 'Kardiyoloji Polikliniği'}});
    expect(hedefBul(hastane, 'kardiyolojiye')).toMatchObject({hedef: {ad: 'Kardiyoloji Polikliniği'}});
    expect(hedefBul(hastane, 'kan tahlili')).toMatchObject({hedef: {ad: 'Laboratuvar'}});
  });

  test.each([
    ['doktor ayşe yılmaz', 'Dr. Ayşe Yılmaz', 'Kardiyoloji Polikliniği'],
    ['yılmaz', 'Dr. Ayşe Yılmaz', 'Kardiyoloji Polikliniği'],
    ['zeynep demir', 'Op. Dr. Zeynep Demir', 'Göz Polikliniği'],
    ['mehmet hoca', 'Dr. Mehmet Kaya', 'Dahiliye Polikliniği'],
  ])('kişi: %j', (metin, kisi, ad) => {
    expect(hedefBul(hastane, metin)).toMatchObject({tur: 'hedef', kisi, hedef: {ad}});
  });

  test('aynı adı taşıyan birden fazla kişi varsa hepsi söylenir', () => {
    const ikiAyse: Mekan = {...hastane, hedefler: hastane.hedefler.map(h =>
      h.ad === 'Dahiliye Polikliniği' ? {...h, kisiler: [...(h.kisiler || []), 'Dr. Ayşe Kara']} : h)};
    const sonuc = hedefBul(ikiAyse, 'ayşe');
    expect(sonuc?.tur).toBe('coklu');
    expect(sonuc?.tur === 'coklu' && sonuc.adaylar.map(a => a.kisi)).toEqual(['Dr. Ayşe Yılmaz', 'Dr. Ayşe Kara']);
  });

  test('oda numarasıyla', () => {
    expect(hedefBul(hastane, '118 numaralı oda')).toMatchObject({hedef: {ad: 'Dahiliye Polikliniği'}});
    expect(hedefBul(hastane, 'oda 999')).toBeNull();
  });

  test('yalnızca unvan söylenirse eşleşme yapılmaz', () => {
    expect(hedefBul(hastane, 'doktor')).toBeNull();
  });

  test('aynı türden hedeflerde en yakını seçilir', () => {
    expect(hedefBul(hastane, 'tuvalet', 'giris')).toMatchObject({hedef: {nokta: 'wc-0'}});
    expect(hedefBul(hastane, 'tuvalet', 'k1-koridor')).toMatchObject({hedef: {nokta: 'wc-1'}});
  });

  test('hedef etiketi kişi, oda ve katı içerir', () => {
    expect(hedefEtiketi(hastane, hedef(hastane, 'Kardiyoloji Polikliniği'), 'Dr. Ayşe Yılmaz'))
      .toBe('Dr. Ayşe Yılmaz, Kardiyoloji Polikliniği, oda 112, 1. kat');
    expect(hedefEtiketi(market, hedef(market, 'Süt Ürünleri'))).toBe('Süt Ürünleri'); // tek katlıda kat söylenmez
  });
});

describe('hastane: katlar, merdiven ve asansör', () => {
  const kardiyoloji = () => hedef(hastane, 'Kardiyoloji Polikliniği');

  test.each([[0, 'zemin kat'], [1, '1. kat'], [-1, 'bodrum kat'], [-2, 'eksi 2. kat']])('kat %d → %s', (k, ad) => {
    expect(katAdi(k)).toBe(ad);
  });

  test('varsayılan rota merdivenden gider ve merdiven güvenlik bilgisi söylenir', () => {
    const tarif = rotaTarifi(hastane, 'giris', kardiyoloji());
    expect(tarif).toContain('Sonra dikkat, merdiven. Merdivenle 1 kat yukarı çıkın, toplam 24 basamak. ' +
      'Korkuluk sağınızda, ara sahanlıkta sola dönün. 1. kat, Merdiven başı noktasına ulaşacaksınız.');
    expect(tarif).not.toContain('Asansör');
    expect(tarif).toMatch(/Kardiyoloji kapısı solunuzda, oda 112\.$/);
  });

  test('merdivenden kaçınılınca asansör kullanılır', () => {
    const tarif = rotaTarifi(hastane, 'giris', kardiyoloji(), ['merdiven']);
    expect(tarif).toContain('Sonra asansöre binin ve 1. kat düğmesine basın. Düğmelerde kabartma yazı var. 1. kat, Asansör önü noktasına ulaşacaksınız.');
    expect(tarif).not.toContain('merdiven');
    expect(toplamAdim(rotaBul(hastane, 'giris', 'kardiyoloji', ['merdiven'])!))
      .toBeGreaterThan(toplamAdim(rotaBul(hastane, 'giris', 'kardiyoloji')!));
  });

  test('aşağı inerken yön ve geri tarif doğru', () => {
    const tarif = rotaTarifi(hastane, 'kardiyoloji', hedef(hastane, 'Vezne'));
    expect(tarif).toContain('Merdivenle 1 kat aşağı inin, toplam 24 basamak. Korkuluk solunuzda');
    expect(tarif).toContain('Zemin kat, Merdiven başı noktasına ulaşacaksınız.');
  });

  test('asansörsüz binada merdivenden kaçınılamazsa kullanıcı uyarılır', () => {
    const asansorsuz: Mekan = {...hastane, baglantilar: hastane.baglantilar.filter(b => b.tur !== 'asansor')};
    const tarif = rotaTarifi(asansorsuz, 'giris', kardiyoloji(), ['merdiven']);
    expect(tarif).toMatch(/^Merdivensiz yol bulunamadı, tarif merdiven içeriyor\. Kardiyoloji Polikliniği için:/);
    expect(tarif).toContain('dikkat, merdiven.');
  });

  test('çok katlı binada nokta açıklaması katı içerir', () => {
    expect(noktaAciklamasi(hastane, 'kardiyoloji'))
      .toBe('Şu an 1. kat, Kardiyoloji kapısı noktasındasınız. Burada: Kardiyoloji Polikliniği.');
  });

  test('QR ile hedefe varış', () => {
    const varis = varisIsle(hastane, 'kardiyoloji', [{hedef: kardiyoloji(), ogeler: []}])!;
    expect(varis.metin).toBe('Hedefinize ulaştınız. Kardiyoloji kapısı solunuzda, oda 112.');
  });
});
