// Gebze Emlak Konutları 3. Etap blokları için blok içi yönlendirme düzenleri üretir:
// blok kapısı → zemin hol → asansör ya da merdiven → kat holü → daire kapısı.
// Kullanım: node docs/gebze-blok-uret.js docs/gebze-bloklar.json mekan-deposu/mekanlar
//
// Ayar dosyası bir blok listesidir. Örnek:
// [{
//   "blok": "B4",                       // site düzenindeki blok kodu
//   "katlar": [0, 1, 2, 3, 4, 5],        // daire bulunan katlar (0 zemin)
//   "asansor": true,
//   "basamak": 20,                       // iki kat arasındaki basamak sayısı
//   "girisAdim": 6,                      // blok kapısından zemin kat holüne
//   "kattakiDaireler": [                 // her katta aynı düzen; numara = ilkNo + kat sırası × daire sayısı + sıra
//     {"yer": "sol", "adim": 3, "tip": "gebze-b-tipi-2-1"},
//     {"yer": "sag", "adim": 3, "tip": "gebze-b-tipi-3-1"}
//   ],
//   "ilkNo": 1
// }]
// "yer": asansör (ya da merdiven) arkanızdayken kat holünde dairenin tarafı: sol, sag, karsi, sol-capraz, sag-capraz.
const fs = require('fs');
const path = require('path');

const YER = {
  sol: 'solunuzdaki', sag: 'sağınızdaki', karsi: 'karşınızdaki',
  'sol-capraz': 'sol çaprazınızdaki', 'sag-capraz': 'sağ çaprazınızdaki',
};
// Daireden çıkınca asansörün kaldığı taraf
const CIKIS = {sol: 'sağınızda', sag: 'solunuzda', karsi: 'karşınızda', 'sol-capraz': 'sağ çaprazınızda', 'sag-capraz': 'sol çaprazınızda'};

// Daire tipi kimliğinden okunabilir ad: "gebze-c-tipi-2-1-acik-mutfak" → "C tipi 2+1 açık mutfaklı"
function tipAdi(tip) {
  const m = tip.match(/^gebze-([a-f])-tipi-(\d)-1(.*)$/);
  if (!m) return tip;
  const ek = {'-acik-mutfak': ' açık mutfaklı', '-dubleks': ' dubleks', '-b': ' işlikli'}[m[3]] || '';
  return `${m[1].toUpperCase()} tipi ${m[2]}+1${ek}`;
}

