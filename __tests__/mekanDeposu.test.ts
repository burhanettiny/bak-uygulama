// GitHub'a yüklenen mekan-deposu klasöründeki düzenler uygulamanın kabul edeceği biçimde mi?
// Bozuk bir dosya yayınlanırsa uygulama onu reddeder; bu test sorunu yayından önce yakalar.
import {yerlesimDogrula} from '../src/mekan/yerlesim';

// Node tipleri projeye eklenmiyor (uygulamanın fetch tipleriyle çakışıyor); yalnızca gereken kadarı:
declare const __dirname: string;
const fs = jest.requireActual<{
  readdirSync(yol: string): string[];
  readFileSync(yol: string, kodlama: 'utf8'): string;
}>('fs');
const path = jest.requireActual<{join(...parcalar: string[]): string}>('path');

const KLASOR = path.join(__dirname, '..', 'mekan-deposu', 'mekanlar');
const dosyalar = fs.readdirSync(KLASOR).filter(f => f.endsWith('.json') && f !== 'index.json');
const oku = (f: string) => JSON.parse(fs.readFileSync(path.join(KLASOR, f), 'utf8'));
const liste: {mekanlar: {id: string; ad: string}[]} = oku('index.json');

test('depoda en az bir mekân var', () => {
  expect(dosyalar.length).toBeGreaterThan(0);
});

test.each(dosyalar)('%s geçerli ve kimliği dosya adıyla aynı', dosya => {
  const mekan = yerlesimDogrula(oku(dosya));
  expect(mekan).not.toBeNull();
  expect(mekan!.id).toBe(dosya.replace(/\.json$/, ''));
  expect(mekan!.id).toMatch(/^[\w-]+$/);
});

test('index.json depodaki dosyalarla birebir aynı', () => {
  expect(liste.mekanlar.map(m => `${m.id}.json`).sort()).toEqual([...dosyalar].sort());
  for (const m of liste.mekanlar) {
    expect(m.ad).toBe(oku(`${m.id}.json`).ad);
  }
});

// "q-" kimlikleri kurumların kendi QR'ıyla gelen, doğrulanmamış binalara ayrılmıştır (bkz. src/mekan/qrVeri.ts)
test('depodaki doğrulanmış binaların kimliği "q-" ile başlamaz', () => {
  expect(dosyalar.filter(f => f.startsWith('q-'))).toEqual([]);
});
