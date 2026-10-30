import {harfSadelestir} from '../yazi';
import {UrunBilgisi} from '../tipler';

// Alerjen bilgisi Türkiye'deki ürünlerin çoğunda veritabanının "alerjen" alanında yoktur; ama içindekiler metni
// çoğu zaman vardır (ya da ambalajdan okunur). Bu yüzden içindekiler metninde de sözcükle aranır.
// Gruplar, gıda veritabanının alerjen adlarıyla (urun.ts ALERJEN_ADLARI) aynıdır.
export const ALERJEN_SOZLUGU: [grup: string, sozcukler: string[]][] = [
  ['gluten', ['gluten', 'bugday', 'arpa', 'cavdar', 'yulaf', 'irmik', 'bulgur', 'kepek', 'malt']],
  ['süt', ['sut', 'peynir', 'tereyag', 'krema', 'laktoz', 'yogurt', 'kazein', 'peyniralti', 'kefir']],
  ['yumurta', ['yumurta']],
  ['yer fıstığı', ['yer fistigi', 'fistik ezmesi', 'fistik']],
  ['sert kabuklu yemiş', ['findik', 'ceviz', 'badem', 'antep fistigi', 'kaju', 'pikan', 'makadamya', 'kestane']],
  ['soya', ['soya']],
  ['susam', ['susam', 'tahin']],
  ['balık', ['balik', 'hamsi', 'somon', 'ton baligi', 'sardalya']],
  ['kabuklu deniz ürünü', ['karides', 'yengec', 'istakoz']],
  ['yumuşakça', ['midye', 'kalamar', 'ahtapot']],
  ['kereviz', ['kereviz']],
  ['hardal', ['hardal']],
  ['sülfit', ['sulfit', 'sulfur dioksit', 'e220', 'e221', 'e222', 'e223', 'e224', 'e228']],
  ['acı bakla', ['aci bakla', 'lupin']],
];

const kelimeSinirli = (metin: string, soz: string) =>
  new RegExp(`(^|[^a-z0-9])${soz.replace(/ /g, '\\s+')}`).test(metin);

// İçindekiler metninde geçen alerjen grupları
export function icindekilerdenAlerjenler(metin?: string | null): string[] {
  if (!metin) return [];
  const sade = harfSadelestir(metin.toLocaleLowerCase('tr-TR'));
  return ALERJEN_SOZLUGU.filter(([, sozler]) => sozler.some(s => kelimeSinirli(sade, s))).map(([g]) => g);
}

// Kullanıcının kendi alerjeni: söylediği sözcük ("fındık") ve ait olduğu grup ("sert kabuklu yemiş")
export interface KisiselAlerjen {
  ad: string;
  grup: string | null;
}

// "fındık ve süt", "gluten, susam" → kişisel alerjenler. Bilinmeyen sözcük de tutulur (içindekilerde aranır).
export function kisiselAlerjenCoz(soylenen: string): KisiselAlerjen[] {
  const parcalar = soylenen.toLocaleLowerCase('tr-TR').split(/,|\bve\b|\bile\b|\bbir de\b/).map(p => p.trim())
    .map(p => p.replace(/\b(alerjim|alerjen\w*|var|benim|bana|dokunur|yiyemem)\b/g, '').trim())
    .filter(p => p.length >= 3);
  const sonuc: KisiselAlerjen[] = [];
  for (const ad of parcalar) {
    const sade = harfSadelestir(ad);
    const grup = ALERJEN_SOZLUGU.find(([g, sozler]) => harfSadelestir(g) === sade || sozler.some(s => sade.startsWith(s)))?.[0];
    if (!sonuc.some(k => harfSadelestir(k.ad) === sade)) sonuc.push({ad, grup: grup ?? null});
  }
  return sonuc;
}

export function kisiselAlerjenAdi(k: KisiselAlerjen): string {
  return k.grup && harfSadelestir(k.grup) !== harfSadelestir(k.ad) ? `${k.ad} (${k.grup})` : k.ad;
}

// Üründe kullanıcının alerjenlerinden hangileri var: kesin içerenler ve "eser miktarda içerebilir" olanlar
export function kisiselEslesmeler(u: UrunBilgisi, kisisel: KisiselAlerjen[]): {icerir: string[]; eser: string[]} {
  const sade = harfSadelestir((u.icindekiler || '').toLocaleLowerCase('tr-TR'));
  const icerir: string[] = [];
  const eser: string[] = [];
  for (const k of kisisel) {
    const sozcuk = harfSadelestir(k.ad);
    if ((k.grup && u.alerjenler?.includes(k.grup)) || (sade && kelimeSinirli(sade, sozcuk))) icerir.push(k.ad);
    else if (k.grup && u.eserAlerjenler?.includes(k.grup)) eser.push(k.ad);
  }
  return {icerir, eser};
}

// Ambalajdan okunan yazıda "İçindekiler:" bölümü; bulunamazsa null. Sadeleştirme harf sayısını korur: arama
// sadeleştirilmiş metinde yapılır, okunacak kısım aynı konumlardan asıl (Türkçe harfli) metinden alınır.
const BAS = /\b(icindekiler|bilesenler|ingredients)\b\s*[:;.-]?\s*/;
const BITIS = /\b(net miktar|net agirlik|saklama|uretici|uretim yeri|enerji|besin degerleri|son tuketim|tavsiye edilen|parti no|tett)\b/;
export function icindekilerBul(okunan: string): string | null {
  const asil = okunan.replace(/\s+/g, ' ');
  const sade = harfSadelestir(asil);
  const ayni = sade.length === asil.length;
  const m = BAS.exec(sade);
  if (!m) return null;
  const bas = m.index + m[0].length;
  const kalan = sade.slice(bas);
  const son = kalan.search(BITIS);
  const bitis = bas + (son > 0 ? son : Math.min(kalan.length, 600));
  const metin = (ayni ? asil : sade).slice(bas, bitis).trim().replace(/[,;.]+$/, '');
  return metin.length >= 8 ? metin : null;
}
