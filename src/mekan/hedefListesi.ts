import {Mekan, MekanHedefi} from '../tipler';
import {harfSadelestir, kelimelereAyir} from '../yazi';
import {katAdi, noktaKati} from './yerlesim';

// Kullanıcı binada hangi birimlerin hangi adla kayıtlı olduğunu bilemez. "Neler var" deyince
// yerler numaralı okunur; numarasını ya da adını söyleyerek seçer. Uzun listeler sayfa sayfa okunur.
export const SAYFA_BOYU = 10;

// Listede okunan ad: kurum kısa ad verdiyse o ("Kardiyoloji"), yoksa tam ad
export function listeAdi(h: MekanHedefi): string {
  return h.kisaAd?.trim() || h.ad;
}

// Aynı adlı hedefler (her kattaki "Tuvalet") bir kez sayılır; en yakını tarif sırasında seçilir
export function hedefSecenekleri(y: Mekan): MekanHedefi[] {
  const gorulen = new Set<string>();
  const secenekler = y.hedefler.filter(h => {
    const ad = harfSadelestir(listeAdi(h));
    if (gorulen.has(ad)) return false;
    gorulen.add(ad);
    return true;
  });
  // Katlara göre sıralı: "zemin katta …, 1. katta …"
  return secenekler
    .map((h, i) => ({h, i}))
    .sort((a, b) => noktaKati(y, a.h.nokta) - noktaKati(y, b.h.nokta) || a.i - b.i)
    .map(x => x.h);
}

// Listenin bir sayfası. Numaralar sayfadan bağımsızdır (11. yer ikinci sayfada da 11'dir).
// sonraki: okunmamış yer kaldıysa bir sonraki sayfanın başı, yoksa null.
export function hedefListesiMetni(y: Mekan, secenekler: MekanHedefi[] = hedefSecenekleri(y), bas = 0):
  {metin: string; sonraki: number | null} {
  const sayfa = secenekler.slice(bas, bas + SAYFA_BOYU);
  const katlar = [...new Set(secenekler.map(h => noktaKati(y, h.nokta)))];
  const numarali = (h: MekanHedefi) => `${secenekler.indexOf(h) + 1}, ${listeAdi(h)}`;
  const liste = katlar.length > 1
    ? [...new Set(sayfa.map(h => noktaKati(y, h.nokta)))].map(k => {
      const ad = katAdi(k);
      return `${ad.charAt(0).toLocaleUpperCase('tr-TR') + ad.slice(1)}: ` +
        sayfa.filter(h => noktaKati(y, h.nokta) === k).map(numarali).join('; ') + '.';
    }).join(' ')
    : sayfa.map(numarali).join('; ') + '.';
  const sonraki = bas + SAYFA_BOYU < secenekler.length ? bas + SAYFA_BOYU : null;
  const giris = bas === 0
    ? `Burada ${secenekler.length} yer var.${sonraki !== null ? ` İlk ${SAYFA_BOYU} tanesi:` : ''}`
    : `${bas + 1}. yerden devam:`;
  const kisiVar = bas === 0 && y.hedefler.some(h => h.kisiler?.length);
  const devam = sonraki !== null ? ` Diğer ${secenekler.length - sonraki} yer için devam deyin.` : '';
  return {
    metin: `${giris} ${liste}${devam}` +
      (kisiVar ? ' Çalışanların adıyla da sorabilirsiniz, örneğin doktorun adını söyleyin.' : ''),
    sonraki,
  };
}

export function devamMi(metin: string): boolean {
  return /^(devam|devam et|sonraki|sonrakiler|digerleri|digerlerini oku|baska|daha fazla|devami)$/
    .test(harfSadelestir(metin).replace(/[.!?,]+/g, ' ').replace(/\s+/g, ' ').trim());
}

const SAYI_KELIMELERI: Record<string, number> = {
  bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10,
  birinci: 1, ikinci: 2, ucuncu: 3, dorduncu: 4, besinci: 5, altinci: 6, yedinci: 7, sekizinci: 8,
  dokuzuncu: 9, onuncu: 10, yirmi: 20, otuz: 30,
};

// "3", "üç", "üçüncü", "on iki", "numara 12" → sıfırdan başlayan seçim; listede yoksa null.
// Yalnızca sayı (ve "numara", "numaralı" gibi dolgu sözcükleri) söylendiyse seçim sayılır:
// "112 numaralı oda" gibi oda aramaları hedefBul'a bırakılır.
export function secimCoz(metin: string, adet: number): number | null {
  const kelimeler = kelimelereAyir(harfSadelestir(metin))
    .filter(w => !['numara', 'numarali', 'numarayi', 'sayi', 'yer', 'olan', 'secenek'].includes(w));
  if (!kelimeler.length) return null;
  let sayi = 0;
  for (const w of kelimeler) {
    if (/^\d+(\.)?$/.test(w)) sayi += parseInt(w, 10);
    else if (SAYI_KELIMELERI[w] !== undefined) sayi += SAYI_KELIMELERI[w];
    else return null;
  }
  return sayi >= 1 && sayi <= adet ? sayi - 1 : null;
}

function benzerlik(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a.startsWith(b) || b.startsWith(a)) return Math.min(a.length, b.length) / Math.max(a.length, b.length) + 0.3;
  // Levenshtein uzaklığından 0–1 arası benzerlik
  const d: number[] = Array.from({length: b.length + 1}, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let onceki = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const gecici = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, onceki + (a[i - 1] === b[j - 1] ? 0 : 1));
      onceki = gecici;
    }
  }
  return 1 - d[b.length] / Math.max(a.length, b.length);
}

// Bulunamayan aramada önerilecek en benzer yerler: "labaratuvar" → Laboratuvar
export function benzerHedefler(y: Mekan, aranan: string, enFazla = 3): MekanHedefi[] {
  const sorgu = kelimelereAyir(harfSadelestir(aranan)).filter(w => w.length >= 3);
  if (!sorgu.length) return [];
  return hedefSecenekleri(y)
    .map(h => {
      const kelimeler = [h.ad, h.kisaAd || '', ...h.anahtarlar].flatMap(a => kelimelereAyir(harfSadelestir(a)));
      const puan = Math.max(...sorgu.map(s => Math.max(0, ...kelimeler.map(k => benzerlik(s, k)))));
      return {h, puan};
    })
    .filter(x => x.puan >= 0.6)
    .sort((a, b) => b.puan - a.puan)
    .slice(0, enFazla)
    .map(x => x.h);
}
