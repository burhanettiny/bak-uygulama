"""BAK tanıtım videoları (Engelsiz Bilişim Ödülleri 2026): kısa (≤20 sn) ve uzun (4–8 dk).

Görüntüler gerçektir: sunum slaytları, uygulamanın öykünücüdeki ekranları, QR oluşturucunun tarayıcı görüntüleri.
Seslendirme Microsoft'un Türkçe sinir ağı sesleriyle (edge-tts): anlatıcı Emel, uygulamanın kendi sesi Ahmet.
Her sahnenin başında görüntüyü anlatan bir betimleme cümlesi okunur (sesli betimleme). Altyazı videoya yazılır ve
ayrıca .srt olarak çıkar (YouTube'a yüklemek için). Sağ altta işaret dili tercümanı için boş alan bırakılır.

Kullanım: python video_uret.py kisa|uzun
"""
import asyncio
import re
import subprocess
import sys
import textwrap
from pathlib import Path

import edge_tts
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

KOK = Path(__file__).parent
SCR = KOK.parent
SLAYT = KOK / "slayt"
EKRAN = Path(r"C:\Users\qurut\AppData\Local\Temp\ekr")
UX = SCR / "ux"
CIKTI = Path(r"C:\Users\qurut\Videos\BAK")
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
G, Y = 1920, 1080
LACIVERT, SARI, KREM = (11, 31, 58), (255, 212, 0), (246, 244, 236)
# İçerik sol üstte; sağ altta tercüman alanı (~ekranın 1/6'sı), içeriğin altında altyazı
ICERIK = (24, 24, 1344, 756)            # x, y, genişlik, yükseklik
TERCUMAN = (1392, 420, 504, 636)
SESLER = {"anlatici": "tr-TR-EmelNeural", "uygulama": "tr-TR-AhmetNeural"}
BOSLUK = 0.45                            # cümleler arası nefes (sn)
YAZI = r"C:\Windows\Fonts\segoeuib.ttf"
YAZI_INCE = r"C:\Windows\Fonts\segoeui.ttf"


def kare_slayt(ad: str) -> Image.Image:
    return Image.open(SLAYT / f"{ad}.png").convert("RGB")


def kare_telefon(dosya: Path, baslik: str, alt: str) -> Image.Image:
    """Telefon ekranı solda (yuvarlak köşeli), sağında başlık ve açıklama; lacivert zemin."""
    k = Image.new("RGB", (G, Y), LACIVERT)
    t = Image.open(dosya).convert("RGB")
    yuk = 1000
    t = t.resize((int(t.width * yuk / t.height), yuk))
    maske = Image.new("L", t.size, 0)
    ImageDraw.Draw(maske).rounded_rectangle((0, 0, *t.size), radius=48, fill=255)
    k.paste(t, (150, 40), maske)
    c = ImageDraw.Draw(k)
    c.text((760, 300), baslik, font=ImageFont.truetype(YAZI, 76), fill=SARI)
    for i, satir in enumerate(textwrap.wrap(alt, 30)):
        c.text((760, 420 + i * 70), satir, font=ImageFont.truetype(YAZI_INCE, 52), fill=KREM)
    return k


def kare_tarayici(dosya: Path, baslik: str) -> Image.Image:
    """QR oluşturucu ekranı: üstte başlık, altında tarayıcı görüntüsü."""
    k = Image.new("RGB", (G, Y), KREM)
    c = ImageDraw.Draw(k)
    c.text((96, 60), baslik, font=ImageFont.truetype(YAZI, 70), fill=LACIVERT)
    t = Image.open(dosya).convert("RGB")
    t = t.crop((0, 0, t.width, min(t.height, int(t.width * 0.62))))
    gen = 1728
    t = t.resize((gen, int(t.height * gen / t.width)))
    t = t.crop((0, 0, gen, min(t.height, Y - 200)))
    k.paste(t, (96, 180))
    c.rectangle((96, 180, 96 + gen - 1, 180 + t.height - 1), outline=(200, 200, 200), width=3)
    return k


