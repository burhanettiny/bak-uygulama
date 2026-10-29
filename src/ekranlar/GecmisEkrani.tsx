import React from 'react';
import {View, Text, TouchableOpacity, ScrollView} from 'react-native';
import {GecmisKaydi} from '../tipler';
import {gecmisSesliMetin} from '../ayristirma/urun';
import {sesliSoyele, soyleVeyaSustur} from '../servisler/ses';
import {stil} from '../stil';

interface Props {
  gecmis: GecmisKaydi[];
  onGeri: () => void;
}

export function GecmisEkrani({gecmis, onGeri}: Props) {
  const tumu = gecmis.length
    ? `Son taranan ürünler: ${gecmis.map((g, i) => `${i + 1}. ${gecmisSesliMetin(g)}`).join('. ')}.`
    : 'Henüz taranmış ürün yok.';
  return (
    // Tek dokun → tamamını oku   |   Uzun bas → ana menüye dön
    <ScrollView style={stil.kapsayici} contentContainerStyle={stil.kaydirIcerik}>
      <TouchableOpacity
      activeOpacity={1}
      style={stil.ekran}
      onPress={() => soyleVeyaSustur(tumu)}
      onLongPress={onGeri}
      delayLongPress={800}
      // TalkBack bu alanı tek düğme gibi okursa içerideki öğelere ve düğmelere ulaşılamaz
      accessible={false}
    >
        <Text style={stil.hakkindaLogo}>SON TARANANLAR</Text>
        <View style={stil.hakkindaJestBant}>
          <Text style={stil.hakkindaJestYazi}>Tek dokun → Hepsini dinle</Text>
          <Text style={stil.hakkindaJestYazi}>Uzun bas → Ana menüye dön</Text>
        </View>
        {gecmis.length === 0 && (
          <Text style={stil.hakkindaSatir}>Henüz taranmış ürün yok.</Text>
        )}
        {gecmis.map((g, i) => (
          <TouchableOpacity key={g.barkod} style={stil.hakkindaBolum}
            onPress={() => sesliSoyele(`${i + 1}. ${gecmisSesliMetin(g)}`)}
            accessible={true} accessibilityRole="button"
            accessibilityLabel={`${i + 1}. ${gecmisSesliMetin(g)}`}>
            <Text style={stil.kartMarka}>{g.marka}</Text>
            <Text style={stil.gecmisAd}>{g.ad}</Text>
            <Text style={stil.hakkindaVersiyon}>{new Date(g.zaman).toLocaleString('tr-TR')}</Text>
          </TouchableOpacity>
        ))}
      </TouchableOpacity>
    </ScrollView>
  );
}