function blokUret(b) {
  if (!/^[A-F]\d{1,2}$/.test(b.blok)) throw new Error(`Geçersiz blok kodu: ${b.blok}`);
  const ad = `${b.blok} Blok`;
  const noktalar = [{id: 'blok-kapi', ad: `${ad} giriş kapısı`}];
  const baglantilar = [];
  const hedefler = [];
  const bagla = (a, c, adim, tarif, geriTarif, ek = {}) => baglantilar.push({a, b: c, adim, tarif, geriTarif, ...ek});
  const kattakiSayi = b.kattakiDaireler.length;

  b.katlar.forEach((kat, sira) => {
    const hol = `hol-${kat}`;
    noktalar.push({id: hol, ad: kat === b.katlar[0] ? 'Giriş holü' : 'Kat holü', kat});
    noktalar.push({id: `merdiven-${kat}`, ad: 'Merdiven başı', kat});
    bagla(hol, `merdiven-${kat}`, 2, 'Merdivene yönelin', 'Merdivenden çıkıp kat holüne ilerleyin');
    if (b.asansor) {
      noktalar.push({id: `asansor-${kat}`, ad: 'Asansör önü', kat});
      bagla(hol, `asansor-${kat}`, 2, 'Asansörlere yönelin', 'Asansörden çıkıp kat holüne ilerleyin');
    }
    if (sira > 0) {
      const onceki = b.katlar[sira - 1];
      bagla(`merdiven-${onceki}`, `merdiven-${kat}`, 12, 'Korkuluğa tutunun.', 'Korkuluğa tutunun.',
        {tur: 'merdiven', basamak: b.basamak});
      if (b.asansor) bagla(`asansor-${onceki}`, `asansor-${kat}`, 15, 'Butonlarda kabartma yazı olabilir.', 'Butonlarda kabartma yazı olabilir.', {tur: 'asansor'});
    }
    b.kattakiDaireler.forEach((d, i) => {
      const no = String((b.ilkNo ?? 1) + sira * kattakiSayi + i);
      const id = `daire-${no}`;
      noktalar.push({id, ad: `${no} numaralı daire kapısı`, kat});
      bagla(hol, id, d.adim,
        `Asansör arkanızdayken ${YER[d.yer]} ${no} numaralı daire kapısına yönelin`,
        `Daireden çıkın; asansör ${CIKIS[d.yer]}`);
      hedefler.push({
        ad: `${no} numaralı daire`, nokta: id, no,
        tarif: `${no} numaralı daire kapısındasınız. Daire planı ${tipAdi(d.tip)}. ` +
          'Kapıdaki QR kodu okutunca daire içinde yönlendirme başlar.',
        anahtarlar: [],
      });
    });
  });

  const zemin = b.katlar[0];
  bagla('blok-kapi', `hol-${zemin}`, b.girisAdim, 'Blok kapısından girin ve giriş holünde düz ilerleyin', 'Blok çıkış kapısına yönelin');
  hedefler.push(
    {ad: 'Blok çıkışı', nokta: 'blok-kapi', tarif: 'Blok giriş kapısındasınız.', anahtarlar: ['çıkış', 'dış kapı', 'blok kapısı']},
    {ad: 'Merdiven', nokta: `merdiven-${zemin}`, tarif: 'Merdiven başındasınız.', anahtarlar: ['merdiven']},
  );
  if (b.asansor) hedefler.push({ad: 'Asansör', nokta: `asansor-${zemin}`, tarif: 'Asansör önündesiniz.', anahtarlar: ['asansör']});

  return {
    id: `gebze-${b.blok.toLowerCase()}-blok`,
    ad: `${ad}, Gebze Emlak Konutları 3. Etap`,
    tur: 'diger',
    surum: b.surum ?? 1,
    giris: 'blok-kapi',
    noktalar: noktalar.map(n => ({...n, ad: n.ad.charAt(0).toLocaleUpperCase('tr-TR') + n.ad.slice(1)})),
    baglantilar,
    hedefler,
  };
}

module.exports = {blokUret, tipAdi};

if (require.main === module) {
  const [ayar, klasor] = process.argv.slice(2);
  if (!ayar || !klasor) throw new Error('Kullanım: node docs/gebze-blok-uret.js <ayar.json> <mekanlar klasörü>');
  const bloklar = JSON.parse(fs.readFileSync(ayar, 'utf8'));
  const liste = JSON.parse(fs.readFileSync(path.join(klasor, 'index.json'), 'utf8'));
  for (const b of bloklar) {
    const mekan = blokUret(b);
    fs.writeFileSync(path.join(klasor, `${mekan.id}.json`), JSON.stringify(mekan, null, 1) + '\n');
    if (!liste.mekanlar.some(m => m.id === mekan.id)) liste.mekanlar.push({id: mekan.id, ad: mekan.ad, tur: mekan.tur});
    console.log(`${mekan.id}: ${mekan.hedefler.filter(h => h.no).length} daire`);
  }
  fs.writeFileSync(path.join(klasor, 'index.json'), JSON.stringify(liste, null, 2)
    .replace(/\{\n\s+"id": ("[^"]+"),\n\s+"ad": ("[^"]+"),\n\s+"tur": ("[^"]+")\n\s+\}/g, '{"id": $1, "ad": $2, "tur": $3}') + '\n');
  if (!bloklar.length) console.log('Ayar dosyası boş: blok bilgileri girilince düzenler üretilecek.');
}
