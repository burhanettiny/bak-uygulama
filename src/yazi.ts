export function kucukHarf(metin: string): string {
  try { return metin.toLocaleLowerCase('tr-TR'); } catch { return metin.toLowerCase(); }
}

export function kelimelereAyir(metin: string): string[] {
  return kucukHarf(metin).split(/[\s,.;:!?'"()/&+_-]+/).filter(Boolean);
}

// Banknot ve liste eşleştirmesi için Türkçe harfleri sadeleştirir: "İKİ YÜZ" → "iki yuz"
export function harfSadelestir(metin: string): string {
  return kucukHarf(metin)
    .replace(/\u0307/g, '')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ğ/g, 'g');
}
