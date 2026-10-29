/// Gebze Emlak Konutları 3. Etap düzenleri (mekan-deposu) gerçek sorularla doğru yere götürüyor mu?
import {blokKoduBirlestir, hedefBul, rotaBul, rotaTarifi, yerlesimDogrula} from '../src/mekan/yerlesim';
import {sesliKomutCoz} from '../src/ayristirma/komut';
import {Mekan} from '../src/tipler';
import siteVerisi from '../mekan-deposu/mekanlar/gebze-emlak-konutlari-3.json';
import daireVerisi from '../mekan-deposu/mekanlar/gebze-a-tipi-2-1.json';

const site = yerlesimDogrula(siteVerisi) as Mekan;
const daire = yerlesimDogrula(daireVerisi) as Mekan;

// Sesli komuttan hedefe: kullanıcının söyleyeceği cümle → bulunan hedefin adı
function sor(y: Mekan, cumle: string, baslangic?: string): string | undefined {
  const komut = sesliKomutCoz(cumle);
  if (komut.tur !== 'nerede') throw new Error(`"${cumle}" yol tarifi komutu olarak anlaşılmadı: ${komut.tur}`);
  const sonuc = hedefBul(y, komut.aranan, baslangic);
  return sonuc?.tur === 'hedef' ? sonuc.hedef.ad : undefined;
}

describe('site', () => {
  test('geçerli', () => {
    expect(site).not.toBeNull();
    expect(site.hedefler.filter(h => / Blok$/.test(h.ad))).toHaveLength(37);   // A1–6, B1–8, C1–6, D1–2, E1–3, F1–12
  });

  test('girişten her hedefe yol var', () => {
    for (const h of site.hedefler) {
      expect(rotaBul(site, site.giris, h.nokta)).not.toBeNull();
    }
  });

  test.each([
    ['B4 blok nerede', 'B4 Blok'],
    ['b 4 blok nerede', 'B4 Blok'],
    ['be dört blok nerede', 'B4 Blok'],
    ['C3 bloğa nasıl giderim', 'C3 Blok'],
    ['F12 blok nerede', 'F12 Blok'],
    ['basketbol sahası nerede', 'Basketbol sahası'],
  ])('%j → %s', (cumle, ad) => {
    expect(sor(site, cumle)).toBe(ad);
  });

  test('"F1" sorusu "F12"ye gitmez', () => {
    expect(sor(site, 'F1 blok nerede')).toBe('F1 Blok');
  });

  test('blok kodu birleştirme', () => {
    expect(blokKoduBirlestir('Be dört blok')).toBe('b4 blok');
    expect(blokKoduBirlestir('F on iki')).toBe('f12');
    expect(blokKoduBirlestir('a 6')).toBe('a6');
  });
});

describe('A tipi 2+1 daire', () => {
  test('geçerli', () => {
    expect(daire).not.toBeNull();
  });

  test.each([
    ['mutfak nerede', 'Mutfak'],
    ['salon nerede', 'Salon'],
    ['balkon nerede', 'Balkon'],
    ['tuvalet nerede', 'Banyo'],
    ['ebeveyn banyosu nerede', 'Ebeveyn banyosu'],      // "ebeveyn" ve "banyo"dan daha belirgin
    ['yatak odası nerede', 'Ebeveyn yatak odası'],
    ['küçük oda nerede', 'Oda'],
    ['çıkış kapısı nerede', 'Giriş kapısı'],
  ])('%j → %s', (cumle, ad) => {
    expect(sor(daire, cumle)).toBe(ad);
  });

  test('girişten ebeveyn banyosuna tarif', () => {
    const hedef = daire.hedefler.find(h => h.ad === 'Ebeveyn banyosu')!;
    expect(rotaTarifi(daire, 'kapi', hedef)).toBe(
      'Ebeveyn banyosu için: Daireye girin ve giriş holünde düz ilerleyin, yaklaşık 3 adım. Giriş holü noktasına ulaşacaksınız. ' +
      'Sonra holde sağa dönüp koridora girin ve düz ilerleyin, yaklaşık 4 adım. Koridor, oda kapısı önü noktasına ulaşacaksınız. ' +
      'Sonra koridorda bir adım daha ilerleyin, yaklaşık 1 adım. Koridor, banyo kapısı önü noktasına ulaşacaksınız. ' +
      'Sonra koridorun sonuna ilerleyin, yaklaşık 2 adım. Ebeveyn yatak odası kapısı noktasına ulaşacaksınız. ' +
      'Sonra yatak odasına girin, sağ çaprazdaki köşeye yönelin, yaklaşık 4 adım. Ebeveyn banyosu kapısı noktasına ulaşacaksınız. ' +
      'Ebeveyn banyosu kapısı önünüzde.');
  });
});

