# BAK: Görmeden de, sormadan da yolunu bul

BAK, görme engelli bireyler için geliştirilmiş ücretsiz bir **sesli alışveriş ve bina içi yol tarifi asistanıdır**.
Telefonun kamerası görür, uygulama sesle anlatır ve kullanıcıyı adım adım götürür. Ekrana bakmadan, dokunuş
hareketleri ve sesli komutlarla kullanılır; TalkBack ile uyumludur.

- **Ürün, tarih, para:** barkoddan ürün adı, markası ve alerjenleri; son kullanma tarihi (geçmişse uyarı);
  banknot değeri ve POS cihazındaki tutar. Barkod kameranın kenarında kalırsa telefonu hangi yöne çevireceğini söyler.
- **Bina içi yol tarifi:** girişteki QR etiketi okutulunca binadaki yerler numaralı okunur; kullanıcı numarayı ya da
  adı söyler, uygulama adımları sayarak, her köşede geliş yönüne göre "sağa, sola, düz" diye tarif eder. Yoldaki
  küçük etiketler "neredeyim?" sorusunu cevaplar. Adım uzunluğu yürüdükçe kişiye göre öğrenilir.
- **Acil durum:** "Yardım çağır" kayıtlı yakını arar; "Yerimi gönder" bina, kat ve noktayı (dışarıdaysa harita
  bağlantısını) WhatsApp'tan iletir; canlı konum bir saat boyunca kendiliğinden güncellenir.
- **Gizlilik:** hesap istemez, reklam ve takip içermez. Bilgiler telefonda kalır; okutulan binalar sonra
  internetsiz de çalışır.

## Kurumlar için

Hastane, market, okul, belediye gibi kurumlar kendi BAK etiketlerini ücretsiz
[QR oluşturucu](https://bakmekan.streamlit.app) ile hazırlar; kampüsler OpenStreetMap'ten otomatik kurulur.
Oluşturucu ve yayınlanan bina planları ayrı bir depodadır:
[burhanettiny/bak-mekanlar](https://github.com/burhanettiny/bak-mekanlar).

## Geliştirme

React Native 0.85, TypeScript. Android'de çalışır; iPhone sürümü hazırlanıyor ([docs/iphone.md](docs/iphone.md)).

```sh
npm install          # patch-package yamaları da uygulanır (patches/)
npm test             # otomatik testler
npm run android      # bağlı telefonda ya da emülatörde çalıştırır
```

| Klasör | İçerik |
|---|---|
| `App.tsx` | Ana akış: dokunuş hareketleri, sesli komutlar, kamera, konuşma |
| `src/ekranlar`, `src/bilesenler` | Ekranlar ve bileşenler |
| `src/ayristirma` | Ürün, tarih, para, alerjen, komut ve konum mesajı çözümleme |
| `src/mekan` | Bina planı, yol bulma, sesli tarif, adım kalibrasyonu |
| `src/servisler` | Ürün veritabanı, plan indirme, ses, titreşim, adım sayar |
| `__tests__` | Jest testleri |
| `docs` | Play Store, iPhone ve başvuru belgeleri |

Yayın imzası depoda değildir; `android/app/build.gradle` onu kullanıcının `~/.gradle/gradle.properties`
dosyasından okur.

## Lisans

[MIT](LICENSE) © 2026 Burhanettin Yalçınkaya. Kampüs haritaları
[OpenStreetMap katkıcılarının](https://www.openstreetmap.org/copyright) verisiyle (ODbL) hazırlanır.

İletişim: mailtoburhanettin@gmail.com
