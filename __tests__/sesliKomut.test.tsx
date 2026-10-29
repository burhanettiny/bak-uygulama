import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import {sesiDinle} from '../src/servisler/ses';

// Mikrofon yerine sırayla verilen cümleler "duyulur"
jest.mock('../src/servisler/ses', () => ({
  ...jest.requireActual('../src/servisler/ses'),
  konusVeBekle: jest.fn(() => Promise.resolve()),
  sesiDinle: jest.fn(),
  sesliSoyele: jest.fn(),
}));
const {sesliSoyele, konusVeBekle} = jest.requireMock('../src/servisler/ses');

async function uygulamayiAc() {
  let kok: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    kok = ReactTestRenderer.create(<App />);
  });
  return kok!;
}

const yazilar = (kok: ReactTestRenderer.ReactTestRenderer) =>
  kok.root.findAllByType('Text' as any).map(t => [t.props.children].flat().join(''));

// Ana ekranın tamamını kaplayan, uzun basışı dinleyen dokunma alanı
async function uzunBas(kok: ReactTestRenderer.ReactTestRenderer, soylenen: string) {
  (sesiDinle as jest.Mock).mockResolvedValueOnce({metin: soylenen});
  const alan = kok.root.findAll(n => typeof n.props.onLongPress === 'function')[0];
  await ReactTestRenderer.act(async () => {
    await alan.props.onLongPress();
  });
}

beforeEach(() => jest.clearAllMocks());

test('uzun basıp "listeye süt ekle" denince ürün listeye eklenir', async () => {
  const kok = await uygulamayiAc();
  expect(yazilar(kok)).toContain('📝 ALIŞVERİŞ LİSTESİ (0)');

  await uzunBas(kok, 'Listeye süt ve ekmek ekle');

  expect(yazilar(kok)).toContain('📝 ALIŞVERİŞ LİSTESİ (2)');
  expect(sesliSoyele).toHaveBeenLastCalledWith('süt, ekmek listeye eklendi.');
});

test('"listemi aç" liste ekranına geçer', async () => {
  const kok = await uygulamayiAc();
  await uzunBas(kok, 'listemi aç');
  expect(yazilar(kok)).toContain('LİSTEM');
});

test('mağaza yokken "süt nerede" sorulursa önce QR istenir', async () => {
  const kok = await uygulamayiAc();
  await uzunBas(kok, 'süt nerede');
  expect(sesliSoyele).toHaveBeenLastCalledWith(expect.stringMatching(/^Önce bina ya da mağaza girişindeki QR kodu okutun/));
});

test('anlaşılmayan komutta yardım önerilir', async () => {
  const kok = await uygulamayiAc();
  await uzunBas(kok, 'bugün hava güzel');
  expect(sesliSoyele).toHaveBeenLastCalledWith(expect.stringContaining('yardım deyin'));
});

test('hastane girişinde QR okutulup doktor sorulunca kat ve merdiven dahil yol tarif edilir', async () => {
  // Kamerayı hazır göster ki barkod modu açılabilsin
  const {useCameraDevice} = require('react-native-vision-camera');
  (useCameraDevice as jest.Mock).mockReturnValue({id: 'arka', hasTorch: true});
  const kok = await uygulamayiAc();

  await uzunBas(kok, 'barkod oku');
  const tarayici = kok.root.findAll(n => n.props.codeScanner)[0].props.codeScanner;
  // Girişte yerler numaralı okunur ve seçim beklenir; kullanıcı bu kez bir şey söylemiyor
  (sesiDinle as jest.Mock).mockResolvedValueOnce({hata: 'anlasilmadi', kod: '7'});
  await ReactTestRenderer.act(async () => {
    await tarayici.onCodeScanned([{value: 'BAK:MEKAN:ornek-hastane'}]);
  });
  const karsilama = (konusVeBekle as jest.Mock).mock.calls.at(-1)[0];
  expect(karsilama).toMatch(/^Hoş geldiniz: Örnek Devlet Hastanesi\. Giriştesiniz\./);
  expect(karsilama).toMatch(/Burada \d+ yer var\. Zemin kat: 1, Danışma; 2, Vezne;.* 1\. kat: .*Kardiyoloji Polikliniği.*Gitmek istediğiniz yerin numarasını ya da adını söyleyin\.$/);
  expect(yazilar(kok)).toContain('📍 Örnek Devlet Hastanesi');

  await uzunBas(kok, "Doktor Ayşe Yılmaz'ın odası nerede");
  const tarif = (sesliSoyele as jest.Mock).mock.calls.at(-1)[0];
  expect(tarif).toMatch(/^Dr\. Ayşe Yılmaz, Kardiyoloji Polikliniği, oda 112, 1\. kat\. Kardiyoloji Polikliniği için:/);
  expect(tarif).toContain('dikkat, merdiven. Merdivenle 1 kat yukarı çıkın, toplam 24 basamak.');
  expect(yazilar(kok)).toContain('🎯 Hedef: Kardiyoloji Polikliniği');

  // Merdivenden kaçınınca aynı soru asansörle tarif edilir
  await uzunBas(kok, 'merdiven kullanma');
  await uzunBas(kok, 'Ayşe Yılmaz nerede');
  const asansorlu = (sesliSoyele as jest.Mock).mock.calls.at(-1)[0];
  expect(asansorlu).toContain('asansöre binin ve 1. kat düğmesine basın');
  expect(asansorlu).not.toContain('basamak');

  (useCameraDevice as jest.Mock).mockReturnValue(undefined);
});
