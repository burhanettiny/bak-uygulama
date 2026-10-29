import {
  AccessibilityInfo, EmitterSubscription, NativeEventEmitter, NativeModules, PermissionsAndroid, Platform, Vibration,
} from 'react-native';
import Tts from 'react-native-tts';
import {SesHatasi, SesSonucu} from '../tipler';
import {TITRESIM} from '../sabitler';

// ── Konuşma çıkışı ───────────────────────────────────────
// Görme engellilerin çoğu telefonu TalkBack açık kullanır. O durumda uygulamanın kendi sesi TalkBack'le
// üst üste konuşur; bu yüzden mesajlar TalkBack'e duyuru olarak verilir.
let ekranOkuyucuAcik = false;
let konusulanMesaj: string | number | null = null;   // TTS'in o an okuduğu mesajın kimliği
let duyuruBitisi = 0;                                  // TalkBack duyurusunun tahmini bitiş zamanı (ms)

// TalkBack yaklaşık saniyede 14 harf okur; bitiş olayı vermediği için süre tahmin edilir
export function tahminiOkumaSuresi(metin: string): number {
  return Math.max(1200, metin.length * 70);
}

// Uygulama açılışında bir kez çağrılır; dönen fonksiyon dinlemeyi bırakır
export function sesCikisiniHazirla(): () => void {
  AccessibilityInfo.isScreenReaderEnabled().then(acik => { ekranOkuyucuAcik = acik; }).catch(() => {});
  const abonelikler = [
    AccessibilityInfo.addEventListener('screenReaderChanged', (acik: boolean) => { ekranOkuyucuAcik = acik; }),
    // Bitiş ve iptal yalnızca o an okunan mesaja aitse dikkate alınır: susturup hemen yenisi
    // başladığında eskisinin iptal olayı yenisini "bitti" saymasın
    ...(['tts-finish', 'tts-cancel'] as const).map(olay =>
      Tts.addEventListener(olay, (e: {utteranceId?: string | number}) => {
        if (e?.utteranceId === undefined || e.utteranceId === konusulanMesaj) konusulanMesaj = null;
      }) as unknown as {remove(): void} | undefined),
  ];
  return () => abonelikler.forEach(a => a?.remove());
}

export function ekranOkuyucuAcikMi(): boolean {
  return ekranOkuyucuAcik;
}

export function sesliSoyele(metin: string) {
  Tts.stop();
  if (ekranOkuyucuAcik) {
    konusulanMesaj = null;
    AccessibilityInfo.announceForAccessibility(metin);
    duyuruBitisi = Date.now() + tahminiOkumaSuresi(metin);
    return;
  }
  konusulanMesaj = Tts.speak(metin) ?? 'konusuyor';
}

export function konusuyorMu(): boolean {
  return konusulanMesaj !== null || Date.now() < duyuruBitisi;
}

// Uzun bir tarif okunurken kullanıcı tek dokunuşla susturabilsin
export function sustur() {
  Tts.stop();
  konusulanMesaj = null;
  duyuruBitisi = 0;
}

// Android tarafındaki SpeechModule (android/app/.../SpeechModule.java); iOS'ta yok
export const SesModulu = NativeModules.SpeechModule;
export const sesOlaylari = SesModulu ? new NativeEventEmitter(SesModulu) : null;

// Konuşma bitmeden mikrofon açılırsa uygulama kendi sesini duyar
export function konusVeBekle(metin: string): Promise<void> {
  if (ekranOkuyucuAcik) {
    // TalkBack duyurusu bitiş olayı vermez: tahmini süre kadar beklenir
    sesliSoyele(metin);
    return new Promise(resolve => setTimeout(resolve, tahminiOkumaSuresi(metin)));
  }
  return new Promise(resolve => {
    let bitti = false;
    const son = () => {
      if (bitti) return;
      bitti = true;
      clearTimeout(yedek);
      abonelik?.remove();
      resolve();
    };
    // Bitiş olayı gelmezse yedek süre: uzun metin (yer listesi gibi) okunurken mikrofon açılmasın
    const yedek = setTimeout(son, Math.max(5000, tahminiOkumaSuresi(metin) * 1.5));
    // react-native-tts'in removeEventListener'ı yeni React Native'de olmayan removeListener'ı çağırıp
    // uygulamayı çökertiyor; bunun yerine addEventListener'ın döndürdüğü abonelik kaldırılır
    const abonelik = Tts.addEventListener('tts-finish', son) as unknown as {remove(): void} | undefined;
    sesliSoyele(metin);
  });
}

