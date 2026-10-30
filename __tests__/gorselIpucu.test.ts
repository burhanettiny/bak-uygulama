import {eanGecerli, gorselIpucu} from '../src/ayristirma/kodKonumu';

const BOYUT = {width: 1000, height: 2000};
const kutu = (text: string, left: number, top: number, width = 300, height = 60) => ({text, frame: {left, top, width, height}});

test('EAN sağlama hanesi', () => {
  expect(eanGecerli('8690504012344')).toBe(true);
  expect(eanGecerli('8690504012348')).toBe(false);
  expect(eanGecerli('96385074')).toBe(true);
  expect(eanGecerli('123')).toBe(false);
});

test('barkodun altındaki rakamlar tam ve doğruysa barkod o numarayla aranır', () => {
  expect(gorselIpucu([kutu('8 690504 012344', 350, 900)], BOYUT)).toEqual({tur: 'barkod', deger: '8690504012344'});
});

test('çözülemeyen BAK etiketi: yeri ve uzaklığına göre yön söylenir', () => {
  expect(gorselIpucu([kutu('BAK · Neredeyim? Okutun', 40, 900, 200)], BOYUT))
    .toEqual({tur: 'yon', metin: 'Etiket görünüyor. Telefonu biraz sola çevirin.'});
  expect(gorselIpucu([kutu('Neredeyim? Okutun', 420, 950, 150)], BOYUT))
    .toEqual({tur: 'yon', metin: 'Etiket ortada. Telefonu yavaşça yaklaştırın.'});
  expect(gorselIpucu([kutu('BAK', 50, 50, 950, 1900)], BOYUT))
    .toEqual({tur: 'yon', metin: 'Etiket çok yakın, telefonu biraz uzaklaştırın.'});
});

test('eksik barkod rakamları: yön; ilgisiz yazı: sessiz', () => {
  expect(gorselIpucu([kutu('690504 01', 700, 1500)], BOYUT))
    .toEqual({tur: 'yon', metin: 'Barkod görünüyor. Telefonu biraz sağa ve aşağı çevirin.'});
  expect(gorselIpucu([kutu('Tam yağlı süt', 300, 900)], BOYUT)).toBeNull();
});
