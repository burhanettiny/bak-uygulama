"""OpenStreetMap verisinden kampüs BAK şablonu (ilk örnek: Ardahan Üniversitesi Yenisey Kampüsü).

Yol ağı ve bina konumları OSM'den; mesafeler yol boyunca ölçülür. Adım = metre / 0.7.
Veri: Overpass API ile kampüs alanındaki highway yolları, adlı binalar ve barrier=gate (giriş kapısı), "out geom".
Kullanım: python osm_kampus_sablonu.py kampus_osm.json cikti.json
Harita verisi © OpenStreetMap katkıda bulunanlar (ODbL).
"""
import heapq
import json
import math
import re
import sys
import unicodedata

ADIM_M = 0.7
_TR = str.maketrans("çğıöşüÇĞİÖŞÜâÂîÎ", "cgiosuCGIOSUaAiI")


def kisalt(m):
    s = unicodedata.normalize("NFKD", m.translate(_TR)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


veri = json.load(open(sys.argv[1], encoding="utf-8"))["elements"]
kampus = next(e for e in veri if e.get("tags", {}).get("amenity") == "university")
LAT0 = sum(p["lat"] for p in kampus["geometry"]) / len(kampus["geometry"])
LON0 = sum(p["lon"] for p in kampus["geometry"]) / len(kampus["geometry"])
KX = 111320 * math.cos(math.radians(LAT0))
KY = 110540


def xy(lat, lon):
    return ((lon - LON0) * KX, (lat - LAT0) * KY)


# ── Yol ağı ───────────────────────────────────────────────
konum: dict = {}
komsu: dict = {}
yol_turu: dict = {}
for e in veri:
    t = e.get("tags", {})
    if e["type"] != "way" or "highway" not in t or t["highway"] in ("track",):
        continue
    for nid, g in zip(e["nodes"], e["geometry"]):
        konum[nid] = xy(g["lat"], g["lon"])
    for a, b in zip(e["nodes"], e["nodes"][1:]):
        komsu.setdefault(a, set()).add(b)
        komsu.setdefault(b, set()).add(a)
        yol_turu[frozenset((a, b))] = t["highway"]


def uzaklik(a, b):
    return math.dist(konum[a], konum[b])


# Bina noktasını en yakın yol parçasına bağla (parça bölünür, yeni düğüm eklenir)
sanal = [0]


def yola_bagla(p):
    en = None
    for a in komsu:
        for b in komsu[a]:
            if a > b:
                continue
            ax, ay = konum[a]
            bx, by = konum[b]
            dx, dy = bx - ax, by - ay
            u = max(0, min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / (dx * dx + dy * dy or 1)))
            q = (ax + u * dx, ay + u * dy)
            d = math.dist(p, q)
            if en is None or d < en[0]:
                en = (d, a, b, u, q)
    d, a, b, u, q = en
    if u < 0.05:
        return a, d
    if u > 0.95:
        return b, d
    sanal[0] -= 1
    n = sanal[0]
    konum[n] = q
    tur = yol_turu[frozenset((a, b))]
    komsu[a].discard(b)
    komsu[b].discard(a)
    komsu[n] = {a, b}
    komsu[a].add(n)
    komsu[b].add(n)
    yol_turu[frozenset((a, n))] = yol_turu[frozenset((n, b))] = tur
    return n, d


def merkez(e):
    g = e.get("geometry") or [p for m in e.get("members", []) for p in m.get("geometry", [])]
    pts = [xy(p["lat"], p["lon"]) for p in g]
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))


# ── Binalar (hedefler) ────────────────────────────────────
ATLA = ("Lojman", "Güvenlik Kulübesi")
binalar = []
for e in veri:
    t = e.get("tags", {})
    if "building" in t and t.get("name") and not any(k in t["name"] for k in ATLA):
        binalar.append((t["name"], merkez(e), t))

# ── Giriş: kampüs kapısı ─────────────────────────────────
kapi = next(e for e in veri if e.get("tags", {}).get("barrier") == "gate")
kapi_xy = xy(kapi["lat"], kapi["lon"])
giris = kapi["id"] if kapi["id"] in komsu else yola_bagla(kapi_xy)[0]

