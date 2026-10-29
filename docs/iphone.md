# BAK iPhone sürümü – TestFlight ile paylaşma

> **Durum (29 Ekim 2026): beklemede.** iPhone kodu ve Codemagic ayarı hazır; Apple Developer hesabı açılınca
> aşağıdaki adımlarla sürdürülür. Son derleme imza adımında durmuştu (bkz. "İmza anahtarı").

iPhone'a APK gibi doğrudan uygulama kurulamaz; Apple yalnızca App Store ve TestFlight'a izin verir. BAK, bir Apple
Developer hesabından (yıllık 99 $) **TestFlight**'a yüklenir. iPhone kullanıcısı App Store'dan ücretsiz **TestFlight**
uygulamasını kurar, paylaşılan **davet bağlantısına** dokunur ve BAK'ı yükler (en çok 10.000 kişi). Mac gerekmez:
uygulama Codemagic'in bulut Mac'inde derlenir.

## Hesap sahibinin (arkadaşınız) yapacakları – yaklaşık 15 dakika

1. **Paket kimliği:** <https://developer.apple.com/account> → Certificates, IDs & Profiles → Identifiers → **+** →
   App IDs → App. Description: `BAK`, Bundle ID (Explicit): `tr.bak`. Ek yetenek seçmeye gerek yok.
   *`tr.bak` başkası tarafından alınmışsa* `tr.bak.app` gibi bir kimlik seçin ve aynı kimliği `codemagic.yaml`
   (`bundle_identifier`) ile `ios/AlisverisAsistani.xcodeproj/project.pbxproj` (`PRODUCT_BUNDLE_IDENTIFIER`) içine yazın.
2. **Uygulama kaydı:** <https://appstoreconnect.apple.com> → Uygulamalar → **+** → Yeni Uygulama. Platform iOS,
   ad `BAK – Sesli Alışveriş ve Yol Tarifi` (ad benzersiz olmalı; doluysa küçük bir değişiklik yapın), birincil dil
   Türkçe, paket kimliği `tr.bak`, SKU `bak`.
   Oluşunca **Uygulama Bilgileri** sayfasındaki **Apple Kimliği**ni (rakamlar) not edin.
3. **API anahtarı:** App Store Connect → Kullanıcılar ve Erişim → **Tümleştirmeler** → App Store Connect API →
   **+**. Ad `Codemagic`, erişim **App Manager**. `.p8` dosyasını indirin (bir kez indirilebilir), **Issuer ID** ve
   **Key ID**'yi not edin. Bu üçünü yalnızca Codemagic'e girin; başka yere yazmayın.

## Sizin yapacaklarınız

1. **Kodu GitHub'a koyun:** `AlisverisAsistani` klasörünü GitHub Desktop ile **özel (private)** bir depo olarak
   yayınlayın (`.gitignore` imza anahtarlarını ve `.p8` dosyalarını dışarıda tutar).
2. **Codemagic:** <https://codemagic.io> → GitHub ile giriş → depoyu ekleyin. Ücretsiz planda ayda 500 dakika Mac
   derlemesi vardır; bir derleme yaklaşık 20–25 dakika sürer.
3. **Anahtarı bağlayın:** Codemagic → Team settings → Integrations → **Developer Portal** → Connect. Ad olarak tam
   `BAK App Store Connect` yazın; Issuer ID, Key ID ve `.p8` dosyasını girin.
4. **İmza anahtarı (bir kez):** Codemagic → uygulama → **Environment variables** → değişken adı
   `CERTIFICATE_PRIVATE_KEY`, değer olarak `C:\Users\qurut\bak-ios-sertifika-anahtari.pem` dosyasının **tüm
   içeriği** (`-----BEGIN RSA PRIVATE KEY-----` satırından sonuna kadar), grup adı `bak_imza`, **Secure** işaretli →
   Add. Derleme bu anahtarla Apple'da dağıtım sertifikasını ve App Store profilini kendisi oluşturur (her derlemede
   aynı sertifika kullanılır). Dosyayı bir yedeğe de koyun; depoya ya da sohbete koymayın.
5. **Apple Kimliği:** `codemagic.yaml` içindeki `APP_STORE_APPLE_ID: 0000000000` satırına 2. adımdaki rakamları yazın
   ve GitHub'a gönderin.
6. **Derleyin:** Codemagic → uygulama → **Start new build** → iş akışı `BAK iPhone → TestFlight`. Bitince derleme
   kendiliğinden TestFlight'a yüklenir (Apple'ın işlemesi 10–30 dakika sürer).

## Paylaşmak

App Store Connect → BAK → **TestFlight**:
- **Harici test** grubu oluşturun (ör. "Görme engelli kullanıcılar"), derlemeyi ekleyin ve **Herkese açık bağlantı**yı
  açın. İlk derleme Apple'ın kısa beta incelemesinden geçer (genellikle 1 gün). Test bilgileri sayfasına gizlilik
  politikası adresini yazın: <https://burhanettiny.github.io/bak-mekanlar/gizlilik.html>.
- Bağlantıyı WhatsApp ya da e-postayla paylaşın. Alan kişi: App Store'dan **TestFlight**'ı kurar → bağlantıya dokunur
  → **Yükle**. TestFlight derlemeleri 90 gün geçerlidir; yeni derleme yükleyince kullanıcılar güncellemeyi alır.
- Hazır olunca aynı hesaptan **App Store'a** da gönderilebilir.

## iPhone sürümünün Android'den farkları

| Özellik | iPhone |
|---|---|
| Sesli komut | Apple konuşma tanıma (Türkçe). Bip, "duyuyorum" titreşimi, "duymadım / anlamadım" ayrımı aynı |
| Adım adım rehber | CoreMotion adımölçeri; adımlar birkaç saniyede bir toplu gelir, rehber aynı çalışır |
| Yön uyarısı | Jiroskop (CoreMotion) |
| Konum gönderme | WhatsApp sohbeti mesajla açılır, **Gönder'e kullanıcı basar** (VoiceOver: sağ alttaki gönder) |
| Canlı konum | Adımlar sesle anlatılır (artı → Konum → Canlı Konumu Paylaş → süre → gönder). **Otomatik yapılamaz**: Apple, bir uygulamanın başka uygulamanın düğmelerine basmasına izin vermez |
| Yardım çağır | iPhone aramadan önce "Ara" onayı ister |
| Ekran okuyucu | VoiceOver (TalkBack yerine); duyurular ve butonlar aynı |
| Geri tuşu | iPhone'da yok; ekranlardaki "Ana menü" düğmesi ve uzun basış |

## Bilinen sınırlar

- iPhone yerel modülleri (`ios/BakYerel/`) Windows'ta derlenemediği için **ilk Codemagic derlemesinde** derleme hatası
  çıkabilir; hata günlüğünü (Artifacts → `xcodebuild_logs`) iletin, düzeltilir.
- Konuşma tanıma ilk kullanımda internet ister; iPhone Ayarlar → Genel → Klavye → Dikte'de Türkçe indirilirse
  internetsiz de çalışır.
