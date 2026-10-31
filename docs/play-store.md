# BAK – Google Play yayın notları

## Dosyalar

| Ne | Nerede |
|---|---|
| Paket adı (Play kimliği, değiştirilemez) | `tr.bak` |
| Play'e yüklenecek paket | `android/app/build/outputs/bundle/release/app-release.aab` (`cd android && ./gradlew bundleRelease`) |
| Yayın anahtarı | `C:\Users\qurut\.bak-imza\bak-yayin.keystore` (şifre aynı klasördeki `OKU-BENI.txt`'de) |
| Gradle'ın anahtarı bulduğu ayar | `C:\Users\qurut\.gradle\gradle.properties` (`BAK_YAYIN_*`) |
| Gizlilik politikası | `mekan-deposu/gizlilik.html` → <https://burhanettiny.github.io/bak-mekanlar/gizlilik.html> |

Her yeni sürümde `android/app/build.gradle` içindeki `versionCode` bir artırılmalı (`versionName` isteğe bağlı).

**Anahtar yedeği:** `.bak-imza` klasörünü iki ayrı yere (USB bellek ve bulut) kopyalayın. Play Console'da
"Play App Signing" açık kalırsa bu anahtar yalnızca *yükleme* anahtarıdır; kaybolursa Google'dan sıfırlanması
istenebilir, ama bu günler sürer.

## Mağaza sayfası

**Uygulama adı (30 karakter):** BAK – Görme Engelli Asistanı

**Kısa açıklama (80 karakter):**
Barkod, para ve tarih okur; hastane, market ve binalarda sesli yol tarif eder.

**Tam açıklama:**

BAK, görme engelliler ve az görenler için sesli bir alışveriş ve bina içi yönlendirme asistanıdır. Ekrana uzun
basıp ne istediğinizi söylemeniz yeterli.

Alışverişte
• Barkod ve QR kod okur; ürünün adını, markasını ve alerjenlerini söyler.
• Son kullanma tarihini kendiliğinden bulur, tarihi geçmişse uyarır.
• Türk lirası banknotları tanır, POS cihazındaki tutarı okur.
• Sesli alışveriş listesi tutar; mağazada listeyi en kısa yoldan gezdirir.

Binalarda
• Girişteki BAK QR kodunu okutunca binadaki yerleri sayar: danışma, vezne, poliklinikler, sınıflar, reyonlar.
• "Kardiyoloji nerede", "Doktor Ayşe Yılmaz", "112 numaralı oda" deyin; kat, merdiven ve asansör dahil adım adım
  yol tarif eder.
• Adımlarınızı sayar, dönüşleri zamanında söyler, yönünüzden saparsanız uyarır. Adım uzunluğunuzu kendisi öğrenir.
• Kayboldum deyince nerede olduğunuzu söyler; "yardım çağır" deyince kayıtlı yakınınızı arar.

Kullanımı kolay
• Bir dokunuş susturur, iki dokunuş barkod okur, üç dokunuş yol tarifi ister, uzun basış sesli komut.
• TalkBack ile tam uyumlu; yüksek kontrastlı, büyük yazılı ekran.
• İlk açılışta sesli eğitim.
• Hesap, reklam ve kullanım takibi yoktur.

Kurumlar için: hastane, okul, market ve kamu binaları kendi BAK QR kodunu ücretsiz oluşturabilir.

**Kategori:** Araçlar · **Etiketler:** Erişilebilirlik, Alışveriş
**İletişim e-postası:** mailtoburhanettin@gmail.com
**Gizlilik politikası:** https://burhanettiny.github.io/bak-mekanlar/gizlilik.html

## Gerekli görseller

- Uygulama simgesi 512×512: `docs/play-gorselleri/simge-512.png`
- Öne çıkan görsel 1024×500: `docs/play-gorselleri/one-cikan-1024x500.png`
- İkisi de `python scripts/logo_uret.py` ile yeniden üretilir (Android simgeleriyle birlikte)
- En az 2 telefon ekran görüntüsü (ana ekran, ürün sonucu, yol tarifi, ayarlar)

## Play Console formları

**Veri güvenliği (Data safety):**
- Veri toplanıyor mu? *Hayır* – uygulama geliştiriciye hiçbir veri göndermez.
- Veri paylaşılıyor mu? Barkod numarası ürün veritabanlarına gönderilir; kişisel veri değildir ve kullanıcıyla
  ilişkilendirilmez. Ses, cihazın konuşma tanıma servisinde işlenir (Android sistemi; uygulama sesi almaz/göndermez).
  Bina haritaları BAK deposundan ya da (büyük binalarda) giriş QR'ında yazan kurum sitesinden indirilir; bu
  isteklerde kullanıcıya ait bilgi gönderilmez.
- Veriler aktarım sırasında şifreli mi? *Evet* (HTTPS).
- Kullanıcı verilerin silinmesini isteyebilir mi? Veriler yalnızca cihazda; uygulamayı silmek hepsini siler.

**İzin gerekçeleri:** kamera (barkod/yazı okuma), mikrofon (sesli komut), fiziksel etkinlik (adım sayma),
telefon araması (kullanıcının kaydettiği yardım numarası ve acil kişiler), konum (yalnızca kullanıcının komutuyla, tek seferlik, ön planda: "konumumu gönder", "adımlarımı ölç" ve açık
alanda "neredeyim"; arka plan konumu yok).

**Veri güvenliği – konum:** Konum geliştiriciye gönderilmez. Kullanıcının isteğiyle, kendi seçtiği kişiye kendi SMS ya
da WhatsApp uygulamasından gönderdiği mesajın içine yazılır. Play formunda "Konum: toplanmıyor" işaretlenebilir;
kullanıcı tarafından başlatılan paylaşım olduğu açıklamaya yazılır. Rehber izni yoktur (Android kişi seçme ekranı).
"Adımlarımı ölç" ve açık alanda "neredeyim" komutlarında konum yalnızca telefonda hesaplamaya girer (adım uzunluğu,
haritadaki en yakın nokta), saklanmaz ve hiçbir yere gönderilmez.

**Veri güvenliği – sağlık bilgisi sayılabilecek alerjenler:** Kullanıcının kaydettiği alerjenler yalnızca cihazda
tutulur, ürün sorgusuna eklenmez; Play formunda "toplanmıyor". Kamera kareleri (içindekiler okuma, kod yönlendirmesi)
yazı tanımadan sonra silinir.

**İçerik derecelendirmesi:** anket "Yardımcı program / araç", şiddet, kumar vb. yok → 3+.

**Hedef kitle:** 13 yaş ve üzeri (çocuklara yönelik değil).

**Erişilebilirlik hizmeti:** BAK, isteğe bağlı bir AccessibilityService içerir (`WhatsappYardimcisi`,
`android:isAccessibilityTool="true"`). Play Console → Uygulama içeriği → "Erişilebilirlik API'si" beyanı doldurulur:
- Amaç: görme engelli kullanıcı "canlı konumumu paylaş" deyince WhatsApp'ta canlı konum paylaşım düğmelerine
  kullanıcının yerine basmak (WhatsApp'ın bu işlem için başka uygulamalara açık bir yolu yok).
- Yalnızca `com.whatsapp` / `com.whatsapp.w4b` paketlerini görür, yalnızca kullanıcının sesli komutuyla çalışır;
  ekran içeriği saklanmaz ya da gönderilmez. Varsayılan kapalı; uygulama açmadan önce sesle ne yapacağını anlatır.
- BAK görme engelliler için tasarlanmış bir erişilebilirlik aracı olduğu için `isAccessibilityTool` beyanı uygundur.
  Play bu beyan için kısa bir video isteyebilir: komut → ayarlarda hizmeti açma → canlı konumun paylaşılması.

## Dahili test (birkaç kişiyle hemen)

Play Koruma uyarısı ve Android'in "kısıtlanmış ayar" engeli olmadan, Play Store'dan kurulum. 12 kişi / 14 gün
kuralı dahili test için geçerli değildir; en fazla 100 test kullanıcısı.

1. Play Console → **Uygulama oluştur**: ad BAK, dil Türkçe, uygulama, ücretsiz.
2. **Test ve yayınla → Test → Dahili test → Test kullanıcıları**: e-posta listesi oluşturun, kişilerin telefonda
   kullandığı Gmail adreslerini ekleyin.
3. **Yeni sürüm oluştur**: Play Uygulama İmzalama'yı kabul edin, `app-release.aab` yükleyin (`cd android &&
   ./gradlew bundleRelease`, çıktı `app/build/outputs/bundle/release/`), **İncele → Yayınla**.
4. Test kullanıcıları sekmesindeki **katılma bağlantısını** kişiye gönderin; telefonundaki Gmail hesabıyla açıp
   "Test kullanıcısı ol" der, Play Store'dan kurar. İlk yayın birkaç saat sürebilir.
5. Console eksik beyan isterse (gizlilik politikası adresi, veri güvenliği, erişilebilirlik API'si, hedef kitle)
   yanıtlar bu dosyanın yukarısında.

Her yeni yüklemede `android/app/build.gradle` içindeki `versionCode` bir artırılmalı (aynı numara reddedilir).
İmza anahtarı (keystore) Play'de "yükleme anahtarı" olur: kaybolursa yeni sürüm yüklenemez, yedekleyin.

## Kişisel geliştirici hesabı kuralı

Kasım 2023'ten sonra açılan kişisel Play geliştirici hesaplarında üretime çıkmadan önce **en az 12 test
kullanıcısıyla 14 gün kapalı test** zorunludur. Kapalı test kanalına `app-release.aab` yüklenip test edenlerin
e-postaları eklenir; 14 gün sonra üretim erişimi istenir. Görme engelliler derneklerinden gönüllü test kullanıcıları
bu adım için de, geri bildirim için de en iyi kaynaktır.
