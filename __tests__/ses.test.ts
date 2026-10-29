import Tts from 'react-native-tts';
import {konusVeBekle} from '../src/servisler/ses';

// Sesli komut "Dinliyorum" dedikten sonra konuşmanın bitmesini bekler. Gerçek telefonda burada
// react-native-tts'in removeEventListener'ı çağrılınca uygulama çöküyordu.
test('konuşma bitince beklemek biter ve dinleyici kaldırılır', async () => {
  const abonelik = {remove: jest.fn()};
  let bitti: (() => void) | undefined;
  (Tts.addEventListener as jest.Mock).mockImplementationOnce((_olay: string, cb: () => void) => {
    bitti = cb;
    return abonelik;
  });

  const bekleme = konusVeBekle('Dinliyorum.');
  expect(Tts.speak).toHaveBeenCalledWith('Dinliyorum.');
  bitti!();                     // TTS "tts-finish" olayı
  await expect(bekleme).resolves.toBeUndefined();
  expect(abonelik.remove).toHaveBeenCalledTimes(1);
});

test('konuşma bitiş olayı gelmezse 5 saniye sonra yine devam edilir', async () => {
  jest.useFakeTimers();
  const bekleme = konusVeBekle('Dinliyorum.');
  jest.advanceTimersByTime(5000);
  await expect(bekleme).resolves.toBeUndefined();
  jest.useRealTimers();
});

describe('ses tanıma hata kodları', () => {
  const {sesHatasiCoz, SES_HATALARI} = jest.requireActual('../src/servisler/ses');
  test.each([
    ['2', 'ag'], ['1', 'ag'], ['12', 'dil'], ['13', 'dil'], ['8', 'mesgul'],
    ['7', 'anlasilmadi'], ['6', 'anlasilmadi'], ['9', 'izin'], ['unavailable', 'yok'], ['5', 'servis'], ['11', 'servis'],
  ])('kod %s → %s', (kod, tur) => {
    expect(sesHatasiCoz(kod)).toBe(tur);
    expect(SES_HATALARI[tur]).toEqual(expect.any(String));
  });
});

describe('sesiDinle yeniden deneme', () => {
  test('servis bağlantısı koparsa (11) bir kez sessizce yeniden dinler', async () => {
    jest.resetModules();
    const {NativeModules, DeviceEventEmitter} = require('react-native');
    NativeModules.SpeechModule = {startListening: jest.fn(), stopListening: jest.fn(), addListener: jest.fn(), removeListeners: jest.fn()};
    jest.spyOn(require('react-native').PermissionsAndroid, 'request').mockResolvedValue('granted');
    const {sesiDinle: dinle} = require('../src/servisler/ses');

    const bekleme = dinle();
    await new Promise<void>(r => setTimeout(r, 350));   // titreşimden sonra mikrofon açılır
    expect(NativeModules.SpeechModule.startListening).toHaveBeenCalledTimes(1);
    DeviceEventEmitter.emit('onSpeechError', '11');
    expect(NativeModules.SpeechModule.startListening).toHaveBeenCalledTimes(2);   // yeniden denendi
    DeviceEventEmitter.emit('onSpeechResult', 'yardım');
    await expect(bekleme).resolves.toEqual({metin: 'yardım'});
  });

  test('hiç konuşma duyulmazsa (7) bir kez daha titreşip dinler, ikincisinde hata verir', async () => {
    jest.resetModules();
    const {NativeModules, DeviceEventEmitter, Vibration} = require('react-native');
    NativeModules.SpeechModule = {startListening: jest.fn(), stopListening: jest.fn(), addListener: jest.fn(), removeListeners: jest.fn()};
    jest.spyOn(require('react-native').PermissionsAndroid, 'request').mockResolvedValue('granted');
    const titresim = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});
    const {sesiDinle: dinle} = require('../src/servisler/ses');
    const bekle = () => new Promise<void>(r => setTimeout(r, 350));

    const bekleme = dinle();
    await bekle();
    expect(titresim).toHaveBeenCalledTimes(1);
    DeviceEventEmitter.emit('onSpeechError', '7');
    await bekle();
    expect(titresim).toHaveBeenCalledTimes(2);
    expect(NativeModules.SpeechModule.startListening).toHaveBeenCalledTimes(2);
    DeviceEventEmitter.emit('onSpeechError', '7');
    // Ses düzeyi gelmedi, konuşma başlamadı: kullanıcının sesi mikrofona hiç ulaşmadı
    await expect(bekleme).resolves.toEqual({hata: 'sessiz', kod: '7'});
  });

  test('ses duyulduysa "anlaşılmadı"; konuşurken anlaşılan ara sonuç bildirilir', async () => {
    jest.resetModules();
    const {NativeModules, DeviceEventEmitter, Vibration} = require('react-native');
    NativeModules.SpeechModule = {startListening: jest.fn(), stopListening: jest.fn(), addListener: jest.fn(),
      removeListeners: jest.fn(), ton: jest.fn()};
    jest.spyOn(require('react-native').PermissionsAndroid, 'request').mockResolvedValue('granted');
    const titresim = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});
    const {sesiDinle: dinle} = require('../src/servisler/ses');
    const kismi = jest.fn();
    const bekleme = dinle({kismi});
    await new Promise<void>(r => setTimeout(r, 350));
    expect(NativeModules.SpeechModule.ton).toHaveBeenCalledWith('dinle');      // bip: konuşun
    DeviceEventEmitter.emit('onSpeechBegin', '');
    expect(titresim).toHaveBeenLastCalledWith([0, 40]);                        // sizi duyuyorum
    DeviceEventEmitter.emit('onSpeechPartial', 'süt ner');
    expect(kismi).toHaveBeenCalledWith('süt ner');
    DeviceEventEmitter.emit('onSpeechEnd', '');
    expect(NativeModules.SpeechModule.ton).toHaveBeenCalledWith('duydum');
    DeviceEventEmitter.emit('onSpeechLevel', '8');
    DeviceEventEmitter.emit('onSpeechError', '7');
    await new Promise<void>(r => setTimeout(r, 350));
    DeviceEventEmitter.emit('onSpeechLevel', '8');
    DeviceEventEmitter.emit('onSpeechError', '7');
    await expect(bekleme).resolves.toEqual({hata: 'anlasilmadi', kod: '7'});
  });

  test('uzun iş sürerken tık sesi; bitince durur', async () => {
    jest.resetModules();
    jest.useFakeTimers();
    const {NativeModules} = require('react-native');
    NativeModules.SpeechModule = {ton: jest.fn(), addListener: jest.fn(), removeListeners: jest.fn()};
    const {beklerkenBildir} = require('../src/servisler/ses');
    let coz: (v: string) => void = () => {};
    const sonuc = beklerkenBildir('Ürün aranıyor.', new Promise<string>(r => { coz = r; }));
    jest.advanceTimersByTime(20000);   // TTS bitiş olayı yok: konuşuyor sayılır, yine de 8 sn sonra "hâlâ" denir
    coz('tamam');
    jest.useRealTimers();
    await expect(sonuc).resolves.toBe('tamam');
    const once = NativeModules.SpeechModule.ton.mock.calls.length;
    await new Promise<void>(r => setTimeout(r, 1600));
    expect(NativeModules.SpeechModule.ton.mock.calls.length).toBe(once);       // iş bitti, tık durdu
  });
});

