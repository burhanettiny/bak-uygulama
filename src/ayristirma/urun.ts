import {GecmisKaydi, UrunBilgisi} from '../tipler';

// OpenFoodFacts kategori etiketlerinin sonuncusu en belirgin olanıdır
// ("en:plant-based-foods-and-beverages" → ... → "en:orange-juices")
export function kategoriEtiketiSec(etiketler?: string[]): string {
  const son = etiketler?.[etiketler.length - 1] || '';
  return son.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ');
}

export const ALERJEN_ADLARI: Record<string, string> = {
  'gluten': 'gluten', 'milk': 'süt', 'eggs': 'yumurta', 'nuts': 'sert kabuklu yemiş',
  'peanuts': 'yer fıstığı', 'soybeans': 'soya', 'fish': 'balık', 'crustaceans': 'kabuklu deniz ürünü',
  'molluscs': 'yumuşakça', 'celery': 'kereviz', 'mustard': 'hardal', 'sesame-seeds': 'susam',
  'sulphur-dioxide-and-sulphites': 'sülfit', 'lupin': 'acı bakla',
};

export function alerjenleriCevir(etiketler?: string[]): string[] {
  if (!etiketler?.length) return [];
  const sonuc = etiketler
    .map(e => ALERJEN_ADLARI[e.replace(/^[a-z]{2}:/, '')])
    .filter((a): a is string => !!a);
  return Array.from(new Set(sonuc));
}

export function urunSesliMetin(u: UrunBilgisi): string {
  let metin = `${u.marka ? u.marka + ', ' : ''}${u.ad}.`;
  if (u.alerjenler?.length) metin += ` Dikkat, alerjen içerir: ${u.alerjenler.join(', ')}.`;
  if (u.konum?.yonTarifi) metin += ` ${u.konum.yonTarifi}`;
  return metin;
}

export function gecmisSesliMetin(g: GecmisKaydi): string {
  return `${g.marka ? g.marka + ', ' : ''}${g.ad}`;
}