bina_dugum = {}
for ad, p, t in binalar:
    n, d = yola_bagla(p)
    bina_dugum[ad] = (n, d, p)


def dijkstra(kaynak):
    uz = {kaynak: 0}
    once = {}
    kuyruk = [(0, kaynak)]
    while kuyruk:
        d, u = heapq.heappop(kuyruk)
        if d > uz[u]:
            continue
        for v in komsu[u]:
            nd = d + uzaklik(u, v)
            if nd < uz.get(v, 1e18):
                uz[v], once[v] = nd, u
                heapq.heappush(kuyruk, (nd, v))
    return uz, once


uz, once = dijkstra(giris)
# Girişten her binaya en kısa yolların birleşimi: bir ağaç
agac_cocuk: dict = {}
for ad, (n, _, _) in bina_dugum.items():
    if n not in uz:
        print("ulaşılamıyor:", ad)
        continue
    v = n
    while v != giris:
        u = once[v]
        agac_cocuk.setdefault(u, set()).add(v)
        v = u

hedef_dugumleri = {n: ad for ad, (n, _, _) in bina_dugum.items()}
anahtar = {giris} | set(hedef_dugumleri) | {u for u, c in agac_cocuk.items() if len(c) >= 2}


def yon(a, b):
    (ax, ay), (bx, by) = konum[a], konum[b]
    return math.degrees(math.atan2(bx - ax, by - ay)) % 360   # kuzeyden saat yönü


def donus(gelis, gidis):
    d = (gidis - gelis + 540) % 360 - 180   # + sağ, - sol
    if abs(d) < 30:
        return "duz", d
    if abs(d) < 60:
        return ("hafif-sag" if d > 0 else "hafif-sol"), d
    if abs(d) < 150:
        return ("sag" if d > 0 else "sol"), d
    return "geri", d


def kivrim_metni(kivrim):
    """['sola', 'sola', 'sağa'] → ['yol iki kez sola', 'sonra sağa kıvrılır']"""
    gruplar = []
    for k in kivrim:
        if gruplar and gruplar[-1][0] == k:
            gruplar[-1][1] += 1
        else:
            gruplar.append([k, 1])
    sayi = {1: "", 2: "iki kez ", 3: "üç kez "}
    parca = [f"{sayi.get(n, f'{n} kez ')}{k}" for k, n in gruplar]
    return [f"yol {' sonra '.join(parca)} kıvrılır"] if parca else []


DONUS_METNI = {"duz": "düz devam edin", "hafif-sag": "hafif sağa yönelin", "hafif-sol": "hafif sola yönelin",
               "sag": "sağa dönün", "sol": "sola dönün", "geri": "geri dönün"}


def kenar_yolu(u, v):
    """Anahtar u'dan ağaçta aşağı, sonraki anahtara kadar giden düğümler."""
    yol = [u, v]
    while yol[-1] not in anahtar:
        yol.append(next(iter(agac_cocuk[yol[-1]])))
    return yol


def kivrimlar(yol):
    """Yol üzerindeki belirgin kıvrımlar (anahtar olmayan ara düğümlerde)."""
    sonuc = []
    birikmis = 0.0
    for i in range(1, len(yol) - 1):
        d = (yon(yol[i], yol[i + 1]) - yon(yol[i - 1], yol[i]) + 540) % 360 - 180
        birikmis += d
        if abs(birikmis) >= 50:
            sonuc.append("sağa" if birikmis > 0 else "sola")
            birikmis = 0
    return sonuc


def taraf(yol, p):
    """Bina, yol boyunca giderken (son parçaya göre) sağda mı solda mı?"""
    a, b = yol[-2], yol[-1]
    (ax, ay), (bx, by) = konum[a], konum[b]
    capraz = (bx - ax) * (p[1] - ay) - (by - ay) * (p[0] - ax)
    return "solunuzda" if capraz > 0 else "sağınızda"


KISA = {"İktisadi ve İdari Bilimler Fakültesi": "İİBF", "Âşık Şenlik Kültür Merkezi": "Kültür Merkezi",
        "İnsani Bilimler Fakültesi": "İnsani Bilimler", "Mühendislik Fakültesi": "Mühendislik",
        "Hoca Ahmet Yesevi Camii": "Cami"}


