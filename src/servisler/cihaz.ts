import {Linking, NativeEventEmitter, NativeModules, PermissionsAndroid, Platform, Share} from 'react-native';
import {whatsappNumarasi} from '../ayristirma/konumMesaji';

// Android tarafındaki CihazModulu (android/app/.../CihazModulu.java)
const CihazModulu = NativeModules.CihazModulu;
const cihazOlaylari = CihazModulu ? new NativeEventEmitter(CihazModulu) : null;

export {numarayiOkunurYap, telefonNumarasiCoz} from '../ayristirma/telefon';

// Kayıtlı yakını doğrudan arar. İzin yoksa ya da modül yoksa telefonun arama ekranını açar.
export async function yardimAra(numara: string): Promise<'arandi' | 'ekran' | 'hata'> {
  try {
    if (Platform.OS === 'android' && CihazModulu) {
      const izin = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CALL_PHONE);
      if (izin === PermissionsAndroid.RESULTS.GRANTED) {
        await CihazModulu.ara(numara);
        return 'arandi';
      }
    }
    await Linking.openURL(`tel:${numara}`);
    return 'ekran';
  } catch {
    return 'hata';
  }
}

export interface GpsKonumu {
  enlem: number;
  boylam: number;
  dogruluk: number;   // metre
  zaman: number;      // ms
}

// Tek seferlik konum: yalnızca kullanıcı "konumumu gönder" dediğinde. İzin verilmezse ya da konum
// alınamazsa null (bina içindeyse mesaj yine bina ve nokta bilgisiyle gider).
export async function konumAl(): Promise<GpsKonumu | null> {
  try {
    if (!CihazModulu) return null;
    if (Platform.OS === 'android') {
      const izin = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      if (izin !== PermissionsAndroid.RESULTS.GRANTED) return null;
    }
    return (await CihazModulu.konumAl()) ?? null;
  } catch {
    return null;
  }
}

// Android'in kişi seçme ekranı; rehberi okuma izni gerekmez
export async function kisiSec(): Promise<{ad: string; numara: string} | null> {
  try {
    return CihazModulu ? ((await CihazModulu.kisiSec()) ?? null) : null;
  } catch {
    return null;
  }
}

// Mesaj, kişinin SMS ya da WhatsApp ekranında hazır açılır; kullanıcı gönder tuşuna basar.
// Uygulamanın kendisi SMS göndermez (Google Play SMS iznini kısıtlıyor; kullanıcı ne gittiğini bilsin).
// WhatsApp sohbeti doğrudan WhatsApp uygulamasında açılır (wa.me tarayıcıda açılıp kişiyi bulamayabiliyor);
// modül yoksa wa.me bağlantısına düşülür.
export async function mesajAc(numara: string, metin: string, kanal: 'sms' | 'whatsapp'): Promise<boolean> {
  if (kanal === 'whatsapp' && CihazModulu?.whatsappAc) {
    try {
      const sonuc = await CihazModulu.whatsappAc(whatsappNumarasi(numara), metin, 'yok');
      if (sonuc === 'acildi') return true;
      if (sonuc === 'yok') return false;
    } catch { /* wa.me ile denenir */ }
  }
  const adres = kanal === 'whatsapp'
    ? `https://wa.me/${whatsappNumarasi(numara)}?text=${encodeURIComponent(metin)}`
    : `sms:${numara}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(metin)}`;
  try {
    await Linking.openURL(adres);
    return true;
  } catch {
    return false;
  }
}

export async function whatsappYardimcisiAcikMi(): Promise<boolean> {
  try {
    return !!CihazModulu?.whatsappYardimcisiAcikMi && (await CihazModulu.whatsappYardimcisiAcikMi());
  } catch {
    return false;
  }
}

export function erisilebilirlikAyarlariniAc(): void {
  CihazModulu?.erisilebilirlikAyarlariniAc?.();
}

