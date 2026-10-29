import {BaglantiTuru, Durak, KonumBilgisi, Mekan, MekanHedefi, MekanQr} from '../tipler';
import {anahtarEslesir, eslesenAnahtarUzunlugu} from '../ayristirma/konum';
import {harfSadelestir, kelimelereAyir, kucukHarf} from '../yazi';

// Eski sürümde basılmış tekil QR'lar örnek mağazanın noktalarına karşılık gelir
const ESKI_QR_KODLARI: Record<string, string> = {
  'GIRIS': 'giris', 'REYON-MEYVE': 'k1', 'REYON-EKMEK': 'k2', 'REYON-SUT': 'k3',
  'REYON-ET': 'k4', 'REYON-ICECEK': 'k5', 'REYON-TEMIZLIK': 'k6', 'KASA': 'kasa',
};

// "BAK:MEKAN:<id>" (eski: "BAK:MAGAZA:<id>") → giriş, "BAK:NOKTA:<id>:<nokta>" → bina içi konum
export function qrCoz(deger: string): MekanQr | null {
  const d = deger.trim();
  if (ESKI_QR_KODLARI[d]) return {tur: 'nokta', mekanId: 'ornek-market', noktaId: ESKI_QR_KODLARI[d]};
  const giris = d.match(/^BAK:(?:MEKAN|MAGAZA):([\w-]+)$/i);
  if (giris) return {tur: 'mekan', mekanId: giris[1]};
  const nokta = d.match(/^BAK:NOKTA:([\w-]+):([\w-]+)$/i);
  if (nokta) return {tur: 'nokta', mekanId: nokta[1], noktaId: nokta[2]};
  return null;
}

const DIKEY_GECISLER: BaglantiTuru[] = ['merdiven', 'yuruyen-merdiven', 'asansor'];
const BAGLANTI_TURLERI: BaglantiTuru[] = ['yuru', 'rampa', 'kapi', ...DIKEY_GECISLER];

// İndirilen ya da paketlenen veri kullanılmadan önce doğrulanır. Bozuk veri hiç yüklenmez:
// görme engelli kullanıcıyı yanlış yere yönlendirmektense hiç yönlendirmemek daha güvenli.
export function yerlesimDogrula(veri: unknown): Mekan | null {
  const y = veri as Mekan;
  if (!y || typeof y.id !== 'string' || typeof y.ad !== 'string' ||
      !Array.isArray(y.noktalar) || !Array.isArray(y.baglantilar) || !Array.isArray(y.hedefler)) {
    return null;
  }
  const idler = new Set(y.noktalar.map(n => n.id));
  if (!idler.has(y.giris) || (y.kasa !== undefined && !idler.has(y.kasa))) return null;
  const baglantilarGecerli = y.baglantilar.every(b => {
    const tur = b.tur || 'yuru';
    if (!BAGLANTI_TURLERI.includes(tur) || !idler.has(b.a) || !idler.has(b.b) || !(b.adim > 0)) return false;
    // Dikey geçişlerin tarifi otomatik üretilir; yürüme yollarında iki yön için tarif şart
    return DIKEY_GECISLER.includes(tur) || (!!b.tarif && (b.tekYon || !!b.geriTarif));
  });
  const hedeflerGecerli = y.hedefler.every(h =>
    idler.has(h.nokta) && !!h.ad && Array.isArray(h.anahtarlar) &&
    (h.kisiler === undefined || Array.isArray(h.kisiler)));
  return baglantilarGecerli && hedeflerGecerli ? y : null;
}

// ── Katlar ve adlar ──────────────────────────────────────

export function katAdi(kat: number): string {
  if (kat === 0) return 'zemin kat';
  if (kat === -1) return 'bodrum kat';
  return kat > 0 ? `${kat}. kat` : `eksi ${-kat}. kat`;
}

export function noktaKati(y: Mekan, noktaId: string): number {
  return y.noktalar.find(n => n.id === noktaId)?.kat ?? 0;
}

function cokKatli(y: Mekan): boolean {
  return new Set(y.noktalar.map(n => n.kat ?? 0)).size > 1;
}

export function noktaAdi(y: Mekan, noktaId: string): string {
  return y.noktalar.find(n => n.id === noktaId)?.ad || noktaId;
}

