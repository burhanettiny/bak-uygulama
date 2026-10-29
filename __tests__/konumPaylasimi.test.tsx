import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import {sesliKomutCoz} from '../src/ayristirma/komut';
import {kisiBul, konumMesaji, whatsappNumarasi} from '../src/ayristirma/konumMesaji';

jest.mock('../src/servisler/ses', () => ({
  ...jest.requireActual('../src/servisler/ses'),
  konusVeBekle: jest.fn(() => Promise.resolve()),
  sesiDinle: jest.fn(),
  sesliSoyele: jest.fn(),
}));
jest.mock('../src/servisler/cihaz', () => ({
  ...jest.requireActual('../src/servisler/cihaz'),
  konumAl: jest.fn(() => Promise.resolve(null)),
  kisiSec: jest.fn(() => Promise.resolve(null)),
  mesajAc: jest.fn(() => Promise.resolve(true)),
  paylas: jest.fn(() => Promise.resolve(true)),
  yardimAra: jest.fn(() => Promise.resolve('arandi')),
  whatsappYardimcisiAcikMi: jest.fn(() => Promise.resolve(false)),
  erisilebilirlikAyarlariniAc: jest.fn(),
  canliKonumPaylas: jest.fn(() => Promise.resolve({sonuc: 'paylasildi'})),
  whatsappGonder: jest.fn(() => Promise.resolve('acildi')),
}));
const {sesliSoyele, konusVeBekle, sesiDinle} = jest.requireMock('../src/servisler/ses');
const {
  canliKonumPaylas, erisilebilirlikAyarlariniAc, konumAl, kisiSec, mesajAc, paylas, whatsappGonder, whatsappYardimcisiAcikMi,
  yardimAra,
} = jest.requireMock('../src/servisler/cihaz');
const AsyncStorage = require('@react-native-async-storage/async-storage');

const KISILER = [{ad: 'Ayşe Yılmaz', numara: '05321234567'}, {ad: 'Annem', numara: '05339876543'}];
const GPS = {enlem: 40.802345, boylam: 29.430123, dogruluk: 12, zaman: 1_000_000};

describe('konum mesajı', () => {
  test('bina içinde bina, kat ve nokta; dışarıda harita bağlantısı', () => {
    expect(konumMesaji({bina: 'Örnek Devlet Hastanesi', nokta: '1. kat, Kardiyoloji kapısı', hedef: 'Göz Polikliniği'}))
      .toBe('BAK konum bildirimi: Örnek Devlet Hastanesi, 1. kat, Kardiyoloji kapısı yakınındayım. Göz Polikliniği için yoldayım.');
    expect(konumMesaji({gps: GPS, simdi: GPS.zaman}))
      .toBe('BAK konum bildirimi: Haritada: https://maps.google.com/?q=40.802345,29.430123 (yaklaşık 12 m)');
    expect(konumMesaji({gps: GPS, simdi: GPS.zaman + 10 * 60000})).toContain('10 dakika önceki konum');
    expect(konumMesaji({})).toBeNull();
  });

  test.each([
    ['0532 123 45 67', '905321234567'], ['5321234567', '905321234567'], ['+90 532 123 45 67', '905321234567'],
    ['0090 532 123 45 67', '905321234567'], ['+90 (0532) 123-45-67', '905321234567'], ['90 532 123 4567', '905321234567'],
    ['0 (262) 123 45 67', '902621234567'], ['+49 151 2345 6789', '4915123456789'], ['0049 151 2345 6789', '4915123456789'],
  ])(
    'WhatsApp numarası %s → %s', (numara, beklenen) => expect(whatsappNumarasi(numara)).toBe(beklenen));

  test.each([['Ayşe’ye', 'Ayşe Yılmaz'], ["ayşeye", 'Ayşe Yılmaz'], ['annemi', 'Annem'], ['anneme', 'Annem']])(
    'söylenen ad %j → %s', (soylenen, ad) => expect(kisiBul(KISILER, soylenen).map(k => k.ad)).toEqual([ad]));

  test('tanınmayan ad boş döner', () => expect(kisiBul(KISILER, 'Mehmet')).toEqual([]));
});

