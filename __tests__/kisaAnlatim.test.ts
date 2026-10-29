import {rotaTarifi, yerlesimDogrula} from '../src/mekan/yerlesim';
import {Mekan} from '../src/tipler';

const ev = yerlesimDogrula(require('../mekan-deposu/mekanlar/gebze-b-tipi-3-1.json')) as Mekan;
const hastane = yerlesimDogrula(require('../src/mekan/veri/ornek-hastane.json')) as Mekan;
const hedef = (y: Mekan, ad: string) => y.hedefler.find(h => h.ad === ad)!;

describe('kısa anlatım', () => {
  test('evde: çerçeve ve varış cümleleri atılır, adım sayısı ve yön kalır', () => {
    const uzun = rotaTarifi(ev, 'kapi', hedef(ev, 'Banyo'));
    const kisa = rotaTarifi(ev, 'kapi', hedef(ev, 'Banyo'), [], true);
    expect(kisa.length).toBeLessThan(uzun.length * 0.75);
    expect(kisa).toBe('Banyo için: Daireye girin ve giriş holünde düz ilerleyin, 2 adım. ' +
      'Sonra sağa dönüp koridora girin; banyo kapısı sağınızda, 3 adım. Banyo kapısındasınız.');
    expect(kisa).not.toContain('ulaşacaksınız');
  });

  test('merdiven uyarısı kısa modda da eksiksiz söylenir', () => {
    const kisa = rotaTarifi(hastane, 'giris', hedef(hastane, 'Kardiyoloji Polikliniği'), [], true);
    expect(kisa).toContain('dikkat, merdiven. Merdivenle 1 kat yukarı çıkın, toplam 24 basamak. Korkuluk sağınızda, ara sahanlıkta sola dönün.');
  });
});
