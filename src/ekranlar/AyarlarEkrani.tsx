import React, {useEffect, useState} from 'react';
import {AppState, Platform, View, Text, TouchableOpacity, ScrollView, TextInput} from 'react-native';
import {numarayiOkunurYap} from '../ayristirma/telefon';
import {AcilKisi} from '../ayristirma/konumMesaji';
import {KisiselAlerjen, kisiselAlerjenAdi} from '../ayristirma/alerjen';
import {erisilebilirlikAyarlariniAc, whatsappYardimcisiAcikMi} from '../servisler/cihaz';
import {stil} from '../stil';

interface Props {
  hizAdi: string;
  adimBoyu: string;
  onAdimBoyu: () => void;
  onAdimOlc: () => void;
  kisaAnlatim: boolean;
  merdivendenKacin: boolean;
  adimRehberi: boolean;
  yonUyarisi: boolean;
  yardimNumarasi: string | null;
  onHiz: () => void;
  onKisaAnlatim: () => void;
  onMerdiven: () => void;
  onAdimRehberi: () => void;
  onYonUyarisi: () => void;
  onYardimNumarasiYaz: (metin: string) => void;
  onYardimNumarasiSesle: () => void;
  onEgitim: () => void;
  acilKisiler: AcilKisi[];
  onAcilKisiEkle: () => void;
  onAcilKisiSil: (k: AcilKisi) => void;
  alerjenler: KisiselAlerjen[];
  onAlerjenSesle: () => void;
  onAlerjenSil: (a: KisiselAlerjen) => void;
  onGeri: () => void;
}

// Açık/kapalı ayar satırı: TalkBack "anahtar, açık" diye okur
function Anahtar({etiket, acik, onPress, aciklama}: {etiket: string; acik: boolean; onPress: () => void; aciklama: string}) {
  return (
    <TouchableOpacity style={stil.ayarSatiri} onPress={onPress}
      accessible={true} accessibilityRole="switch" accessibilityState={{checked: acik}}
      accessibilityLabel={`${etiket}: ${acik ? 'açık' : 'kapalı'}. ${aciklama}`}>
      <Text style={stil.ayarEtiket}>{etiket}</Text>
      <Text style={[stil.ayarDeger, acik ? stil.ayarAcik : stil.ayarKapali]}>{acik ? 'AÇIK' : 'KAPALI'}</Text>
    </TouchableOpacity>
  );
}

