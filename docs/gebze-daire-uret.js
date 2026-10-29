// Gebze Emlak Konutları 3. Etap kataloğundaki daire planlarından (s.33–46) daire içi yönlendirme düzenleri üretir.
// Kullanım: node docs/gebze-daire-uret.js mekan-deposu/mekanlar
//
// Her plan bir ağaç olarak tarif edilir: girişten hole, holden kapılara ve koridorlara.
// "yon" (sol/sag/duz) o noktaya girişten gelirken bakılan yöne göredir; plandaki kapı konumlarından okundu.
// Ters yön tarifleri kurala göre üretilir: koridorda gidişte solda kalan kapı dönüşte sağda kalır,
// soldaki bir odadan çıkınca giriş tarafı sağda kalır.
// Adım sayıları plan ölçeğinden (salon metrekaresinden) tahmindir; yerinde doğrulanmalıdır.
const fs = require('fs');
const path = require('path');

// ── Plan tarifleri ────────────────────────────────────────

const oda = (ad, anahtarlar, ic, icOdalar) => ({ad, anahtarlar, ic, icOdalar});
const ic = (ad, anahtarlar, yer, adim, geri) => ({ad, anahtarlar, yer, adim, geri});
const kapi = (yon, adim, o) => ({tur: 'kapi', yon, adim, oda: o});
const koridor = (yon, adim, ogeler) => ({tur: 'koridor', yon, adim, ogeler});
const kk = (yan, adim, o) => ({tur: 'kapi', yan, adim, oda: o});        // koridor kapısı
const kavsak = (adim, kollar) => ({tur: 'kavsak', adim, kollar});
const merdiven = (yon, adim, basamak, kollar) => ({tur: 'merdiven', yon, adim, basamak, kollar});

const A = {
  salon: ['salon', 'oturma'], mutfak: ['mutfak', 'ocak', 'buzdolabı'], banyo: ['banyo', 'tuvalet', 'lavabo', 'wc', 'duş'],
  eyo: ['yatak', 'ebeveyn', 'büyük oda'], ebanyo: ['ebeveyn banyo', 'ikinci banyo'], soyunma: ['soyunma', 'giyinme', 'dolap odası'],
  balkon: ['balkon'], oda: n => [`oda ${n}`, 'oda'], wc: ['wc', 'tuvalet', 'misafir tuvaleti'],
};
const ebeveynBanyosu = (yer, adim, geri) => ic('Ebeveyn banyosu', A.ebanyo, yer, adim, geri);
const soyunma = (yer, adim) => ic('Soyunma odası', A.soyunma, yer, adim);
const balkon = (ad, yer, adim, geri, anahtarlar = A.balkon) => ic(ad, anahtarlar, yer, adim, geri);

