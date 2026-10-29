import {harfSadelestir} from '../yazi';

// Banknotların üzerinde değer yazıyla da yazar: "YÜZ TÜRK LİRASI" gibi
export const BANKNOT_DEGERLERI = [5, 10, 20, 50, 100, 200, 500];
export const BANKNOT_YAZI: Record<string, number> = {
  'iki yuz': 200, 'bes yuz': 500, 'yirmi': 20, 'elli': 50, 'yuz': 100, 'bes': 5, 'on': 10,
};

export function banknotBul(metin: string): number | null {
  const sade = harfSadelestir(metin);
  // Rakamla yazılmış değerler — banknotun her iki yüzünde de büyük puntoyla bulunur
  const rakamlar = sade.split(/[^\d]+/).map(Number).filter(n => BANKNOT_DEGERLERI.includes(n));

  const m = sade.match(/(iki\s*yuz|bes\s*yuz|yirmi|elli|yuz|bes|on)\s*turk\s*lirasi/);
  if (m) {
    const deger = BANKNOT_YAZI[m[1].replace(/\s+/g, ' ')];
    // OCR "İKİ" kelimesini kaçırırsa 200'ü 100 sanmasın
    if (deger === 100 && rakamlar.includes(200) && !rakamlar.includes(100)) return 200;
    return deger;
  }

  const banknotMu = /lirasi|merkez\s*bankasi|turkiye\s*cumhuriyet/.test(sade);
  if (!banknotMu || !rakamlar.length) return null;
  const sayilar = new Map<number, number>();
  rakamlar.forEach(r => sayilar.set(r, (sayilar.get(r) || 0) + 1));
  return [...sayilar.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
}