export function AyarlarEkrani(p: Props) {
  const [numara, setNumara] = useState(p.yardimNumarasi || '');
  const [yardimciAcik, setYardimciAcik] = useState(false);
  // Erişilebilirlik ayarlarından dönünce durum yenilenir
  useEffect(() => {
    whatsappYardimcisiAcikMi().then(setYardimciAcik);
    const abonelik = AppState.addEventListener('change', d => {
      if (d === 'active') whatsappYardimcisiAcikMi().then(setYardimciAcik);
    });
    return () => abonelik.remove();
  }, []);
  return (
    // Uzun bas → ana menü (diğer ekranlarla aynı)
    <ScrollView style={stil.kapsayici} contentContainerStyle={stil.kaydirIcerik} keyboardShouldPersistTaps="handled">
      <TouchableOpacity activeOpacity={1} style={stil.ekran} onLongPress={p.onGeri} delayLongPress={800}
      accessible={false}>
        <Text style={stil.ekranBaslik} accessibilityRole="header">AYARLAR</Text>

        <TouchableOpacity style={stil.ayarSatiri} onPress={p.onHiz}
          accessible={true} accessibilityRole="button"
          accessibilityLabel={`Konuşma hızı: ${p.hizAdi}. Değiştirmek için dokunun.`}>
          <Text style={stil.ayarEtiket}>Konuşma hızı</Text>
          <Text style={stil.ayarDeger}>{p.hizAdi.toLocaleUpperCase('tr-TR')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={stil.ayarSatiri} onPress={p.onAdimBoyu}
          accessible={true} accessibilityRole="button"
          accessibilityLabel={`Adım boyu: ${p.adimBoyu}. Rehber sayaç sizden önce bitiyorsa kısa seçin. Değiştirmek için dokunun.`}>
          <Text style={stil.ayarEtiket}>Adım boyu</Text>
          <Text style={stil.ayarDeger}>{p.adimBoyu.toLocaleUpperCase('tr-TR')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={stil.ayarSatiri} onPress={p.onAdimOlc}
          accessible={true} accessibilityRole="button"
          accessibilityLabel="Adımlarımı ölç. Açık havada 80 adım yürüyerek adım uzunluğunuz ölçülür. Kışın ya da ayakkabı değişince yeniden ölçün.">
          <Text style={stil.ayarEtiket}>📏 Adımlarımı ölç</Text>
        </TouchableOpacity>

        <Anahtar etiket="Kısa anlatım" acik={p.kisaAnlatim} onPress={p.onKisaAnlatim}
          aciklama="Açıkken yol tarifleri daha kısa söylenir."/>
        <Anahtar etiket="Adım adım rehber" acik={p.adimRehberi} onPress={p.onAdimRehberi}
          aciklama="Açıkken yürürken kalan adımlar ve sıradaki talimat söylenir."/>
        <Anahtar etiket="Yön uyarısı" acik={p.yonUyarisi} onPress={p.onYonUyarisi}
          aciklama="Açıkken düz gitmeniz gereken yerde yön değiştirirseniz uyarılırsınız."/>
        <Anahtar etiket="Merdivenden kaçın" acik={p.merdivendenKacin} onPress={p.onMerdiven}
          aciklama="Açıkken tariflerde asansör ve rampa tercih edilir."/>

        <View style={stil.ayarBolum}>
          <Text style={stil.ayarEtiket} accessibilityRole="header">Yardım numarası</Text>
          <Text style={stil.ayarAciklama}>
            Sesli komutta "yardım çağır" deyince bu numara aranır.
            {p.yardimNumarasi ? ` Kayıtlı: ${p.yardimNumarasi}` : ' Henüz kayıtlı numara yok.'}
          </Text>
          <TextInput
            style={stil.ayarGiris}
            value={numara}
            onChangeText={setNumara}
            keyboardType="phone-pad"
            placeholder="0532 123 45 67"
            placeholderTextColor="#888"
            accessibilityLabel={`Yardım numarası. ${p.yardimNumarasi
              ? `Kayıtlı numara ${numarayiOkunurYap(p.yardimNumarasi)}` : 'Kayıtlı numara yok'}`}
          />
          <View style={stil.ayarButonlar}>
            <TouchableOpacity style={stil.ayarButon} onPress={() => p.onYardimNumarasiYaz(numara)}
              accessible={true} accessibilityRole="button" accessibilityLabel="Yazılan numarayı kaydet">
              <Text style={stil.ayarButonYazi}>Kaydet</Text>
            </TouchableOpacity>
            <TouchableOpacity style={stil.ayarButon} onPress={p.onYardimNumarasiSesle}
              accessible={true} accessibilityRole="button" accessibilityLabel="Numarayı sesle söyleyerek kaydet">
              <Text style={stil.ayarButonYazi}>🎙️ Sesle söyle</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={stil.ayarBolum}>
          <Text style={stil.ayarEtiket} accessibilityRole="header">Alerjenlerim</Text>
          <Text style={stil.ayarAciklama}>
            Okuttuğunuz üründe bunlardan biri varsa uygulama ürün adından önce uyarır ve telefon güçlü titrer.
            {p.alerjenler.length ? '' : ' Henüz alerjen yok.'}
          </Text>
          {p.alerjenler.map(a => (
            <View key={a.ad} style={stil.ayarKisi}>
              <Text style={stil.ayarKisiAd}>{kisiselAlerjenAdi(a)}</Text>
              <TouchableOpacity style={stil.ayarKisiSil} onPress={() => p.onAlerjenSil(a)}
                accessible={true} accessibilityRole="button" accessibilityLabel={`${a.ad} alerjenini sil`}>
                <Text style={stil.ayarButonYazi}>Sil</Text>
              </TouchableOpacity>
            </View>
          ))}
          <View style={stil.ayarButonlar}>
            <TouchableOpacity style={stil.ayarButon} onPress={p.onAlerjenSesle}
              accessible={true} accessibilityRole="button" accessibilityLabel="Alerjen ekle: söyleyerek, örneğin fıstık ve süt">
              <Text style={stil.ayarButonYazi}>🎙️ Sesle ekle</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={stil.ayarBolum}>
          <Text style={stil.ayarEtiket} accessibilityRole="header">Acil kişiler</Text>
          <Text style={stil.ayarAciklama}>
            "Konumumu gönder" deyince bulunduğunuz yer bu kişilere WhatsApp’tan gider (WhatsApp yoksa SMS); "annemi ara" gibi adıyla da
            arayabilirsiniz.{p.acilKisiler.length ? '' : ' Henüz kişi yok.'}
          </Text>
          {p.acilKisiler.map(k => (
            <View key={`${k.ad}-${k.numara}`} style={stil.ayarKisi}>
              <Text style={stil.ayarKisiAd} accessibilityLabel={`${k.ad}, ${numarayiOkunurYap(k.numara)}`}>{k.ad}</Text>
              <TouchableOpacity style={stil.ayarKisiSil} onPress={() => p.onAcilKisiSil(k)}
                accessible={true} accessibilityRole="button" accessibilityLabel={`${k.ad} kişisini sil`}>
                <Text style={stil.ayarButonYazi}>Sil</Text>
              </TouchableOpacity>
            </View>
          ))}
          <View style={stil.ayarButonlar}>
            <TouchableOpacity style={stil.ayarButon} onPress={p.onAcilKisiEkle}
              accessible={true} accessibilityRole="button" accessibilityLabel="Rehberden acil kişi ekle">
              <Text style={stil.ayarButonYazi}>📇 Rehberden ekle</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* iPhone başka uygulamaların düğmelerine basmaya izin vermez: yardımcı yalnızca Android'de */}
        {Platform.OS === 'android' && <View style={stil.ayarBolum}>
          <Text style={stil.ayarEtiket} accessibilityRole="header">WhatsApp yardımcısı</Text>
          <Text style={stil.ayarAciklama}>
            {yardimciAcik
              ? 'Açık. "Konumumu gönder" deyince mesaj, "canlı konumumu paylaş" deyince canlı konumunuz WhatsApp’ta dokunmadan gönderilir.'
              : 'Kapalı. Açarsanız konum mesajında ve canlı konumda BAK, WhatsApp’taki ataç, Konum, Canlı konum ve ' +
                'Gönder düğmelerine sizin yerinize basar. Erişilebilirlik ayarlarında, Yüklü uygulamalar altında ' +
                'BAK WhatsApp yardımcısını açın. Açılmıyor ve "kısıtlanmış ayar" diyorsa: telefon ayarlarında ' +
                'Uygulamalar → BAK → sağ üstteki ⋮ menü → "Kısıtlanmış ayarlara izin ver", sonra yeniden deneyin.'}
          </Text>
          <View style={stil.ayarButonlar}>
            <TouchableOpacity style={stil.ayarButon} onPress={erisilebilirlikAyarlariniAc}
              accessible={true} accessibilityRole="button"
              accessibilityLabel={`WhatsApp yardımcısı ${yardimciAcik ? 'açık' : 'kapalı'}. Erişilebilirlik ayarlarını aç`}>
              <Text style={stil.ayarButonYazi}>♿ Erişilebilirlik ayarları</Text>
            </TouchableOpacity>
          </View>
        </View>}

        <TouchableOpacity style={stil.butonHakkinda} onPress={p.onEgitim}
          accessible={true} accessibilityRole="button" accessibilityLabel="Kullanım eğitimini yeniden başlat">
          <Text style={stil.butonHakkindaYazi}>🎓 EĞİTİMİ BAŞLAT</Text>
        </TouchableOpacity>
        <TouchableOpacity style={stil.butonAna} onPress={p.onGeri}
          accessible={true} accessibilityRole="button" accessibilityLabel="Ana menüye dön">
          <Text style={stil.butonAnaYazi}>↩ ANA MENÜ</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </ScrollView>
  );
}