const PLANLAR = [
  {id: 'gebze-a-tipi-3-1', ad: 'A tipi 3+1 daire', sayfa: 33, hol: 2, kollar: [
    kapi('duz', 2, oda('Mutfak', A.mutfak, 'İçeri girince tezgah ve ocak sol duvarda, kapalı balkon kapısı karşıda.', [
      balkon('Kapalı balkon', 'karşı duvarda', 4, 'Balkondan mutfağa girin; mutfak kapısı karşınızda')])),
    koridor('sag', 2, [
      kk('sol', 0, oda('Salon', A.salon, 'İçeri girince yemek masası sağ tarafta, oturma grubu ileride.')),
      kk('sag', 1, oda('Banyo', A.banyo)),
      kk('sol', 4, oda('Oda 2', A.oda(2))),
      kk('sag', 1, oda('Ebeveyn yatak odası', A.eyo, null, [
        ebeveynBanyosu('sağ çaprazda', 3, 'Banyodan çıkın; yatak odası kapısı sol çaprazınızda')])),
      kk('sonda', 1, oda('Oda 1', A.oda(1))),
    ]),
  ]},
  {id: 'gebze-b-tipi-2-1', ad: 'B tipi 2+1 daire', sayfa: 34, hol: 3, kollar: [
    kapi('sag', 1, oda('Salon', A.salon, 'İçeri girince oturma grubu karşıda, yemek masası sağ tarafta, açık balkon kapısı sol tarafta.', [
      balkon('Balkon', 'sol tarafta, dış duvarda', 4, 'Balkondan salona girin; salon kapısı sağ çaprazınızda')])),
    kapi('duz', 2, oda('Mutfak', A.mutfak, 'İçeri girince tezgah ve ocak sol duvarda.')),
    koridor('sol', 3, [
      kk('sol', 0, oda('Banyo', A.banyo)),
      kk('sag', 1, oda('Oda', ['oda', 'küçük oda', 'çocuk'])),
      kk('sonda', 2, oda('Ebeveyn yatak odası', A.eyo, null, [
        ebeveynBanyosu('sol çaprazda', 3, 'Banyodan çıkın; yatak odası kapısı sağ çaprazınızda')])),
    ]),
  ]},
  {id: 'gebze-b-tipi-3-1', ad: 'B tipi 3+1 daire', sayfa: 35, hol: 2, kollar: [
    kapi('duz', 2, oda('Mutfak', A.mutfak, 'İçeri girince tezgah ve ocak sağ duvarda, kapalı balkon kapısı karşıda.', [
      balkon('Kapalı balkon', 'karşı duvarda', 4, 'Balkondan mutfağa girin; mutfak kapısı karşınızda')])),
    kapi('sag', 2, oda('Salon', A.salon, 'İçeri girince yemek masası karşıda, oturma grubu ileride, açık balkon kapısı sağ ilerideki köşede, kapalı balkon kapısı sol ilerideki köşede.', [
      balkon('Açık balkon', 'sağ ilerideki köşede', 6, 'Balkondan salona girin; salon kapısı sol ilerideki köşede')])),
    koridor('sag', 2, [
      kk('sag', 1, oda('Banyo', A.banyo)),
      kk('sag', 5, oda('Ebeveyn yatak odası', A.eyo, null, [
        ebeveynBanyosu('sağ tarafta', 3, 'Banyodan çıkın; yatak odası kapısı sol tarafınızda')])),
      kk('sol', 1, oda('Oda 2', A.oda(2))),
      kk('sonda', 1, oda('Oda 1', A.oda(1))),
    ]),
  ]},
  {id: 'gebze-c-tipi-2-1-acik-mutfak', ad: 'C tipi 2+1 daire (açık mutfaklı)', sayfa: 36, hol: 1, kollar: [
    koridor('duz', 1, [
      kk('sol', 0, oda('Oda', ['oda', 'küçük oda', 'çocuk'])),
      kk('sol', 2, oda('Salon ve mutfak', [...A.salon, ...A.mutfak],
        'İçeri girince mutfak bölümü hemen sağınızda, oturma grubu ileride; kapalı balkon kapısı sol duvarda, açık balkon kapısı sağ duvarın sonunda.', [
          balkon('Kapalı balkon', 'sol duvarın ilerisinde', 6, 'Balkondan salona girin; salon kapısı sağ ilerinizde', ['kapalı balkon']),
          balkon('Açık balkon', 'sağ duvarın sonunda', 7, 'Balkondan salona girin; salon kapısı sol ilerinizde', ['açık balkon', 'balkon']),
        ])),
      kk('sag', 4, oda('Banyo', A.banyo)),
      kk('sonda', 1, oda('Ebeveyn yatak odası', A.eyo, null, [
        soyunma('sağ tarafta', 3),
        ebeveynBanyosu('sağ tarafta, soyunma odasının içinden', 5),
      ])),
    ]),
  ]},
  {id: 'gebze-c-tipi-2-1', ad: 'C tipi 2+1 daire', sayfa: 37, hol: 2, kollar: [
    kapi('sag', 1, oda('Banyo', A.banyo)),
    koridor('duz', 2, [
      kavsak(0, [
        kapi('duz', 1, oda('Mutfak', A.mutfak, 'İçeri girince tezgah ve ocak sağ duvarda.')),
        koridor('sol', 2, [
          kk('sag', 0, oda('Oda', ['oda', 'küçük oda', 'çocuk'])),
          kk('sonda', 1, oda('Ebeveyn yatak odası', A.eyo)),
        ]),
        kapi('sag', 2, oda('Salon', A.salon, 'İçeri girince yemek masası sağ tarafta, oturma grubu sol tarafta, açık balkon kapısı sol duvarın sonunda.', [
          balkon('Balkon', 'sol duvarın sonunda', 6, 'Balkondan salona girin; salon kapısı sağ ilerinizde')])),
      ]),
    ]),
  ]},
  {id: 'gebze-c-tipi-3-1', ad: 'C tipi 3+1 daire', sayfa: 38, hol: 2, kollar: [
    kapi('sag', 1, oda('Salon', A.salon, 'İçeri girince yemek masası sol tarafta, oturma grubu ileride, açık balkon kapısı sol ileride.', [
      balkon('Salon balkonu', 'sol ileride', 7, 'Balkondan salona girin; salon kapısı sağ ilerideki köşede', ['salon balkon', 'balkon'])])),
    koridor('duz', 2, [
      kk('sol', 1, oda('Banyo', A.banyo)),
      kavsak(3, [
        kapi('duz', 1, oda('Oda 1', A.oda(1))),
        koridor('sag', 2, [
          kk('sol', 0, oda('Mutfak', A.mutfak, 'İçeri girince tezgah ve ocak sağ duvarda.')),
          kk('sonda', 1, oda('Oda 2', A.oda(2))),
        ]),
        koridor('sol', 3, [
          kk('sonda', 0, oda('Ebeveyn yatak odası', A.eyo, null, [
            soyunma('sol tarafta', 3),
            ebeveynBanyosu('sol tarafta, soyunma odasının yanında', 4),
            balkon('Yatak odası balkonu', 'sağ duvarın sonunda', 5, 'Balkondan yatak odasına girin; kapı sol ilerinizde', ['yatak odası balkon']),
          ])),
        ]),
      ]),
    ]),
  ]},
  {id: 'gebze-c-tipi-4-1', ad: 'C tipi 4+1 daire', sayfa: 39, hol: 2, kollar: [
    koridor('duz', 1, [
      kk('sol', 0, oda('Mutfak', A.mutfak, 'İçeri girince tezgah ve ocak sol duvarda, kapalı balkon kapısı karşıda.', [
        balkon('Kapalı balkon', 'karşı duvarda', 4, 'Balkondan mutfağa girin; mutfak kapısı karşınızda', ['kapalı balkon'])])),
      kk('sol', 1, oda('Salon', A.salon, 'İçeri girince yemek masası sağ tarafta, oturma grubu ileride, açık balkon kapısı sağ ileride.', [
        balkon('Salon balkonu', 'sağ ileride', 7, 'Balkondan salona girin; salon kapısı sol ilerideki köşede', ['salon balkon', 'balkon'])])),
      kk('sag', 3, oda('Banyo', A.banyo)),
      kavsak(2, [
        koridor('sag', 2, [
          kk('sol', 0, oda('Oda 1', A.oda(1))),
          kk('sonda', 2, oda('Ebeveyn yatak odası', A.eyo, null, [
            soyunma('sağ tarafta', 3),
            ebeveynBanyosu('sağ tarafta, soyunma odasının içinden', 5),
            balkon('Yatak odası balkonu', 'sol duvarın sonunda', 4, 'Balkondan yatak odasına girin; kapı sağ ilerinizde', ['yatak odası balkon']),
          ])),
        ]),
        koridor('sol', 2, [
          kk('sag', 0, oda('Oda 2', A.oda(2))),
          kk('sonda', 2, oda('Oda 3', A.oda(3))),
        ]),
      ]),
    ]),
  ]},
  {id: 'gebze-d-tipi-2-1-acik-mutfak', ad: 'D tipi 2+1 daire (açık mutfaklı)', sayfa: 40, hol: 2, kollar: [
    kapi('sol', 4, oda('Salon ve mutfak', [...A.salon, ...A.mutfak], 'İçeri girince mutfak tezgahı karşı duvarda, oturma grubu sağ tarafta.')),
    koridor('duz', 3, [
      kk('sol', 0, oda('Banyo', A.banyo)),
      kk('sag', 1, oda('Oda', ['oda', 'küçük oda', 'çocuk'])),
      kk('sonda', 1, oda('Ebeveyn yatak odası', A.eyo)),
    ]),
  ]},
  {id: 'gebze-d-tipi-2-1', ad: 'D tipi 2+1 daire', sayfa: 41, hol: 2, kollar: [
    kapi('sag', 1, oda('Salon', A.salon, 'İçeri girince oturma grubu ve yemek masası ileride.')),
    koridor('duz', 3, [
      kk('sol', 0, oda('Banyo', A.banyo)),
      kk('sag', 3, oda('Mutfak', A.mutfak, 'İçeri girince tezgah ve ocak sağ duvarda, açık balkon kapısı karşıda.', [
        balkon('Balkon', 'karşı duvarda', 4, 'Balkondan mutfağa girin; mutfak kapısı karşınızda')])),
      kavsak(1, [
        kapi('duz', 1, oda('Oda', ['oda', 'küçük oda', 'çocuk'])),
        koridor('sol', 3, [
          kk('sonda', 0, oda('Ebeveyn yatak odası', A.eyo, null, [
            soyunma('sol tarafta', 3),
            ebeveynBanyosu('sol tarafta, soyunma odasının yanında', 4),
          ])),
        ]),
      ]),
    ]),
  ]},
  {id: 'gebze-d-tipi-3-1', ad: 'D tipi 3+1 daire', sayfa: 42, hol: 2, kollar: [
    koridor('duz', 1, [
      kk('sol', 0, oda('Mutfak', A.mutfak, 'İçeri girince tezgah ve ocak sol duvarda, kapalı balkon kapısı karşıda.', [
        balkon('Kapalı balkon', 'karşı duvarda', 4, 'Balkondan mutfağa girin; mutfak kapısı karşınızda', ['kapalı balkon'])])),
      kk('sol', 1, oda('Salon', A.salon, 'İçeri girince yemek masası ileride, oturma grubu daha ileride.')),
      kk('sag', 3, oda('Banyo', A.banyo)),
      kk('sol', 3, oda('Oda 2', A.oda(2), null, [
        balkon('Açık balkon', 'karşı duvarda', 4, 'Balkondan odaya girin; oda kapısı karşınızda', ['açık balkon', 'balkon'])])),
      kavsak(1, [
        koridor('sag', 2, [
          kk('sol', 0, oda('Oda 1', A.oda(1))),
          kk('sonda', 2, oda('Ebeveyn yatak odası', A.eyo, null, [
            soyunma('sağ tarafta', 3),
            ebeveynBanyosu('sağ tarafta, soyunma odasının yanında', 5),
          ])),
        ]),
      ]),
    ]),
  ]},
  {id: 'gebze-e-tipi-3-1', ad: 'E tipi 3+1 daire', sayfa: 43, hol: 2, kollar: [
    kapi('sag', 1, oda('Salon', A.salon, 'İçeri girince yemek masası ileride, oturma grubu daha ileride.')),
    koridor('duz', 1, [
      kk('sag', 0, oda('Mutfak', A.mutfak, 'İçeri girince tezgah ve ocak sol duvarda, kapalı balkon kapısı karşıda.', [
        balkon('Kapalı balkon', 'karşı duvarda', 4, 'Balkondan mutfağa girin; mutfak kapısı karşınızda')])),
      kavsak(1, [
        kapi('duz', 1, oda('Banyo', A.banyo)),
        koridor('sol', 4, [
          kk('sag', 0, oda('Oda 2', A.oda(2))),
          kk('sol', 1, oda('Ebeveyn yatak odası', A.eyo, null, [
            ebeveynBanyosu('sol tarafta', 3),
            soyunma('sol tarafta, ebeveyn banyosunun yanında', 4),
          ])),
          kk('sonda', 1, oda('Oda 1', A.oda(1))),
        ]),
      ]),
    ]),
  ]},
  {id: 'gebze-e-tipi-3-1-b', ad: 'E tipi 3+1 daire (işlikli)', sayfa: 44, hol: 2, kollar: [
    kapi('sag', 2, oda('Salon', A.salon, 'İçeri girince yemek masası sağ ileride, oturma grubu sol ileride, açık balkon kapısı sol duvarın sonunda.')),
    kapi('duz', 3, oda('Mutfak', A.mutfak, 'İçeri girince tezgah ve ocak sağ duvarda, açık balkon kapısı karşıda.', [
      balkon('Balkon', 'karşı duvarda', 5, 'Balkondan mutfağa girin; mutfak kapısı karşınızda')])),
    koridor('sol', 2, [
      kk('sag', 0, oda('Oda 2', A.oda(2))),
      kk('sol', 1, oda('İşlik', ['işlik', 'çamaşır', 'çamaşır makinesi'])),
      kk('sag', 3, oda('Oda 1', A.oda(1))),
      kk('sol', 1, oda('Banyo', A.banyo)),
      kk('sonda', 1, oda('Ebeveyn yatak odası', A.eyo, null, [ebeveynBanyosu('sol tarafta', 3)])),
    ]),
  ]},
  {id: 'gebze-f-tipi-4-1', ad: 'F tipi 4+1 daire', sayfa: 45, hol: 3, kollar: [
    kapi('sol', 1, oda('Mutfak', A.mutfak, 'İçeri girince tezgah ve ocak karşı duvarda.')),
    kapi('sol', 2, oda('Kapalı balkon', ['kapalı balkon'], null, [
      balkon('Açık balkon', 'karşı duvarda', 3, 'Açık balkondan kapalı balkona girin; kapı karşınızda', ['açık balkon', 'balkon'])])),
    kapi('duz', 3, oda('Salon', A.salon, 'İçeri girince yemek masası sağ tarafta, oturma grubu ileride.')),
    koridor('sag', 2, [
      kk('sol', 0, oda('Oda 3', A.oda(3))),
      kk('sag', 1, oda('Vestiyer', ['vestiyer', 'portmanto', 'mont'])),
      kk('sag', 2, oda('Misafir tuvaleti', A.wc)),
      kk('sol', 1, oda('Oda 2', A.oda(2))),
      kk('sag', 2, oda('Banyo', ['banyo', 'duş', 'lavabo'])),
      kk('sol', 2, oda('Oda 1', A.oda(1))),
      kk('sonda', 1, oda('Ebeveyn yatak odası', A.eyo, null, [
        ebeveynBanyosu('sağ tarafta', 4),
        balkon('Yatak odası balkonu', 'sağ tarafta', 4, 'Balkondan yatak odasına girin; kapı sol ilerinizde', ['yatak odası balkon']),
      ])),
    ]),
  ]},
  {id: 'gebze-f-tipi-4-1-dubleks', ad: 'F tipi 4+1 dubleks daire', sayfa: 46, hol: 2, kollar: [
    kapi('duz', 2, oda('Vestiyer', ['vestiyer', 'portmanto', 'mont'], null, [
      ic('Misafir tuvaleti', A.wc, 'karşı duvarda', 3, 'Tuvaletten çıkın; vestiyerden hole doğru ilerleyin')])),
    kapi('sol', 2, oda('Salon', A.salon, 'İçeri girince yemek masası ileride, oturma grubu sol ileride.')),
    kapi('sol', 3, oda('Mutfak', A.mutfak, 'İçeri girince tezgah ve ocak sol duvarda, teras kapısı karşıda.', [
      balkon('Teras', 'karşı duvarda', 5, 'Terastan mutfağa girin; mutfak kapısı karşınızda', ['teras'])])),
    kapi('sag', 3, oda('Kiler', ['kiler', 'erzak'])),
    merdiven('sag', 3, 16, [
      kapi('sag', 3, oda('Ebeveyn yatak odası', A.eyo, null, [
        soyunma('sol tarafta', 2),
        ebeveynBanyosu('sol tarafta, soyunma odasının yanında', 3),
      ])),
      koridor('sol', 3, [
        kk('sol', 0, oda('Banyo', ['banyo', 'duş', 'lavabo'])),
        kk('sag', 1, oda('Oda 1', A.oda(1))),
        kk('sol', 2, oda('Oda 2', A.oda(2), null, [
          balkon('Balkon', 'karşı duvarda', 5, 'Balkondan odaya girin; oda kapısı karşınızda')])),
        kk('sonda', 1, oda('Oda 3', A.oda(3))),
      ]),
    ]),
  ]},
];

