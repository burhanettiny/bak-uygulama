import {Platform} from 'react-native';
import {Mod, TaramaModu} from './tipler';

// Ekran okuyucunun adı: Android'de TalkBack, iPhone'da VoiceOver
export const EKRAN_OKUYUCU = Platform.OS === 'ios' ? 'VoiceOver' : 'TalkBack';

export const TITRESIM = {
  barkodOkundu:   [0, 100],
  urunBulundu:    [0, 100, 80, 200],
  urunBulunamadi: [0, 200, 100, 200],
  posBulundu:     [0, 100, 80, 100, 80, 300],
  hata:           [0, 400, 150, 400],
  dokunusOnay:    [0, 60],
  dinliyorum:     [0, 250],       // sesli komutta: şimdi konuşun
  sesDuyuldu:     [0, 40],        // konuşmaya başlayınca: sizi duyuyorum (kısa, konuşmayı bölmez)
};

// Haritadaki adım sayıları standart (yaklaşık 70 cm) adıma göredir. Dikkatli, kısa adımla yürüyen
// kullanıcıda aynı mesafe daha çok adım tutar; sayılar bu çarpanla büyütülür.
export const ADIM_BOYLARI = [
  {ad: 'kısa',   carpan: 1.4},
  {ad: 'normal', carpan: 1},
  {ad: 'uzun',   carpan: 0.8},
];

export const KONUSMA_HIZLARI = [
  {ad: 'Yavaş',     deger: 0.35},
  {ad: 'Normal',    deger: 0.5},
  {ad: 'Hızlı',     deger: 0.65},
  {ad: 'Çok hızlı', deger: 0.85},
];

// limit: bu kadar denemede sonuç çıkmazsa "bulunamadı" denir; yarısında ipucu verilir
export const TARAMA: Record<TaramaModu, {aralik: number; limit: number; ipucu: string}> = {
  tarih: {aralik: 1500, limit: 12, ipucu: 'Tarih henüz bulunamadı. Ürünü yavaşça çevirin. Karanlıksa fener için uzun basın.'},
  pos:   {aralik: 2000, limit: 10, ipucu: 'Tutar henüz okunamadı. Telefonu POS ekranına biraz yaklaştırın veya uzaklaştırın.'},
  para:  {aralik: 1500, limit: 12, ipucu: 'Para henüz tanınamadı. Banknotu düz tutun ve telefonu biraz uzaklaştırın.'},
  icindekiler: {aralik: 1800, limit: 14, ipucu: 'İçindekiler henüz bulunamadı. Ambalajı yavaşça çevirin; içindekiler genellikle arka yüzde, küçük yazıyla yazılır. Telefonu bir karış uzakta tutun.'},
};

export function taramaModuMu(m: Mod): m is TaramaModu {
  return m === 'pos' || m === 'tarih' || m === 'para' || m === 'icindekiler';
}

// Hakkında ekranında sesli okunan metinler. "tamami" parçalardan kurulur; tek yerden güncellensin.
const OZELLIKLER = 'Özellikler: Barkod ve QR kod okuma. 4 farklı ürün veritabanı. İnternetsiz çalışan ürün kaydı. ' +
  'Son taranan ürünler listesi. Sesli ürün ve alerjen bilgisi; kendi alerjeninizi kaydederseniz ürün adından önce uyarı; ambalajdan içindekileri okuma. POS ekran tutarı okuma. Otomatik son kullanma tarihi ' +
  'tespiti. Para tanıma. Sesli alışveriş listesi. Sesli komutla kullanım. Ayarlanabilir konuşma hızı. ' +
  'Girişteki QR ile mağaza, hastane, okul ve kurumlarda bina içi sesli yol tarifi; girişte oradaki yerlerin ' +
  'numaralı listesi; birden çok sonuçta seçenek sunma; kat, merdiven ve asansör yönlendirmesi; doktor ve oda arama; ' +
  'adım sayarla adım adım rehber; adım uzunluğunu etiketlerle, vardım deyince ve açık havada GPS ile ölçme; yön sapması uyarısı; kısa anlatım modu; ' +
  'duvardaki etiketi bulmak için etiket arama. Kayboldum komutu; rehberden seçilen acil kişilere konum gönderme ve tek komutla arama. ' +
  'İlk açılışta sesli eğitim. Kamerada fener. Dinlerken bip, sesiniz duyulunca titreşim, arama sürerken tık sesi. ' +
  `${EKRAN_OKUYUCU} uyumlu.`;
