import {urunBilgisiGetir} from '../src/servisler/urunApi';

const yanit = (veri: object) => Promise.resolve({json: () => Promise.resolve(veri)} as Response);
const bulunamadi = {status: 0};
const asla = () => new Promise<Response>(() => {});

afterEach(() => { (globalThis as any).fetch = jest.fn(() => Promise.reject(new Error('ağ yok'))); });

test('gıda veritabanı bulunca diğer yavaş kaynaklar beklenmez', async () => {
  (globalThis as any).fetch = jest.fn((url: string) => url.includes('openfoodfacts')
    ? yanit({status: 1, product: {product_name: 'Çikolatalı Gofret', brands: 'Ülker', categories_tags: []}})
    : asla());
  await expect(urunBilgisiGetir('8690504020509')).resolves.toMatchObject({ad: 'Çikolatalı Gofret', marka: 'Ülker'});
});

test('öncelikli kaynak bulamazsa sıradakinin sonucu kullanılır', async () => {
  (globalThis as any).fetch = jest.fn((url: string) => url.includes('upcitemdb')
    ? yanit({code: 'OK', items: [{title: 'Diş Fırçası', brand: 'X'}]})
    : yanit(bulunamadi));
  await expect(urunBilgisiGetir('123')).resolves.toMatchObject({ad: 'Diş Fırçası', kaynak: 'Genel Ürün Veritabanı'});
});

test('hiçbiri bulamazsa null; isteklerde uygulama kendini tanıtır', async () => {
  const sahte = jest.fn((_url: string, _s?: RequestInit) => yanit(bulunamadi));
  (globalThis as any).fetch = sahte;
  await expect(urunBilgisiGetir('000')).resolves.toBeNull();
  expect((sahte.mock.calls[0][1]!.headers as Record<string, string>)['User-Agent']).toMatch(/^BAK\//);
});
