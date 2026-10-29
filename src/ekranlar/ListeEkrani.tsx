import React from 'react';
import {View, Text, TouchableOpacity, ScrollView} from 'react-native';
import {ListeOgesi} from '../tipler';
import {stil} from '../stil';

interface Props {
  liste: ListeOgesi[];
  dinleniyor: boolean;
  mekanVar: boolean;
  onDokun: () => void;
  onSesle: () => void;
  onGez: () => void;
  onOgeDegistir: (oge: ListeOgesi) => void;
  onAlinanlariSil: () => void;
  onGeri: () => void;
}

export function ListeEkrani({
  liste, dinleniyor, mekanVar, onDokun, onSesle, onGez, onOgeDegistir, onAlinanlariSil, onGeri,
}: Props) {
  const kalanSayi = liste.filter(o => !o.alindi).length;
  return (
    // Tek dokun → listeyi oku | Çift dokun → sesle ekle/sil | Uzun bas → ana menü
    <ScrollView style={stil.kapsayici} contentContainerStyle={stil.kaydirIcerik}>
      <TouchableOpacity
      activeOpacity={1}
      style={stil.ekran}
      onPress={onDokun}
      onLongPress={onGeri}
      delayLongPress={800}
      // TalkBack bu alanı tek düğme gibi okursa içerideki öğelere ve düğmelere ulaşılamaz
      accessible={false}
    >
        <Text style={stil.hakkindaLogo}>LİSTEM</Text>
        <Text style={stil.hakkindaSlogan}>
          {liste.length ? `${kalanSayi} ürün kaldı · ${liste.length - kalanSayi} alındı` : 'Liste boş'}
        </Text>
        <View style={stil.hakkindaJestBant}>
          <Text style={stil.hakkindaJestYazi}>Tek dokun → Listeyi dinle</Text>
          <Text style={stil.hakkindaJestYazi}>2 kez dok → Sesle ekle / sil</Text>
          {mekanVar && <Text style={stil.hakkindaJestYazi}>3 kez dok → Mağazada gez</Text>}
          <Text style={stil.hakkindaJestYazi}>Uzun bas → Ana menüye dön</Text>
        </View>

        {mekanVar && kalanSayi > 0 && (
          <TouchableOpacity style={[stil.buton, stil.butonNerede]}
            onPress={onGez}
            accessible={true} accessibilityRole="button"
            accessibilityLabel={`Listeyi mağazada gez, ${kalanSayi} ürün`}>
            <Text style={stil.butonYazi}>🧭 MAĞAZADA GEZ</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[stil.buton, stil.butonListe, dinleniyor && stil.butonDevre]}
          onPress={onSesle}
          accessible={true} accessibilityRole="button"
          accessibilityLabel="Sesle ürün ekle veya sil">
          <Text style={stil.butonYazi}>{dinleniyor ? '🎙️ DİNLENİYOR...' : '🎙️ SESLE EKLE / SİL'}</Text>
        </TouchableOpacity>

        {liste.map((o, i) => (
          <TouchableOpacity key={`${o.ad}-${i}`}
            style={[stil.hakkindaBolum, o.alindi && stil.listeAlindi]}
            onPress={() => onOgeDegistir(o)}
            accessible={true} accessibilityRole="checkbox"
            accessibilityState={{checked: o.alindi}}
            accessibilityLabel={`${o.ad}, ${o.alindi ? 'alındı' : 'alınmadı'}. Değiştirmek için dokun.`}>
            <Text style={[stil.gecmisAd, o.alindi && stil.listeAlindiYazi]}>
              {o.alindi ? '✓ ' : '○ '}{o.ad}
            </Text>
          </TouchableOpacity>
        ))}

        {liste.some(o => o.alindi) && (
          <TouchableOpacity style={stil.butonAna} onPress={onAlinanlariSil}
            accessible={true} accessibilityRole="button"
            accessibilityLabel="Alınan ürünleri listeden sil">
            <Text style={stil.butonAnaYazi}>🗑 ALINANLARI SİL</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
