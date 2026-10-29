import {donusMetni, rotaParcalari} from '../src/mekan/yerlesim';
import {veriQrCoz} from '../src/mekan/qrVeri';

declare const __dirname: string;
const fs = jest.requireActual<{readFileSync(yol: string, kodlama: 'utf8'): string}>('fs');
const path = jest.requireActual<{join(...p: string[]): string}>('path');

// QR oluşturucunun Çizim sayfasında hazırlanan okul (Python tarafında üretildi): girişten kuzeye hol, holün batısında
// müdür odası, doğusunda WC. Yollara çizimdeki yön yazılır; uygulama dönüşü izlenen rotaya göre söyler.
const OKUL = veriQrCoz(fs.readFileSync(path.join(__dirname, 'veri', 'kurum-qr-cizim.txt'), 'utf8'))!;
const metinler = (a: string, b: string) => rotaParcalari(OKUL, a, b)!.parcalar.map(p => p.metin);

test('dönüş açısı: oluşturucuyla aynı eşikler', () => {
  expect(donusMetni(0, 0)).toBe('Düz ilerleyin');
  expect(donusMetni(0, 90)).toBe('Sağa dönün');
  expect(donusMetni(0, 270)).toBe('Sola dönün');
  expect(donusMetni(350, 30)).toBe('Hafif sağa yönelin');
  expect(donusMetni(90, 270)).toBe('Geri dönün');
});

test('girişten müdür odasına: holde sola', () => {
  expect(OKUL).not.toBeNull();
  const m = metinler('giris', 'mudur-odasi');
  expect(m[0]).toMatch(/^Düz ilerleyin, yaklaşık 10 adım/);
  expect(m[1]).toMatch(/^Sola dönün, yaklaşık 8 adım\. Müdür odası kapısı noktasına ulaşacaksınız\./);
});

test('WC’den müdür odasına: holde düz (kayıtlı "sola" değil, gelinen yöne göre)', () => {
  const m = metinler('wc', 'mudur-odasi');
  expect(m[0]).toMatch(/^Geri dönün/);              // ilk bölüm: kayıtlı tarif (kullanıcının yönü bilinmez)
  expect(m[1]).toMatch(/^Düz ilerleyin, yaklaşık 8 adım/);
});

test('WC’den çıkışa: holde sola (batıya giderken güney soldadır)', () => {
  expect(metinler('wc', 'giris')[1]).toMatch(/^Sola dönün/);
});

test('yön bilgisi olmayan eski QR’lar eskisi gibi kayıtlı tarifi okur', () => {
  const eski = {...OKUL, baglantilar: OKUL.baglantilar.map(({yon: _y, ...b}) => b)};
  expect(rotaParcalari(eski, 'wc', 'mudur-odasi')!.parcalar[1].metin).toMatch(/^Sola dönün/);
});
