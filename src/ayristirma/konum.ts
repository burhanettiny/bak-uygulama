import {KonumBilgisi} from '../tipler';
import {kelimelereAyir} from '../yazi';

// Kısa anahtarlar (≤3 harf) kelimeyle birebir eşleşmeli; uzunlar kelime başında
// eşleşir ("peynirli", "sütlü" gibi Türkçe ekleri yakalamak için).
// Sıra önemli: "meyve suyu" sebzeden önce içecek olarak yakalanmalı.
export const REYONLAR: {anahtarlar: string[]; konum: KonumBilgisi}[] = [
  {anahtarlar: ['suyu', 'su', 'kola', 'gazoz', 'soda', 'çay', 'kahve', 'içecek', 'ayran', 'water', 'waters', 'juice', 'juices', 'coffee', 'coffees', 'tea', 'teas', 'beverage', 'drink', 'sodas'],
   konum: {bolum:'İçecek', koridor:'5', raf:'3', yonTarifi:'Bu ürün genellikle 5. koridorda, içecek reyonunda bulunur.'}},
  {anahtarlar: ['süt', 'peynir', 'yoğurt', 'tereyağ', 'krema', 'kaymak', 'milk', 'cheese', 'dairies', 'dairy', 'yogurt', 'butter'],
   konum: {bolum:'Süt Ürünleri', koridor:'3', raf:'2', yonTarifi:'Bu ürün genellikle 3. koridorda, süt ürünleri reyonunda bulunur.'}},
  {anahtarlar: ['ekmek', 'unlu', 'pasta', 'bisküvi', 'çikolata', 'kek', 'kraker', 'bread', 'biscuit', 'chocolate', 'cake', 'cakes', 'snack', 'cookie'],
   konum: {bolum:'Fırın & Unlu', koridor:'2', raf:'1', yonTarifi:'Bu ürün genellikle 2. koridorda, unlu mamuller reyonunda bulunur.'}},
  {anahtarlar: ['et', 'kıyma', 'tavuk', 'balık', 'sucuk', 'salam', 'sosis', 'pastırma', 'meat', 'meats', 'chicken', 'fish', 'fishes', 'beef', 'sausage'],
   konum: {bolum:'Et Ürünleri', koridor:'4', raf:'1', yonTarifi:'Bu ürün genellikle 4. koridorda, et ürünleri reyonunda bulunur.'}},
  {anahtarlar: ['meyve', 'sebze', 'salata', 'domates', 'elma', 'muz', 'fruit', 'fruits', 'vegetable', 'tomato', 'tomatoes'],
   konum: {bolum:'Meyve Sebze', koridor:'1', raf:'', yonTarifi:'Bu ürün genellikle 1. koridorda, meyve sebze reyonunda bulunur.'}},
  {anahtarlar: ['deterjan', 'sabun', 'şampuan', 'temizlik', 'krem', 'kozmetik', 'diş', 'detergent', 'shampoo', 'soap', 'cleaning', 'beauty', 'cream', 'lotion', 'toothpaste'],
   konum: {bolum:'Temizlik & Kozmetik', koridor:'6', raf:'2', yonTarifi:'Bu ürün genellikle 6. koridorda, temizlik ve kozmetik reyonunda bulunur.'}},
  {anahtarlar: ['elektronik', 'telefon', 'kablo', 'pil', 'şarj', 'electronic', 'battery', 'batteries', 'cable', 'phone'],
   konum: {bolum:'Elektronik', koridor:'7', raf:'1', yonTarifi:'Bu ürün genellikle 7. koridorda, elektronik reyonunda bulunur.'}},
  {anahtarlar: ['kitap', 'dergi', 'kırtasiye', 'kalem', 'defter', 'book', 'books', 'magazine', 'stationery'],
   konum: {bolum:'Kırtasiye & Kitap', koridor:'8', raf:'1', yonTarifi:'Bu ürün genellikle 8. koridorda, kırtasiye reyonunda bulunur.'}},
];

// Eşleşen en uzun anahtarın uzunluğu (eşleşme yoksa 0). Kısa anahtarlar (≤3 harf) kelimeyle birebir,
// uzunlar kelime başında eşleşir. Çok kelimeli anahtarlar ("ebeveyn banyo") art arda gelen kelimelerle
// eşleşir; uzun anahtar daha belirgin olduğu için birden çok hedef eşleşince öne geçer.
export function eslesenAnahtarUzunlugu(anahtarlar: string[], metin: string): number {
  const kelimeler = kelimelereAyir(metin);
  const tekEslesir = (a: string, k: string) => (a.length <= 3 ? k === a : k.startsWith(a));
  let enUzun = 0;
  for (const a of anahtarlar) {
    const parcalar = kelimelereAyir(a);
    const eslesti = kelimeler.some((_, i) =>
      parcalar.every((p, j) => kelimeler[i + j] !== undefined && tekEslesir(p, kelimeler[i + j])));
    if (parcalar.length && eslesti) enUzun = Math.max(enUzun, a.length);
  }
  return enUzun;
}

export function anahtarEslesir(anahtarlar: string[], metin: string): boolean {
  return eslesenAnahtarUzunlugu(anahtarlar, metin) > 0;
}

export function reyonBul(metin: string): KonumBilgisi | null {
  return REYONLAR.find(r => anahtarEslesir(r.anahtarlar, metin))?.konum || null;
}

export function kategorideKonum(kategori: string, urunAd: string): KonumBilgisi {
  // Önce en belirgin kategori, sonra ürün adı denenir
  return reyonBul(kategori) || reyonBul(urunAd) ||
    {bolum:'Genel Market', koridor:'', raf:'', yonTarifi:'Bu ürünün konumu için market görevlisine danışabilirsiniz.'};
}
