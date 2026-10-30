import {UrunBilgisi} from '../tipler';
import {kategorideKonum} from '../ayristirma/konum';
import {alerjenleriCevir, kategoriEtiketiSec} from '../ayristirma/urun';
import {icindekilerdenAlerjenler} from '../ayristirma/alerjen';
import {kayitOku, kayitYaz} from './kayit';
import {zamanAsimliFetch} from './ag';

// ── API 1: OpenFoodFacts ──────────────────────────────────
export async function openFoodFactsGetir(barkod: string): Promise<UrunBilgisi | null> {
  try {
    const res  = await zamanAsimliFetch(`https://world.openfoodfacts.org/api/v0/product/${barkod}.json`);
    const data = await res.json();
    if (data.status !== 1) return null;
    const p        = data.product;
    const ad       = p.product_name_tr || p.product_name || '';
    if (!ad) return null;
    const kategori = kategoriEtiketiSec(p.categories_tags);
    // Alerjen alanı Türk ürünlerinde çoğu zaman boştur: içindekiler metninde de aranır
    const icindekiler: string = p.ingredients_text_tr || p.ingredients_text || '';
    const alerjenler = Array.from(new Set([...alerjenleriCevir(p.allergens_tags), ...icindekilerdenAlerjenler(icindekiler)]));
    const eserAlerjenler = alerjenleriCevir(p.traces_tags).filter(a => !alerjenler.includes(a));
    return {
      ad, marka: p.brands || '', kategori, konum: kategorideKonum(kategori, ad),
      kaynak: 'Gıda Veritabanı', alerjenler, eserAlerjenler, icindekiler: icindekiler || undefined,
      alerjenBilgisiVar: !!(p.allergens_tags?.length || p.traces_tags?.length || icindekiler),
    };
  } catch { return null; }
}

// ── API 2: UPCitemdb ──────────────────────────────────────
export async function upcItemDbGetir(barkod: string): Promise<UrunBilgisi | null> {
  try {
    const res  = await zamanAsimliFetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${barkod}`,
      {headers: {'Accept': 'application/json'}}
    );
    const data = await res.json();
    if (data.code !== 'OK' || !data.items?.length) return null;
    const item     = data.items[0];
    const ad       = item.title || '';
    if (!ad) return null;
    const kategori = item.category || '';
    return {ad, marka: item.brand || '', kategori, konum: kategorideKonum(kategori, ad), kaynak: 'Genel Ürün Veritabanı'};
  } catch { return null; }
}

// ── API 3: OpenBeautyFacts ────────────────────────────────
export async function openBeautyFactsGetir(barkod: string): Promise<UrunBilgisi | null> {
  try {
    const res  = await zamanAsimliFetch(`https://world.openbeautyfacts.org/api/v0/product/${barkod}.json`);
    const data = await res.json();
    if (data.status !== 1) return null;
    const p  = data.product;
    const ad = p.product_name || '';
    if (!ad) return null;
    const kategori = kategoriEtiketiSec(p.categories_tags) || 'kozmetik';
    return {ad, marka: p.brands || '', kategori, konum: kategorideKonum(kategori, ad), kaynak: 'Kozmetik Veritabanı'};
  } catch { return null; }
}

// ── API 4: Open Products Facts ────────────────────────────
export async function openProductsFactsGetir(barkod: string): Promise<UrunBilgisi | null> {
  try {
    const res  = await zamanAsimliFetch(`https://world.openproductsfacts.org/api/v0/product/${barkod}.json`);
    const data = await res.json();
    if (data.status !== 1) return null;
    const p  = data.product;
    const ad = p.product_name || '';
    if (!ad) return null;
    const kategori = kategoriEtiketiSec(p.categories_tags);
    return {ad, marka: p.brands || '', kategori, konum: kategorideKonum(kategori, ad), kaynak: 'Ürün Veritabanı'};
  } catch { return null; }
}

// ── Ana zincir: hepsi paralel, öncelik sırasına göre ilk sonuç ──
// Öncelikli kaynak bulduğu anda döner; yavaş ya da yanıt vermeyen diğer kaynaklar beklenmez
export function urunBilgisiGetir(barkod: string): Promise<UrunBilgisi | null> {
  const istekler = [
    openFoodFactsGetir(barkod),
    upcItemDbGetir(barkod),
    openBeautyFactsGetir(barkod),
    openProductsFactsGetir(barkod),
  ];
  return new Promise(resolve => {
    const sonuclar: (UrunBilgisi | null | undefined)[] = istekler.map(() => undefined);
    const karar = () => {
      for (const s of sonuclar) {
        if (s === undefined) return;      // daha öncelikli kaynak henüz yanıtlamadı
        if (s !== null) return resolve(s);
      }
      resolve(null);
    };
    istekler.forEach((istek, i) => istek.then(s => { sonuclar[i] = s; karar(); }));
  });
}

// Önce cihazdaki kayıt: hem hızlı hem internetsiz çalışır
export async function urunAra(barkod: string): Promise<UrunBilgisi | null> {
  const kayitli = await kayitOku<UrunBilgisi | null>(`urun:${barkod}`, null);
  if (kayitli) return {...kayitli, kaynak: `${kayitli.kaynak || 'Ürün'} · cihazda kayıtlı`};
  const bilgi = await urunBilgisiGetir(barkod);
  if (bilgi) kayitYaz(`urun:${barkod}`, bilgi);
  return bilgi;
}
