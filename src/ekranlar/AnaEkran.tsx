import React from 'react';
import {View, Text, TouchableOpacity, ScrollView, Image} from 'react-native';
import {TarihSonuc, TaramaModu, UrunBilgisi} from '../tipler';
import {SonucKartlari} from '../bilesenler/SonucKartlari';
import {stil} from '../stil';

interface Props {
  durum: string;
  kameraIzniYok: boolean;
  kameraHazir: boolean;
  gecmisSayisi: number;
  kalanListeSayisi: number;
  urun: UrunBilgisi | null;
  tutar: string | null;
  banknot: number | null;
  tarihSonuc: TarihSonuc | null;
  mekanAdi: string | null;
  konumAdi: string | null;
  hedefAdi: string | null;
  kalanDurakSayisi: number;
  dinleniyor: boolean;
  onSonrakiDurak: () => void;
  onUrunNerede: () => void;
  onKonumGonder: () => void;
  onMekanDinle: () => void;
  onMekandanCik: () => void;
  rehberDurumu: string | null;
  onDokun: () => void;
  onUzunBas: () => void;
  onSesliKomut: () => void;
  onKameraAc: (m: 'barkod' | TaramaModu) => void;
  onEkranAc: (m: 'liste' | 'gecmis' | 'hakkinda' | 'ayarlar') => void;
  onAnaMenu: () => void;
}

// Barkod ve yol tarifi en sık kullanılanlardır; diğer kamera modları onların altında
const KAMERA_BUTONLARI: {mod: TaramaModu; yazi: string; etiket: string; renk?: object}[] = [
  {mod: 'tarih',  yazi: 'SON KULLANMA TARİHİ', etiket: 'Son kullanma tarihini otomatik oku', renk: stil.butonTarih},
  {mod: 'para',   yazi: 'PARA TANI',           etiket: 'Para tanı',                          renk: stil.butonPara},
  {mod: 'pos',    yazi: 'POS TUTARI OKU',      etiket: 'POS tutarını oku',                   renk: stil.butonPos},
];

