"""BAK logosunu ve Android simgelerini üretir.

Tasarım: lacivert zemin üzerine parlak sarı göz ve göz bebeği, sağında sesli anlatımı simgeleyen iki dalga.
Az görenler için yüksek kontrast; küçük boyutta da seçilsin diye kalın, düz çizgiler.

Çalıştırma (proje kökünden):  python scripts/logo_uret.py
Üretilenler:
  assets/icon.png                         uygulama içi logo (1024)
  android/.../mipmap-*/ic_launcher*.png   eski Android sürümleri için simgeler
  android/.../drawable/ic_launcher_foreground.xml + mipmap-anydpi-v26/*  uyarlanabilir simge (Android 8+)
  docs/play-gorselleri/simge-512.png, one-cikan-1024x500.png             Play Store görselleri
"""

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

KOK = Path(__file__).resolve().parent.parent
RES = KOK / "android" / "app" / "src" / "main" / "res"

ZEMIN = "#0B1F3A"     # lacivert
CIZGI = "#FFD400"     # sarı: lacivert üzerinde ~11:1 kontrast
BEYAZ = "#FFFFFF"

# Geometri, Android'in uyarlanabilir simge tuvali olan 108×108 birimde; içerik merkezdeki 66 birimlik
# güvenli alanda kalır (telefon simgeyi daire ya da yuvarlak kareye kırpsa da kesilmez).
GOZ_SOL, GOZ_SAG, GOZ_Y, GOZ_KONTROL = (26, 54), (64, 54), 54, 21   # kontrol noktası merkezden 21 birim
BEBEK = (45, 54, 7.5)
PARILTI = (47.8, 51.0, 2.1)
DALGA_MERKEZ = (45, 54)
DALGALAR = (29, 37)
DALGA_ACI = 40
KALINLIK = 4.6


def _bezier(p0, p1, p2, adim=400):
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0],
             (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1])
            for t in (i / adim for i in range(adim + 1))]


def icerik_ciz(ciz: ImageDraw.ImageDraw, olcek: float, kaydir=(0.0, 0.0)) -> None:
    """Göz ve dalgaları 108 birimlik tuvalden piksele ölçekleyerek çizer."""
    def p(x, y):
        return (kaydir[0] + x * olcek, kaydir[1] + y * olcek)

    kal = KALINLIK * olcek
    orta = (GOZ_SOL[0] + GOZ_SAG[0]) / 2
    ust = _bezier(GOZ_SOL, (orta, GOZ_Y - GOZ_KONTROL), GOZ_SAG)
    alt = _bezier(GOZ_SAG, (orta, GOZ_Y + GOZ_KONTROL), GOZ_SOL)
    # Kalın eğri, sık aralıklı dairelerle çizilir: Pillow'un kalın çizgi birleşimleri köşeli görünüyor
    for q in ust + alt[1:]:
        x, y = p(*q)
        ciz.ellipse((x - kal / 2, y - kal / 2, x + kal / 2, y + kal / 2), fill=CIZGI)

    bx, by, br = BEBEK
    x, y = p(bx, by)
    ciz.ellipse((x - br * olcek, y - br * olcek, x + br * olcek, y + br * olcek), fill=CIZGI)
    px, py, pr = PARILTI
    x, y = p(px, py)
    ciz.ellipse((x - pr * olcek, y - pr * olcek, x + pr * olcek, y + pr * olcek), fill=ZEMIN)

    mx, my = p(*DALGA_MERKEZ)
    for r in DALGALAR:
        rr = r * olcek
        ciz.arc((mx - rr, my - rr, mx + rr, my + rr), -DALGA_ACI, DALGA_ACI, fill=CIZGI, width=round(kal))
        for aci in (-DALGA_ACI, DALGA_ACI):   # yuvarlak uçlar
            ux = mx + rr * math.cos(math.radians(aci)) - kal / 2 * math.cos(math.radians(aci))
            uy = my + rr * math.sin(math.radians(aci)) - kal / 2 * math.sin(math.radians(aci))
            ciz.ellipse((ux - kal / 2, uy - kal / 2, ux + kal / 2, uy + kal / 2), fill=CIZGI)


def kare_simge(boyut: int, yuvarlak: bool = False, kose: float = 0.0, icerik_olcegi: float = 1.0) -> Image.Image:
    """İçeriği tuvalin ortasına yerleştirir; 4 kat büyük çizip küçülterek kenarları yumuşatır."""
    b = boyut * 4
    resim = Image.new("RGBA", (b, b), (0, 0, 0, 0))
    ciz = ImageDraw.Draw(resim)
    if yuvarlak:
        ciz.ellipse((0, 0, b - 1, b - 1), fill=ZEMIN)
    else:
        ciz.rounded_rectangle((0, 0, b - 1, b - 1), radius=kose * b, fill=ZEMIN)
    olcek = b / 108 * icerik_olcegi
    kaydir = (b - 108 * olcek) / 2
    icerik_ciz(ciz, olcek, (kaydir, kaydir))
    return resim.resize((boyut, boyut), Image.LANCZOS)