// Çok katlı binada kat da söylenir: "1. kat, asansör önü"
export function noktaTamAdi(y: Mekan, noktaId: string): string {
  return cokKatli(y) ? `${katAdi(noktaKati(y, noktaId))}, ${noktaAdi(y, noktaId)}` : noktaAdi(y, noktaId);
}

export function hedefEtiketi(y: Mekan, h: MekanHedefi, kisi?: string): string {
  return [kisi, h.ad, h.oda && `oda ${h.oda}`, cokKatli(y) && katAdi(noktaKati(y, h.nokta))]
    .filter(Boolean).join(', ');
}

// ── Arama ────────────────────────────────────────────────

// "süt nerede", "Doktor Ayşe Yılmaz'ın odası nerede", "bana şampuan lazım" → "süt", "doktor ayşe yılmaz", "şampuan"
export function aramaMetniTemizle(metin: string): string {
  let s = kucukHarf(metin).replace(/[.!?]+/g, ' ').replace(/\s+/g, ' ').trim();
  const sonEkler = /\s+(nerede|nerde|nerededir|ne tarafta|hangi reyonda|hangi katta|arıyorum|lazım|bul|odası|odasına|odasını|götür|git|nasıl giderim|nasıl gidilir)$/;
  let onceki;
  do {
    onceki = s;
    s = s.replace(sonEkler, '').trim();
  } while (s !== onceki);
  return s
    .replace(/^(nerede|bana|beni|bul)\s+/, '')
    .replace(/['’][a-zçğıöşü]+$/, '') // "yılmaz'ın" → "yılmaz"
    .trim();
}

const UNVANLAR = new Set([
  'dr', 'doktor', 'doktoru', 'doc', 'docent', 'prof', 'profesor', 'uzm', 'uzman', 'op', 'operator',
  'hemsire', 'hoca', 'bey', 'hanim', 'sayin', 'mudur', 'muduru',
]);

function adKelimeleri(metin: string): string[] {
  return kelimelereAyir(harfSadelestir(metin)).filter(w => !UNVANLAR.has(w));
}

// "ayşe yılmaz", "yılmaz", "doktor ayşe" → "Dr. Ayşe Yılmaz" ile eşleşir
function kisiEslesir(sorgu: string, kisi: string): boolean {
  const aranan = adKelimeleri(sorgu);
  if (!aranan.some(w => w.length >= 3)) return false;
  const ad = adKelimeleri(kisi);
  return aranan.every(w => ad.some(k => k.startsWith(w)));
}

export function yolUzunlugu(y: Mekan, a: string, b: string, kacinilacak: BaglantiTuru[] = []): number {
  if (a === b) return 0;
  const rota = rotaBul(y, a, b, kacinilacak) || rotaBul(y, a, b);
  return rota ? rota.reduce((t, x) => t + x.adim, 0) : Infinity;
}

// Listedeki ürünler gibi yalnızca anahtar kelimeyle aranan hedefler
export function anahtarlaHedefBul(y: Mekan, metin: string): MekanHedefi | null {
  return y.hedefler.find(h => anahtarEslesir(h.anahtarlar, metin)) || null;
}

const HARF_ADLARI: Record<string, string> = {a: 'a', be: 'b', ce: 'c', de: 'd', e: 'e', fe: 'f', ge: 'g', he: 'h'};
const SAYI_ADLARI: Record<string, string> = {
  bir: '1', iki: '2', uc: '3', dort: '4', bes: '5', alti: '6', yedi: '7', sekiz: '8', dokuz: '9', on: '10',
  'on bir': '11', 'on iki': '12',
};

// Konuşma tanıma blok kodlarını "B 4", "b4" ya da "be dört" diye yazabilir; hepsi "b4" olur
export function blokKoduBirlestir(metin: string): string {
  return harfSadelestir(metin)
    .replace(/\b(on bir|on iki|bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz|on)\b/g, s => SAYI_ADLARI[s])
    .replace(/\b(a|be|ce|de|e|fe|ge|he)\s+(\d{1,2})\b/g, (_, h, n) => `${HARF_ADLARI[h]}${n}`)
    .replace(/\b([a-h])\s+(\d{1,2})\b/g, '$1$2');
}

export type HedefSonucu =
  | {tur: 'hedef'; hedef: MekanHedefi; kisi?: string}
  // Birden fazla kişi ya da farklı adlı birden fazla yer eşleşti: kullanıcıya seçenek sunulur
  | {tur: 'coklu'; adaylar: {kisi?: string; hedef: MekanHedefi}[]};

// Önce oda numarası, sonra kişi adı, sonra anahtar kelime. Aynı türden birden fazla hedef varsa
// (her katta bir tuvalet gibi) kullanıcıya en yakın olanı seçilir.
export function hedefBul(y: Mekan, metin: string, baslangic: string = y.giris): HedefSonucu | null {
  const numara = metin.match(/\b(\d{1,4}[a-z]?)\b/i)?.[1];
  if (numara) {
    const oda = y.hedefler.find(h => [h.oda, h.no].some(n => n && kucukHarf(n) === kucukHarf(numara)));
    if (oda) return {tur: 'hedef', hedef: oda};
  }

  const kisiler = y.hedefler.flatMap(h =>
    (h.kisiler || []).filter(k => kisiEslesir(metin, k)).map(kisi => ({kisi, hedef: h})));
  if (kisiler.length === 1) return {tur: 'hedef', ...kisiler[0]};
  if (kisiler.length > 1) return {tur: 'coklu', adaylar: kisiler};

  // Puan: eşleşen en uzun anahtar. "ebeveyn banyosu" hem "ebeveyn" hem "banyo" ile eşleşir;
  // daha uzun olan "ebeveyn banyo" anahtarı kazanır. Eşitlikte aynı adlı yerlerden (her kattaki
  // tuvalet) en yakını seçilir; farklı adlı yerler eşitse ("poliklinik") kullanıcıya hangisi olduğu sorulur.
  const blokluMetin = blokKoduBirlestir(metin);
  // Listede okunan kısa ad da anahtar sayılır: kullanıcı duyduğu adı söyler
  const anahtarlari = (h: MekanHedefi) => (h.kisaAd ? [...h.anahtarlar, h.kisaAd] : h.anahtarlar);
  let puanlar = y.hedefler.map(h => Math.max(
    eslesenAnahtarUzunlugu(anahtarlari(h), metin), eslesenAnahtarUzunlugu(anahtarlari(h), blokluMetin)));
  if (!puanlar.some(p => p > 0)) {
    // Adlar ek almış olabilir: "Kardiyoloji Polikliniği" sorulurken "poliklinik" denir; uzun kelimelerin
    // son iki harfi atılarak kökle eşleştirilir
    puanlar = y.hedefler.map(h => eslesenAnahtarUzunlugu(
      kelimelereAyir(h.ad).filter(w => w.length >= 4).map(w => (w.length >= 7 ? w.slice(0, -2) : w)), metin));
  }
  const enIyiPuan = Math.max(...puanlar);
  if (enIyiPuan <= 0) return null;
  const adaylar = y.hedefler.filter((_, i) => puanlar[i] === enIyiPuan);
  const enYakinlar = new Map<string, MekanHedefi>();
  for (const h of adaylar) {
    const ad = harfSadelestir(h.ad);
    const onceki = enYakinlar.get(ad);
    if (!onceki || yolUzunlugu(y, baslangic, h.nokta) < yolUzunlugu(y, baslangic, onceki.nokta)) enYakinlar.set(ad, h);
  }
  const secenekler = [...enYakinlar.values()];
  return secenekler.length === 1
    ? {tur: 'hedef', hedef: secenekler[0]}
    : {tur: 'coklu', adaylar: secenekler.map(hedef => ({hedef}))};
}

// Taranan ürünün bu mağazadaki konumu (genel tahmin yerine mekân verisi)
export function hedefKonumu(y: Mekan, metin: string): KonumBilgisi | null {
  const h = anahtarlaHedefBul(y, metin);
  if (!h) return null;
  return {
    bolum: h.ad, koridor: h.koridor || '', raf: h.raf || '',
    yonTarifi: `Bu mağazada ${h.ad} reyonunda${h.koridor ? `, ${h.koridor}. koridorda` : ''}.`,
  };
}

// ── Rota ─────────────────────────────────────────────────

interface Adim {
  kaynak: string;
  varis: string;
  adim: number;
  tur: BaglantiTuru;
  tarif?: string;
  basamak?: number;
  yon?: number;     // bu yönde yürürken pusula derecesi (bkz. MekanBaglantisi.yon)
  oto?: boolean;
}

// İki yürüme yönü arasındaki dönüş (QR oluşturucudaki donus_metni ile aynı eşikler)
export function donusMetni(gelis: number, gidis: number): string {
  const fark = ((gidis - gelis + 540) % 360) - 180;   // artı: saat yönünde, sağa
  if (Math.abs(fark) < 30) return 'Düz ilerleyin';
  const taraf = fark > 0 ? 'sağa' : 'sola';
  if (Math.abs(fark) < 60) return `Hafif ${taraf} yönelin`;
  if (Math.abs(fark) < 150) return `${taraf === 'sağa' ? 'Sağa' : 'Sola'} dönün`;
  return 'Geri dönün';
}

// En kısa yol (Dijkstra, ağırlık = adım). kacinilacak: kullanıcının istemediği geçişler (ör. merdiven).
export function rotaBul(y: Mekan, baslangic: string, hedef: string, kacinilacak: BaglantiTuru[] = []): Adim[] | null {
  const komsular = new Map<string, Adim[]>();
  const ekle = (adim: Adim) => komsular.set(adim.kaynak, [...(komsular.get(adim.kaynak) || []), adim]);
  for (const b of y.baglantilar) {
    const tur = b.tur || 'yuru';
    if (kacinilacak.includes(tur)) continue;
    // Bozuk ya da eksik yön bilgisi yok sayılır (kayıtlı tarif okunur)
    const yon = typeof b.yon === 'number' && Number.isFinite(b.yon) ? b.yon : undefined;
    ekle({kaynak: b.a, varis: b.b, adim: b.adim, tur, tarif: b.tarif, basamak: b.basamak, yon, oto: b.oto});
    if (b.tekYon) continue;
    if (!DIKEY_GECISLER.includes(tur) && !b.geriTarif) continue;
    ekle({kaynak: b.b, varis: b.a, adim: b.adim, tur, tarif: b.geriTarif, basamak: b.basamak,
      yon: yon === undefined ? undefined : (yon + 180) % 360, oto: b.oto});
  }

  const mesafe = new Map<string, number>([[baslangic, 0]]);
  const onceki = new Map<string, Adim>();
  const bekleyen = new Set([baslangic]);
  while (bekleyen.size) {
    const simdiki = [...bekleyen].reduce((a, b) => (mesafe.get(a)! <= mesafe.get(b)! ? a : b));
    bekleyen.delete(simdiki);
    if (simdiki === hedef) break;
    for (const k of komsular.get(simdiki) || []) {
      const yeni = mesafe.get(simdiki)! + k.adim;
      if (yeni < (mesafe.get(k.varis) ?? Infinity)) {
        mesafe.set(k.varis, yeni);
        onceki.set(k.varis, k);
        bekleyen.add(k.varis);
      }
    }
  }
  if (!mesafe.has(hedef)) return null;
  const rota: Adim[] = [];
  for (let n = hedef; n !== baslangic; n = onceki.get(n)!.kaynak) {
    rota.unshift(onceki.get(n)!);
  }
  return rota;
}

// Tek adımın sesli tarifi. Merdiven ve asansörde yön, kat ve basamak her zaman söylenir.
function adimMetni(y: Mekan, a: Adim, kisa = false): string {
  const katFarki = noktaKati(y, a.varis) - noktaKati(y, a.kaynak);
  const ek = a.tarif ? ` ${a.tarif}` : '';
  // Gelecek zaman: "Varış: X" kullanıcıya daha yürümeden "vardınız" gibi geliyordu
  const varisYeri = noktaTamAdi(y, a.varis);
  const varis = kisa ? '' : ` ${varisYeri.charAt(0).toLocaleUpperCase('tr-TR') + varisYeri.slice(1)} noktasına ulaşacaksınız.`;
  switch (a.tur) {
    case 'merdiven': {
      const yon = katFarki > 0 ? `${katFarki} kat yukarı çıkın` : katFarki < 0 ? `${-katFarki} kat aşağı inin` : 'geçin';
      const basamak = a.basamak ? `, toplam ${a.basamak} basamak` : '';
      return `Dikkat, merdiven. Merdivenle ${yon}${basamak}.${ek}${varis}`;
    }
    case 'yuruyen-merdiven':
      return `Dikkat, yürüyen merdiven. ${katAdi(noktaKati(y, a.varis))} için ${katFarki >= 0 ? 'çıkan' : 'inen'} ` +
        `yürüyen merdivene binin; binerken ve inerken dikkatli olun.${ek}${varis}`;
    case 'asansor':
      return `Asansöre binin ve ${katAdi(noktaKati(y, a.varis))} düğmesine basın.${ek}${varis}`;
    case 'rampa':
      return `Rampa. ${a.tarif}, yaklaşık ${a.adim} adım.${varis}`;
    default:
      return `${a.tarif}, yaklaşık ${a.adim} adım.${varis}`;
  }
}

const KACINMA_NOTU: Partial<Record<BaglantiTuru, string>> = {
  merdiven: 'Merdivensiz yol bulunamadı, tarif merdiven içeriyor.',
};

// Rotanın sesli söylenen bir parçası. Adım sayar yürüme parçalarında geri sayım yapar;
// dikey parçalarda (merdiven, asansör) kullanıcının "devam" demesi beklenir.
export interface RotaParcasi {
  metin: string;
  adim: number;
  dikey: boolean;
  varisAdi: string;
}

// Rotayı parçalara böler. Aynı tarifle art arda giden yürüme adımları birleştirilir:
// "ön koridorda sağa doğru yaklaşık 18 adım". Yol yoksa null.
// Alışmış kullanıcı için kısa anlatım: "Giriş kapısı arkanızdayken, sağınızdaki banyo kapısına yönelin,
// yaklaşık 3 adım. Banyo kapısı noktasına ulaşacaksınız." → "Sağınızdaki banyo kapısına yönelin, 3 adım."
// Merdiven ve asansör uyarıları güvenlik için olduğu gibi kalır.
// (Varış cümlesi kısa modda hiç üretilmez; bkz. adimMetni)
export function kisaAnlatim(metin: string): string {
  const kisa = metin
    .replace(/^(Giriş kapısı|Giriş tarafı|Merdiven) arkanızdayken, /, '')
    .replace(/^Koridorda (ilerleyin|girişe doğru ilerleyin|koridor ayrımına doğru ilerleyin|merdivene doğru ilerleyin); /, '')
    .replace(/yaklaşık (\d+) adım/g, '$1 adım')
    .trim();
  return kisa.charAt(0).toLocaleUpperCase('tr-TR') + kisa.slice(1);
}

// adimCarpani: kullanıcının adımı kayıttaki standart adımdan kısaysa 1'den büyüktür (bkz. ADIM_BOYLARI)
export function rotaParcalari(y: Mekan, baslangic: string, hedefNokta: string, kacinilacak: BaglantiTuru[] = [],
  kisa = false, adimCarpani = 1):
  {parcalar: RotaParcasi[]; not: string} | null {
  let rota = rotaBul(y, baslangic, hedefNokta, kacinilacak);
  let not = '';
  if (!rota && kacinilacak.length) {
    rota = rotaBul(y, baslangic, hedefNokta);
    not = kacinilacak.map(t => KACINMA_NOTU[t]).filter(Boolean).join(' ') + ' ';
  }
  if (!rota) return null;

  // Çizimden üretilmiş tarif, rotada bir önceki yürüyüşün yönüne göre yeniden söylenir: aynı köşede girişten
  // gelene "sola", yan odadan gelene "düz" denir. İlk bölümde (okutulan QR'da duran kullanıcının yönü
  // bilinmez) ve yönü olmayan yollarda kayıtlı tarif kullanılır.
  rota = rota.map((a, i) => {
    const once = rota![i - 1];
    if (!a.oto || a.yon === undefined || !once || once.yon === undefined || DIKEY_GECISLER.includes(a.tur)) return a;
    return {...a, tarif: donusMetni(once.yon, a.yon)};
  });

  const birlesik: Adim[] = [];
  for (const a of rota) {
    const son = birlesik[birlesik.length - 1];
    const ayniYuruyus = son && son.tur === 'yuru' && a.tur === 'yuru' && son.tarif === a.tarif;
    // Birkaç kat art arda: "2 kat yukarı çıkın, toplam 40 basamak" (asansöre her kat için yeniden binilmez)
    const ayniDikey = son && son.tur === a.tur && DIKEY_GECISLER.includes(a.tur);
    if (ayniYuruyus || ayniDikey) {
      son.adim += a.adim;
      son.varis = a.varis;
      if (ayniDikey && son.basamak && a.basamak) son.basamak += a.basamak;
    } else {
      birlesik.push({...a});
    }
  }
  return {
    not,
    parcalar: birlesik.map(b => ({...b, adim: Math.max(1, Math.round(b.adim * adimCarpani))})).map(a => ({
      metin: kisa ? kisaAnlatim(adimMetni(y, a, true)) : adimMetni(y, a),
      adim: a.adim,
      dikey: DIKEY_GECISLER.includes(a.tur),
      varisAdi: noktaTamAdi(y, a.varis),
    })),
  };
}

export function rotaTarifi(y: Mekan, baslangic: string, hedef: MekanHedefi, kacinilacak: BaglantiTuru[] = [],
  kisa = false, adimCarpani = 1): string {
  if (baslangic === hedef.nokta) return `${hedef.ad} burada. ${hedef.tarif}`;
  const rota = rotaParcalari(y, baslangic, hedef.nokta, kacinilacak, kisa, adimCarpani);
  if (!rota) return `${hedef.ad} için yol bulunamadı. Lütfen bir görevliye danışın.`;
  const adimlar = rota.parcalar.map((p, i) => (i === 0 ? p.metin : kucukHarf(p.metin.charAt(0)) + p.metin.slice(1)));
  return `${rota.not}${hedef.ad} için: ${adimlar.join(' Sonra ')} ${hedef.tarif}`;
}

// Bir hedefe yol tarifi üreten fonksiyon. Adım adım rehber açıksa uygulama kendi tarif
// fonksiyonunu verir (yalnızca ilk talimatı söyleyip rehberi başlatan).
export type TarifEt = (baslangic: string, hedef: MekanHedefi) => string;

// Bir noktada okutulan QR için: "Şu an 1. kat, asansör önü noktasındasınız. Burada: Kardiyoloji."
export function noktaAciklamasi(y: Mekan, noktaId: string): string {
  // Girişteki "çıkış" hedefini girişte saymak gereksiz tekrar olur ("Giriştesiniz. Burada: Giriş kapısı.")
  const buradakiler = y.hedefler.filter(h => h.nokta === noktaId && h.nokta !== y.giris).map(h => h.ad);
  const yer = noktaId === y.giris ? 'Giriştesiniz.' : `Şu an ${noktaTamAdi(y, noktaId)} noktasındasınız.`;
  return `${yer}${buradakiler.length ? ` Burada: ${buradakiler.join(', ')}.` : ''}`;
}

// Bölge etiketi ("neredeyim" QR'ı) okutulunca ya da "neredeyim" denince: en yakın yerler, gerçek yürüme mesafesiyle
// ve kullanıcının adım uzunluğuna göre. "Yakınınızda: WC, yaklaşık 8 adım; Kardiyoloji, 14 adım."
// Bulunulan noktadaki yerler ("Burada: …") ve çok uzaktakiler (60 standart adımdan fazla, ~40 m) sayılmaz.
export function yakindakilerMetni(y: Mekan, noktaId: string, adimCarpani = 1, enFazla = 3): string {
  const gorulen = new Set<string>();
  const adaylar: {ad: string; adim: number}[] = [];
  for (const h of y.hedefler) {
    if (h.nokta === noktaId) continue;
    const ad = h.kisaAd || h.ad;
    const anahtar = harfSadelestir(ad);
    if (gorulen.has(anahtar)) continue;
    const adim = yolUzunlugu(y, noktaId, h.nokta);
    if (!Number.isFinite(adim) || adim > 60) continue;
    gorulen.add(anahtar);
    adaylar.push({ad, adim});
  }
  const secilen = adaylar.sort((a, b) => a.adim - b.adim).slice(0, enFazla);
  if (!secilen.length) return '';
  return ` Yakınınızda: ${secilen.map((a, i) =>
    `${a.ad}, ${i === 0 ? 'yaklaşık ' : ''}${Math.max(1, Math.round(a.adim * adimCarpani))} adım`).join('; ')}.`;
}

// ── Alışveriş listesine göre tur ─────────────────────────

// Liste ürünleri hedeflere toplanır, duraklar her seferinde en yakın olana gidilerek sıralanır.
// Mekân haritaları küçük olduğu için bu yaklaşım yeterince kısa bir tur verir.
export function listeRotasi(y: Mekan, baslangic: string, ogeler: string[], kacinilacak: BaglantiTuru[] = []):
  {duraklar: Durak[]; bulunamayanlar: string[]} {
  const gruplar = new Map<MekanHedefi, string[]>();
  const bulunamayanlar: string[] = [];
  for (const oge of ogeler) {
    const h = anahtarlaHedefBul(y, oge);
    if (h) gruplar.set(h, [...(gruplar.get(h) || []), oge]);
    else bulunamayanlar.push(oge);
  }

  const duraklar: Durak[] = [];
  const kalan = [...gruplar.keys()];
  let konum = baslangic;
  while (kalan.length) {
    const uzakliklar = kalan.map(h => yolUzunlugu(y, konum, h.nokta, kacinilacak));
    const enYakin = uzakliklar.indexOf(Math.min(...uzakliklar));
    const [h] = kalan.splice(enYakin, 1);
    if (uzakliklar[enYakin] === Infinity) {
      bulunamayanlar.push(...gruplar.get(h)!);
      continue;
    }
    duraklar.push({hedef: h, ogeler: gruplar.get(h)!});
    konum = h.nokta;
  }
  return {duraklar, bulunamayanlar};
}

export function turOzeti(y: Mekan, baslangic: string, tur: {duraklar: Durak[]; bulunamayanlar: string[]},
  kacinilacak: BaglantiTuru[] = [], tarifEt: TarifEt = (b, h) => rotaTarifi(y, b, h, kacinilacak)): string {
  const {duraklar, bulunamayanlar} = tur;
  const bilinmeyen = bulunamayanlar.length ? ` Burada yeri bilinmeyen: ${bulunamayanlar.join(', ')}.` : '';
  if (!duraklar.length) return `Listenizdeki ürünlerin burada yeri bilinmiyor.${bilinmeyen}`;
  const urunSayisi = duraklar.reduce((t, d) => t + d.ogeler.length, 0);
  const sira = duraklar.map((d, i) => `${i + 1}. ${d.hedef.ad}: ${d.ogeler.join(', ')}.`).join(' ');
  return `Listenizdeki ${urunSayisi} ürün ${duraklar.length} durakta. Sıra: ${sira}${bilinmeyen} ` +
    `İlk durak. ${tarifEt(baslangic, duraklar[0].hedef)}`;
}

// Bir noktada QR okutulunca: o noktadaki duraklar tamamlanır, sıradaki durağın tarifi verilir.
// Bu noktada durak yoksa null döner.
export function varisIsle(y: Mekan, nokta: string, duraklar: Durak[], kacinilacak: BaglantiTuru[] = [],
  tarifEt: TarifEt = (b, h) => rotaTarifi(y, b, h, kacinilacak)):
  {metin: string; kalan: Durak[]} | null {
  const burada = duraklar.filter(d => d.hedef.nokta === nokta);
  if (!burada.length) return null;
  const kalan = duraklar.filter(d => d.hedef.nokta !== nokta);

  let metin = 'Hedefinize ulaştınız. ' + burada.map(d =>
    d.hedef.tarif + (d.ogeler.length ? ` Buradan alınacaklar: ${d.ogeler.join(', ')}.` : '')).join(' ');
  if (kalan.length) {
    metin += ` Sonraki durak. ${tarifEt(nokta, kalan[0].hedef)}`;
  } else if (burada.some(d => d.ogeler.length) && y.kasa && y.kasa !== nokta) {
    const kasa: MekanHedefi = {ad: 'Kasalar', nokta: y.kasa, tarif: 'Kasalara ulaşacaksınız.', anahtarlar: []};
    metin += ` Listedeki tüm duraklar tamamlandı. ${tarifEt(nokta, kasa)}`;
  }
  return {metin, kalan};
}
