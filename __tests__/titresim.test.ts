import {iphoneVurusSayisi} from '../src/servisler/titresim';
import {TITRESIM} from '../src/sabitler';

test('iPhone: Android desenleri vuruş sayısına çevrilir', () => {
  expect(iphoneVurusSayisi(TITRESIM.sesDuyuldu)).toBe(1);     // [0, 40]: tek, kısa "duyuyorum"
  expect(iphoneVurusSayisi(TITRESIM.urunBulundu)).toBe(2);    // [0, 100, 80, 200]
  expect(iphoneVurusSayisi(TITRESIM.posBulundu)).toBe(3);
  expect(iphoneVurusSayisi(30)).toBe(1);
});
