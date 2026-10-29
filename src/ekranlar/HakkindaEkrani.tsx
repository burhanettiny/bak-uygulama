import React from 'react';
import {View, Text, TouchableOpacity, ScrollView, Image, Linking} from 'react-native';
import {GIZLILIK_ADRESI, HAKKINDA_METINLER, SURUM} from '../sabitler';
import {sesliSoyele, soyleVeyaSustur} from '../servisler/ses';
import {stil} from '../stil';

interface Props {
  onGeri: () => void;
}

export function HakkindaEkrani({onGeri}: Props) {
  return (
    // Tek dokun → tamamını oku   |   Uzun bas → ana menüye dön
    <ScrollView style={stil.kapsayici} contentContainerStyle={stil.kaydirIcerik}>
      <TouchableOpacity
      activeOpacity={1}
      style={stil.ekran}
      onPress={() => soyleVeyaSustur(HAKKINDA_METINLER.tamami)}
      onLongPress={onGeri}
      delayLongPress={800}
      // TalkBack bu alanı tek düğme gibi okursa içerideki öğelere ve düğmelere ulaşılamaz
      accessible={false}
    >
        <View style={stil.hakkindaKart}>
          <Image source={require('../../assets/icon.png')} style={stil.hakkindaIkon} resizeMode="contain"/>
          <Text style={stil.hakkindaLogo}>BAK</Text>
          <Text style={stil.hakkindaSlogan}>Görme Engelliler İçin{'\n'}Sesli Alışveriş ve Yol Tarifi Asistanı</Text>

          {/* Jest ipucu bandı */}
          <View style={stil.hakkindaJestBant}>
            <Text style={stil.hakkindaJestYazi}>Tek dokun → Tamamını dinle / sustur</Text>
            <Text style={stil.hakkindaJestYazi}>Uzun bas → Ana menüye dön</Text>
          </View>

          {/* Özellikler bölümü — dokunulunca sadece bu bölümü okur */}
          <TouchableOpacity
            style={stil.hakkindaBolum}
            onPress={(e) => { e.stopPropagation(); sesliSoyele(HAKKINDA_METINLER.ozellikler); }}
            accessible={true} accessibilityRole="button"
            accessibilityLabel="Özellikler bölümü. Dinlemek için dokun.">
            <Text style={stil.hakkindaBaslik}>Özellikler  🔊</Text>
            <Text style={stil.hakkindaSatir}>✓ Barkod ve QR kod okuma</Text>
            <Text style={stil.hakkindaSatir}>✓ 4 farklı ürün veritabanı</Text>
            <Text style={stil.hakkindaSatir}>✓ İnternetsiz çalışan ürün kaydı</Text>
            <Text style={stil.hakkindaSatir}>✓ Son taranan ürünler listesi</Text>
            <Text style={stil.hakkindaSatir}>✓ Sesli ürün ve alerjen bilgisi</Text>
            <Text style={stil.hakkindaSatir}>✓ POS ekran tutarı okuma</Text>
            <Text style={stil.hakkindaSatir}>✓ Otomatik son kullanma tarihi tespiti</Text>
            <Text style={stil.hakkindaSatir}>✓ Para tanıma</Text>
            <Text style={stil.hakkindaSatir}>✓ Sesli alışveriş listesi</Text>
            <Text style={stil.hakkindaSatir}>✓ Sesli komutla kullanım</Text>
            <Text style={stil.hakkindaSatir}>✓ Ayarlanabilir konuşma hızı</Text>
            <Text style={stil.hakkindaSatir}>✓ Mağaza, hastane, okul ve kurumlarda bina içi sesli yol tarifi</Text>
            <Text style={stil.hakkindaSatir}>✓ Girişte yerlerin numaralı listesi, birden çok sonuçta seçenek</Text>
            <Text style={stil.hakkindaSatir}>✓ Kat, merdiven ve asansör yönlendirmesi</Text>
            <Text style={stil.hakkindaSatir}>✓ Adım sayarla adım adım rehber, adım uzunluğunu öğrenme</Text>
            <Text style={stil.hakkindaSatir}>✓ Duvardaki etiketi bulmak için etiket arama</Text>
            <Text style={stil.hakkindaSatir}>✓ Yön sapması uyarısı ve kısa anlatım</Text>
            <Text style={stil.hakkindaSatir}>✓ Kayboldum, acil yardım araması</Text>
            <Text style={stil.hakkindaSatir}>✓ Konumunu acil kişine tek komutla gönderme</Text>
            <Text style={stil.hakkindaSatir}>✓ İlk açılışta sesli eğitim</Text>
            <Text style={stil.hakkindaSatir}>✓ Kamerada fener</Text>
            <Text style={stil.hakkindaSatir}>✓ Titreşim geri bildirimi</Text>
            <Text style={stil.hakkindaSatir}>✓ TalkBack uyumlu</Text>
          </TouchableOpacity>

          {/* Dokunuş kısayolları bölümü */}
          <TouchableOpacity
            style={stil.hakkindaBolum}
            onPress={(e) => { e.stopPropagation(); sesliSoyele(HAKKINDA_METINLER.kisayollar); }}
            accessible={true} accessibilityRole="button"
            accessibilityLabel="Dokunuş kısayolları bölümü. Dinlemek için dokun.">
            <Text style={stil.hakkindaBaslik}>Dokunuş Kısayolları  🔊</Text>
            <Text style={stil.hakkindaSatir}>Uzun bas → Sesli komut</Text>
            <Text style={stil.hakkindaSatir}>1 kez dok → Sustur / son sonucu dinle</Text>
            <Text style={stil.hakkindaSatir}>2 kez dok → Barkod / QR oku</Text>
            <Text style={stil.hakkindaSatir}>3 kez dok → Yol tarifi (ürün, oda, kişi)</Text>
            <Text style={stil.hakkindaSatir}>Kamerada uzun bas → Fener</Text>
          </TouchableOpacity>

          {/* Geliştirici bölümü */}
          <TouchableOpacity
            style={stil.hakkindaBolum}
            onPress={(e) => { e.stopPropagation(); sesliSoyele(HAKKINDA_METINLER.gelistirici); }}
            accessible={true} accessibilityRole="button"
            accessibilityLabel="Geliştirici bölümü. Dinlemek için dokun.">
            <Text style={stil.hakkindaBaslik}>Geliştirici  🔊</Text>
            <Text style={stil.hakkindaSatir}>Burhanettin Yalçınkaya</Text>
            <Text style={stil.hakkindaMail}>✉️ mailtoburhanettin@gmail.com</Text>
          </TouchableOpacity>

          {/* Versiyon */}
          <TouchableOpacity
            style={stil.hakkindaBolum}
            onPress={(e) => { e.stopPropagation(); sesliSoyele(HAKKINDA_METINLER.versiyon); }}
            accessible={true} accessibilityRole="button"
            accessibilityLabel="Versiyon bilgisi. Dinlemek için dokun.">
            <Text style={stil.hakkindaVersiyon}>Versiyon {SURUM}</Text>
            <Text style={stil.hakkindaVersiyon}>© 2026 BAK — Tüm hakları saklıdır.</Text>
          </TouchableOpacity>

          {/* Gizlilik politikası: tarayıcıda açılır */}
          <TouchableOpacity
            style={stil.hakkindaBolum}
            onPress={(e) => { e.stopPropagation(); Linking.openURL(GIZLILIK_ADRESI).catch(() => {}); }}
            accessible={true} accessibilityRole="link"
            accessibilityLabel="Gizlilik politikası. Tarayıcıda açmak için dokun.">
            <Text style={stil.hakkindaBaslik}>Gizlilik politikası  🔗</Text>
            <Text style={stil.hakkindaSatir}>Hesap, reklam ve kullanım takibi yok. Bilgileriniz telefonunuzda kalır.</Text>
          </TouchableOpacity>

        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}