// ── Üretici ───────────────────────────────────────────────

const SAG_SOL = {sol: 'solunuzdaki', sag: 'sağınızdaki', duz: 'karşınızdaki'};
const DONUS = {sol: 'sola dönüp', sag: 'sağa dönüp', duz: 'düz devam edip'};
const YAN = {sol: 'solunuzda', sag: 'sağınızda', sonda: 'koridorun sonunda, karşınızda'};
const TERS = {sol: 'sağınızda', sag: 'solunuzda'};
// Bir odadan çıkınca kavşağın geri yönü (giriş tarafı) hangi tarafta kalır
const CIKIS = {sol: 'sağınızda', sag: 'solunuzda', duz: 'karşınızda'};

const slug = s => s.toLocaleLowerCase('tr-TR')
  .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ğ/g, 'g')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ilkBuyuk = s => s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);

function uret(plan) {
  const noktalar = [], baglantilar = [], hedefler = [];
  const kullanilan = new Set();
  const nokta = (idTaslak, ad, kat) => {
    let id = slug(idTaslak), i = 2;
    while (kullanilan.has(id)) id = `${slug(idTaslak)}-${i++}`;
    kullanilan.add(id);
    noktalar.push({id, ad, kat});
    return id;
  };
  const bagla = (a, b, adim, tarif, geriTarif, ek = {}) =>
    baglantilar.push({a, b, adim: Math.max(1, adim), tarif, geriTarif, ...ek});

  function odaEkle(o, kapiNoktasi, kat) {
    hedefler.push({ad: o.ad, nokta: kapiNoktasi, tarif: `${o.ad} kapısındasınız.${o.ic ? ` ${o.ic}` : ''}`, anahtarlar: o.anahtarlar});
    for (const i of o.icOdalar || []) {
      const n = nokta(i.ad, `${i.ad} kapısı`, kat);
      bagla(kapiNoktasi, n, i.adim, `${o.ad} içine girin; ${i.ad.toLocaleLowerCase('tr-TR')} ${i.yer}`,
        i.geri || `${o.ad} kapısına geri dönün`);
      hedefler.push({ad: i.ad, nokta: n, tarif: `${i.ad} kapısındasınız.`, anahtarlar: i.anahtarlar});
    }
  }

  // kavsak: {id, ad, cerceve: yön tarifinin dayanağı, geriYon: geri dönüş yönü,
  //          geriIsaret: varınca söylenecek yer işareti, varisYeri: yer işaretinin söylendiği yer}
  function kollariEkle(kv, kollar, kat) {
    for (const k of kollar) {
      if (k.tur === 'kapi') {
        const n = nokta(k.oda.ad, `${k.oda.ad} kapısı`, kat);
        bagla(kv.id, n, k.adim, `${kv.cerceve}, ${SAG_SOL[k.yon]} ${k.oda.ad.toLocaleLowerCase('tr-TR')} kapısına yönelin`,
          `Kapıdan çıkın; ${kv.geriIsaret} ${CIKIS[k.yon]}`);
        odaEkle(k.oda, n, kat);
      } else if (k.tur === 'koridor') {
        koridorEkle(kv, k, kat);
      } else if (k.tur === 'merdiven') {
        const alt = nokta('merdiven-alt', 'Merdiven başı', kat);
        const ust = nokta('merdiven-ust', 'Üst kat merdiven başı', kat + 1);
        bagla(kv.id, alt, k.adim, `${kv.cerceve}, ${SAG_SOL[k.yon]} iç merdivene yönelin`,
          `Merdivenden inince ${kv.ad.toLocaleLowerCase('tr-TR')} yönüne ilerleyin`);
        bagla(alt, ust, 10, 'Korkuluğa tutunun.', 'Korkuluğa tutunun.', {tur: 'merdiven', basamak: k.basamak});
        hedefler.push({ad: 'Üst kat', nokta: ust, tarif: 'Üst kattasınız.', anahtarlar: ['üst kat', 'yukarı', 'merdiven']});
        kollariEkle({id: ust, ad: 'Üst kat merdiven başı', cerceve: 'Merdiven arkanızdayken', geriYon: 'merdivene doğru',
          geriIsaret: 'merdiven', varisYeri: 'merdiven başında'}, k.kollar, kat + 1);
      }
    }
  }

  function koridorEkle(kv, k, kat) {
    let onceki = kv.id, oncekiOge = null;
    k.ogeler.forEach((o, i) => {
      const n = o.tur === 'kavsak'
        ? nokta('koridor-ayrimi', 'Koridor ayrımı', kat)
        : nokta(`koridor-${o.oda.ad}`, `${o.oda.ad} kapısı`, kat);
      const varis = o.tur === 'kavsak' ? 'koridor ayrımına geleceksiniz' : `${o.oda.ad.toLocaleLowerCase('tr-TR')} kapısı ${YAN[o.yan]}`;
      const adim = (i === 0 ? k.adim : 0) + o.adim;
      const ileri = i === 0
        ? `${kv.cerceve}, ${DONUS[k.yon]} koridora girin; ${varis}`
        : `Koridorda ilerleyin; ${varis}`;
      // Koridordan kavşağa dönen kullanıcıya orada nereye baktığını söyle: sol koldan dönerken giriş tarafı sağda kalır
      const geri = i === 0
        ? `Koridorda ${kv.geriYon} ilerleyin; ${kv.varisYeri} ${kv.geriIsaret} ${CIKIS[k.yon]} kalacak`
        : `Koridorda ${kv.geriYon} ilerleyin; ${oncekiOge.tur === 'kavsak'
          ? 'koridor ayrımına geleceksiniz'
          : `${oncekiOge.oda.ad.toLocaleLowerCase('tr-TR')} kapısı ${TERS[oncekiOge.yan] || 'önünüzde'}`}`;
      bagla(onceki, n, adim, ileri, geri);
      if (o.tur === 'kavsak') {
        kollariEkle({id: n, ad: 'Koridor ayrımı', cerceve: 'Giriş tarafı arkanızdayken', geriYon: 'koridor ayrımına doğru',
          geriIsaret: 'giriş tarafı', varisYeri: 'ayrımda'}, o.kollar, kat);
      } else {
        odaEkle(o.oda, n, kat);
      }
      onceki = n;
      oncekiOge = o;
    });
  }

  const kapiId = nokta('kapi', 'Daire giriş kapısı', 0);
  const holId = nokta('hol', 'Giriş holü', 0);
  bagla(kapiId, holId, plan.hol, 'Daireye girin ve giriş holünde düz ilerleyin', 'Giriş kapısına yönelin');
  kollariEkle({id: holId, ad: 'Giriş holü', cerceve: 'Giriş kapısı arkanızdayken', geriYon: 'girişe doğru',
    geriIsaret: 'giriş kapısı', varisYeri: 'holde'}, plan.kollar, 0);
  hedefler.push({ad: 'Giriş kapısı', nokta: kapiId, tarif: 'Daire giriş kapısındasınız.', anahtarlar: ['çıkış', 'giriş', 'kapı', 'dış kapı']});

  return {
    id: plan.id,
    ad: `${plan.ad}, Gebze Emlak Konutları 3. Etap`,
    tur: 'diger',
    surum: 1,
    giris: kapiId,
    noktalar: noktalar.map(n => ({id: n.id, ad: ilkBuyuk(n.ad), ...(n.kat ? {kat: n.kat} : {})})),
    baglantilar,
    hedefler,
  };
}

const klasor = process.argv[2];
if (!klasor) throw new Error('Kullanım: node docs/gebze-daire-uret.js <mekanlar klasörü>');
const liste = JSON.parse(fs.readFileSync(path.join(klasor, 'index.json'), 'utf8'));
for (const plan of PLANLAR) {
  const mekan = uret(plan);
  fs.writeFileSync(path.join(klasor, `${mekan.id}.json`), JSON.stringify(mekan, null, 1) + '\n');
  if (!liste.mekanlar.some(m => m.id === mekan.id)) liste.mekanlar.push({id: mekan.id, ad: mekan.ad, tur: mekan.tur});
  console.log(`${mekan.id.padEnd(30)} s.${plan.sayfa}  ${mekan.noktalar.length} nokta, ${mekan.hedefler.length} hedef`);
}
fs.writeFileSync(path.join(klasor, 'index.json'), JSON.stringify(liste, null, 2)
  .replace(/\{\n\s+"id": ("[^"]+"),\n\s+"ad": ("[^"]+"),\n\s+"tur": ("[^"]+")\n\s+\}/g, '{"id": $1, "ad": $2, "tur": $3}') + '\n');
