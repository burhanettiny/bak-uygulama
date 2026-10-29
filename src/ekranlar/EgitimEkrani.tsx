import React from 'react';
import {Text, TouchableOpacity, ScrollView, View} from 'react-native';
import {stil} from '../stil';

interface Props {
  metin: string;
  adim: number;
  toplam: number;
  ekranOkuyucu: boolean;
  onDokun: () => void;
  onUzunBas: () => void;
  onBitir: () => void;
}

// Ekranın tamamı hareket alanıdır; TalkBack açıksa hareketler çalışmadığı için yalnızca "bitir" butonu kullanılır
export function EgitimEkrani({metin, adim, toplam, ekranOkuyucu, onDokun, onUzunBas, onBitir}: Props) {
  return (
    <ScrollView style={stil.kapsayici} contentContainerStyle={stil.kaydirIcerik}>
      <TouchableOpacity activeOpacity={1} style={stil.ekran}
      onPress={ekranOkuyucu ? undefined : onDokun}
      onLongPress={ekranOkuyucu ? undefined : onUzunBas} delayLongPress={800}
      accessible={false}>
        <Text style={stil.ekranBaslik} accessibilityRole="header">EĞİTİM</Text>
        {!ekranOkuyucu && <Text style={stil.egitimSayac}>Adım {adim + 1} / {toplam}</Text>}
        <View style={stil.egitimKutu} accessible={true} accessibilityLabel={metin}>
          <Text style={stil.egitimYazi}>{metin}</Text>
        </View>
        <TouchableOpacity style={stil.butonAna} onPress={onBitir}
          accessible={true} accessibilityRole="button"
          accessibilityLabel={ekranOkuyucu ? 'Eğitimi bitir' : 'Eğitimi atla'}>
          <Text style={stil.butonAnaYazi}>{ekranOkuyucu ? 'EĞİTİMİ BİTİR' : 'EĞİTİMİ ATLA'}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </ScrollView>
  );
}
