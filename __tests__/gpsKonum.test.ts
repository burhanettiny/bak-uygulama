import {Mekan} from '../src/tipler';
import {gpsIleEnYakinNokta, gpsliNoktaVar} from '../src/mekan/yerlesim';

// Ardahan Üniversitesi şablonundaki iki nokta (OSM koordinatları); aralarında ~1 km var
const kampus: Mekan = {
  id: 'kampus', ad: 'Kampüs', giris: 'giris',
  noktalar: [
    {id: 'giris', ad: 'Ana giriş', enlem: 41.130848, boylam: 42.786478},
    {id: 'cami', ad: 'Cami', enlem: 41.133812, boylam: 42.774933},
    {id: 'koridor', ad: 'Koridor'},
  ],
  baglantilar: [], hedefler: [],
} as unknown as Mekan;

test('açık alanda GPS hassassa en yakın nokta ve mesafesi bulunur', () => {
  // Girişin ~11 m kuzeyi
  const yakin = gpsIleEnYakinNokta(kampus, {enlem: 41.130948, boylam: 42.786478, dogruluk: 8});
  expect(yakin?.nokta).toBe('giris');
  expect(yakin!.metre).toBeGreaterThan(9);
  expect(yakin!.metre).toBeLessThan(13);
});

test('GPS zayıfsa, nokta çok uzaksa ya da koordinatlı nokta yoksa kullanılmaz', () => {
  expect(gpsIleEnYakinNokta(kampus, {enlem: 41.130948, boylam: 42.786478, dogruluk: 35})).toBeNull();
  expect(gpsIleEnYakinNokta(kampus, {enlem: 41.1323, boylam: 42.7807, dogruluk: 5})).toBeNull();
  expect(gpsIleEnYakinNokta(kampus, null)).toBeNull();
  const binaIci = {...kampus, noktalar: [{id: 'koridor', ad: 'Koridor'}]} as Mekan;
  expect(gpsliNoktaVar(binaIci)).toBe(false);
  expect(gpsliNoktaVar(kampus)).toBe(true);
  expect(gpsIleEnYakinNokta(binaIci, {enlem: 41.130848, boylam: 42.786478, dogruluk: 3})).toBeNull();
});
