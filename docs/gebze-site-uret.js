// Gebze Emlak Konutları 3. Etap vaziyet planından (katalog s.30) site içi yönlendirme taslağı üretir.
// Koordinatlar PDF birimidir (blok etiketlerinin merkezi); ara noktalar plandaki yollardan elle okundu.
// Ölçek tahmini: 1 PDF birimi ≈ 0,47 m; yol kıvrımları için ×1,15; 1 adım ≈ 0,7 m.
const fs = require('fs');
// Kullanım: node docs/gebze-site-uret.js mekan-deposu/mekanlar/gebze-emlak-konutlari-3.json
const [cikti] = process.argv.slice(2);

const METRE_BIRIM = 0.47, YOL_PAYI = 1.15, ADIM_M = 0.7;

// [id, ad, x, y]
const noktalar = [
  ['giris',       'Site girişi',                  866, 590],
  ['gb-dogu',     'B7 ve C6 yol ayrımı',          700, 595],
  ['gb-orta',     'B1 ve F1 yol ayrımı',          560, 600],
  ['bati-kavsak', 'Batı kavşağı',                 345, 560],
  // Merkez halka yol (bloklar halka üzerinde)
  ['B1', 'B1 Blok girişi', 484, 540], ['A6', 'A6 Blok girişi', 610, 460], ['B6', 'B6 Blok girişi', 600, 340],
  ['B5', 'B5 Blok girişi', 510, 262], ['B4', 'B4 Blok girişi', 420, 240], ['C5', 'C5 Blok girişi', 320, 280],
  ['C4', 'C4 Blok girişi', 280, 370], ['B3', 'B3 Blok girişi', 320, 465], ['B2', 'B2 Blok girişi', 400, 520],
  // Batı ada
  ['A2', 'A2 Blok girişi', 288, 555], ['C1', 'C1 Blok girişi', 231, 524], ['C2', 'C2 Blok girişi', 175, 484],
  ['C3', 'C3 Blok girişi', 174, 413], ['F5', 'F5 Blok girişi', 123, 379], ['F6', 'F6 Blok girişi', 151, 339],
  // Güney ada
  ['F1', 'F1 Blok girişi', 565, 669], ['D1', 'D1 Blok girişi', 613, 642], ['E1', 'E1 Blok girişi', 481, 631],
  ['F2', 'F2 Blok girişi', 505, 688], ['F3', 'F3 Blok girişi', 449, 689], ['F4', 'F4 Blok girişi', 399, 669],
  ['A1', 'A1 Blok girişi', 360, 606],
  // Doğu ada
  ['B7', 'B7 Blok girişi', 687, 553], ['B8', 'B8 Blok girişi', 760, 487], ['C6', 'C6 Blok girişi', 820, 551],
  // Kuzeybatı ada
  ['kb-kavsak', 'Kuzeybatı ada girişi', 285, 290],
  ['A3', 'A3 Blok girişi', 217, 261], ['E2', 'E2 Blok girişi', 283, 179], ['F7', 'F7 Blok girişi', 207, 188],
  ['F8', 'F8 Blok girişi', 237, 145], ['F9', 'F9 Blok girişi', 267, 102], ['basket', 'Basketbol sahası', 169, 250],
  // Kuzey ada
  ['k-kavsak', 'Kuzey ada girişi', 440, 212],
  ['E3', 'E3 Blok girişi', 423, 169], ['A4', 'A4 Blok girişi', 518, 169], ['F12', 'F12 Blok girişi', 459, 118],
  ['F11', 'F11 Blok girişi', 414, 93], ['F10', 'F10 Blok girişi', 369, 67],
  // Kuzeydoğu ada
  ['kd-kavsak', 'Kuzeydoğu ada girişi', 600, 225],
  ['A5', 'A5 Blok girişi', 635, 150], ['D2', 'D2 Blok girişi', 662, 50],
];

