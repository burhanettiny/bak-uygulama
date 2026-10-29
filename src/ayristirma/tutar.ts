// Anahtar kelimeli kalıplar önce: POS ekranında birden fazla sayı olabilir
export const TUTAR_SAYI = '(\\d{1,3}(?:[.,]\\d{3})*[.,]\\d{2}|\\d+[.,]\\d{2})';
export const TUTAR_KALIPLARI = [
  new RegExp(`TOPLAM[:\\s]*(?:₺|TL)?\\s*${TUTAR_SAYI}`, 'i'),
  new RegExp(`TUTAR[:\\s]*(?:₺|TL)?\\s*${TUTAR_SAYI}`, 'i'),
  new RegExp(`TOTAL[:\\s]*(?:₺|TL)?\\s*${TUTAR_SAYI}`, 'i'),
  new RegExp(`₺\\s*${TUTAR_SAYI}`),
  new RegExp(`${TUTAR_SAYI}\\s*(?:TL|₺)`, 'i'),
];

export function tutarBul(metin: string): string | null {
  for (const p of TUTAR_KALIPLARI) {
    const m = metin.match(p);
    if (m) return tutarBicimle(m[1]);
  }
  return null;
}

// "1.234,50", "1,234.50", "12.50" → {lira: 1234, kurus: 50}
export function tutarAyristir(tutar: string): {lira: number; kurus: number} {
  const temiz = tutar.replace(/[^\d.,]/g, '');
  const sonAyrac = Math.max(temiz.lastIndexOf(','), temiz.lastIndexOf('.'));
  if (sonAyrac === -1 || temiz.length - sonAyrac - 1 !== 2) {
    return {lira: parseInt(temiz.replace(/[.,]/g, ''), 10) || 0, kurus: 0};
  }
  return {
    lira:  parseInt(temiz.slice(0, sonAyrac).replace(/[.,]/g, ''), 10) || 0,
    kurus: parseInt(temiz.slice(sonAyrac + 1), 10) || 0,
  };
}

// Türkçe gösterim: 1.234,50
export function tutarBicimle(tutar: string): string {
  const {lira, kurus} = tutarAyristir(tutar);
  const liraYazi = String(lira).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${liraYazi},${String(kurus).padStart(2, '0')}`;
}

export function tutarSesliMetin(tutar: string): string {
  const {lira, kurus} = tutarAyristir(tutar);
  return kurus > 0 ? `${lira} lira ${kurus} kuruş` : `${lira} lira`;
}
