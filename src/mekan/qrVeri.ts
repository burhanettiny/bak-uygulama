import {inflateRaw} from 'pako';
import {Mekan} from '../tipler';
import {yerlesimDogrula} from './yerlesim';

// Kurumların BAK QR Oluşturucu ile kendi hazırladığı giriş QR'ı: bina düzeni QR'ın içindedir,
// sunucu ya da internet gerekmez. Biçim: "BAK:VERI:1:" + base45(raw deflate(JSON)).
// base45 (RFC 9285) QR'ın harf-rakam kipine sığar; aynı veri base64'e göre daha küçük bir QR'a basılır.
// Üretici: mekan-deposu/olusturucu/bak_mekan.py (qr_verisi)
//
// Güvenlik: bu düzenler BAK tarafından doğrulanmamıştır. Kimlikleri "q-" ile başlamak zorundadır;
// böylece sahte bir QR, BAK'ın yayınladığı doğrulanmış bir binanın (ör. "ornek-hastane") yerine geçemez.
// Kullanıcıya girişte doğrulanmamış olduğu söylenir.
export const VERI_QR_ONEKI = 'BAK:VERI:1:';
export const KURUM_ONEKI = 'q-';
const EN_BUYUK_JSON = 64 * 1024;

const BASE45 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

export function kurumMekaniMi(id: string): boolean {
  return id.startsWith(KURUM_ONEKI);
}

export function base45Coz(metin: string): Uint8Array {
  const baytlar: number[] = [];
  for (let i = 0; i < metin.length; i += 3) {
    const parca = [...metin.slice(i, i + 3)].map(h => {
      const d = BASE45.indexOf(h);
      if (d < 0) throw new Error('geçersiz karakter');
      return d;
    });
    if (parca.length === 1) throw new Error('eksik veri');
    const n = parca[0] + parca[1] * 45 + (parca.length === 3 ? parca[2] * 45 * 45 : 0);
    if (parca.length === 3) {
      if (n > 0xffff) throw new Error('geçersiz değer');
      baytlar.push(Math.floor(n / 256), n % 256);
    } else {
      if (n > 0xff) throw new Error('geçersiz değer');
      baytlar.push(n);
    }
  }
  return Uint8Array.from(baytlar);
}

// Büyük binalar (yüzlerce mağazalı AVM) tek QR'a sığmaz: kurum düzen dosyasını kendi sitesinde yayınlar,
// QR yalnızca adresi taşır. Biçim: "BAK:URL:https://…". Aynı güvenlik kuralları geçerlidir (bkz. üstteki not).
export const ADRES_QR_ONEKI = 'BAK:URL:';

export function adresQrCoz(deger: string): string | null {
  const d = deger.trim();
  if (!d.startsWith(ADRES_QR_ONEKI)) return null;
  const adres = d.slice(ADRES_QR_ONEKI.length);
  return /^https:\/\/\S+$/i.test(adres) && adres.length <= 500 ? adres : null;
}

export function veriQrCoz(deger: string): Mekan | null {
  const d = deger.trim();
  if (!d.startsWith(VERI_QR_ONEKI)) return null;
  try {
    const json = inflateRaw(base45Coz(d.slice(VERI_QR_ONEKI.length)), {to: 'string'});
    if (json.length > EN_BUYUK_JSON) return null;
    const mekan = yerlesimDogrula(JSON.parse(json));
    return mekan && kurumMekaniMi(mekan.id) ? mekan : null;
  } catch {
    return null;
  }
}