// [a, b, tarif türü]: 'yol' güney yolu, 'halka' merkez halka yol, 'ada' ada içi yaya yolu
const yollar = [
  ['giris', 'gb-dogu', 'yol'], ['gb-dogu', 'gb-orta', 'yol'], ['gb-orta', 'bati-kavsak', 'yol'],
  ['gb-orta', 'B1', 'ada'], ['bati-kavsak', 'B3', 'ada'],
  ['B1', 'A6', 'halka'], ['A6', 'B6', 'halka'], ['B6', 'B5', 'halka'], ['B5', 'B4', 'halka'], ['B4', 'C5', 'halka'],
  ['C5', 'C4', 'halka'], ['C4', 'B3', 'halka'], ['B3', 'B2', 'halka'], ['B2', 'B1', 'halka'],
  ['bati-kavsak', 'A2', 'ada'], ['A2', 'C1', 'ada'], ['C1', 'C2', 'ada'], ['C2', 'C3', 'ada'], ['C3', 'F5', 'ada'], ['F5', 'F6', 'ada'],
  ['gb-orta', 'F1', 'ada'], ['F1', 'D1', 'ada'], ['gb-orta', 'E1', 'ada'], ['F1', 'F2', 'ada'], ['F2', 'E1', 'ada'],
  ['F2', 'F3', 'ada'], ['F3', 'F4', 'ada'], ['F4', 'A1', 'ada'], ['A1', 'bati-kavsak', 'ada'],
  ['gb-dogu', 'B7', 'ada'], ['B7', 'B8', 'ada'], ['gb-dogu', 'C6', 'ada'],
  ['C5', 'kb-kavsak', 'ada'], ['kb-kavsak', 'A3', 'ada'], ['A3', 'basket', 'ada'], ['A3', 'F7', 'ada'],
  ['kb-kavsak', 'E2', 'ada'], ['F7', 'F8', 'ada'], ['F8', 'F9', 'ada'],
  ['B4', 'k-kavsak', 'ada'], ['k-kavsak', 'E3', 'ada'], ['k-kavsak', 'A4', 'ada'], ['E3', 'F12', 'ada'],
  ['F12', 'F11', 'ada'], ['F11', 'F10', 'ada'],
  ['B5', 'kd-kavsak', 'ada'], ['kd-kavsak', 'A5', 'ada'], ['A5', 'D2', 'ada'],
];

const konum = Object.fromEntries(noktalar.map(([id, , x, y]) => [id, {x, y}]));
const ad = Object.fromEntries(noktalar.map(([id, a]) => [id, a]));
const adim = (a, b) => Math.max(3, Math.round(
  Math.hypot(konum[a].x - konum[b].x, konum[a].y - konum[b].y) * METRE_BIRIM * YOL_PAYI / ADIM_M));
const yonelt = (tur, hedef) => ({
  yol: `Güney yolunun kaldırımında ${hedef} yönüne ilerleyin`,
  halka: `Merkez halka yolda ${hedef} yönüne ilerleyin`,
  ada: `Yaya yolunda ${hedef} yönüne ilerleyin`,
}[tur]);

const bloklar = noktalar.filter(([id]) => /^[A-F]\d+$/.test(id));
const mekan = {
  id: 'gebze-emlak-konutlari-3',
  ad: 'Gebze Emlak Konutları 3. Etap',
  tur: 'diger',
  surum: 1,
  giris: 'giris',
  noktalar: noktalar.map(([id, a]) => ({id, ad: a, kat: 0})),
  baglantilar: yollar.map(([a, b, tur]) => ({
    a, b, adim: adim(a, b), tarif: yonelt(tur, ad[b]), geriTarif: yonelt(tur, ad[a]),
  })),
  hedefler: [
    ...bloklar.map(([id]) => ({
      ad: `${id} Blok`, nokta: id,
      tarif: `${id} blok girişindesiniz. Blok kapısındaki QR kodu okutunca blok içinde, dairelere kadar yönlendirme başlar.`,
      anahtarlar: [id.toLowerCase()],
    })),
    {ad: 'Basketbol sahası', nokta: 'basket', tarif: 'Basketbol sahasındasınız.', anahtarlar: ['basketbol', 'basket', 'spor sahası']},
    {ad: 'Site çıkışı', nokta: 'giris', tarif: 'Site girişindesiniz.', anahtarlar: ['çıkış', 'giriş', 'kapı', 'güvenlik']},
  ],
};
fs.writeFileSync(cikti, JSON.stringify(mekan, null, 1) + '\n');
console.log(`${mekan.noktalar.length} nokta, ${mekan.baglantilar.length} yol, ${mekan.hedefler.length} hedef`);
