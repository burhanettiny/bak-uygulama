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

export function kodYonu(kod: Kutu, onizleme: {width: number; height: number}): string {
  const cx = (kod.x + kod.width / 2) / onizleme.width;
  const cy = (kod.y + kod.height / 2) / onizleme.height;
  const boy = Math.max(kod.width / onizleme.width, kod.height / onizleme.height);
  if (boy > BUYUK) return 'Kod çok yakın, telefonu biraz uzaklaştırın.';

  const yonler: string[] = [];
  if (cx < KENAR) yonler.push('sola');
  else if (cx > 1 - KENAR) yonler.push('sağa');
  if (cy < KENAR) yonler.push('yukarı');
  else if (cy > 1 - KENAR) yonler.push('aşağı');
  if (yonler.length) return `Kod görünüyor. Telefonu biraz ${yonler.join(' ve ')} çevirin.`;
  return boy < KUCUK ? 'Kod ortada. Telefonu yavaşça yaklaştırın.' : 'Kod ortada, sabit tutun.';
}