const KISAYOLLAR = 'Sesli komut için ekrana uzun basın; yardım derseniz tüm komutlar okunur. Dokunuş kısayolları: ' +
  '1 kez dokun, konuşmayı sustur; sessizken son sonucu ya da durumu dinle. 2 kez dokun, barkod veya QR oku. ' +
  '3 kez dokun, yol tarifi. Son kullanma tarihi, para, POS tutarı ve alışveriş listesi için uzun basıp söyleyin ' +
  'ya da ekrandaki butonları kullanın. Kamera açıkken uzun bas, feneri aç veya kapat.';
const GELISTIRICI = 'Geliştirici: Burhanettin Yalçınkaya. E-posta: mailtoburhanettin at gmail nokta com.';
export const SURUM = '1.0.0';
export const GIZLILIK_ADRESI = 'https://burhanettiny.github.io/bak-mekanlar/gizlilik.html';
const VERSIYON = `Versiyon ${SURUM}. 2026 BAK, tüm hakları saklıdır.`;

export const HAKKINDA_METINLER = {
  ozet:       'BAK. Görme engelliler için sesli alışveriş ve yol tarifi asistanı.',
  ozellikler: OZELLIKLER,
  kisayollar: KISAYOLLAR,
  gelistirici: GELISTIRICI,
  versiyon:   VERSIYON,
  tamami:     `BAK uygulaması hakkında. Görme engelliler için sesli alışveriş ve yol tarifi asistanı. ${OZELLIKLER} ` +
              `${KISAYOLLAR} ${GELISTIRICI} ${VERSIYON}`,
};

// ── İlk açılış eğitimi ───────────────────────────────────
// Her adımda bir hareket istenir; doğru hareket gelince sonraki adıma geçilir.
export type EgitimHareketi = 1 | 2 | 3 | 'uzun';

export const EGITIM_ADIMLARI: {metin: string; beklenen: EgitimHareketi}[] = [
  {metin: 'Merhaba, BAK uygulamasını kısa bir eğitimle tanıyalım. Her adımda sizden bir hareket isteyeceğim. ' +
    'Başlamak için ekrana bir kez dokunun.', beklenen: 1},
  {metin: 'Güzel. Bir dokunuş, uygulama konuşurken susturur; susarken son sonucu tekrar söyler. ' +
    'Şimdi ekrana iki kez hızlıca dokunun.', beklenen: 2},
  {metin: 'Harika. İki dokunuş kamerayı açar; barkod ve QR kodları okur. ' +
    'Şimdi ekrana üç kez hızlıca dokunun.', beklenen: 3},
  {metin: 'Çok iyi. Üç dokunuş, bulunduğunuz binada yol tarifi ister. ' +
    'Şimdi parmağınızı ekranda bir saniye basılı tutun.', beklenen: 'uzun'},
  {metin: 'Uzun basış sesli komut içindir. Bip sesini duyunca ya da titreşimi hissedince ne istediğinizi söyleyin; ' +
    'sesiniz duyulunca telefon kısaca titrer, bitince ikinci bir ses gelir. Örneğin barkod oku, ' +
    'mutfak nerede, sus ya da kayboldum. Bir binada hangi yerler olduğunu bilmiyorsanız neler var deyin. ' +
    'Tüm komutları duymak için uzun basıp yardım deyin. ' +
    'Acil durumda uzun basıp yardım çağır demeniz yeterli. Eğitim bitti. Ana ekrana geçmek için bir kez dokunun.', beklenen: 1},
];

export const EGITIM_TALKBACK =
  `Merhaba, BAK uygulamasına hoş geldiniz. ${EKRAN_OKUYUCU} açık olduğu için ekrandaki butonları kullanabilirsiniz. ` +
  'En üstte Sesli Komut butonu var: dokunun, bip sesinden sonra ne istediğinizi söyleyin, örneğin barkod oku, mutfak nerede ya da kayboldum. ' +
  'Altında Barkod, Yol Tarifi, Son Kullanma Tarihi, Para, POS, Alışveriş Listesi, Son Taranan Ürünler, Ayarlar ve Hakkında butonları var. ' +
  'Acil durumda Sesli Komut butonuna dokunup yardım çağır deyin. Eğitimi bitirmek için Eğitimi Bitir butonuna dokunun.';