// Dinlerken kullanıcı yeniden uzun basarsa: mikrofon kapatılır, o ana kadar söylenen işlenir
export function dinlemeyiBitir(): void {
  SesModulu?.stopListening?.();
}

// Ekranı göremeyen kullanıcıya durum sesi: dinle (bip: konuşun), duydum, isliyor (tık), hata
export type DurumSesi = 'dinle' | 'duydum' | 'isliyor' | 'hata';
export function durumSesi(tur: DurumSesi): void {
  SesModulu?.ton?.(tur);
}

// Google tanıyıcısının ses düzeyi (dB, yaklaşık -2…10). Bunun altında kalan dinleme büyük olasılıkla kullanıcının
// sesini hiç almadı: "duyamadım, yaklaştırın" denir; üstündeyse "duydum ama anlayamadım".
const SES_DUYULDU_ESIGI = 3;

export interface DinlemeBildirimi {
  kismi?: (metin: string) => void;   // konuşurken anlaşılan (ekranda göstermek için)
}

export async function sesiDinle(bildirim: DinlemeBildirimi = {}): Promise<SesSonucu> {
  if (!SesModulu || !sesOlaylari) return {hata: 'yok'};
  if (Platform.OS === 'android') {
    const izin = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    if (izin !== PermissionsAndroid.RESULTS.GRANTED) return {hata: 'izin'};
  }
  const olaylar = sesOlaylari;
  return new Promise(resolve => {
    const abonelikler: EmitterSubscription[] = [];
    const bitir = (sonuc: SesSonucu) => {
      abonelikler.forEach(a => a.remove());
      clearTimeout(zamanAsimi);
      resolve(sonuc);
    };
    abonelikler.push(olaylar.addListener('onSpeechResult', (m: string) =>
      bitir(m?.trim() ? {metin: m.trim()} : {hata: 'anlasilmadi'})));
    // Kullanıcı konuşmaya başlayınca kısa bir titreşim: "sizi duyuyorum". Konuşma bitince "aldım" sesi.
    let duyuldu = false;
    abonelikler.push(olaylar.addListener('onSpeechBegin', () => {
      if (duyuldu) return;
      duyuldu = true;
      Vibration.vibrate(TITRESIM.sesDuyuldu);
    }));
    abonelikler.push(olaylar.addListener('onSpeechEnd', () => durumSesi('duydum')));
    abonelikler.push(olaylar.addListener('onSpeechPartial', (m: string) => bildirim.kismi?.(m)));
    let enYuksekSes: number | null = null;
    abonelikler.push(olaylar.addListener('onSpeechLevel', (d: string) => { enYuksekSes = Number(d); }));
    // Servis bağlantısı kopması (11) ve istemci hatası (5) çoğu zaman tek seferlik: bir kez sessizce yeniden dene.
    // Hiç konuşma duyulmadıysa (7) kullanıcı titreşimi kaçırmış olabilir: bir kez daha titreşip dinle.
    let yenidenDenendi = false;
    let sessizlikTekrari = false;
    abonelikler.push(olaylar.addListener('onSpeechError', (kod: string) => {
      if ((kod === '11' || kod === '5') && !yenidenDenendi) {
        yenidenDenendi = true;
        SesModulu.startListening();
        return;
      }
      if (kod === '7' && !sessizlikTekrari) {
        sessizlikTekrari = true;
        dinlemeyiBaslat();
        return;
      }
      const hata = sesHatasiCoz(kod);
      // Ses düzeyi düşükse kullanıcının sesi mikrofona hiç ulaşmamıştır: ne yapacağı farklı
      const sessiz = hata === 'anlasilmadi' && !duyuldu && (enYuksekSes === null || enYuksekSes < SES_DUYULDU_ESIGI);
      bitir({hata: sessiz ? 'sessiz' : hata, kod});
    }));
    const zamanAsimi = setTimeout(() => {
      SesModulu.stopListening();
      bitir({hata: duyuldu ? 'anlasilmadi' : 'sessiz'});
    }, 25000);
    dinlemeyiBaslat();
  });
}