// WhatsApp yardımcısına görev: "gonder" (hazır mesajda Gönder'e basar) ya da "canli" (mesajı gönderip ataç → Konum →
// Canlı konumu paylaş → Gönder). Sonuç: 'tamam', 'yarim' (adim: takıldığı adım) ya da 'acilmadi'.
type GorevSonucu = {sonuc: 'tamam' | 'yarim' | 'acilmadi'; adim?: string};
function whatsappGorevi(numara: string, metin: string, gorev: 'gonder' | 'canli', sureMs: number): Promise<GorevSonucu> {
  if (!CihazModulu?.whatsappAc || !cihazOlaylari) return Promise.resolve({sonuc: 'acilmadi'});
  const olaylar = cihazOlaylari;
  return new Promise(coz => {
    let bitti = false;
    const bitir = (s: GorevSonucu) => {
      if (bitti) return;
      bitti = true;
      abonelik.remove();
      clearTimeout(sure);
      coz(s);
    };
    const abonelik = olaylar.addListener('onWhatsappGorevi', (o: {basarili: boolean; adim: string}) =>
      bitir(o.basarili ? {sonuc: 'tamam'} : {sonuc: 'yarim', adim: o.adim}));
    const sure = setTimeout(() => bitir({sonuc: 'yarim'}), sureMs);
    CihazModulu.whatsappAc(whatsappNumarasi(numara), metin, gorev)
      .then((s: string) => { if (s !== 'acildi') bitir({sonuc: 'acilmadi'}); })
      .catch(() => bitir({sonuc: 'acilmadi'}));
  });
}

// Canlı konum: her adım en çok 8 sn bekler; 5 adım ve açılış için 60 sn fazlasıyla yeter
export async function canliKonumPaylas(numara: string, metin: string):
  Promise<{sonuc: 'paylasildi' | 'yarim' | 'acilmadi'; adim?: string}> {
  const s = await whatsappGorevi(numara, metin, 'canli', 60000);
  return s.sonuc === 'tamam' ? {sonuc: 'paylasildi'} : {sonuc: s.sonuc, adim: s.adim};
}

// Konum mesajı WhatsApp'tan: yardımcı açıksa Gönder'e de basılır (kullanıcı WhatsApp ekranında tuş aramaz);
// kapalıysa sohbet hazır mesajla açılır, kullanıcı gönderir. WhatsApp yoksa 'acilmadi' (çağıran SMS'e düşer).
export async function whatsappGonder(numara: string, metin: string): Promise<'gonderildi' | 'acildi' | 'acilmadi'> {
  if (!(await whatsappYardimcisiAcikMi())) return (await mesajAc(numara, metin, 'whatsapp')) ? 'acildi' : 'acilmadi';
  const s = await whatsappGorevi(numara, metin, 'gonder', 20000);
  return s.sonuc === 'tamam' ? 'gonderildi' : s.sonuc === 'yarim' ? 'acildi' : 'acilmadi';
}

// Kişi seçilmeden: Android paylaşım menüsü (WhatsApp, SMS, e-posta… ve oradan herhangi bir kişi)
export async function paylas(metin: string): Promise<boolean> {
  try {
    const sonuc = await Share.share({message: metin});
    return sonuc.action !== Share.dismissedAction;
  } catch {
    return false;
  }
}

// Kamera, yol tarifi ve dinleme sırasında ekran kapanıp kilitlenmesin
export function ekranAcikTut(acik: boolean): void {
  CihazModulu?.ekranAcikTut?.(acik);
}

export async function yonSensoruVarMi(): Promise<boolean> {
  try {
    return !!CihazModulu && (await CihazModulu.yonVarMi());
  } catch {
    return false;
  }
}

// Telefonun yönü (derece) değiştikçe yon() çağrılır; dönen fonksiyon dinlemeyi bırakır ve sensörü kapatır
export function yonuDinle(yon: (derece: number) => void): () => void {
  if (!CihazModulu || !cihazOlaylari) return () => {};
  const abonelik = cihazOlaylari.addListener('onYon', yon);
  CihazModulu.yonBaslat();
  return () => {
    abonelik.remove();
    CihazModulu.yonDurdur();
  };
}
