import {kodYonu} from '../src/ayristirma/kodKonumu';

const ekran = {width: 400, height: 800};
const kod = (cx: number, cy: number, boy = 80) => ({x: cx - boy / 2, y: cy - boy / 2, width: boy, height: boy});

test.each([
  [kod(60, 400), 'Kod görünüyor. Telefonu biraz sola çevirin.'],
  [kod(340, 400), 'Kod görünüyor. Telefonu biraz sağa çevirin.'],
  [kod(200, 100), 'Kod görünüyor. Telefonu biraz yukarı çevirin.'],
  [kod(340, 700), 'Kod görünüyor. Telefonu biraz sağa ve aşağı çevirin.'],
  [kod(200, 400, 40), 'Kod ortada. Telefonu yavaşça yaklaştırın.'],
  [kod(200, 400, 200), 'Kod ortada, sabit tutun.'],
  [kod(200, 400, 380), 'Kod çok yakın, telefonu biraz uzaklaştırın.'],
])('%j → %s', (k, beklenen) => {
  expect(kodYonu(k, ekran)).toBe(beklenen);
});
