import {Mekan} from '../tipler';
import {yerlesimDogrula} from './yerlesim';
import ornekMarket from './veri/ornek-market.json';
import ornekHastane from './veri/ornek-hastane.json';
// Ev içi deneme için: internet ve GitHub yayını olmadan da çalışsın. Depodaki sürüm daha yeniyse o kullanılır.
import gebzeB31 from '../../mekan-deposu/mekanlar/gebze-b-tipi-3-1.json';

// Uygulamayla birlikte gelen mekân yerleşimleri. QR'daki kimlikle GitHub Pages'ten indirilenler de
// aynı biçimdedir ve yerlesimDogrula'dan geçer.
const PAKETLI_MEKANLAR: Record<string, unknown> = {
  'ornek-market': ornekMarket,
  'ornek-hastane': ornekHastane,
  'gebze-b-tipi-3-1': gebzeB31,
};

export function mekanGetir(id: string): Mekan | null {
  return yerlesimDogrula(PAKETLI_MEKANLAR[id]);
}
