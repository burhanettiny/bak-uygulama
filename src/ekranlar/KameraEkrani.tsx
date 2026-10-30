import React, {RefObject, useRef} from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import {Camera, CameraDevice, CodeScanner} from 'react-native-vision-camera';
import {TaramaModu} from '../tipler';
import {stil} from '../stil';

interface Props {
  mod: 'barkod' | TaramaModu;
  device: CameraDevice;
  cameraRef: RefObject<Camera | null>;
  fenerAcik: boolean;
  codeScanner: CodeScanner;
  onKapat: () => void;
  onFener: () => void;
  // Önizlemenin boyutu: görülen ama çözülemeyen kodun konumundan yön tarif etmek için
  onOnizlemeBoyutu?: (boyut: {width: number; height: number}) => void;
}

const ERISIM_ETIKETLERI = {
  barkod: 'Barkod taranıyor. Çıkmak için ekrana dokun. Fener için uzun bas.',
  pos:    'POS tutarı otomatik aranıyor. Çıkmak için ekrana dokun. Fener için uzun bas.',
  para:   'Para tanınıyor. Çıkmak için ekrana dokun. Fener için uzun bas.',
  tarih:  'Son kullanma tarihi otomatik aranıyor. Çıkmak için ekrana dokun. Fener için uzun bas.',
  icindekiler: 'İçindekiler yazısı aranıyor. Çıkmak için ekrana dokun. Fener için uzun bas.',
};

const UST_YAZILAR = {
  barkod: '📷  Barkodu / QR kodu yaklaştırın',
  pos:    '💳  POS ekranını yaklaştırın',
  para:   '💵  Banknotu düz tutun',
  tarih:  '📅  Ürünü yavaşça çevirin',
  icindekiler: '🧾  Ambalajın arka yüzünü tutun',
};

const ARAMA_YAZILARI = {
  barkod: '',
  pos:    '💳 Tutar aranıyor...',
  para:   '💵 Para tanınıyor...',
  tarih:  '📅 Tarih aranıyor...',
  icindekiler: '🧾 İçindekiler aranıyor...',
};

// Kamerayı açan çoklu dokunuşun artığı ya da ürünü tutarken avucun ekrana değmesi kamerayı hemen kapatmasın
const ACILIS_KORUMASI_MS = 1200;

export function KameraEkrani({mod, device, cameraRef, fenerAcik, codeScanner, onKapat, onFener, onOnizlemeBoyutu}: Props) {
  const acilis = useRef(Date.now());
  const kapat = () => {
    if (Date.now() - acilis.current > ACILIS_KORUMASI_MS) onKapat();
  };
  return (
    // Tek dokun → iptal / ana menü (tüm kamera modlarında) | Uzun bas → fener
    <TouchableOpacity
      activeOpacity={1}
      style={stil.kapsayici}
      onPress={kapat}
      onLongPress={onFener}
      delayLongPress={800}
      accessible={true}
      accessibilityLabel={ERISIM_ETIKETLERI[mod]}
    >
      <Camera
        ref={cameraRef}
        style={stil.kamera}
        device={device}
        isActive={true}
        photo={true}
        torch={fenerAcik ? 'on' : 'off'}
        codeScanner={mod === 'barkod' ? codeScanner : undefined}
        onLayout={e => onOnizlemeBoyutu?.(e.nativeEvent.layout)}
      />

      {/* Çerçeve */}
      <View style={[
        stil.cerceve,
        mod === 'pos'   && stil.cercevePos,
        mod === 'tarih' && stil.cerceveTarih,
        mod === 'para'  && stil.cercevePara,
      ]} pointerEvents="none"/>

      {/* Üst bilgi bandı — ne yapılacağını söyler */}
      <View style={stil.kameraUstBant} pointerEvents="none">
        <Text style={stil.kameraUstYazi}>{UST_YAZILAR[mod]}</Text>
      </View>

      {/* Alt bilgi bandı — durum ve jest ipucu */}
      <View style={stil.kameraAltBant} pointerEvents="none">
        {ARAMA_YAZILARI[mod] ? <Text style={stil.otomatikYazi}>{ARAMA_YAZILARI[mod]}</Text> : null}
        <Text style={stil.jestIpucu}>
          Tek dokun → Çık   ·   Uzun bas → Fener {fenerAcik ? '(açık)' : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