describe('TalkBack ve susturma', () => {
  // Önceki testler modül kaydını sıfırlıyor: her test react-native, TTS ve ses modülünü birlikte yükler
  let AccessibilityInfo: any, ses: any, tts: any;
  beforeEach(() => {
    jest.resetModules();
    AccessibilityInfo = require('react-native').AccessibilityInfo;
    tts = require('react-native-tts');
    ses = require('../src/servisler/ses');
  });
  const bekle = () => new Promise<void>(r => setTimeout(r, 0));

  afterEach(() => {
    (tts.addEventListener as jest.Mock).mockImplementation(() => ({remove: jest.fn()}));
    (tts.speak as jest.Mock).mockReset();
    jest.restoreAllMocks();
  });

  test('TalkBack açıkken metin TTS yerine ekran okuyucuya duyurulur', async () => {
    const duyur = jest.fn();
    AccessibilityInfo.announceForAccessibility = duyur;
    let degisti: (acik: boolean) => void = () => {};
    AccessibilityInfo.addEventListener = jest.fn((_olay: string, cb: (acik: boolean) => void) => {
      degisti = cb;
      return {remove: jest.fn()};
    });
    const birak = ses.sesCikisiniHazirla();
    await bekle();
    degisti(true);                                 // kullanıcı TalkBack'i açtı
    (tts.speak as jest.Mock).mockClear();

    ses.sesliSoyele('Süt 3. koridorda.');
    expect(duyur).toHaveBeenCalledWith('Süt 3. koridorda.');
    expect(tts.speak).not.toHaveBeenCalled();
    expect(ses.konusuyorMu()).toBe(true);
    ses.sustur();
    expect(ses.konusuyorMu()).toBe(false);
    birak();
  });

  test('konuşma bitince ya da susturunca konusuyorMu yanlış olur; eski mesajın iptali yenisini bitirmez', async () => {
    jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(false);
    const dinleyiciler: Record<string, (e: object) => void> = {};
    (tts.addEventListener as jest.Mock).mockImplementation((olay: string, cb: (e: object) => void) => {
      dinleyiciler[olay] = cb;
      return {remove: jest.fn()};
    });
    (tts.speak as jest.Mock).mockReturnValue('m1');
    const birak = ses.sesCikisiniHazirla();
    await bekle();

    ses.sesliSoyele('Merhaba');
    expect(ses.konusuyorMu()).toBe(true);
    dinleyiciler['tts-cancel']({utteranceId: 'eski'});
    expect(ses.konusuyorMu()).toBe(true);
    dinleyiciler['tts-finish']({utteranceId: 'm1'});
    expect(ses.konusuyorMu()).toBe(false);

    ses.soyleVeyaSustur('Liste boş.');
    expect(ses.konusuyorMu()).toBe(true);
    (tts.stop as jest.Mock).mockClear();
    ses.soyleVeyaSustur('Liste boş.');            // ikinci dokunuş susturur
    expect(tts.stop).toHaveBeenCalled();
    expect(ses.konusuyorMu()).toBe(false);
    birak();
  });
});