// Android SpeechRecognizer hata kodları: her hata 'anlaşılamadı' denirse kullanıcı neyi düzelteceğini bilemez
export function sesHatasiCoz(kod: string): SesHatasi {
  switch (kod) {
    case 'unavailable': return 'yok';
    case '9': return 'izin';                    // ERROR_INSUFFICIENT_PERMISSIONS
    case '1': case '2': return 'ag';            // ERROR_NETWORK_TIMEOUT, ERROR_NETWORK
    case '12': case '13': return 'dil';         // ERROR_LANGUAGE_NOT_SUPPORTED, ERROR_LANGUAGE_UNAVAILABLE
    case '8': return 'mesgul';                  // ERROR_RECOGNIZER_BUSY
    case '6': case '7': return 'anlasilmadi';   // ERROR_SPEECH_TIMEOUT, ERROR_NO_MATCH
    default: return 'servis';                   // ses, istemci, sunucu bağlantısı vb.
  }
}

export const SES_HATALARI: Record<SesHatasi, string> = {
  izin:        'Mikrofon izni gerekli. Lütfen ayarlardan mikrofon iznini verin.',
  yok:         'Bu cihazda ses tanıma kullanılamıyor.',
  anlasilmadi: 'Sesinizi duydum ama anlayamadım. Kısa ve net söyleyin. Tekrar denemek için iki kez dokunun.',
  sessiz:      'Sesinizi duyamadım. Bip sesinden sonra telefonu ağzınıza yaklaştırıp konuşun. Tekrar denemek için iki kez dokunun.',
  ag:          'Ses tanıma için internet bağlantısı gerekiyor. Bağlantınızı kontrol edin ya da telefon ayarlarından Türkçe çevrimdışı konuşma tanıma paketini indirin.',
  dil:         'Telefonunuzda Türkçe konuşma tanıma paketi yüklü değil. Telefon ayarlarından konuşma tanıma için Türkçe dil paketini indirin.',
  mesgul:      'Ses tanıma servisi meşgul. Birkaç saniye sonra tekrar deneyin.',
  servis:      'Ses tanıma servisi hata verdi. Lütfen tekrar deneyin.',
};

// Tek dokunuş: konuşuyorsa sustur, susuyorsa metni oku
export function soyleVeyaSustur(metin: string) {
  if (konusuyorMu()) sustur();
  else sesliSoyele(metin);
}

// "Konuşabilirsiniz" titreşimi mikrofon açılmadan verilir: mikrofon açılırken bazı telefonlar titreşimi
// bastırıyor, ayrıca titreşim sesi tanımaya karışmasın
function dinlemeyiBaslat() {
  Vibration.vibrate(TITRESIM.dinliyorum);
  durumSesi('dinle');
  setTimeout(() => SesModulu.startListening(), 300);
}

// Uzun süren iş (ürün arama, bina bilgisi indirme, konum alma) sürerken kullanıcı sessizlikte "takıldı mı?" diye
// kalmasın: başta ne yapıldığı söylenir, sonra her 1,5 saniyede kısa bir tık sesi, 8 saniyeyi geçerse bir kez
// "hâlâ …" denir. İş bitince sesler durur; sonucu çağıran söyler.
export async function beklerkenBildir<T>(mesaj: string, is: Promise<T>, uzunMesaj = 'Hâlâ arıyorum, internet yavaş olabilir.'): Promise<T> {
  sesliSoyele(mesaj);
  const baslangic = Date.now();
  let uzunSoylendi = false;
  const tik = setInterval(() => {
    if (!uzunSoylendi && Date.now() - baslangic > 8000) {
      uzunSoylendi = true;
      sesliSoyele(uzunMesaj);
      return;
    }
    if (!konusuyorMu()) durumSesi('isliyor');
  }, 1500);
  try {
    return await is;
  } finally {
    clearInterval(tik);
  }
}