def vektor_xml() -> str:
    """Uyarlanabilir simgenin ön katmanı (keskin; her ekran yoğunluğunda net)."""
    orta = (GOZ_SOL[0] + GOZ_SAG[0]) / 2
    goz = (f"M{GOZ_SOL[0]},{GOZ_Y} Q{orta},{GOZ_Y - GOZ_KONTROL} {GOZ_SAG[0]},{GOZ_Y} "
           f"Q{orta},{GOZ_Y + GOZ_KONTROL} {GOZ_SOL[0]},{GOZ_Y} Z")
    bx, by, br = BEBEK
    px, py, pr = PARILTI

    def daire(x, y, r):
        return f"M{x - r:.2f},{y} a{r},{r} 0 1,0 {2 * r:.2f},0 a{r},{r} 0 1,0 {-2 * r:.2f},0"

    dalgalar = []
    for r in DALGALAR:
        a = math.radians(DALGA_ACI)
        x1, y1 = DALGA_MERKEZ[0] + r * math.cos(-a), DALGA_MERKEZ[1] + r * math.sin(-a)
        x2, y2 = DALGA_MERKEZ[0] + r * math.cos(a), DALGA_MERKEZ[1] + r * math.sin(a)
        dalgalar.append(f"M{x1:.2f},{y1:.2f} A{r},{r} 0 0,1 {x2:.2f},{y2:.2f}")
    cizgi = (f'android:strokeColor="{CIZGI}" android:strokeWidth="{KALINLIK}" '
             'android:strokeLineCap="round" android:strokeLineJoin="round"')
    return f"""<?xml version="1.0" encoding="utf-8"?>
<!-- scripts/logo_uret.py ile üretildi; elle değiştirmeyin -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
    <path android:pathData="{goz}" {cizgi} />
    <path android:pathData="{daire(bx, by, br)}" android:fillColor="{CIZGI}" />
    <path android:pathData="{daire(px, py, pr)}" android:fillColor="{ZEMIN}" />
    <path android:pathData="{' '.join(dalgalar)}" {cizgi} />
</vector>
"""


UYARLANABILIR = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
    <monochrome android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
"""


def one_cikan_gorsel() -> Image.Image:
    g, y = 1024, 500
    resim = Image.new("RGB", (g * 2, y * 2), ZEMIN)
    ciz = ImageDraw.Draw(resim)
    icerik_ciz(ciz, olcek=9.0, kaydir=(-60, 500 - 54 * 9.0))
    baslik = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 260)
    alt = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 64)
    ciz.text((880, 250), "BAK", font=baslik, fill=CIZGI)
    ciz.text((890, 590), "Sesli alışveriş ve bina içi", font=alt, fill=BEYAZ)
    ciz.text((890, 670), "yol tarifi asistanı", font=alt, fill=BEYAZ)
    return resim.resize((g, y), Image.LANCZOS)


def main() -> None:
    kare_simge(1024, kose=0.22, icerik_olcegi=1.3).save(KOK / "assets" / "icon.png")

    for klasor, boyut in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
        hedef = RES / f"mipmap-{klasor}"
        kare_simge(boyut, kose=0.2, icerik_olcegi=1.3).save(hedef / "ic_launcher.png")
        kare_simge(boyut, yuvarlak=True, icerik_olcegi=1.3).save(hedef / "ic_launcher_round.png")

    (RES / "drawable" / "ic_launcher_foreground.xml").write_text(vektor_xml(), encoding="utf-8")
    (RES / "mipmap-anydpi-v26").mkdir(exist_ok=True)
    for ad in ("ic_launcher.xml", "ic_launcher_round.xml"):
        (RES / "mipmap-anydpi-v26" / ad).write_text(UYARLANABILIR, encoding="utf-8")
    (RES / "values" / "ic_launcher_background.xml").write_text(
        f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        f'    <color name="ic_launcher_background">{ZEMIN}</color>\n</resources>\n', encoding="utf-8")

    gorseller = KOK / "docs" / "play-gorselleri"
    gorseller.mkdir(parents=True, exist_ok=True)
    kare_simge(512, icerik_olcegi=1.3).convert("RGB").save(gorseller / "simge-512.png")
    one_cikan_gorsel().save(gorseller / "one-cikan-1024x500.png")
    print("tamam")


if __name__ == "__main__":
    main()