def yerlestir(icerik: Image.Image) -> Image.Image:
    """Son kare: içerik sol üstte, altyazı ve tercüman alanı için lacivert çerçeve."""
    k = Image.new("RGB", (G, Y), LACIVERT)
    x, y, w, h = ICERIK
    k.paste(icerik.resize((w, h)), (x, y))
    return k


# ── Senaryolar: her sahne (görseller, [(konuşmacı, metin), …]); ilk cümle sesli betimlemedir ──
def uzun_sahneler():
    T = lambda d, b, a: kare_telefon(EKRAN / d, b, a)   # noqa: E731
    W = lambda d, b: kare_tarayici(UX / d, b)            # noqa: E731
    A, U = "anlatici", "uygulama"
    return [
        ([kare_slayt("kapak")], [
            (A, "Ekranda lacivert zemin üzerinde sarı harflerle BAK yazıyor; yanında ses dalgaları yayan sarı bir göz."),
            (A, "BAK, görme engelli bireyler için geliştirilmiş, ücretsiz bir sesli alışveriş ve yol tarifi asistanıdır."),
            (A, "Telefonun kamerası görür, uygulama sesle anlatır ve kullanıcıyı adım adım götürür.")]),
        ([kare_slayt("sorun")], [
            (A, "Sonraki ekranda görme engelli bir bireyin gündelik engelleri sıralanıyor."),
            (A, "Markette bir ürünün ne olduğu, son kullanma tarihi ya da elindeki paranın değeri çoğu zaman başkasına sorularak öğrenilir."),
            (A, "Hastanede polikliniği, alışveriş merkezinde mağazayı bulmak da öyle. GPS bina içinde çalışmaz, levhalar ise görseldir.")]),
        ([kare_slayt("cozum")], [
            (A, "Ekranda BAK'ın üç temel işlevi yazıyor."),
            (A, "BAK bu sorunlara üç yoldan cevap verir: ürünü ve parayı okur, bina içinde adım adım yol tarif eder ve acil durumda kullanıcıyı yalnız bırakmaz.")]),
        ([T("ana.png", "Ekrana bakmadan", "Dokunuşlar ve sesli komut; büyük, yüksek kontrastlı butonlar"), kare_slayt("kullanim")], [
            (A, "Ekranda uygulamanın ana sayfası görülüyor: siyah zemin, en üstte BAK logosu, altında kırmızı Sesli Komut, lacivert Barkod ve mor Yol Tarifi butonları."),
            (A, "BAK ekrana bakmadan kullanılır. Bir dokunuş susturur ya da son sonucu tekrarlar, iki dokunuş barkod okur, üç dokunuş yol tarifi ister."),
            (A, "Uzun basıp ne istediğinizi söylersiniz. Mikrofon açılırken bip sesi gelir, sesiniz duyulunca telefon kısaca titrer."),
            (A, "Uygulama sizi duyamazsa bunu söyler, duyup anlayamazsa onu da ayrı söyler; böylece kullanıcı neyi düzelteceğini bilir."),
            (A, "TalkBack ve iPhone'da VoiceOver ile uyumludur; ilk açılışta sesli bir eğitimle hareketleri öğretir.")]),
        ([kare_slayt("alisveris"), T("ana_butonlar.png", "Alışverişte", "Barkod, son kullanma tarihi, para, POS tutarı, alışveriş listesi")], [
            (A, "Ekranda alışveriş özellikleri ve uygulamanın tüm butonları görülüyor."),
            (A, "Barkod okutulunca ürünün adı, markası ve alerjenleri söylenir. Barkod kameranın kenarında kalırsa uygulama telefonu hangi yöne çevireceğini söyler."),
            (U, "Kod görünüyor. Telefonu biraz sola çevirin."),
            (A, "Son kullanma tarihini kendisi bulur ve tarih geçmişse uyarır. Banknotun değerini ve kasadaki POS cihazının ekranındaki tutarı da okur."),
            (A, "Alışveriş listesi sesle tutulur; mağazaya girince uygulama listedeki ürünleri en kısa sırayla gezdirir.")]),
        ([kare_slayt("bina")], [
            (A, "Ekranda bina içi yol tarifinin dört adımı var: girişte QR, yerlerin okunması, adım adım rehber ve etiketlerle düzeltme."),
            (A, "Bina girişindeki BAK etiketi okutulunca uygulama binadaki yerleri numaralı okur."),
            (U, "Hoş geldiniz. Burada 8 yer var. Zemin kat: 1, Müdür odası; 2, Öğretmenler odası; 3, Kantin…"),
            (A, "Kullanıcı yerlerin adını bilmek zorunda değildir; numarayı ya da adı söyler. Birden fazla sonuç varsa uygulama seçenekleri sayar."),
            (A, "Ardından adımları sayarak yol tarif eder. Her köşede, kullanıcının geldiği yöne göre sağa mı, sola mı, düz mü gideceğini söyler; merdiveni ve asansörü zamanında bildirir."),
            (A, "Yoldaki küçük etiketlerden biri okutulunca uygulama nerede olunduğunu ve yakındaki yerleri söyler."),
            (U, "Şu an 1. kat koridor başındasınız. Yakınınızda: WC, yaklaşık 8 adım; Kardiyoloji, 14 adım."),
            (A, "Uygulama kullanıcının adım uzunluğunu da yürüdükçe kendisi öğrenir.")]),
        ([kare_slayt("guvenlik")], [
            (A, "Ekranda güvenlik özellikleri yazıyor: kayboldum, yardım çağır ve konum gönderme."),
            (A, "Kaybolan kullanıcı kayboldum der; uygulama nerede olduğunu ve en yakın etiketi nasıl bulacağını anlatır."),
            (A, "Yardım çağır komutu kayıtlı yakını tek komutla arar."),
            (A, "Konumumu gönder ya da yerimi gönder komutu, bulunulan binayı, katı, noktayı ve dışarıdaysa harita bağlantısını seçilen kişiye WhatsApp'tan iletir."),
            (A, "Android'de canlı konum da kullanıcının yerine WhatsApp üzerinden paylaşılır; konum bir saat boyunca kendiliğinden güncellenir.")]),
        ([kare_slayt("kurumlar"), W("z0.png", "Kurumlar için QR oluşturucu"), W("z4.png", "Yerler liste olarak yazılır")], [
            (A, "Ekranda kurumlar için hazırlanan web uygulaması görülüyor: önce ne için QR hazırlandığı soruluyor, sonra yerler bir listeye yazılıyor."),
            (A, "BAK'ın yaygınlaşması kurumlara bağlıdır. Hastane, market, alışveriş merkezi, okul ve belediyeler kendi BAK etiketlerini ücretsiz bir web uygulamasıyla hazırlar."),
            (A, "Kurum görevlisi katları ve birimleri bir liste olarak yazar ya da kurumunun sitesindeki kat planını olduğu gibi yapıştırır.")]),
        ([W("c1.png", "Kontrol: kutuları sürükleyerek"), W("t1.png", "Kampüs: binalar ve içleri"), W("z3.png", "Yazdır: giriş QR'ı ve etiketler")], [
            (A, "Ekranda oluşan düzen iki boyutlu bir çizim olarak görülüyor; ardından kampüs çizimi ve basılmaya hazır QR."),
            (A, "Koridor, merdiven ve asansör kendiliğinden çizilir. Görevli kutuları sürükleyerek yerleştirir, mesafeleri metre olarak girer; uygulama bunları her ziyaretçinin kendi adımına çevirir."),
            (A, "Kampüslerde binalar ekranda kutu kutu eklenir; her binanın içine odaları yazılır."),
            (A, "Son adımda giriş QR'ı ve her noktaya asılacak neredeyim etiketleri tek sayfada basılır."),
            (A, "Kurumun kendi hazırladığı binalar girişte doğrulanmadı diye duyurulur; böylece kullanıcı yanlış yönlendirmeye karşı uyarılır.")]),
        ([kare_slayt("olcutler")], [
            (A, "Ekranda ödülün dört katkı alanı yazıyor."),
            (A, "BAK, ödülün dört katkı alanının dördüne de dokunur: alışverişte bağımsızlıkla toplumsal ve ekonomik hayata katılım, hastane ve belediyede kamu hizmetlerinden yararlanma, okul binasında eğitime erişim, ürün ve tarih bilgisiyle bilgiye erişim.")]),
        ([kare_slayt("gizlilik")], [
            (A, "Ekranda gizlilik ilkeleri sıralanıyor."),
            (A, "Uygulama hesap istemez, reklam ve takip içermez. Bilgiler telefonda kalır; okutulan binalar sonra internetsiz de çalışır.")]),
        ([kare_slayt("yolharitasi")], [
            (A, "Ekranda yol haritası görülüyor."),
            (A, "BAK bugün çalışan bir Android uygulamasıdır; gerçek telefonda sahada denendi ve Google Play'e hazırlanıyor. iPhone sürümü de TestFlight ile paylaşılmaya hazırlanıyor."),
            (A, "Sıradaki adım, görme engelli kullanıcılar ve pilot kurumlarla sahada deneme.")]),
        ([kare_slayt("kapanis")], [
            (A, "Son ekranda BAK logosu, slogan ve web sitesinin adresi var: burhanettiny.github.io/bak-mekanlar."),
            (A, "BAK ile görmeden de, sormadan da yolunu bul. İzlediğiniz için teşekkürler.")]),
    ]


