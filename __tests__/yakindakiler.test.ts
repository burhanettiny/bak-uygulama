import {mekanGetir} from '../src/mekan/mekanlar';
import {yakindakilerMetni, yolUzunlugu} from '../src/mekan/yerlesim';

const hastane = mekanGetir('ornek-hastane')!;

test('bölge etiketinde en yakın üç yer, yakından uzağa, adım sayısıyla söylenir', () => {
  const nokta = hastane.giris;
  const metin = yakindakilerMetni(hastane, nokta);
  expect(metin).toMatch(/^ Yakınınızda: .+, yaklaşık \d+ adım/);
  const parcalar = metin.replace(' Yakınınızda: ', '').replace(/\.$/, '').split('; ');
  expect(parcalar.length).toBeLessThanOrEqual(3);
  const adimlar = parcalar.map(p => Number(p.match(/(\d+) adım/)![1]));
  expect([...adimlar].sort((a, b) => a - b)).toEqual(adimlar);
  // Söylenen adım gerçek yürüme mesafesidir
  const ilk = hastane.hedefler.find(h => parcalar[0].startsWith(h.kisaAd || h.ad))!;
  expect(adimlar[0]).toBe(yolUzunlugu(hastane, nokta, ilk.nokta));
});

test('kullanıcının adım uzunluğuna göre ölçeklenir; bulunulan noktadaki yer sayılmaz', () => {
  const nokta = hastane.giris;
  const normal = Number(yakindakilerMetni(hastane, nokta).match(/yaklaşık (\d+) adım/)![1]);
  const kisa = Number(yakindakilerMetni(hastane, nokta, 1.5).match(/yaklaşık (\d+) adım/)![1]);
  expect(kisa).toBe(Math.round(normal * 1.5));
  const buradaki = hastane.hedefler.find(h => h.nokta !== hastane.giris)!;
  expect(yakindakilerMetni(hastane, buradaki.nokta)).not.toContain(`${buradaki.kisaAd || buradaki.ad},`);
});