describe('komutlar', () => {
  test.each([
    ['konumumu gönder', null, null],
    ["konumumu Ayşe'ye gönder", "ayşe'ye", null],
    ['Annemlere konumumu at', 'annemlere', null],
    ["konumumu Ayşe'ye WhatsApp'tan gönder", "ayşe'ye", 'whatsapp'],
    ['konumumu mesajla paylaş', null, 'sms'],
  ])('%j', (metin, kisi, kanal) => {
    expect(sesliKomutCoz(metin)).toEqual({tur: 'konumGonder', kisi, kanal, canli: false});
  });

  test('"canlı konumumu paylaş" WhatsApp’ın canlı konumuna yönlendirir', () => {
    expect(sesliKomutCoz('canlı konumumu paylaş')).toEqual({tur: 'konumGonder', kisi: null, kanal: 'whatsapp', canli: true});
    expect(sesliKomutCoz("canlı konumumu Ayşe'ye gönder")).toEqual(
      {tur: 'konumGonder', kisi: "ayşe'ye", kanal: 'whatsapp', canli: true});
  });

  test.each(['acil kişi ekle', 'rehberden kişi seç', 'yakın ekle'])('%j → acilKisiEkle', metin =>
    expect(sesliKomutCoz(metin)).toEqual({tur: 'acilKisiEkle'}));

  test('"annemi ara" kişi aramasıdır; "etiket ara" ve "barkod" ayrı kalır', () => {
    expect(sesliKomutCoz('annemi ara')).toEqual({tur: 'kisiAra', kisi: 'annemi'});
    expect(sesliKomutCoz('etiket ara')).toEqual({tur: 'etiketAra'});
    expect(sesliKomutCoz('yardım çağır')).toEqual({tur: 'yardimCagir'});
  });
});

