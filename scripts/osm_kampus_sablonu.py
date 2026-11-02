"""Ardahan Üniversitesi Yenisey Kampüsü şablonu: QR oluşturucunun "haritadan kur" kurulumuyla (osm_kampus.py) aynı
yoldan üretilir; yalnızca arama sözcükleri elle zenginleştirilir ("rektör", "öğrenci işleri", "namaz"…).

Böylece şablon, kurumların kendi kampüsleri için aldığı sonuçla aynıdır: yol ağı ve bina konumları OpenStreetMap'ten,
mesafeler yol boyunca, yolun kıvrımları dönemeç noktası, sağa / sola tarifleri çizimdeki açılardan (uygulama gerçek
rotaya göre yeniden söyler); çizim haritaya oturtulmuştur ve tek giriş QR'ına sığar.

Kullanım: python osm_kampus_sablonu.py kampus_osm.json cikti.json   (Overpass "out geom" verisi; oluşturucunun
test_veri/ardahan-osm.json dosyası da olur)
Harita verisi © OpenStreetMap katkıda bulunanlar (ODbL).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "mekan-deposu" / "olusturucu"))
import osm_kampus as ok  # noqa: E402

AD = "Ardahan Üniversitesi Yenisey Kampüsü"
# Yalnızca adda geçmeyen söyleyişler (ad ve kısa ad zaten anahtardır); tek giriş QR'ına sığması için az ve öz
ANAHTAR = {
    "Rektörlük": ["rektör", "öğrenci işleri"],
    "İnsani Bilimler Fakültesi": ["edebiyat"],
    "İktisadi ve İdari Bilimler Fakültesi": ["işletme"],
    "Âşık Şenlik Kültür Merkezi": ["konferans salonu"],
    "Hoca Ahmet Yesevi Camii": ["namaz", "mescit"],
    "Konukevi": ["misafirhane"],
}
KISA = {"İktisadi ve İdari Bilimler Fakültesi": "İİBF", "Âşık Şenlik Kültür Merkezi": "Kültür Merkezi",
        "Hoca Ahmet Yesevi Camii": "Cami"}

elemanlar = json.load(open(sys.argv[1], encoding="utf-8"))["elements"]
sinir = next(e for e in elemanlar if e.get("tags", {}).get("amenity") == "university")
mekan = ok.kampus_kur(elemanlar, sinir["id"], AD)
for h in mekan["hedefler"]:
    h["anahtarlar"] = list(dict.fromkeys(h["anahtarlar"] + ANAHTAR.get(h["ad"], [])))
    if h["ad"] in KISA:
        h["kisaAd"] = KISA[h["ad"]]
mekan = {"sablonAdi": f"{AD} (OpenStreetMap yol ağından – sahada doğrulayın)", **mekan, "id": "q-sablon"}
json.dump(mekan, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(mekan["noktalar"]), "nokta", len(mekan["baglantilar"]), "yol", len(mekan["hedefler"]), "hedef")