def alt_hedefler(n):
    """Ağaçta n'den ileride kalan binaların kısa adları (girişe yakından uzağa)."""
    bulunan, yigin = [], [n]
    while yigin:
        u = yigin.pop()
        if u in hedef_dugumleri:
            bulunan.append(u)
        yigin.extend(agac_cocuk.get(u, ()))
    adlar = [KISA.get(hedef_dugumleri[u], hedef_dugumleri[u]) for u in sorted(bulunan, key=lambda u: uz[u])]
    if len(adlar) > 3:
        adlar = adlar[:3] + ["diğerleri"]
    return " ve ".join([", ".join(adlar[:-1]), adlar[-1]]) if len(adlar) > 1 else adlar[0]


# ── Noktalar ──────────────────────────────────────────────
nokta_id = {giris: "giris"}
nokta_ad = {giris: "Kampüs giriş kapısı"}
for n, ad in hedef_dugumleri.items():
    nokta_id[n] = kisalt(KISA.get(ad, ad))   # kısa kimlik: QR'a sığsın
    nokta_ad[n] = f"{ad} önü"
kavsak_no = 0


def kavsak_adi(n):
    global kavsak_no
    if n not in nokta_id:
        kavsak_no += 1
        nokta_id[n] = f"kavsak-{kavsak_no}"
        # Kavşağa en yakın binanın adı akılda kalıcı bir işaret olur
        nokta_ad[n] = f"{kavsak_no}. kavşak"
    return nokta_id[n]


baglantilar = []
gelis_yonu = {giris: None}
on_yol: dict = {}
yan: dict = {}
kaynak_nokta: dict = {}
sira = [giris]
ziyaret = set()
while sira:
    u = sira.pop(0)
    if u in ziyaret:
        continue
    ziyaret.add(u)
    for v in sorted(agac_cocuk.get(u, ()), key=lambda v: uz[v]):
        yol = on_yol.get(u, [u])[:-1] + kenar_yolu(u, v)
        son = yol[-1]
        metre0 = sum(uzaklik(a, b) for a, b in zip(yol, yol[1:]))
        if False:  # yakın kavşaklar ayrı kalır: birleştirilince 'önce düz, sonra sağa' bilgisi kaybolur
            # Çok yakın iki kavşak: ayrı nokta (ve ayrı QR etiketi) yapılmaz, bir sonrakine birlikte bağlanır
            on_yol[son] = yol
            nokta_id[son] = nokta_id.get(u)
            nokta_ad[son] = nokta_ad.get(u)
            gelis_yonu[son] = gelis_yonu[u] if gelis_yonu[u] is not None else yon(yol[-2], yol[-1])
            kaynak_nokta[son] = kaynak_nokta.get(u, u)
            sira.append(son)
            continue
        u0 = kaynak_nokta.get(u, u)
        if son not in hedef_dugumleri:
            kavsak_adi(son)
        metre = sum(uzaklik(a, b) for a, b in zip(yol, yol[1:]))
        turler = [yol_turu[frozenset((a, b))] for a, b in zip(yol, yol[1:])]
        arac = sum(t in ("tertiary", "secondary", "residential", "service") for t in turler) > len(turler) / 2
        gidis = yon(u, v)
        hedef_adi = hedef_dugumleri.get(son)
        yon_adi = hedef_adi or nokta_ad[son]
        hedef_kisa = hedef_adi or alt_hedefler(son)
        if gelis_yonu[u] is None:
            ilk = "Kapıdan kampüse girin, yol boyunca ilerleyin"
        else:
            dn = DONUS_METNI[donus(gelis_yonu[u], gidis)[0]]
            if u0 == giris:
                ilk = f"Kapıdan kampüse girin; hemen sonraki kavşakta {dn}, {hedef_kisa} yönündeki yola girin"
            else:
                yer = "Kavşakta" if nokta_id[u].startswith("kavsak") else f"{nokta_ad[u]}nden"
                ilk = f"{yer} {hedef_kisa} yönündeki yola girin (girişten gelirken {dn})"
        parcalar = [ilk]
        parcalar += kivrim_metni(kivrimlar(yol))
        if hedef_adi:
            yan[hedef_adi] = "yolun " + taraf(yol, bina_dugum[hedef_adi][2]).replace("sağınızda", "sağında").replace("solunuzda", "solunda")
            parcalar.append(f"{hedef_adi} {taraf(yol, bina_dugum[hedef_adi][2])}")
        if gelis_yonu[u] is None:
            parcalar.append("kampüs yolları araç yoludur, yol kenarından yürüyün")
        tarif = ", ".join(parcalar)
        geri_hedef = "Giriş kapısı" if u0 == giris else nokta_ad[u].split(" (")[0]
        geri = f"{geri_hedef} yönüne yürüyün"
        geri_kivrim = [("sola" if k == "sağa" else "sağa") for k in reversed(kivrimlar(yol))]
        if geri_kivrim:
            geri += ", " + ", ".join(kivrim_metni(geri_kivrim))
        baglantilar.append({"a": nokta_id[u], "b": nokta_id[son], "adim": max(1, round(metre / ADIM_M)),
                            "tarif": tarif, "geriTarif": geri})
        gelis_yonu[son] = yon(yol[-2], yol[-1])
        sira.append(son)

