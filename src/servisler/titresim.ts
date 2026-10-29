import {Platform, Vibration} from 'react-native';

// Uygulamadaki titreşim desenleri Android içindir: [bekle, titre, bekle, titre…] milisaniye (bkz. sabitler TITRESIM).
// iPhone titreşim süresini ayarlatmaz (her titreşim sabit, yaklaşık 0,4 sn) ve deseni farklı yorumlar; aynı desen orada
// art arda karışık titreşimler olur. iPhone'da desen "kaç vuruş" olarak çevrilir: her "titre" bölümü bir vuruş,
// vuruşlar arası 0,5 sn. Böylece "ürün bulundu" iki, "hata" iki, "duyuyorum" tek vuruş olarak hissedilir.
export function iphoneVurusSayisi(desen: number | number[]): number {
  if (typeof desen === 'number') return 1;
  return Math.max(1, desen.filter((_, i) => i % 2 === 1).length);
}

export function titresimiUyarla(): void {
  if (Platform.OS !== 'ios') return;
  const asil = Vibration.vibrate.bind(Vibration);
  Vibration.vibrate = ((desen?: number | number[]) => {
    const sayi = iphoneVurusSayisi(desen ?? 400);
    for (let i = 0; i < sayi; i++) setTimeout(() => asil(), i * 500);
  }) as typeof Vibration.vibrate;
}
