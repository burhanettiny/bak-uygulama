import {Mekan} from '../tipler';
import {rotaParcalari} from './yerlesim';

// Adım uzunluğu kişiden kişiye değişir. Kullanıcı rehberle yürürken bir nokta QR'ı okutunca
// iki QR arasında sayılan adım, haritadaki (standart adımla ölçülmüş) yol uzunluğuyla karşılaştırılır.
// Böylece "adımlarım kısa" demeden adım çarpanı kendiliğinden öğrenilir.

const EN_AZ_BEKLENEN = 8;     // kısa yollarda bir iki adımlık hata oranı çok bozar
const EN_AZ_SAYILAN = 5;
const OLCUM_ARALIGI: [number, number] = [0.6, 2];   // dışındakiler büyük olasılıkla yol değiştirmektir
export const CARPAN_ARALIGI: [number, number] = [0.7, 1.8];

// Sayılan / beklenen oranı; ölçüm güvenilir değilse null
export function adimOlcumu(y: Mekan, baslangic: string, bitis: string, sayilan: number): number | null {
  if (baslangic === bitis || sayilan < EN_AZ_SAYILAN) return null;
  const rota = rotaParcalari(y, baslangic, bitis);
  // Merdiven ve asansörde adım sayılmaz; o yollar ölçüme katılmaz
  if (!rota || rota.parcalar.some(p => p.dikey)) return null;
  const beklenen = rota.parcalar.reduce((t, p) => t + p.adim, 0);
  if (beklenen < EN_AZ_BEKLENEN) return null;
  const oran = sayilan / beklenen;
  return oran >= OLCUM_ARALIGI[0] && oran <= OLCUM_ARALIGI[1] ? oran : null;
}

// Tek ölçüm yanıltabilir: yeni değer eskisiyle harmanlanır. agirlik: yeni ölçümün payı. Kullanıcı "adımlarım
// değişti" dediğinde (mevsim, ayakkabı, yorgunluk) ya da ölçümler art arda aynı yönde saptığında yeni adıma hızlı
// uyulsun diye büyütülür (HIZLI_AGIRLIK).
export const NORMAL_AGIRLIK = 0.4;
export const HIZLI_AGIRLIK = 0.75;
export const SAPMA_ESIGI = 0.15;   // ölçüm mevcut ayardan bu oranda farklıysa "sapma" sayılır
export function carpaniGuncelle(eski: number, olcum: number, agirlik = NORMAL_AGIRLIK): number {
  const yeni = eski * (1 - agirlik) + olcum * agirlik;
  return Math.round(Math.min(CARPAN_ARALIGI[1], Math.max(CARPAN_ARALIGI[0], yeni)) * 100) / 100;
}

// Ölçüm olmadan iyi bir başlangıç: adım uzunluğu boyun yaklaşık %41,5'idir (yürüme araştırmalarında yaygın
// kullanılan oran). Haritadaki standart adım 70 cm: 160 cm boyda adım ~66 cm → çarpan ~1,05.
const STANDART_ADIM_CM = 70;
export function boydanCarpan(boyCm: number): number | null {
  if (!Number.isFinite(boyCm) || boyCm < 100 || boyCm > 220) return null;
  const carpan = STANDART_ADIM_CM / (boyCm * 0.415);
  return Math.round(Math.min(CARPAN_ARALIGI[1], Math.max(CARPAN_ARALIGI[0], carpan)) * 100) / 100;
}

export function adimUzunluguCm(carpan: number): number {
  return Math.round(STANDART_ADIM_CM / carpan);
}

const ONLAR: Record<string, number> = {on: 10, yirmi: 20, otuz: 30, kirk: 40, elli: 50, altmis: 60, yetmis: 70,
  seksen: 80, doksan: 90};
const BIRLER: Record<string, number> = {bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9};

// "boyum 170", "1.70", "1 70", "bir yetmiş", "yüz yetmiş beş", "1 metre 65" → santim. Metin sadeleştirilmiş olmalı.
export function boyCoz(metin: string): number | null {
  const s = metin.replace(/\b(boyum|boy|uzunlugum|santim|santimetre|cm|metre|m)\b/g, ' ').trim();
  const nokta = s.match(/\b([12])\s*[.,]?\s*(\d{2})\b/);
  if (nokta) return Number(nokta[1]) * 100 + Number(nokta[2]);
  const tam = s.match(/\b(\d{3})\b/);
  if (tam) return Number(tam[1]);
  let toplam = 0;
  let yuzluk = false;
  for (const w of s.split(/\s+/)) {
    if (w === 'yuz') { toplam += 100; yuzluk = true; } else if (w in ONLAR) toplam += ONLAR[w];
    else if (w in BIRLER) toplam += !yuzluk && toplam === 0 && w === 'bir' ? (yuzluk = true, 100) : BIRLER[w];
  }
  return toplam >= 100 ? toplam : null;
}


// ── GPS ile kalibrasyon yürüyüşü (açık havada) ──
// Kullanıcı düz bir yolda KALIBRASYON_ADIMI adım yürür; başlangıç ve bitişteki GPS konumları arasındaki mesafe
// adım sayısına bölünür. GPS birkaç metre sapabildiği için yalnızca iki ölçüm de yeterince hassassa kabul edilir;
// bina içinde GPS çalışmaz, orada etiketler ve "vardım" ile ölçülür.
export const KALIBRASYON_ADIMI = 80;
const GPS_EN_KOTU_DOGRULUK = 12;   // metre

export interface GpsNokta {
  enlem: number;
  boylam: number;
  dogruluk: number;
}

export function gpsMesafesi(a: GpsNokta, b: GpsNokta): number {
  const R = 6371000;
  const r = (d: number) => (d * Math.PI) / 180;
  const dEnlem = r(b.enlem - a.enlem);
  const dBoylam = r(b.boylam - a.boylam);
  const h = Math.sin(dEnlem / 2) ** 2 + Math.cos(r(a.enlem)) * Math.cos(r(b.enlem)) * Math.sin(dBoylam / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function gpsAdimOlcumu(bas: GpsNokta | null, son: GpsNokta | null, adim: number):
  {carpan: number; adimCm: number} | {hata: 'gps' | 'mesafe'} {
  if (!bas || !son || bas.dogruluk > GPS_EN_KOTU_DOGRULUK || son.dogruluk > GPS_EN_KOTU_DOGRULUK) return {hata: 'gps'};
  const mesafe = gpsMesafesi(bas, son);
  // İki konumun belirsizliği toplamı yürünen yolun %30'unu aşarsa sonuç ±%30'dan kötü olabilir: ölçülmez
  // (56 m'lik yürüyüşte iki ölçüm birlikte ~17 m'den hassas olmalı; açık havada telefonlar genelde 3–8 m verir)
  if (mesafe >= 0.35 * adim && bas.dogruluk + son.dogruluk > 0.3 * mesafe) return {hata: 'gps'};
  const adimUzunlugu = mesafe / adim;   // metre
  // Yol düz değildiyse (dönüldüyse) ya da GPS sıçradıysa adım uzunluğu insanca olmayan bir değer çıkar
  if (adimUzunlugu < 0.35 || adimUzunlugu > 1.1) return {hata: 'mesafe'};
  const carpan = Math.min(CARPAN_ARALIGI[1], Math.max(CARPAN_ARALIGI[0], STANDART_ADIM_CM / 100 / adimUzunlugu));
  return {carpan: Math.round(carpan * 100) / 100, adimCm: Math.round(adimUzunlugu * 100)};
}
