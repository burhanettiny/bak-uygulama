import {yuruyusFiltresi} from '../src/mekan/yuruyusFiltresi';

// Zaman damgalarını (ms) sırayla verip her adımda kaç adımın sayıldığını toplar
function say(zamanlar: number[]): number[] {
  const filtre = yuruyusFiltresi();
  return zamanlar.map(filtre);
}

describe('yürüyüş filtresi', () => {
  test('dururken tek tük gelen sahte adımlar sayılmaz', () => {
    // Elde sallanma: 2 adım, 10 saniye sonra 2 adım daha
    expect(say([0, 400, 10000, 10500]).reduce((a, b) => a + b)).toBe(0);
  });

  test('yürüyüş başlayınca ilk 3 adım birlikte, sonrakiler tek tek sayılır', () => {
    expect(say([0, 600, 1200, 1800, 2400])).toEqual([0, 0, 3, 1, 1]);
  });

  test('uzun duraklamadan sonra yürüyüş yeniden doğrulanır', () => {
    expect(say([0, 600, 1200, 5000, 5600, 6200])).toEqual([0, 0, 3, 0, 0, 3]);
  });

  test('topluca gelen adımlar gerçek zaman damgalarıyla doğru değerlendirilir', () => {
    // 15:41:04'teki gibi: aynı anda gelen ama 410 ms arayla atılmış 3 adım gerçek yürüyüştür
    expect(say([82000, 82410, 82820])).toEqual([0, 0, 3]);
  });

  test('3 saniyeden geniş aralıklı adımlar yürüyüş sayılmaz', () => {
    expect(say([0, 2000, 4000, 6000, 8000]).reduce((a, b) => a + b)).toBe(0);
  });
});

test('telefondan alınan gerçek kayıt: tereddütlü ev içi yürüyüşte adımlar kaçmaz, tek tük olaylar elenir', () => {
  // 25 Ekim 16:19, HONOR 400 adım sensörü zaman damgaları (ms). Aralarda 2,05 ve 2,46 sn duraklamalar var.
  const yuruyus = [365289163, 365289709, 365290201, 365291047, 365293095, 365295553, 365296645,
    365297055, 365297901, 365299130, 365299512];
  const tekTuk = [365305083, 365309998, 365310326];   // dururken gelen olaylar
  const sonuc = say([...yuruyus, ...tekTuk]);
  expect(sonuc.slice(0, yuruyus.length).reduce((a, b) => a + b)).toBe(yuruyus.length);
  expect(sonuc.slice(yuruyus.length).reduce((a, b) => a + b)).toBe(0);
});