# ── Hedefler ──────────────────────────────────────────────
ANAHTAR = {
    "Rektörlük": ["rektörlük", "rektör", "genel sekreterlik", "personel daire", "öğrenci işleri"],
    "Mühendislik Fakültesi": ["mühendislik", "mühendislik fakültesi", "bilgisayar mühendisliği"],
    "İnsani Bilimler Fakültesi": ["insani bilimler", "edebiyat", "fen edebiyat", "tarih", "türk dili"],
    "İktisadi ve İdari Bilimler Fakültesi": ["iktisadi", "idari bilimler", "iibf", "işletme", "iktisat"],
    "Âşık Şenlik Kültür Merkezi": ["kültür merkezi", "aşık şenlik", "konferans salonu", "salon", "tören"],
    "Hoca Ahmet Yesevi Camii": ["cami", "camii", "mescit", "namaz"],
    "Konukevi": ["konukevi", "misafirhane", "otel"],
}
hedefler = []
for ad, (n, d, p) in sorted(bina_dugum.items(), key=lambda kv: uz.get(kv[1][0], 0)):
    h = {"ad": ad, "nokta": nokta_id[n],
         "tarif": f"{ad} {yan[ad]}" + ("." if d < 25 else f", yaklaşık {round(d / 10) * 10} metre içeride.") +
                  " Bina kapısının yerini sorabilirsiniz.",
         "anahtarlar": ANAHTAR.get(ad, [kisalt(ad).replace('-', ' ')])}
    if ad in KISA:
        h["kisaAd"] = KISA[ad]
    hedefler.append(h)

noktalar = list({i: {"id": i, "ad": nokta_ad[n]} for n, i in nokta_id.items()}.values())
plan = {"konum": {nokta_id[n]: [round(konum[n][0] / 8, 1), round(konum[n][1] / 8, 1)] for n in nokta_id},
        # Çizim sayfası için modül türü: binalar "İçini aç" ile odalarıyla doldurulur
        "tur": {i: ("bina" if n in hedef_dugumleri else "kavsak") for n, i in nokta_id.items()},
        # Çizim haritaya oturtulmuş: (0, 0) kampüsün ortası, bir birim 8 m (= olcek adım × 0,7 m). Oluşturucu çizimin
        # arkasında haritayı gösterir; telefondaki uygulama açık havada GPS'ten en yakın noktayı söyler.
        "olcek": round(8 / ADIM_M, 4), "harita": {"enlem": round(LAT0, 6), "boylam": round(LON0, 6)}}
mekan = {
    "sablonAdi": "Ardahan Üniversitesi Yenisey Kampüsü (OpenStreetMap yol ağından – sahada doğrulayın)",
    "id": "q-sablon", "ad": "Ardahan Üniversitesi Yenisey Kampüsü", "tur": "kurum", "surum": 1,
    "giris": "giris", "noktalar": noktalar, "baglantilar": baglantilar, "hedefler": hedefler,
    "plan": plan,
}
json.dump(mekan, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(noktalar), "nokta", len(baglantilar), "yol", len(hedefler), "hedef")
for b in baglantilar:
    print(f"{b['a']} → {b['b']} ({b['adim']} adım): {b['tarif']} | {b['geriTarif']}")