describe('üretilen daire planları (katalog s.33–46)', () => {
  const liste: {mekanlar: {id: string}[]} = require('../mekan-deposu/mekanlar/index.json');
  const daireler = liste.mekanlar.map(m => m.id).filter(id => /^gebze-[a-f]-tipi-/.test(id) && id !== 'gebze-a-tipi-2-1');
  const yukle = (id: string) => yerlesimDogrula(require(`../mekan-deposu/mekanlar/${id}.json`)) as Mekan;

  test('katalogdaki 14 plan da var', () => {
    expect(daireler).toHaveLength(14);
  });

  test.each(daireler)('%s: geçerli, girişten her hedefe yol var', id => {
    const m = yukle(id);
    expect(m).not.toBeNull();
    for (const h of m.hedefler) expect(rotaBul(m, m.giris, h.nokta)).not.toBeNull();
  });

  test.each(daireler)('%s: mutfak, banyo ve salon bulunur', id => {
    const m = yukle(id);
    expect(sor(m, 'mutfak nerede')).toMatch(/Mutfak|mutfak/);
    expect(sor(m, 'banyo nerede')).toMatch(/Banyo|banyo/);
    expect(sor(m, 'salon nerede')).toMatch(/^Salon/);
  });

  test('koridorda gidişte solda kalan kapı dönüşte sağda söylenir', () => {
    const m = yukle('gebze-c-tipi-4-1');
    const ileri = rotaTarifi(m, m.giris, m.hedefler.find(h => h.ad === 'Oda 3')!);
    const geri = rotaTarifi(m, 'koridor-oda-3', m.hedefler.find(h => h.ad === 'Mutfak')!);
    expect(ileri).toContain('salon kapısı solunuzda');
    expect(geri).toContain('salon kapısı sağınızda');
    expect(geri).toContain('ayrımda giriş tarafı sağınızda kalacak');   // güney (sol) koldan dönerken
  });

  test('dubleks: üst kattaki odaya merdivenle gidilir', () => {
    const m = yukle('gebze-f-tipi-4-1-dubleks');
    const tarif = rotaTarifi(m, m.giris, m.hedefler.find(h => h.ad === 'Oda 3')!);
    expect(tarif).toContain('dikkat, merdiven. Merdivenle 1 kat yukarı çıkın, toplam 16 basamak.');
    expect(tarif).toContain('1. kat, Oda 3 kapısı noktasına ulaşacaksınız.');
    expect(sor(m, 'oda 3 nerede')).toBe('Oda 3');
    expect(sor(m, 'oda üç nerede')).toBe('Oda 3');
  });
});

describe('blok içi düzen üreticisi', () => {
  const {blokUret, tipAdi} = require('../docs/gebze-blok-uret.js');
  // Örnek blok: zemin + 5 kat, her katta 4 daire (gerçek bilgiler gelince docs/gebze-bloklar.json'a girilecek)
  const blok = yerlesimDogrula(blokUret({
    blok: 'B4', katlar: [0, 1, 2, 3, 4, 5], asansor: true, basamak: 20, girisAdim: 6, ilkNo: 1,
    kattakiDaireler: [
      {yer: 'sol', adim: 3, tip: 'gebze-b-tipi-2-1'}, {yer: 'sol-capraz', adim: 4, tip: 'gebze-b-tipi-3-1'},
      {yer: 'sag-capraz', adim: 4, tip: 'gebze-b-tipi-3-1'}, {yer: 'sag', adim: 3, tip: 'gebze-b-tipi-2-1'},
    ],
  })) as Mekan;

  test('geçerli; 24 daire, hepsine yol var', () => {
    expect(blok).not.toBeNull();
    expect(blok.id).toBe('gebze-b4-blok');
    const daireler = blok.hedefler.filter(h => h.no);
    expect(daireler).toHaveLength(24);
    for (const d of daireler) expect(rotaBul(blok, blok.giris, d.nokta)).not.toBeNull();
  });

  test.each([
    ['12 numaralı daire nerede', '12 numaralı daire'],
    ['daire 7', '7 numaralı daire'],
    ['21 numara nerede', '21 numaralı daire'],
    ['asansör nerede', 'Asansör'],
  ])('%j → %s', (cumle, ad) => {
    expect(sor(blok, cumle)).toBe(ad);
  });

  test('12 numaralı daire: 2. kat, asansör arkanızdayken sağda; daire planı söylenir', () => {
    const hedef12 = blok.hedefler.find(h => h.no === '12')!;
    const merdivenli = rotaTarifi(blok, blok.giris, hedef12);
    expect(merdivenli).toContain('Merdivenle 2 kat yukarı çıkın, toplam 40 basamak');
    const asansorlu = rotaTarifi(blok, blok.giris, hedef12, ['merdiven']);
    expect(asansorlu).toContain('asansöre binin ve 2. kat düğmesine basın.');   // her kat için ayrı ayrı değil, bir kez
    expect(asansorlu).toContain('asansör arkanızdayken sağınızdaki 12 numaralı daire kapısına yönelin');
    expect(hedef12.tarif).toContain('Daire planı B tipi 2+1.');
  });

  test('daire tipi adları', () => {
    expect(tipAdi('gebze-c-tipi-2-1-acik-mutfak')).toBe('C tipi 2+1 açık mutfaklı');
    expect(tipAdi('gebze-f-tipi-4-1-dubleks')).toBe('F tipi 4+1 dubleks');
    expect(tipAdi('gebze-e-tipi-3-1-b')).toBe('E tipi 3+1 işlikli');
  });

  test('geçersiz blok kodu reddedilir', () => {
    expect(() => blokUret({blok: 'Z9', katlar: [0], kattakiDaireler: []})).toThrow(/Geçersiz blok/);
  });
});