def kisa_sahneler():
    A, U = "anlatici", "uygulama"
    return [
        ([kare_slayt("kapak")], [(A, "BAK: görme engelliler için sesli alışveriş ve yol tarifi asistanı.")]),
        ([kare_telefon(EKRAN / "ana_butonlar.png", "Alışverişte", "Barkod, tarih, para ve POS tutarı sesle")],
         [(A, "Ürünü, tarihi ve parayı sesle okur.")]),
        ([kare_slayt("bina")], [(A, "Bina girişindeki QR'ı okutunca adım adım yol tarif eder.")]),
        ([kare_slayt("kapanis")], [(A, "BAK: görmeden de, sormadan da yolunu bul.")]),
    ]


def calistir(*arg: str) -> str:
    sonuc = subprocess.run([FFMPEG, "-hide_banner", "-y", *arg], capture_output=True, text=True, encoding="utf-8",
                           errors="replace")
    if sonuc.returncode:
        raise SystemExit(sonuc.stderr[-2000:])
    return sonuc.stderr


def sure(dosya: Path) -> float:
    cikti = subprocess.run([FFMPEG, "-hide_banner", "-i", str(dosya)], capture_output=True, text=True,
                           encoding="utf-8", errors="replace").stderr
    s, d, sn = re.search(r"Duration: (\d+):(\d+):([\d.]+)", cikti).groups()
    return int(s) * 3600 + int(d) * 60 + float(sn)


