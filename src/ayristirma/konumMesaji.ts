import {harfSadelestir, kelimelereAyir} from '../yazi';

// "Konumumu gönder": kullanıcının bulunduğu yer bir yakınına mesajla iletilir.
// Bina içinde GPS çalışmaz; orada asıl bilgi bina, kat ve en son okutulan noktadır. Dışarıda GPS bağlantısı eklenir.

export interface AcilKisi {
  ad: string;
  numara: string;
}

export interface KonumOzeti {
  bina?: string | null;
  kat?: string | null;
  nokta?: string | null;
  hedef?: string | null;
  gps?: {enlem: number; boylam: number; dogruluk: number; zaman: number} | null;
  simdi?: number;
}

export function haritaBaglantisi(enlem: number, boylam: number): string {
  return `https://maps.google.com/?q=${enlem.toFixed(6)},${boylam.toFixed(6)}`;
}

// Mesaj metni; ne bina ne GPS bilgisi varsa null
export function konumMesaji(o: KonumOzeti): string | null {
  const parcalar: string[] = [];
  if (o.bina) {
    const yer = [o.bina, o.kat, o.nokta && `${o.nokta} yakınındayım`].filter(Boolean).join(', ');
    parcalar.push(o.nokta ? `${yer}.` : `${yer} içindeyim.`);
    if (o.hedef) parcalar.push(`${o.hedef} için yoldayım.`);
  }
  if (o.gps) {
    const dakika = Math.round(((o.simdi ?? Date.now()) - o.gps.zaman) / 60000);
    const eski = dakika >= 5 ? `, ${dakika} dakika önceki konum` : '';
    parcalar.push(`Haritada: ${haritaBaglantisi(o.gps.enlem, o.gps.boylam)} ` +
      `(yaklaşık ${Math.max(1, Math.round(o.gps.dogruluk))} m${eski})`);
  }
  return parcalar.length ? `BAK konum bildirimi: ${parcalar.join(' ')}` : null;
}

// WhatsApp numarayı ülke koduyla, başında 0 ya da + olmadan ister; aksi halde "kişi WhatsApp'ta yok" der.
// Rehberdeki yazımlar: "0532 123 45 67", "+90 (532) 123 45 67", "0090 532…", "90 532…", "532 123 45 67",
// "0 (532) 123-45-67" → hepsi "905321234567". Yurt dışı numaralar (+49…, 0049…) ülke koduyla kalır.
export function whatsappNumarasi(numara: string): string {
  let rakamlar = numara.replace(/\D/g, '');
  if (rakamlar.startsWith('00')) rakamlar = rakamlar.slice(2);   // 0090…, 0049…: uluslararası önek
  else if (rakamlar.length === 11 && rakamlar.startsWith('0')) rakamlar = `90${rakamlar.slice(1)}`;
  else if (rakamlar.length === 10 && /^[2-5]/.test(rakamlar)) rakamlar = `90${rakamlar}`;
  // "+90 0532…" gibi araya giren yurt içi 0
  if (rakamlar.length === 13 && rakamlar.startsWith('900')) rakamlar = `90${rakamlar.slice(3)}`;
  return rakamlar;
}

// Söylenen ad ("annemi", "Ayşe'ye") acil kişilerle eşleştirilir. Türkçe ekler değiştiği için sözcüğün
// başı karşılaştırılır: "ayşeye" → "ayş…" → "Ayşe". Birden çok eşleşme olabilir.
export function kisiBul(liste: AcilKisi[], soylenen: string): AcilKisi[] {
  const sozcukler = kelimelereAyir(harfSadelestir(soylenen.replace(/['’]/g, ' '))).filter(w => w.length >= 3);
  if (!sozcukler.length) return [];
  return liste.filter(k => {
    const adSozcukleri = kelimelereAyir(harfSadelestir(k.ad));
    return sozcukler.some(s => {
      const kok = s.slice(0, Math.max(3, s.length - 3));
      return adSozcukleri.some(a => a.startsWith(kok) || s.startsWith(a));
    });
  });
}
