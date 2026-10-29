// "0532 123 45 67", "+90 532 1234567" gibi söylenen ya da yazılan numarayı sadeleştirir; geçersizse null
export function telefonNumarasiCoz(metin: string): string | null {
  // \b Türkçe "ı" harfini kelime harfi saymaz; bu yüzden boşlukla ayrılır
  const arti = /^\s*\+/.test(metin) || /(^|\s)artı(\s|$)/i.test(metin);
  const rakamlar = metin.replace(/\D/g, '');
  if (rakamlar.length < 10 || rakamlar.length > 13) return null;
  return (arti ? '+' : '') + rakamlar;
}

// Numarayı rakam rakam okunur hale getirir: "0 5 3 2 ..." (TTS "beş yüz otuz iki" demesin)
export function numarayiOkunurYap(numara: string): string {
  return numara.replace(/\+/, 'artı ').split('').filter(c => /\d/.test(c)).join(' ');
}
