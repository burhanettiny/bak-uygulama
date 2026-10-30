import {GecmisKaydi, UrunBilgisi} from '../tipler';
import {KisiselAlerjen, kisiselEslesmeler} from './alerjen';

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

// Kullanıcının kendi alerjeni varsa uyarı EN BAŞTA söylenir (ürün adından önce): görme engelli kullanıcı
// cümlenin sonunu dinlemeden ürünü sepete koyabilir. Alerjen bilgisi hiç yoksa bu da söylenir: "yok" ile
// "bilinmiyor" aynı şey değildir.
export function urunSesliMetin(u: UrunBilgisi, kisisel: KisiselAlerjen[] = []): string {
  const {icerir, eser} = kisiselEslesmeler(u, kisisel);
  let metin = '';
  if (icerir.length) metin += `Dikkat! Bu üründe sizin alerjeniniz var: ${icerir.join(', ')}. `;
  else if (eser.length) metin += `Dikkat! Bu ürün sizin alerjeninizi eser miktarda içerebilir: ${eser.join(', ')}. `;
  metin += `${u.marka ? u.marka + ', ' : ''}${u.ad}.`;
  if (u.alerjenler?.length) metin += ` Alerjen içerir: ${u.alerjenler.join(', ')}.`;
  if (u.eserAlerjenler?.length) metin += ` Eser miktarda içerebilir: ${u.eserAlerjenler.join(', ')}.`;
  if (!u.alerjenler?.length && !u.eserAlerjenler?.length && kisisel.length && !u.alerjenBilgisiVar) {
    metin += ' Bu ürünün alerjen bilgisi bulunamadı. İçindekileri duymak için uzun basıp içindekileri oku deyin.';
  }
  if (u.konum?.yonTarifi) metin += ` ${u.konum.yonTarifi}`;
  return metin;
}

// Kullanıcının alerjeni üründe var mı (titreşimi güçlü yapmak için)
export function kisiselAlerjenVar(u: UrunBilgisi, kisisel: KisiselAlerjen[]): boolean {
  const {icerir, eser} = kisiselEslesmeler(u, kisisel);
  return icerir.length + eser.length > 0;
}

export function gecmisSesliMetin(g: GecmisKaydi): string {
  return `${g.marka ? g.marka + ', ' : ''}${g.ad}`;
}
