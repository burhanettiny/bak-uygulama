import {TarihSonuc} from '../tipler';

export const TARIH_SAYI = '(\\d{2}[./-]\\d{2}[./-]\\d{2,4}|\\d{2}[./-]\\d{4})';
// SKT'yi doğrudan belirten etiketler
export const SKT_KALIPLARI = [
  new RegExp(`S\\.?\\s?K\\.?\\s?T\\.?[:\\s]*${TARIH_SAYI}`, 'i'),
  new RegExp(`SON\\s*KUL\\w*\\s*(?:TAR\\w*)?[:\\s]*${TARIH_SAYI}`, 'i'),
  new RegExp(`T\\.?\\s?E\\.?\\s?T\\.?[:\\s]*${TARIH_SAYI}`, 'i'),
  new RegExp(`BEST\\s*BEFORE\\w*[:\\s]*${TARIH_SAYI}`, 'i'),
  new RegExp(`EXP\\w*[:\\s.]*${TARIH_SAYI}`, 'i'),
];
// Üretim tarihi etiketleri — bu tarihler SKT sanılmamalı
export const URETIM_KALIBI = new RegExp(`(?:Ü\\.?\\s?T\\.?|ÜRT\\w*|URT\\w*|ÜRETİM\\w*|PROD\\w*|MFG)[:\\s.]*${TARIH_SAYI}`, 'gi');

export function tarihAyristir(tarihStr: string): Date | null {
  const p = tarihStr.split(/[./-]/).map(s => parseInt(s, 10));
  let gun: number, ay: number, yil: number;
  if (p.length === 2) {
    // AA/YYYY → ayın son günü
    [ay, yil] = p;
    if (ay < 1 || ay > 12) return null;
    return new Date(yil, ay, 0);
  }
  [gun, ay, yil] = p;
  if (yil < 100) yil += 2000;
  if (ay < 1 || ay > 12 || gun < 1 || gun > 31 || yil < 2000 || yil > 2100) return null;
  const tarih = new Date(yil, ay - 1, gun);
  // 31.02 gibi geçersiz tarihleri ele
  if (tarih.getMonth() !== ay - 1) return null;
  return tarih;
}

export function sonKullanmaTarihiBul(metin: string): string | null {
  for (const p of SKT_KALIPLARI) {
    const m = metin.match(p);
    if (m && tarihAyristir(m[1])) return m[1];
  }
  // Etiket yoksa: üretim tarihlerini çıkar, kalanlardan en ileri tarihi seç
  const uretimler = new Set(Array.from(metin.matchAll(URETIM_KALIBI), m => m[1]));
  const adaylar = Array.from(metin.matchAll(new RegExp(TARIH_SAYI, 'g')), m => m[1])
    .filter(t => !uretimler.has(t))
    .map(t => ({t, d: tarihAyristir(t)}))
    .filter((x): x is {t: string; d: Date} => x.d !== null)
    .sort((a, b) => b.d.getTime() - a.d.getTime());
  return adaylar[0]?.t || null;
}

export function tarihDurumHesapla(tarihStr: string): TarihSonuc {
  const tarih = tarihAyristir(tarihStr) || new Date(NaN);
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const gunKaldi = Math.round((tarih.getTime() - bugun.getTime()) / (1000 * 60 * 60 * 24));
  if (gunKaldi === 0) return {
    tarih: tarihStr, durum: 'yakin', gunKaldi,
    mesaj: '⚠️ Son kullanma günü bugün',
    sesliMesaj: 'Dikkat! Bu ürünün son kullanma tarihi bugün.',
  };
  if (gunKaldi < 0) return {
    tarih: tarihStr, durum: 'gecmis', gunKaldi,
    mesaj: `⛔ TARİH GEÇMİŞ! ${Math.abs(gunKaldi)} gün önce`,
    sesliMesaj: `Dikkat! Bu ürünün son kullanma tarihi ${Math.abs(gunKaldi)} gün önce geçmiş!`,
  };
  if (gunKaldi <= 30) return {
    tarih: tarihStr, durum: 'yakin', gunKaldi,
    mesaj: `⚠️ Son ${gunKaldi} gün kaldı`,
    sesliMesaj: `Dikkat! Bu ürünün son kullanma tarihine ${gunKaldi} gün kaldı.`,
  };
  return {
    tarih: tarihStr, durum: 'iyi', gunKaldi,
    mesaj: `✓ ${gunKaldi} gün kaldı`,
    sesliMesaj: `Son kullanma tarihine ${gunKaldi} gün kaldı.`,
  };
}
