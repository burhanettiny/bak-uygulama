import {sesliKomutCoz} from '../src/ayristirma/komut';
import {rotaParcalari} from '../src/mekan/yerlesim';
import {mekanGetir} from '../src/mekan/mekanlar';

describe('adım boyu komutu', () => {
  test.each([
    ['adımlarım kısa', 'kısa'],
    ['Adım boyum uzun', 'uzun'],
    ['adım boyunu normal yap', 'normal'],
    ['adım boyu orta', 'normal'],
  ])('%j → %s', (metin, boy) => {
    expect(sesliKomutCoz(metin)).toEqual({tur: 'adimBoyu', boy});
  });

  test('adım sayarı komutları etkilenmez', () => {
    expect(sesliKomutCoz('adım sayarı kapat')).toEqual({tur: 'adimRehberi', acik: false});
  });
});

describe('adım çarpanı', () => {
  const ev = mekanGetir('gebze-b-tipi-3-1')!;
  const hedef = ev.noktalar[ev.noktalar.length - 1].id;

  test('kısa adımda sayılar ve tarifteki adım sayısı büyür', () => {
    const normal = rotaParcalari(ev, ev.giris, hedef)!;
    const kisa = rotaParcalari(ev, ev.giris, hedef, [], false, 1.4)!;
    normal.parcalar.forEach((p, i) => {
      if (p.dikey) return;
      const beklenen = Math.max(1, Math.round(p.adim * 1.4));
      expect(kisa.parcalar[i].adim).toBe(beklenen);
      expect(kisa.parcalar[i].metin).toContain(`yaklaşık ${beklenen} adım`);
    });
  });
});
