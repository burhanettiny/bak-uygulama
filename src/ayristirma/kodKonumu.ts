// Kamera bir barkodu ya da QR'ı görüp henüz çözemediğinde (uzak, bulanık, kenarda) kodun önizlemedeki
// konumundan kullanıcıya ne yapacağı söylenir. Konum önizlemeye göredir (ekranın yönü), bu yüzden
// "sola" gerçekten telefonu sola çevirmek demektir: kod soldaysa kamerayı sola çevirince ortaya gelir.

export interface Kutu {
  x: number;
  y: number;
  width: number;
  height: number;
}

const KENAR = 0.33;          // önizlemenin üçte biri: bunun dışındaki kod "kenarda" sayılır
const KUCUK = 0.25;          // kodun önizlemeye oranı bundan küçükse uzaktadır
const BUYUK = 0.85;          // bundan büyükse çok yakındır, odak tutmaz

// ad: kullanıcıya söylenen şey ("Kod", "Etiket", "Barkod")
export function kodYonu(kod: Kutu, onizleme: {width: number; height: number}, ad = 'Kod'): string {
  const cx = (kod.x + kod.width / 2) / onizleme.width;
  const cy = (kod.y + kod.height / 2) / onizleme.height;
  const boy = Math.max(kod.width / onizleme.width, kod.height / onizleme.height);
  if (boy > BUYUK) return `${ad} çok yakın, telefonu biraz uzaklaştırın.`;

  const yonler: string[] = [];
  if (cx < KENAR) yonler.push('sola');
  else if (cx > 1 - KENAR) yonler.push('sağa');
  if (cy < KENAR) yonler.push('yukarı');
  else if (cy > 1 - KENAR) yonler.push('aşağı');
  if (yonler.length) return `${ad} görünüyor. Telefonu biraz ${yonler.join(' ve ')} çevirin.`;
  return boy < KUCUK ? `${ad} ortada. Telefonu yavaşça yaklaştırın.` : `${ad} ortada, sabit tutun.`;
}

// ── Çözülemeyen kodu yazıdan bulmak ──
// Barkod tarayıcısı çözemediği kodu hiç bildirmez; bu yüzden kamera görüntüsü ayrıca yazı tanımadan geçirilir:
//  - BAK etiketinin yazısı ("BAK · Neredeyim? Okutun") bulunursa etiketin yerine göre yön söylenir
//  - ürün barkodunun altındaki rakamlar bulunursa: tam ve doğruysa (EAN sağlama hanesi) barkod o numarayla
//    aranır (çizgiler okunamasa da); eksikse rakamların yerine göre yön söylenir
export interface YaziKutusu {
  text: string;
  frame?: {left: number; top: number; width: number; height: number};
}

export type GorselIpucu = {tur: 'barkod'; deger: string} | {tur: 'yon'; metin: string} | null;

// EAN-13 / EAN-8 / UPC-A sağlama hanesi: yanlış okunmuş rakam dizisi ürün diye aranmasın
export function eanGecerli(rakamlar: string): boolean {
  if (!/^(\d{8}|\d{12}|\d{13})$/.test(rakamlar)) return false;
  const r = rakamlar.split('').map(Number);
  const kontrol = r.pop()!;
  const toplam = r.reverse().reduce((t, d, i) => t + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (toplam % 10)) % 10 === kontrol;
}

const kutu = (f: NonNullable<YaziKutusu['frame']>): Kutu => ({x: f.left, y: f.top, width: f.width, height: f.height});

export function gorselIpucu(kutular: YaziKutusu[], boyut: {width: number; height: number}): GorselIpucu {
  for (const k of kutular) {
    const rakamlar = k.text.replace(/[\s-]/g, '');
    if (/^\d+$/.test(rakamlar) && eanGecerli(rakamlar)) return {tur: 'barkod', deger: rakamlar};
  }
  const etiket = kutular.find(k => k.frame && /\bBAK\b|neredeyim|okutun/i.test(k.text));
  if (etiket?.frame) return {tur: 'yon', metin: kodYonu(kutu(etiket.frame), boyut, 'Etiket')};
  const rakam = kutular.find(k => k.frame && /^[\d\s-]+$/.test(k.text.trim()) && k.text.replace(/\D/g, '').length >= 6);
  if (rakam?.frame) return {tur: 'yon', metin: kodYonu(kutu(rakam.frame), boyut, 'Barkod')};
  return null;
}