describe('uygulamada', () => {
  // WhatsApp yardımcısı ve canlı konum otomasyonu Android'e özgü (Jest varsayılanı iOS)
  const {Platform} = require('react-native');
  beforeAll(() => { Platform.OS = 'android'; });
  afterAll(() => { Platform.OS = 'ios'; });
  let kok: ReactTestRenderer.ReactTestRenderer;
  const sonSoylenen = () => (sesliSoyele as jest.Mock).mock.calls.at(-1)?.[0];

  async function soyle(...cumleler: string[]) {
    cumleler.forEach(c => (sesiDinle as jest.Mock).mockResolvedValueOnce({metin: c}));
    await ReactTestRenderer.act(async () => {
      await kok.root.findAll(n => typeof n.props.onLongPress === 'function')[0].props.onLongPress();
    });
    for (let i = 0; i < 10; i++) {
      await ReactTestRenderer.act(async () => { await new Promise<void>(r => setTimeout(r, 0)); });
    }
  }

  async function ac(kisiler = KISILER) {
    await AsyncStorage.setItem('acilKisiler', JSON.stringify(kisiler));
    await AsyncStorage.removeItem('ayar:yardimNumarasi');
    await AsyncStorage.removeItem('aktifMekan');
    await AsyncStorage.removeItem('whatsappYardimcisiSoruldu');
    await ReactTestRenderer.act(async () => { kok = ReactTestRenderer.create(<App />); });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (sesiDinle as jest.Mock).mockReset();
  });
  afterEach(() => ReactTestRenderer.act(() => kok.unmount()));

  test('"konumumu Ayşe’ye gönder": varsayılan WhatsApp; GPS bağlantılı mesaj hazır açılır', async () => {
    (konumAl as jest.Mock).mockResolvedValueOnce({...GPS, zaman: Date.now()});
    await ac();
    await soyle("konumumu Ayşe'ye gönder");
    expect(whatsappGonder).toHaveBeenCalledWith('05321234567', expect.stringContaining('https://maps.google.com/?q=40.802345,29.430123'));
    expect(mesajAc).not.toHaveBeenCalled();
    expect(sonSoylenen()).toBe("Ayşe Yılmaz için konum mesajı WhatsApp'ta hazır. Göndermek için sağ alttaki gönder tuşuna basın.");
  });

  test('yardımcı açıksa WhatsApp mesajı dokunmadan gönderilir', async () => {
    (konumAl as jest.Mock).mockResolvedValueOnce({...GPS, zaman: Date.now()});
    (whatsappGonder as jest.Mock).mockResolvedValueOnce('gonderildi');
    await ac();
    await soyle("konumumu Ayşe'ye gönder");
    expect(sonSoylenen()).toBe("Konumunuz WhatsApp'tan Ayşe Yılmaz kişisine gönderildi.");
  });

  test('WhatsApp yoksa SMS’e düşülür; "SMS ile" denirse doğrudan SMS', async () => {
    (konumAl as jest.Mock).mockResolvedValueOnce({...GPS, zaman: Date.now()});
    (whatsappGonder as jest.Mock).mockResolvedValueOnce('acilmadi');
    await ac();
    await soyle("konumumu Ayşe'ye gönder");
    expect(mesajAc).toHaveBeenCalledWith('05321234567', expect.any(String), 'sms');
    expect(sonSoylenen()).toBe('Ayşe Yılmaz için konum mesajı hazır. Göndermek için mesaj ekranındaki gönder tuşuna basın.');
    (whatsappGonder as jest.Mock).mockClear();
    (konumAl as jest.Mock).mockResolvedValueOnce({...GPS, zaman: Date.now()});
    await soyle("konumumu Ayşe'ye SMS ile gönder");
    expect(whatsappGonder).not.toHaveBeenCalled();
    expect(mesajAc).toHaveBeenLastCalledWith('05321234567', expect.any(String), 'sms');
  });

  test('kişi söylenmezse birden çok acil kişi arasından sorulur; WhatsApp istenebilir', async () => {
    (konumAl as jest.Mock).mockResolvedValueOnce({...GPS, zaman: Date.now()});
    await ac();
    await soyle("konumumu WhatsApp'tan gönder", 'iki');
    expect(sonSoru()).toBe('Kime göndereyim? 1, Ayşe Yılmaz; 2, Annem.');
    expect(whatsappGonder).toHaveBeenCalledWith('05339876543', expect.any(String));
  });

  test('iPhone: yardımcı yok, ayarlar sorulmaz; iPhone WhatsApp düzenine göre adımlar anlatılır', async () => {
    Platform.OS = 'ios';
    try {
      (konumAl as jest.Mock).mockResolvedValueOnce({...GPS, zaman: Date.now()});
      await ac();
      await soyle("canlı konumumu Ayşe'ye gönder");
      expect(erisilebilirlikAyarlariniAc).not.toHaveBeenCalled();
      expect(sonSoru()).toMatch(/artı düğmesine.*Canlı Konumu Paylaş/);
      expect(mesajAc).toHaveBeenCalledWith('05321234567', expect.stringMatching(/Canlı konumumu da paylaşıyorum\.$/), 'whatsapp');
    } finally {
      Platform.OS = 'android';
    }
  });

  test('canlı konum, yardımcı kapalı: ilk seferde nasıl açılacağı anlatılır ve ayarlar açılır', async () => {
    (konumAl as jest.Mock).mockResolvedValueOnce({...GPS, zaman: Date.now()});
    await ac();
    await soyle("canlı konumumu Ayşe'ye gönder");
    expect(sonSoru()).toMatch(/BAK WhatsApp yardımcısını bir kez açmanız gerekiyor/);
    expect(erisilebilirlikAyarlariniAc).toHaveBeenCalled();
    expect(mesajAc).not.toHaveBeenCalled();
  });

  test('canlı konum, yardımcı kapalı ve önceden soruldu: adımlar anlatılır, sohbet hazır mesajla açılır', async () => {
    (konumAl as jest.Mock).mockResolvedValueOnce({...GPS, zaman: Date.now()});
    await ac();
    await AsyncStorage.setItem('whatsappYardimcisiSoruldu', 'true');
    await soyle("canlı konumumu Ayşe'ye gönder");
    expect(sonSoru()).toMatch(/^Ayşe Yılmaz ile WhatsApp sohbeti açılıyor\. .*Canlı konumu paylaş/);
    expect(mesajAc).toHaveBeenCalledWith('05321234567', expect.stringMatching(/Canlı konumumu da paylaşıyorum\.$/), 'whatsapp');
    expect(erisilebilirlikAyarlariniAc).not.toHaveBeenCalled();
  });

  test('canlı konum, yardımcı açık: dokunmadan paylaşılır; takılırsa kalan adımlar söylenir', async () => {
    (whatsappYardimcisiAcikMi as jest.Mock).mockResolvedValue(true);
    (konumAl as jest.Mock).mockResolvedValueOnce({...GPS, zaman: Date.now()});
    await ac();
    await soyle("canlı konumumu Ayşe'ye gönder");
    expect(canliKonumPaylas).toHaveBeenCalledWith('05321234567', expect.stringMatching(/Canlı konumumu da paylaşıyorum\.$/));
    expect(mesajAc).not.toHaveBeenCalled();
    expect(sonSoylenen()).toBe('Canlı konumunuz Ayşe Yılmaz ile bir saat boyunca paylaşılıyor. Konumunuz kendiliğinden güncellenir.');

    (canliKonumPaylas as jest.Mock).mockResolvedValueOnce({sonuc: 'yarim', adim: 'konum'});
    (konumAl as jest.Mock).mockResolvedValueOnce({...GPS, zaman: Date.now()});
    await soyle("canlı konumumu Ayşe'ye gönder");
    expect(sonSoylenen()).toMatch(/^Canlı konum konum adımında tamamlanamadı\. WhatsApp ekranında devam edin: /);
    (whatsappYardimcisiAcikMi as jest.Mock).mockResolvedValue(false);
  });

  test('acil kişi yoksa paylaşım menüsü açılır; konum hiç yoksa söylenir', async () => {
    (konumAl as jest.Mock).mockResolvedValueOnce({...GPS, zaman: Date.now()});
    await ac([]);
    await soyle('konumumu gönder');
    expect(paylas).toHaveBeenCalledWith(expect.stringContaining('maps.google.com'));
    (konumAl as jest.Mock).mockResolvedValueOnce(null);
    await soyle('konumumu gönder');
    expect(sonSoylenen()).toMatch(/^Konumunuz bulunamadı/);
  });

  test('rehberden acil kişi eklenir, "annemi ara" o kişiyi arar', async () => {
    await ac([]);
    (kisiSec as jest.Mock).mockResolvedValueOnce({ad: 'Annem', numara: '0533 987 65 43'});
    await soyle('acil kişi ekle');
    expect(JSON.parse(await AsyncStorage.getItem('acilKisiler'))).toEqual([{ad: 'Annem', numara: '05339876543'}]);
    await soyle('annemi ara');
    expect(yardimAra).toHaveBeenCalledWith('05339876543');
  });

  test('yardım numarası yoksa "yardım çağır" ilk acil kişiyi arar', async () => {
    await ac();
    await soyle('yardım çağır');
    expect(yardimAra).toHaveBeenCalledWith('05321234567');
  });

  function sonSoru() {
    return (konusVeBekle as jest.Mock).mock.calls.at(-1)?.[0];
  }
});

describe('konum komutunun farklı söyleyişleri', () => {
  test.each([
    ['konumumu gönder', null], ['konumu mu gönder', null], ['konu mu gönder', null], ['konum at', null],
    ['yerimi gönder', null], ['lokasyonumu paylaş', null], ['adresimi yolla', null],
    ["nerede olduğumu Ayşe'ye bildir", "ayşe'ye"], ['yerimi annemle paylaş', 'annemle'],
    ["konumumu Musa'ya gönder", "musa'ya"], ['konumumu annemlere haber ver', 'annemlere'],
  ])('%j → konum gönder (kişi %j)', (metin, kisi) => {
    expect(sesliKomutCoz(metin)).toEqual({tur: 'konumGonder', kisi, kanal: null, canli: false});
  });

  test('karışmaması gerekenler', () => {
    expect(sesliKomutCoz('nerede olduğumu bilmiyorum').tur).toBe('kayboldum');
    expect(sesliKomutCoz('neredeyim').tur).toBe('neredeyim');
    expect(sesliKomutCoz('konumum').tur).toBe('neredeyim');
    expect(sesliKomutCoz('yerimi WhatsApp’tan gönder')).toMatchObject({tur: 'konumGonder', kanal: 'whatsapp'});
  });
});