async def seslendir(metin: str, ses: str, dosya: Path) -> None:
    if not dosya.exists():
        await edge_tts.Communicate(metin, ses, rate="-6%" if ses == SESLER["anlatici"] else "+0%").save(str(dosya))


def zaman(sn: float, ass: bool = False) -> str:
    s = int(sn)
    if ass:
        return f"{s // 3600}:{s % 3600 // 60:02d}:{s % 60:02d}.{int((sn - s) * 100):02d}"
    return f"{s // 3600:02d}:{s % 3600 // 60:02d}:{s % 60:02d},{int((sn - s) * 1000):03d}"


def uret(tur: str) -> None:
    global BOSLUK
    sahneler = uzun_sahneler() if tur == "uzun" else kisa_sahneler()
    if tur == "kisa":
        BOSLUK = 0.3   # kısa video en çok 20 sn
    is_ = KOK / f"is-{tur}"
    is_.mkdir(exist_ok=True)
    CIKTI.mkdir(parents=True, exist_ok=True)
    ses_parcalari, altyazilar, klipler = [], [], []
    t = 0.4
    sessiz = is_ / "sessiz.wav"
    calistir("-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", str(BOSLUK), str(sessiz))
    bas_sessiz = is_ / "bas.wav"
    calistir("-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", "0.4", str(bas_sessiz))
    ses_parcalari.append(bas_sessiz)
    for s_no, (gorseller, cumleler) in enumerate(sahneler):
        sahne_bas = t
        for c_no, (kim, metin) in enumerate(cumleler):
            mp3 = is_ / f"s{s_no:02d}-{c_no:02d}-{kim}.mp3"
            asyncio.run(seslendir(metin, SESLER[kim], mp3))
            wav = mp3.with_suffix(".wav")
            if not wav.exists():
                calistir("-i", str(mp3), "-ar", "24000", "-ac", "1", str(wav))
            d = sure(wav)
            etiket = "[Uygulama sesi] " if kim == "uygulama" else ""
            # Altyazı: en çok iki satır; uzun cümle parçalara bölünür, süre karakter oranında paylaştırılır
            satirlar = textwrap.wrap(etiket + metin, 52)
            parcalar = ["\n".join(satirlar[i:i + 2]) for i in range(0, len(satirlar), 2)]
            toplam = sum(len(p) for p in parcalar)
            p_bas = t
            for p in parcalar:
                p_son = p_bas + d * len(p) / toplam
                altyazilar.append((p_bas, p_son, p))
                p_bas = p_son
            ses_parcalari += [wav, sessiz]
            t += d + BOSLUK
        son_pay = 1.5 if tur == "uzun" else 0.1   # son karede kısa bekleme (kısa video en çok 20 sn)
        sahne_suresi = t - sahne_bas if s_no < len(sahneler) - 1 else t - sahne_bas + son_pay
        if s_no == 0:
            sahne_suresi += 0.4
        for g_no, gorsel in enumerate(gorseller):
            png = is_ / f"k{s_no:02d}-{g_no}.png"
            yerlestir(gorsel).save(png)
            klipler.append((png, sahne_suresi / len(gorseller)))

    # Ses: parçalar art arda
    liste = is_ / "ses.txt"
    liste.write_text("".join(f"file '{p.as_posix()}'\n" for p in ses_parcalari), encoding="utf-8")
    ses = is_ / "ses.wav"
    calistir("-f", "concat", "-safe", "0", "-i", str(liste), "-c", "copy", str(ses))

    # Görüntü: her kare süresi kadar; kısa kararma geçişleri
    gliste = is_ / "goruntu.txt"
    gliste.write_text("".join(f"file '{p.as_posix()}'\nduration {d:.3f}\n" for p, d in klipler) +
                      f"file '{klipler[-1][0].as_posix()}'\n", encoding="utf-8")

    # Altyazı: .srt (YouTube) ve videoya yazılan .ass (içeriğin altında, tercüman alanının solunda)
    srt = CIKTI / f"bak-{tur}-video.srt"
    srt.write_text("\n".join(f"{i + 1}\n{zaman(a)} --> {zaman(b)}\n{m}\n" for i, (a, b, m) in enumerate(altyazilar)),
                   encoding="utf-8")
    sag_bosluk = G - (ICERIK[0] + ICERIK[2])
    ass = is_ / "altyazi.ass"
    ass.write_text(f"""[Script Info]
ScriptType: v4.00+
PlayResX: {G}
PlayResY: {Y}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV
Style: Alt,Segoe UI,40,&H00FFFFFF,&H00000000,&H90000000,1,3,6,0,1,{ICERIK[0] + 8},{sag_bosluk},28

[Events]
Format: Layer, Start, End, Style, Text
""" + "".join(f"Dialogue: 0,{zaman(a, True)},{zaman(b, True)},Alt,{m.replace(chr(10), '\\N')}\n"
              for a, b, m in altyazilar), encoding="utf-8")

    mp4 = CIKTI / f"bak-{tur}-video.mp4"
    ass_yolu = ass.as_posix().replace(":", "\\:")
    calistir("-f", "concat", "-safe", "0", "-i", str(gliste), "-i", str(ses),
             "-vf", f"fps=25,format=yuv420p,subtitles='{ass_yolu}'",
             "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
             "-shortest", "-movflags", "+faststart", str(mp4))
    print(f"{mp4}  süre {sure(mp4):.1f} sn, {len(altyazilar)} altyazı")


if __name__ == "__main__":
    uret(sys.argv[1] if len(sys.argv) > 1 else "kisa")
