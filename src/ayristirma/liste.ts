import {ListeKomutu, ListeOgesi} from '../tipler';
import {harfSadelestir, kelimelereAyir, kucukHarf} from '../yazi';

// "süt ve ekmek", "listeme yumurta ekle", "sütü sil", "listeyi temizle"
export function listeKomutuCoz(metin: string): ListeKomutu {
  const k = kucukHarf(metin).trim().replace(/[.!?]+$/, '');
  if (/^(listeyi\s+)?(temizle|boşalt)|^hepsini\s+sil/.test(k)) return {tur: 'temizle'};
  const sil = k.match(/^(.+?)\s+(sil|çıkar|kaldır)$/) || k.match(/^(?:sil|çıkar|kaldır)\s+(.+)$/);
  if (sil) return {tur: 'sil', oge: sil[1].replace(/^(listeden|listemden)\s+/, '')};
  const ogeler = k
    .replace(/^(listeme|listeye)\s+/, '')
    .replace(/\s+(ekle|ekleyin|al)$/, '')
    .split(/\s*,\s*|\s+ve\s+|\s+bir de\s+/)
    .map(s => s.trim())
    .filter(Boolean);
  return {tur: 'ekle', ogeler};
}

// Türkçe ekler ve ünsüz yumuşaması için kelimenin son harfi esnek bırakılır:
// "ekmek" → "ekme" → "ekmeği" eşleşir, "süt" → "sütü" eşleşir
export function kok(kelime: string): string {
  return kelime.length > 4 ? kelime.slice(0, -1) : kelime;
}

export function listeyleEslesir(ogeAdi: string, metin: string): boolean {
  const kelimeler = kelimelereAyir(harfSadelestir(metin));
  const ogeKelimeleri = kelimelereAyir(harfSadelestir(ogeAdi)).filter(w => w.length >= 3);
  if (!ogeKelimeleri.length) return false;
  return ogeKelimeleri.every(ow => kelimeler.some(k => k.startsWith(kok(ow))));
}

export function listeSesliMetin(liste: ListeOgesi[]): string {
  if (!liste.length) return 'Alışveriş listeniz boş. Ürün eklemek için iki kez dokunup ürün adını söyleyin.';
  const kalan  = liste.filter(o => !o.alindi).map(o => o.ad);
  const alinan = liste.filter(o => o.alindi).map(o => o.ad);
  let metin = kalan.length
    ? `Listede ${kalan.length} ürün kaldı: ${kalan.join(', ')}.`
    : 'Listedeki tüm ürünler alındı.';
  if (alinan.length) metin += ` Alınanlar: ${alinan.join(', ')}.`;
  return metin;
}