export function AnaEkran(p: Props) {
  const sonucVar = !!(p.urun || p.tutar || p.tarihSonuc || p.banknot);
  return (
    <ScrollView style={stil.kapsayici} contentContainerStyle={stil.kaydirIcerik}>
      <TouchableOpacity activeOpacity={1} style={stil.ekran}
      onPress={p.onDokun} onLongPress={p.onUzunBas} delayLongPress={800}
      // TalkBack ekranı tek bir buton gibi okumasın; içerik ve butonlar tek tek gezilebilsin
      accessible={false}>

        {p.kameraIzniYok && (
          <View style={stil.uyariBand}>
            <Text style={stil.uyariYazi}>
              ⚠️ Kamera izni verilmedi. Ayarlar → Uygulama İzinleri bölümünden etkinleştirin.
            </Text>
          </View>
        )}

        <View style={stil.logoKutu}>
          <Image source={require('../../assets/icon.png')} style={stil.logoIkon} resizeMode="contain"/>
          <Text style={stil.logoYazi}>BAK</Text>
          <Text style={stil.logoAlt}>Görme Engelliler İçin Sesli Alışveriş ve Yol Tarifi Asistanı</Text>
        </View>

        <View style={stil.durumBandi} accessible={true} accessibilityLabel={`Durum: ${p.durum}`}>
          <Text style={stil.durumYazi}>{p.durum}</Text>
          {!p.kameraHazir && (
            <Text style={stil.kameraUyari}>⏳ Kamera hazırlanıyor...</Text>
          )}
        </View>

        {p.mekanAdi && (
          <View style={stil.mekanBandi}>
            <TouchableOpacity onPress={p.onMekanDinle}
              accessible={true} accessibilityRole="button"
              accessibilityLabel={`Mağaza: ${p.mekanAdi}. Konum: ${p.konumAdi}.${p.hedefAdi ? ` Hedef: ${p.hedefAdi}.` : ''} Tarifi dinlemek için dokun.`}>
              <Text style={stil.mekanAdi}>📍 {p.mekanAdi}</Text>
              <Text style={stil.mekanSatir}>Konum: {p.konumAdi}</Text>
              {p.hedefAdi && (
                <Text style={stil.mekanHedef}>
                  🎯 Hedef: {p.hedefAdi}{p.kalanDurakSayisi > 1 ? ` (+${p.kalanDurakSayisi - 1} durak)` : ''}
                </Text>
              )}
              {p.rehberDurumu && <Text style={stil.mekanRehber}>{p.rehberDurumu}</Text>}
            </TouchableOpacity>
            {p.hedefAdi && (
              <TouchableOpacity style={stil.mekanCikis} onPress={p.onSonrakiDurak}
                accessible={true} accessibilityRole="button"
                accessibilityLabel={`${p.hedefAdi} durağına vardım, sonraki durağa geç`}>
                <Text style={stil.mekanSonraki}>✓ Vardım, sonraki durak</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={stil.mekanCikis} onPress={p.onMekandanCik}
              accessible={true} accessibilityRole="button"
              accessibilityLabel="Bina içi yönlendirmeyi kapat">
              <Text style={stil.mekanCikisYazi}>Yönlendirmeyi kapat</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={stil.dokunusRehber}>
          <Text style={stil.dokunusBaslik}>👆 Dokunuş Kısayolları</Text>
          <Text style={stil.dokunusSatir}>Uzun bas → 🎙️ Sesli komut</Text>
          <Text style={stil.dokunusSatir}>1 kez dok → Sustur / son sonucu dinle</Text>
          <Text style={stil.dokunusSatir}>2 kez dok → Barkod / QR oku</Text>
          <Text style={stil.dokunusSatir}>3 kez dok → Yol tarifi (ürün, oda, kişi)</Text>
        </View>

        <TouchableOpacity style={[stil.buton, stil.butonKomut, p.dinleniyor && stil.butonDevre]}
          onPress={p.onSesliKomut}
          accessible={true} accessibilityRole="button"
          accessibilityLabel="Sesli komut. Dokunduktan sonra ne yapmak istediğinizi söyleyin, örneğin barkod oku ya da süt nerede.">
          <Text style={stil.butonYazi}>{p.dinleniyor ? '🎙️ DİNLENİYOR...' : '🎙️ SESLİ KOMUT'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[stil.buton, !p.kameraHazir && stil.butonDevre]}
          onPress={() => p.onKameraAc('barkod')}
          accessible={true} accessibilityRole="button"
          accessibilityLabel="Barkod veya QR kod oku">
          <Text style={stil.butonYazi}>BARKOD / QR OKU</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[stil.buton, stil.butonNerede, p.dinleniyor && stil.butonDevre]}
          onPress={p.onUrunNerede}
          accessible={true} accessibilityRole="button"
          accessibilityLabel={p.mekanAdi
            ? 'Yol tarifi. Ürün, birim, oda numarası ya da kişi adını söyleyin.'
            : 'Yol tarifi. Önce bina ya da mağaza girişindeki QR kodu okutun.'}>
          <Text style={stil.butonYazi}>{p.dinleniyor ? '🎙️ DİNLENİYOR...' : '🧭 YOL TARİFİ'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[stil.buton, stil.butonKonum, p.dinleniyor && stil.butonDevre]}
          onPress={p.onKonumGonder}
          accessible={true} accessibilityRole="button"
          accessibilityLabel="Konumumu gönder. Bulunduğunuz yer acil kişinize WhatsApp'tan gönderilir.">
          <Text style={stil.butonYazi}>📍 KONUMUMU GÖNDER</Text>
        </TouchableOpacity>

        {KAMERA_BUTONLARI.map(b => (
          <TouchableOpacity key={b.mod} style={[stil.buton, b.renk, !p.kameraHazir && stil.butonDevre]}
            onPress={() => p.onKameraAc(b.mod)}
            accessible={true} accessibilityRole="button"
            accessibilityLabel={b.etiket}>
            <Text style={stil.butonYazi}>{b.yazi}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={[stil.buton, stil.butonListe]}
          onPress={() => p.onEkranAc('liste')}
          accessible={true} accessibilityRole="button"
          accessibilityLabel={`Alışveriş listesi, ${p.kalanListeSayisi} ürün kaldı`}>
          <Text style={stil.butonYazi}>📝 ALIŞVERİŞ LİSTESİ ({p.kalanListeSayisi})</Text>
        </TouchableOpacity>

        <TouchableOpacity style={stil.butonHakkinda}
          onPress={() => p.onEkranAc('gecmis')}
          accessible={true} accessibilityRole="button"
          accessibilityLabel={`Son taranan ürünler, ${p.gecmisSayisi} ürün`}>
          <Text style={stil.butonHakkindaYazi}>🕘 SON TARANANLAR ({p.gecmisSayisi})</Text>
        </TouchableOpacity>

        <TouchableOpacity style={stil.butonHakkinda}
          onPress={() => p.onEkranAc('ayarlar')}
          accessible={true} accessibilityRole="button"
          accessibilityLabel="Ayarlar: konuşma hızı, kısa anlatım, adım rehberi, yön uyarısı, merdiven ve yardım numarası">
          <Text style={stil.butonHakkindaYazi}>⚙️ AYARLAR</Text>
        </TouchableOpacity>

        <TouchableOpacity style={stil.butonHakkinda}
          onPress={() => p.onEkranAc('hakkinda')}
          accessible={true} accessibilityRole="button"
          accessibilityLabel="Hakkında ve iletişim">
          <Text style={stil.butonHakkindaYazi}>ℹ️ HAKKINDA</Text>
        </TouchableOpacity>

        {sonucVar && (
          <TouchableOpacity style={stil.butonAna} onPress={p.onAnaMenu}
            accessible={true} accessibilityRole="button"
            accessibilityLabel="Ana menüye dön ve sonuçları temizle">
            <Text style={stil.butonAnaYazi}>↩ ANA MENÜYE DÖN</Text>
          </TouchableOpacity>
        )}

        <SonucKartlari urun={p.urun} tutar={p.tutar} banknot={p.banknot} tarihSonuc={p.tarihSonuc}/>

      </TouchableOpacity>
    </ScrollView>
  );
}
