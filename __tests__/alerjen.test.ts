import {
  icindekilerBul, icindekilerdenAlerjenler, kisiselAlerjenCoz, kisiselEslesmeler,
} from '../src/ayristirma/alerjen';
import {urunSesliMetin} from '../src/ayristirma/urun';
import {sesliKomutCoz} from '../src/ayristirma/komut';

const ICINDEKILER = 'Buğday unu, şeker, bitkisel yağ, FINDIK (%5), yağsız süt tozu, peynir altı suyu tozu, tuz.';

test('içindekiler metninden alerjen grupları bulunur (Türkçe harf ve büyük harf fark etmez)', () => {
  expect(icindekilerdenAlerjenler(ICINDEKILER)).toEqual(['gluten', 'süt', 'sert kabuklu yemiş']);
  expect(icindekilerdenAlerjenler('Su, şeker, limon tuzu')).toEqual([]);
  expect(icindekilerdenAlerjenler('susuz')).toEqual([]);          // "su" değil, kelime başı aranır
});

test('kişisel alerjen söylenişi gruba bağlanır, bilinmeyen sözcük de tutulur', () => {
  expect(kisiselAlerjenCoz('fındık ve süt')).toEqual([{ad: 'fındık', grup: 'sert kabuklu yemiş'}, {ad: 'süt', grup: 'süt'}]);
  expect(kisiselAlerjenCoz('gluten, kivi')).toEqual([{ad: 'gluten', grup: 'gluten'}, {ad: 'kivi', grup: null}]);
});

test('ürün: kişisel alerjen EN BAŞTA söylenir; eser miktar ayrı; bilgi yoksa söylenir', () => {
  const benim = kisiselAlerjenCoz('fındık');
  const urun = {ad: 'Gofret', marka: 'Ülker', alerjenler: ['gluten', 'süt'], eserAlerjenler: ['sert kabuklu yemiş'],
    icindekiler: 'Buğday unu, süt tozu', alerjenBilgisiVar: true};
  expect(kisiselEslesmeler(urun, benim)).toEqual({icerir: [], eser: ['fındık']});
  expect(urunSesliMetin(urun, benim)).toBe('Dikkat! Bu ürün sizin alerjeninizi eser miktarda içerebilir: fındık. ' +
    'Ülker, Gofret. Alerjen içerir: gluten, süt. Eser miktarda içerebilir: sert kabuklu yemiş.');
  expect(urunSesliMetin({...urun, icindekiler: ICINDEKILER}, benim)).toMatch(/^Dikkat! Bu üründe sizin alerjeniniz var: fındık\./);
  expect(urunSesliMetin({ad: 'Bisküvi', marka: ''}, benim))
    .toBe('Bisküvi. Bu ürünün alerjen bilgisi bulunamadı. İçindekileri duymak için uzun basıp içindekileri oku deyin.');
  // Kişisel alerjeni olmayan kullanıcıya "bilgi yok" uyarısı tekrarlanmaz
  expect(urunSesliMetin({ad: 'Bisküvi', marka: ''})).toBe('Bisküvi.');
});

test('ambalajdan okunan yazıda içindekiler bölümü bulunur', () => {
  const okunan = 'GOFRET\nNet Miktar: 40 g\nİÇİNDEKİLER: Buğday unu, şeker, fındık, süt tozu.\nEnerji 520 kcal\nÜretici: X';
  expect(icindekilerBul(okunan)).toBe('Buğday unu, şeker, fındık, süt tozu');
  expect(icindekilerBul('Son tüketim tarihi 12.05.2027')).toBeNull();
});

test('sesli komutlar: alerjen, içindekiler, adım ölçümü', () => {
  expect(sesliKomutCoz('fıstık alerjim var')).toEqual({tur: 'alerjenEkle', metin: 'fıstık'});
  expect(sesliKomutCoz('alerjenim süt ve gluten')).toEqual({tur: 'alerjenEkle', metin: 'süt ve gluten'});
  expect(sesliKomutCoz('alerjenlerim neler')).toEqual({tur: 'alerjenler'});
  expect(sesliKomutCoz('alerjenlerimi sil')).toEqual({tur: 'alerjenSil'});
  expect(sesliKomutCoz('içindekileri oku')).toEqual({tur: 'kamera', mod: 'icindekiler'});
  expect(sesliKomutCoz('barkod oku')).toEqual({tur: 'kamera', mod: 'barkod'});
  expect(sesliKomutCoz('adımımı ölç')).toEqual({tur: 'adimOlc'});
  expect(sesliKomutCoz('adımlarım değişti')).toEqual({tur: 'adimOlc'});
  expect(sesliKomutCoz('adım ayarım ne')).toEqual({tur: 'adimAyari'});
});
