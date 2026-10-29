import {NativeEventEmitter, NativeModules, PermissionsAndroid, Platform} from 'react-native';
import {yuruyusFiltresi} from '../mekan/yuruyusFiltresi';

// Android tarafındaki AdimModulu (android/app/.../AdimModulu.java); iOS'ta ve adım sensörü olmayan telefonlarda yok
const AdimModulu = NativeModules.AdimModulu;
const adimOlaylari = AdimModulu ? new NativeEventEmitter(AdimModulu) : null;

// Telefonda adım sensörü var mı ve izin verildi mi? Android 10+ "fiziksel etkinlik" izni ister.
export async function adimSayarHazirla(): Promise<boolean> {
  if (!AdimModulu) return false;
  try {
    if (!(await AdimModulu.mevcutMu())) return false;
    if (Platform.OS === 'android' && Number(Platform.Version) >= 29) {
      const izin = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION);
      if (izin !== PermissionsAndroid.RESULTS.GRANTED) return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Her gerçek yürüyüş adımında adim() çağrılır; dururken eldeki sallanma sayılmaz (bkz. yuruyusFiltresi).
// Dönen fonksiyon dinlemeyi bırakır ve sensörü kapatır (pil için).
export function adimlariDinle(adim: () => void): () => void {
  if (!AdimModulu || !adimOlaylari) return () => {};
  const filtre = yuruyusFiltresi();
  const abonelik = adimOlaylari.addListener('onAdim', (zamanMs?: number) => {
    const sayi = filtre(typeof zamanMs === 'number' ? zamanMs : Date.now());
    for (let i = 0; i < sayi; i++) adim();
  });
  AdimModulu.baslat();
  return () => {
    abonelik.remove();
    AdimModulu.durdur();
  };
}
