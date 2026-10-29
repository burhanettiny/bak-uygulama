# Yapay zekâ araçlarıyla hazırlanan videolar

| Dosya | Süre | Not |
|---|---|---|
| `C:\Users\qurut\Videos\BAK\bak-kisa-video.mp4` | 19,4 sn | Tören videosu (sınır 20 sn) |
| `C:\Users\qurut\Videos\BAK\bak-uzun-video.mp4` | 7 dk 10 sn | Jüri videosu (4–8 dk) |
| `bak-kisa-video.srt`, `bak-uzun-video.srt` | | YouTube'a yüklenecek altyazılar (sesle saniyesi saniyesine eşleşir) |

## Nasıl hazırlandı

- **Görüntüler gerçek:** sunum slaytları, uygulamanın Android öykünücüsündeki ekranları, QR oluşturucunun tarayıcı
  görüntüleri. Yapay zekâyla üretilmiş "kullanıcı" görüntüsü **yoktur**; jüriye gerçek kullanım gibi görünen yapay
  görüntü yanıltıcı olurdu.
- **Seslendirme:** Microsoft'un Türkçe sinir ağı sesleri (edge-tts). Anlatıcı *Emel*; uygulamanın kendi cümleleri
  (ör. "Burada 8 yer var…") ayırt edilsin diye *Ahmet* sesiyle ve altyazıda **[Uygulama sesi]** etiketiyle.
  Anlatım tanıtım dilindedir (üçüncü şahıs); kimse adına konuşulmaz.
- **Sesli betimleme:** her sahne, görüntüyü anlatan bir cümleyle başlar ("Ekranda… görülüyor").
- **Altyazı:** videoya yazılı (açık altyazı) ve ayrıca `.srt`.
- **İşaret dili için yer:** içerik sol üstte, altyazı altında; **sağ alt köşe (504×636 piksel, ekranın ~1/6'sı) Türk
  İşaret Dili tercümanı için boş bırakıldı.**
- Yeniden üretmek için: `scripts/video/` (slaytlar → `slayt_ciz.py`, video → `video_uret.py kisa|uzun`).

## Başvurudan önce eksik kalanlar

1. **Türk İşaret Dili tercümanı (gerekli):** Türkçe işaret dili için güvenilir bir yapay zekâ çevirmeni yoktur.
   Tercüman, videoyu izleyerek (ya da `.srt` metnini okuyarak) düz renkli bir fonun önünde çekilir. Çekim, ücretsiz
   **Clipchamp** (Windows'ta hazır) ya da **CapCut** ile videonun sağ alt köşesine "resim içinde resim" olarak
   yerleştirilir: konum x=1392, y=420; boyut 504×636. Görme engelliler derneği ya da bir üniversitenin engelli
   birimi tercüman bulmada yardımcı olabilir.
2. **Gerçek kullanım görüntüsü (çok önerilir):** Görme engelli bir gönüllünün uygulamayı kendi başına kullandığı
   1–2 dakikalık bir telefon çekimi, uzun videoyu en çok güçlendirecek kanıttır. Çekim gelirse "Bina içi" sahnesinin
   yerine ya da arkasına eklenir. Görüntüdeki kişinin yazılı izni alınmalı.
3. **YouTube:** her iki videoyu **Liste dışı** (ya da Herkese açık) yükleyin; Altyazılar → Dosya yükle →
   **Zamanlamalı** → `.srt`. Bağlantıları oturum açmamış bir tarayıcıda deneyin.
