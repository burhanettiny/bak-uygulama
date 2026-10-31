import React, {useState, useEffect, useRef} from 'react';
import {Alert, BackHandler, Platform, Vibration} from 'react-native';
import Tts from 'react-native-tts';
import {Camera, useCameraDevice, useCodeScanner} from 'react-native-vision-camera';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import {unlink} from '@dr.pogodin/react-native-fs';

import {
  BaglantiTuru, Durak, GecmisKaydi, ListeKomutu, ListeOgesi, MekanHedefi, MekanQr, Mekan, Mod, TarihSonuc, TaramaModu, UrunBilgisi,
} from './src/tipler';
import {
  ADIM_BOYLARI, EGITIM_ADIMLARI, EGITIM_TALKBACK, EgitimHareketi, KONUSMA_HIZLARI, TARAMA, TITRESIM, taramaModuMu,
} from './src/sabitler';
import {
  TarifEt, aramaMetniTemizle, hedefBul, hedefEtiketi, hedefKonumu, listeRotasi, noktaAciklamasi, noktaAdi, yakindakilerMetni, qrCoz, gpsIleEnYakinNokta, gpsliNoktaVar, GPS_YAKIN,
  noktaTamAdi, rotaParcalari, rotaTarifi, turOzeti, varisIsle, yolUzunlugu,
} from './src/mekan/yerlesim';
import {
  Rehber, adimAtildi, devamEt, rehberBaslangicMetni, rehberDurumMetni, rehberKisaDurum, rehberOlustur,
} from './src/mekan/rehber';
import {YonIzleyici, yonIzleyici} from './src/mekan/yonIzleyici';
import {adresQrCoz, kurumMekaniMi, veriQrCoz} from './src/mekan/qrVeri';
import {Kutu, gorselIpucu, kodYonu} from './src/ayristirma/kodKonumu';
import {AcilKisi, kisiBul, konumMesaji} from './src/ayristirma/konumMesaji';
import {
  HIZLI_AGIRLIK, KALIBRASYON_ADIMI, NORMAL_AGIRLIK, SAPMA_ESIGI, adimOlcumu, adimUzunluguCm, boydanCarpan, carpaniGuncelle,
  gpsAdimOlcumu,
} from './src/mekan/adimKalibrasyonu';
import {adimSayarHazirla, adimlariDinle} from './src/servisler/adimSayar';
import {
  GpsKonumu, canliKonumPaylas, ekranAcikTut, whatsappGonder, erisilebilirlikAyarlariniAc, kisiSec, konumAl, mesajAc, numarayiOkunurYap, paylas,
  telefonNumarasiCoz, whatsappYardimcisiAcikMi, yardimAra, yonSensoruVarMi, yonuDinle,
} from './src/servisler/cihaz';
import {adrestenMekanIndir, mekanBul} from './src/servisler/mekanKaynagi';
import {kisiselAlerjenVar, urunSesliMetin} from './src/ayristirma/urun';
import {
  KisiselAlerjen, eserBolumunuAyir, icindekilerBul, icindekilerdenAlerjenler, kisiselAlerjenAdi, kisiselAlerjenCoz, kisiselEslesmeler,
} from './src/ayristirma/alerjen';
import {tutarBul, tutarSesliMetin} from './src/ayristirma/tutar';
import {sonKullanmaTarihiBul, tarihDurumHesapla} from './src/ayristirma/tarih';
import {banknotBul} from './src/ayristirma/banknot';
import {KOMUT_YARDIMI, nelerVarMi, sesliKomutCoz} from './src/ayristirma/komut';
import {benzerHedefler, devamMi, hedefListesiMetni, hedefSecenekleri, listeAdi, secimCoz} from './src/mekan/hedefListesi';
import {harfSadelestir} from './src/yazi';
import {listeKomutuCoz, listeSesliMetin, listeyleEslesir} from './src/ayristirma/liste';
import {kayitOku, kayitYaz} from './src/servisler/kayit';
import {urunAra} from './src/servisler/urunApi';
import {
  SES_HATALARI, beklerkenBildir, dinlemeyiBitir, durumSesi, ekranOkuyucuAcikMi, konusVeBekle, konusuyorMu, sesCikisiniHazirla, sesiDinle, sesliSoyele,
  soyleVeyaSustur, sustur,
} from './src/servisler/ses';
import {useCokluDokunus} from './src/kancalar/useCokluDokunus';
import {AnaEkran} from './src/ekranlar/AnaEkran';
import {KameraEkrani} from './src/ekranlar/KameraEkrani';
import {ListeEkrani} from './src/ekranlar/ListeEkrani';
import {GecmisEkrani} from './src/ekranlar/GecmisEkrani';
import {HakkindaEkrani} from './src/ekranlar/HakkindaEkrani';
import {AyarlarEkrani} from './src/ekranlar/AyarlarEkrani';
import {EgitimEkrani} from './src/ekranlar/EgitimEkrani';

const MEKAN_HATIRLAMA_SURESI = 4 * 60 * 60 * 1000; // 4 saat
// Barkod kamerası açıkken: ipuçlarının söylendiği ve aramadan vazgeçildiği saniyeler
const BARKOD_IPUCLARI: [number, string][] = [
  [10, 'Barkod genellikle ürünün arkasında ya da altında, çizgili küçük bir alandır. Ürünü yavaşça çevirin.'],
  [22, 'Telefonu üründen bir karış uzakta tutup yavaşça yaklaştırın. Ortam karanlıksa ekrana uzun basarak feneri açın.'],
];
const BARKOD_VAZGECME_SN = 40;
// "Etiket ara": duvardaki BAK QR etiketini bulmak. Kamera QR'ı ancak tamamen okuyunca haber verdiği için
// kullanıcıya tarama tekniği ve etiketlerin olağan yeri (kapının sağı, göğüs hizası) anlatılır.
const ETIKET_ARAMA_BASLANGICI = 'Etiket aranıyor. Telefonu göğüs hizasında, ekranı size dönük ve dik tutun. ' +
  'Duvara doğru çevirip yavaşça sağa sola tarayın. Etiketler genellikle kapıların sağında, yerden yaklaşık ' +
  '120 santim yüksekliktedir. Bulunca titreşip okuyacağım.';
const ETIKET_IPUCLARI: [number, string][] = [
  [12, 'Telefonu duvardan yarım metre kadar uzakta tutun ve çok yavaş hareket ettirin.'],
  [25, 'Bir kapıya ulaşırsanız elinizle kapının sağ kenarını bulun ve telefonu o hizada tutun.'],
  [40, 'Telefonu biraz yukarı ve aşağı oynatın; etiket beklediğinizden yüksekte ya da alçakta olabilir.'],
];
const ETIKET_VAZGECME_SN = 60;
const REHBER_UYANIK_MS = 3 * 60 * 1000;
// Canlı konumu WhatsApp'ın kendisi başlatır; başka bir uygulamanın onu açma yolu yoktur. Bu yüzden BAK
// sohbeti hazır açar ve adımları önceden sesle anlatır (WhatsApp açıkken BAK konuşmaya devam edemeyebilir).
// BAK WhatsApp yardımcısı (erişilebilirlik hizmeti) açıksa bu adımları kullanıcının yerine o yapar.
// iPhone'da yardımcı yoktur (Apple izin vermez): adımlar her zaman anlatılır; WhatsApp'ın iPhone düzeni farklıdır.
const canliKonumAdimlari = () => (Platform.OS === 'ios'
  ? 'WhatsApp açılınca önce sağ alttaki gönder düğmesine basın. Sonra mesaj kutusunun solundaki artı düğmesine, ' +
    'ardından Konum ve Canlı Konumu Paylaş seçeneklerine dokunun; süreyi, örneğin 1 saat, seçip gönderin. ' +
    'Konumunuz seçtiğiniz süre boyunca kendiliğinden güncellenir. VoiceOver açıksa düğmeleri parmağınızı ' +
    'kaydırarak bulabilirsiniz.'
  : 'WhatsApp açılınca önce gönder tuşuna basın. Sonra mesaj kutusunun yanındaki ataç ' +
    'düğmesine, ardından Konum ve Canlı konumu paylaş seçeneklerine dokunun; süreyi seçip gönderin. ' +
    'Konumunuz seçtiğiniz süre boyunca kendiliğinden güncellenir.');

export default function App() {
  const [mod,        setMod]        = useState<Mod>('ana');
  const [durum,      setDurum]      = useState('Hazır');
  const [urun,       setUrun]       = useState<UrunBilgisi | null>(null);
  const [tutar,      setTutar]      = useState<string | null>(null);
  const [tarihSonuc, setTarihSonuc] = useState<TarihSonuc | null>(null);
  const [banknot,    setBanknot]    = useState<number | null>(null);
  const [okunanMetin, setOkunanMetin] = useState<string | null>(null);   // son okunan içindekiler (tekrar için)
  const [izinDurumu, setIzinDurumu] = useState<'granted' | 'denied' | 'not-determined'>('not-determined');
  const [fenerAcik,  setFenerAcik]  = useState(false);
  const [gecmis,     setGecmis]     = useState<GecmisKaydi[]>([]);
  const [hizIndex,   setHizIndex]   = useState(1);
  const [liste,      setListe]      = useState<ListeOgesi[]>([]);
  const [dinleniyor, setDinleniyor] = useState(false);
  // Mağaza içi yönlendirme: etkin mağaza, son okutulan nokta ve gidilecek duraklar.
  // "Süt nerede?" tek duraklı, liste gezisi çok duraklı bir turdur; ilk durak o anki hedeftir.
  const [mekan,     setMekan]     = useState<Mekan | null>(null);
  const [konumNoktasi, setKonumNoktasi] = useState<string | null>(null);
  const [duraklar,   setDuraklar]   = useState<Durak[]>([]);
  const hedef = duraklar[0]?.hedef || null;
  // Merdiven kullanmak istemeyenler için asansör/rampa tercih edilir
  const [merdivendenKacin, setMerdivendenKacin] = useState(false);
  const kacinilacak: BaglantiTuru[] = merdivendenKacin ? ['merdiven', 'yuruyen-merdiven'] : [];
  // Adım adım rehber: adım sensörüyle geri sayım. Ayar kapalıysa ya da sensör yoksa tarif tek seferde okunur.
  const [adimRehberiAyari, setAdimRehberiAyari] = useState(true);
  const [adimSayarHazir, setAdimSayarHazir] = useState<boolean | null>(null);
  const [rehber, setRehber] = useState<Rehber | null>(null);
  const rehberRef = useRef<Rehber | null>(null);
  // Rehber son adımdan sonra kısa bir süre "etkin" sayılır (ekran açık tutulur)
  const [rehberUyanik, setRehberUyanik] = useState(false);
  const uyanikZamanlayiciRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adimRehberiAcik = adimRehberiAyari && adimSayarHazir === true;
  // Düz yürünecek bölümde pusula yönü izlenir; kullanıcı belirgin biçimde saparsa uyarılır
  const [yonUyarisi, setYonUyarisi] = useState(true);
  const yonIzleyiciRef = useRef<YonIzleyici>(yonIzleyici());
  const izlenenParcaRef = useRef<unknown>(null);
  const [kisaAnlatim, setKisaAnlatim] = useState(false);
  const [adimBoyuIndex, setAdimBoyuIndex] = useState(1);
  // Adım çarpanı seçilen adım boyuyla başlar, QR'lar arası yürüyüşlerle öğrenilir. Ref: QR işlenirken
  // güncellenen değer aynı fonksiyondaki tarifte hemen kullanılsın.
  const [adimCarpani, setAdimCarpani] = useState(1);
  const adimCarpaniRef = useRef(1);
  // Son QR noktası ve o QR'dan bu yana yürüme bölümlerinde sayılan adım
  const adimOlcumRef = useRef<{nokta: string; adim: number} | null>(null);
  const adimOlcumSayisiRef = useRef(0);
  const hizliOlcumRef = useRef(0);    // kalan hızlı ölçüm sayısı ("adımlarım değişti" ya da art arda sapma)
  const sapmaRef = useRef(0);         // art arda aynı yönde sapan ölçüm sayısı (+ uzun, - kısa)   // kaç yolda adım ölçüldü (kullanıcıya ne kadar güvenilir olduğunu söylemek için)
  const [yardimNumarasi, setYardimNumarasi] = useState<string | null>(null);
  // Rehberden seçilen acil kişiler: konum gönderme ve "annemi ara" için
  const [acilKisiler, setAcilKisiler] = useState<AcilKisi[]>([]);
  const [alerjenlerim, setAlerjenlerim] = useState<KisiselAlerjen[]>([]);
  // İlk açılış eğitimi: hangi adımda olunduğu ve TalkBack sürümünün mü gösterildiği
  const [egitimAdim, setEgitimAdim] = useState(0);
  const [egitimTalkback, setEgitimTalkback] = useState(false);

  const tarandiRef         = useRef(false);
  const komutuIsleRef      = useRef<(metin: string) => void>(() => {});
  // Kamera önizlemesinin boyutu ve son söylenen yön tarifi (görülen ama okunamayan kod için)
  const onizlemeRef        = useRef({width: 0, height: 0});
  const sonYonRef          = useRef({metin: '', zaman: 0});
  // Barkod kamerası duvardaki BAK etiketini bulmak için mi açıldı (ipuçları buna göre değişir)
  const etiketAraniyorRef  = useRef(false);
  // Otomatik tarama (tarih / POS / para) durumu
  const mesgulRef          = useRef(false);
  const bulunduRef         = useRef(false);
  const taramaIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const denemeSayisiRef    = useRef(0);
  const cameraRef          = useRef<Camera>(null);
  const kameraAcilisRef    = useRef(0);
  const gorselMesgulRef    = useRef(false);
  const qrZamaniRef        = useRef(0);   // son nokta QR'ının (ya da vardım'ın) okunduğu an
  const gorselYardimRef    = useRef<() => Promise<void>>(async () => {});
  const modRef             = useRef<Mod>('ana');   // kamerayı açan dokunuşların artığı kamerayı hemen kapatmasın
  const device             = useCameraDevice('back');
  const kameraHazir        = !!device;
  const cokluDokunus       = useCokluDokunus();

  useEffect(() => {
    const sesCikisiniBirak = sesCikisiniHazirla();
    Tts.setDefaultRate(KONUSMA_HIZLARI[1].deger);
    kayitOku<boolean>('ayar:merdivendenKacin', false).then(setMerdivendenKacin);
    kayitOku<boolean>('ayar:adimRehberi', true).then(setAdimRehberiAyari);
    kayitOku<boolean>('ayar:kisaAnlatim', false).then(setKisaAnlatim);
    kayitOku<number>('ayar:adimBoyu', 1).then(async i => {
      const index = ADIM_BOYLARI[i] ? i : 1;
      setAdimBoyuIndex(index);
      adimCarpaniAyarla(await kayitOku<number>('ayar:adimCarpani', ADIM_BOYLARI[index].carpan), false);
    });
    kayitOku<number>('ayar:adimOlcumSayisi', 0).then(n => { adimOlcumSayisiRef.current = n; });
    kayitOku<number>('ayar:adimHizliOlcum', 0).then(n => { hizliOlcumRef.current = n; });
    kayitOku<boolean>('ayar:yonUyarisi', true).then(setYonUyarisi);
    kayitOku<string | null>('ayar:yardimNumarasi', null).then(setYardimNumarasi);
    kayitOku<AcilKisi[]>('acilKisiler', []).then(setAcilKisiler);
    kayitOku<KisiselAlerjen[]>('ayar:alerjenler', []).then(setAlerjenlerim);
    kayitOku<number>('ayar:konusmaHizi', 1).then(i => {
      const index = KONUSMA_HIZLARI[i] ? i : 1;
      setHizIndex(index);
      Tts.setDefaultRate(KONUSMA_HIZLARI[index].deger);
    });
    kayitOku<GecmisKaydi[]>('gecmis', []).then(setGecmis);
    kayitOku<ListeOgesi[]>('alisverisListesi', []).then(setListe);
    // Uygulama alışveriş sırasında kapanıp açılırsa mağaza hatırlanır; eski kayıt bir sonraki
    // alışverişte yanlış mağazayı yüklemesin diye süreli tutulur
    kayitOku<{id: string; zaman: number} | null>('aktifMekan', null).then(k => {
      if (k && Date.now() - k.zaman < MEKAN_HATIRLAMA_SURESI) mekanBul(k.id, mekanGuncellendi).then(setMekan);
    });
    // Android'de TTS motoru hazır olmadan konuşma isteği sessizce kaybolur
    Tts.getInitStatus()
      .then(() => Tts.setDefaultLanguage('tr-TR').catch(turkceSesEksik))
      .then(() => kayitOku<boolean>('egitimTamam', false))
      .then(tamam => {
        if (!tamam) egitimiBaslat();
        else if (ekranOkuyucuAcikMi()) sesliSoyele('BAK uygulamasına hoş geldiniz. Sesli komut butonu en üstte.');
        else sesliSoyele('BAK uygulamasına hoş geldiniz. Sesli komut için ekrana uzun basın. ' +
          'Bir dokunuş susturur, iki dokunuş barkod okur, üç dokunuş yol tarifi verir.');
      })
      .catch(err => {
        if (err?.code === 'no_engine') Tts.requestInstallEngine();
      });
    Camera.requestCameraPermission().then(s => {
      setIzinDurumu(s === 'granted' ? 'granted' : 'denied');
    });
    return sesCikisiniBirak;
  }, []);

  // Rehber sürerken her adımda geri sayım; rehber bitince sensör kapatılır (pil için)
  const rehberVar = rehber !== null;
  useEffect(() => {
    if (!rehberVar || !adimRehberiAcik) return;
    return adimlariDinle(() => {
      const r = rehberRef.current;
      if (!r) return;
      // Kalibrasyon için yalnızca yürüme bölümlerindeki adımlar sayılır
      if (adimOlcumRef.current && !r.parcalar[r.sira]?.dikey) adimOlcumRef.current.adim += 1;
      const {rehber: yeni, soylenecek} = adimAtildi(r);
      rehberAyarla(yeni);
      yonIzleyiciRef.current.adim(Date.now(), yeni.sayac);
      if (soylenecek) {
        Vibration.vibrate(TITRESIM.dokunusOnay);
        sesliSoyele(soylenecek);
      }
    });
  }, [rehberVar, adimRehberiAcik]);

  // Rehber sürerken pusula: düz bölümde yön değişip yürümeye devam edilirse bir kez uyarılır
  useEffect(() => {
    if (!rehberVar || !adimRehberiAcik || !yonUyarisi) return;
    return yonuDinle(derece => {
      const r = rehberRef.current;
      if (!r || !yonIzleyiciRef.current.olcum(derece, Date.now())) return;
      Vibration.vibrate(TITRESIM.hata);
      sesliSoyele(`Dikkat, yönünüz değişti. ${r.parcalar[r.sira].metin} ` +
        'Emin değilseniz durun ve yakındaki QR kodunu okutun.');
    });
  }, [rehberVar, adimRehberiAcik, yonUyarisi]);

  // Kamera açıkken, yol tarifiyle yürürken, cevap beklenirken ve eğitimde ekrana dokunulmaz;
  // telefon ekranı kapatıp kilitlemesin. Rehber, vardıktan sonra yeni QR okutulana kadar açık kalabildiği
  // için yalnızca son adımdan sonraki birkaç dakika sayılır. Diğer zamanlarda telefonun ayarı geçerlidir (pil).
  const ekranAcikKalmali = mod === 'barkod' || taramaModuMu(mod) || mod === 'egitim' || rehberUyanik || dinleniyor;
  const ekranAcikKalmaliRef = useRef(ekranAcikKalmali);
  ekranAcikKalmaliRef.current = ekranAcikKalmali;
  useEffect(() => {
    ekranAcikTut(ekranAcikKalmali);
  }, [ekranAcikKalmali]);
  useEffect(() => () => {
    ekranAcikTut(false);
    if (uyanikZamanlayiciRef.current) clearTimeout(uyanikZamanlayiciRef.current);
  }, []);

  // Barkod kamerası: aranırken hafif titreşim nabzı, gecikirse ipuçları, sonunda vazgeçme
  useEffect(() => {
    if (mod !== 'barkod') return;
    const etiket = etiketAraniyorRef.current;
    const nabiz = setInterval(() => Vibration.vibrate(30), 2000);
    // Kod çözülemezken görüntüden yön ipucu (en güncel render'daki işlev çağrılır)
    const gorsel = setInterval(() => gorselYardimRef.current(), 2500);
    const zamanlayicilar = (etiket ? ETIKET_IPUCLARI : BARKOD_IPUCLARI)
      .map(([sn, ipucu]) => setTimeout(() => sesliSoyele(ipucu), sn * 1000));
    zamanlayicilar.push(setTimeout(() => {
      setMod('ana');
      setDurum(etiket ? 'Etiket bulunamadı' : 'Barkod bulunamadı');
      Vibration.vibrate(TITRESIM.urunBulunamadi);
      sesliSoyele(etiket
        ? 'Etiket bulunamadı. Yakındaki birinden yardım isteyebilir ya da uzun basıp kayboldum diyebilirsiniz.'
        : 'Barkod bulunamadı. Tekrar denemek için iki kez dokunun ya da bir görevliden yardım isteyin.');
    }, (etiket ? ETIKET_VAZGECME_SN : BARKOD_VAZGECME_SN) * 1000));
    return () => {
      clearInterval(nabiz);
      clearInterval(gorsel);
      zamanlayicilar.forEach(clearTimeout);
      etiketAraniyorRef.current = false;
    };
  }, [mod]);

  // Android geri tuşu / geri hareketi: alt ekranlarda ve kamerada uygulamayı kapatmak yerine ana menüye döner.
  // Görme engelli kullanıcı yanlışlıkla geri yapınca uygulamanın kapanması büyük sorun (yeniden açıp bulmak zor).
  useEffect(() => {
    const abonelik = BackHandler.addEventListener('hardwareBackPress', () => {
      if (dinleniyor) {
        dinlemeyiBitir();
        return true;
      }
      if (mod === 'ana') return false;
      if (mod === 'egitim') return true;   // eğitim kendi düğmesiyle biter
      sustur();
      setMod('ana');
      setDurum('Hazır');
      Vibration.vibrate(TITRESIM.dokunusOnay);
      sesliSoyele('Ana menü.');
      return true;
    });
    return () => abonelik.remove();
  }, [mod, dinleniyor]);

  // Türkçe ses verisi yoksa uygulama yanlış dilde konuşur ya da hiç konuşmaz.
  // Uyarı TalkBack tarafından okunur; Android'in ses verisi indirme ekranı da açılır.
  function turkceSesEksik(err: {code?: string}) {
    setDurum('⚠️ Türkçe ses verisi yüklü değil');
    if (err?.code === 'lang_missing_data') Tts.requestInstallData().catch(() => {});
    Alert.alert(
      'Türkçe ses eksik',
      'Telefonunuzda Türkçe metin okuma sesi yüklü değil. Ayarlar → Erişilebilirlik → Metin okuma çıkışı bölümünden Türkçe ses verisini indirin.',
      [{text: 'Tamam'}],
    );
  }

  // Hakkında, geçmiş ve liste ekranlarına girilince otomatik sesli okuma
  useEffect(() => {
    let metin = '';
    if (mod === 'hakkinda') {
      metin = 'Hakkında ekranı. ' +
        'BAK, görme engelliler için sesli alışveriş ve yol tarifi asistanı. ' +
        'Tek dokunuşla tüm içeriği dinleyebilirsiniz. ' +
        'Bölümlere ayrı ayrı dokunarak sadece o bölümü de dinleyebilirsiniz. ' +
        'Ana menüye dönmek için uzun basın.';
    } else if (mod === 'gecmis') {
      metin = gecmis.length
        ? `Son taranan ${gecmis.length} ürün. Tek dokunuşla hepsini dinleyin, ürüne dokunarak tek tek dinleyin. Ana menü için uzun basın.`
        : 'Henüz taranmış ürün yok. Ana menü için uzun basın.';
    } else if (mod === 'ayarlar') {
      metin = 'Ayarlar ekranı. Konuşma hızı, kısa anlatım, adım adım rehber, yön uyarısı, merdivenden kaçınma ' +
        've yardım numarası burada. Ana menü için uzun basın.';
    } else if (mod === 'liste') {
      metin = `Alışveriş listesi. ${listeSesliMetin(liste)} ` +
        'Tek dokun listeyi dinle ya da sustur. İki kez dokun, ürün adını söyleyerek ekle veya "sütü sil" diyerek çıkar. ' +
        (mekan ? 'Listeyi mağazada gezmek için 3 kez dokun. ' : '') + 'Ana menü için uzun bas.';
    }
    if (!metin) return;
    const t = setTimeout(() => sesliSoyele(metin), 400);
    return () => clearTimeout(t);
    // gecmis/liste bilerek bağımlılıkta yok: sadece ekrana girerken okunsun
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mod]);

  // Tarama modlarına girince otomatik okumayı başlat, çıkınca durdur
  useEffect(() => {
    denemeSayisiRef.current = 0;
    if (mod !== 'barkod' && !taramaModuMu(mod)) setFenerAcik(false);
    if (!taramaModuMu(mod)) return;

    const taramaModu = mod;
    bulunduRef.current = false;
    const baslangic = setTimeout(() => {
      taramaAdimi(taramaModu);
      taramaIntervalRef.current = setInterval(() => taramaAdimi(taramaModu), TARAMA[taramaModu].aralik);
    }, 1000);
    return () => {
      clearTimeout(baslangic);
      taramayiDurdur();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mod]);

  function taramayiDurdur() {
    if (taramaIntervalRef.current) {
      clearInterval(taramaIntervalRef.current);
      taramaIntervalRef.current = null;
    }
  }

  // Fotoğraf çek, yazıyı oku, fotoğrafı sil (aksi halde önbellek dolar)
  async function fotoOku(): Promise<string | null> {
    const foto = await cameraRef.current?.takePhoto({flash: 'off'});
    if (!foto) return null;
    try {
      return (await TextRecognition.recognize(`file://${foto.path}`)).text;
    } finally {
      unlink(foto.path).catch(() => {});
    }
  }

  async function taramaAdimi(taramaModu: TaramaModu) {
    if (bulunduRef.current || mesgulRef.current) return;
    mesgulRef.current = true;
    try {
      const metin = await fotoOku();
      if (metin === null || bulunduRef.current) return;
      if (sonucuIsle(taramaModu, metin)) {
        bulunduRef.current = true;
        taramayiDurdur();
      } else {
        sonucBulunamadi(taramaModu);
      }
    } catch {
      // Tek karede hata olabilir; bir sonraki denemede devam edilir
    } finally {
      mesgulRef.current = false;
    }
  }

  function sonucuIsle(taramaModu: TaramaModu, metin: string): boolean {
    if (taramaModu === 'tarih') {
      const bulunanTarih = sonKullanmaTarihiBul(metin);
      if (!bulunanTarih) return false;
      tarihGoster(tarihDurumHesapla(bulunanTarih));
      return true;
    }
    if (taramaModu === 'pos') {
      const bulunanTutar = tutarBul(metin);
      if (!bulunanTutar) return false;
      sonuclariTemizle();
      setTutar(bulunanTutar);
      setMod('ana');
      setDurum(`Tutar: ${bulunanTutar} TL`);
      Vibration.vibrate(TITRESIM.posBulundu);
      sesliSoyele(`Tutar: ${tutarSesliMetin(bulunanTutar)}`);
      return true;
    }
    if (taramaModu === 'icindekiler') {
      const icindekiler = icindekilerBul(metin);
      if (!icindekiler) return false;
      icindekilerGoster(icindekiler);
      return true;
    }
    const deger = banknotBul(metin);
    if (!deger) return false;
    sonuclariTemizle();
    setBanknot(deger);
    setMod('ana');
    setDurum(`Para: ${deger} TL`);
    Vibration.vibrate(TITRESIM.urunBulundu);
    sesliSoyele(`${deger} Türk lirası.`);
    return true;
  }

  function sonucBulunamadi(taramaModu: TaramaModu) {
    denemeSayisiRef.current += 1;
    const n = denemeSayisiRef.current;
    const ayar = TARAMA[taramaModu];
    if (n === Math.floor(ayar.limit / 2)) {
      Vibration.vibrate(TITRESIM.dokunusOnay);
      sesliSoyele(`${ayar.ipucu} Çıkmak için dokunun.`);
      return;
    }
    if (n < ayar.limit) return;

    bulunduRef.current = true;
    taramayiDurdur();
    if (taramaModu === 'tarih') {
      tarihGoster({
        tarih: 'Tarih yok', durum: 'yok', gunKaldi: 0,
        mesaj: 'Son kullanma tarihi bulunamadı',
        sesliMesaj: 'Tarih yok. Bu üründe son kullanma tarihi bulunamadı. Tekrar denemek için uzun basıp son kullanma tarihi deyin.',
      });
      return;
    }
    sonuclariTemizle();
    setMod('ana');
    Vibration.vibrate(TITRESIM.urunBulunamadi);
    if (taramaModu === 'icindekiler') {
      setDurum('İçindekiler bulunamadı');
      sesliSoyele('İçindekiler okunamadı. Ambalajın arka yüzünde küçük yazıyla olabilir; tekrar denemek için uzun basıp ' +
        'içindekileri oku deyin ya da bir görevliye sorun.');
    } else if (taramaModu === 'pos') {
      setDurum('Tutar bulunamadı');
      sesliSoyele('Tutar okunamadı. Tekrar denemek için uzun basıp POS tutarı deyin.');
    } else {
      setDurum('Para tanınamadı');
      sesliSoyele('Para tanınamadı. Tekrar denemek için uzun basıp para tanı deyin.');
    }
  }

  // Ambalajdan okunan içindekiler: önce kullanıcının kendi alerjeni, sonra genel alerjenler, sonra metnin kendisi
  function icindekilerGoster(icindekiler: string) {
    sonuclariTemizle();
    // "Eser miktarda … içerebilir" cümlesi kesin içerik sayılmaz, ayrıca söylenir
    const {ana, eser} = eserBolumunuAyir(icindekiler);
    const gruplar = icindekilerdenAlerjenler(ana);
    const eserGruplar = icindekilerdenAlerjenler(eser).filter(g => !gruplar.includes(g));
    const {icerir, eser: kisiselEser} = kisiselEslesmeler(
      {ad: '', marka: '', alerjenler: gruplar, eserAlerjenler: eserGruplar, icindekiler: ana}, alerjenlerim);
    let metin = icerir.length ? `Dikkat! İçindekilerde sizin alerjeniniz var: ${icerir.join(', ')}. ` : '';
    if (kisiselEser.length) metin += `Dikkat! Sizin alerjeniniz eser miktarda bulunabilir: ${kisiselEser.join(', ')}. `;
    if (gruplar.length) metin += `Alerjen: ${gruplar.join(', ')}. `;
    if (eserGruplar.length) metin += `Eser miktarda içerebilir: ${eserGruplar.join(', ')}. `;
    metin += `İçindekiler: ${ana || icindekiler}.`;
    setOkunanMetin(metin);
    setMod('ana');
    setDurum('İçindekiler okundu');
    Vibration.vibrate(icerir.length || kisiselEser.length ? TITRESIM.hata : TITRESIM.urunBulundu);
    sesliSoyele(metin);
  }

  function tarihGoster(sonuc: TarihSonuc) {
    sonuclariTemizle();
    setTarihSonuc(sonuc);
    setMod('ana');
    setDurum(sonuc.durum === 'yok' ? 'Tarih yok' : `SKT: ${sonuc.tarih}`);
    Vibration.vibrate(
      sonuc.durum === 'gecmis' ? TITRESIM.hata :
      sonuc.durum === 'iyi'    ? TITRESIM.urunBulundu :
      TITRESIM.urunBulunamadi
    );
    sesliSoyele(sonuc.sesliMesaj);
  }

  function sonuclariTemizle() {
    setUrun(null); setTutar(null); setTarihSonuc(null); setBanknot(null); setOkunanMetin(null);
  }

  function gecmiseEkle(barkod: string, bilgi: UrunBilgisi) {
    setGecmis(onceki => {
      const yeni = [
        {barkod, ad: bilgi.ad, marka: bilgi.marka, zaman: Date.now()},
        ...onceki.filter(g => g.barkod !== barkod),
      ].slice(0, 20);
      kayitYaz('gecmis', yeni);
      return yeni;
    });
  }

  function listeGuncelle(degistir: (onceki: ListeOgesi[]) => ListeOgesi[]) {
    setListe(onceki => {
      const yeni = degistir(onceki);
      kayitYaz('alisverisListesi', yeni);
      return yeni;
    });
  }

  // Soruyu söyle, konuşma bitince mikrofonu aç, söyleneni döndür. Hata olursa kullanıcıya sesli
  // bildirir ve null döner; tekrarIpucu "Tekrar denemek için …" cümlesini tamamlar.
  async function dinle(soru: string, tekrarIpucu: string): Promise<string | null> {
    if (dinleniyor) {
      // Kullanıcı "duymadı mı?" diye yeniden basarsa sessiz kalınmaz: dinleme bitirilir, söylediği işlenir
      Vibration.vibrate(TITRESIM.dokunusOnay);
      dinlemeyiBitir();
      return null;
    }
    const oncekiDurum = durum;
    setDinleniyor(true);
    setDurum('Dinleniyor...');
    await konusVeBekle(soru);
    // Konuşurken anlaşılan ekranda büyük yazıyla görünür (az gören kullanıcı ve yanındaki için)
    const sonuc = await sesiDinle({kismi: m => setDurum(`🎤 ${m}`)});
    setDinleniyor(false);
    setDurum(oncekiDurum);

    if ('hata' in sonuc) {
      Vibration.vibrate(TITRESIM.hata);
      durumSesi('hata');
      // Kod ekranda görünsün: sorun bildirilirken hangi hata olduğu anlaşılır
      if (sonuc.kod) setDurum(`Ses tanıma hatası (kod ${sonuc.kod})`);
      // "Hiç duymadım" ile "duydum ama anlamadım" ayrı söylenir: kullanıcı neyi düzelteceğini bilsin
      sesliSoyele(sonuc.hata === 'sessiz'
        ? `Sesinizi duyamadım. Bip sesinden sonra telefonu ağzınıza yaklaştırıp konuşun. Tekrar denemek için ${tekrarIpucu}.`
        : sonuc.hata === 'anlasilmadi'
          ? `Sesinizi duydum ama anlayamadım. Kısa ve net söyleyin. Tekrar denemek için ${tekrarIpucu}.`
          : SES_HATALARI[sonuc.hata]);
      return null;
    }
    return sonuc.metin;
  }

  async function sesleListeyiDuzenle() {
    const metin = await dinle('Dinliyorum.', 'iki kez dokunun');
    if (metin) listeKomutuUygula(listeKomutuCoz(metin));
  }

  function listeKomutuUygula(komut: ListeKomutu) {
    if (komut.tur === 'temizle') {
      listeGuncelle(() => []);
      Vibration.vibrate(TITRESIM.urunBulundu);
      sesliSoyele('Liste temizlendi.');
      return;
    }
    if (komut.tur === 'sil') {
      const silinecek = liste.find(o => listeyleEslesir(o.ad, komut.oge) || listeyleEslesir(komut.oge, o.ad));
      if (!silinecek) {
        Vibration.vibrate(TITRESIM.urunBulunamadi);
        sesliSoyele(`${komut.oge} listede yok.`);
        return;
      }
      listeGuncelle(l => l.filter(o => o !== silinecek));
      Vibration.vibrate(TITRESIM.urunBulundu);
      sesliSoyele(`${silinecek.ad} listeden çıkarıldı.`);
      return;
    }
    // Zaten listede (alınmamış) olanları tekrar ekleme
    const yeniler = komut.ogeler.filter(oge => !liste.some(o => !o.alindi && listeyleEslesir(o.ad, oge)));
    if (!yeniler.length) {
      sesliSoyele(komut.ogeler.length ? `${komut.ogeler.join(', ')} zaten listede.` : SES_HATALARI.anlasilmadi);
      return;
    }
    listeGuncelle(l => [...l, ...yeniler.map(ad => ({ad, alindi: false}))]);
    Vibration.vibrate(TITRESIM.urunBulundu);
    sesliSoyele(`${yeniler.join(', ')} listeye eklendi.`);
  }

  function listeOgesiDegistir(oge: ListeOgesi) {
    listeGuncelle(l => l.map(o => (o === oge ? {...o, alindi: !o.alindi} : o)));
    Vibration.vibrate(TITRESIM.dokunusOnay);
    sesliSoyele(oge.alindi ? `${oge.ad}, alınmadı olarak işaretlendi.` : `${oge.ad}, alındı olarak işaretlendi.`);
  }

  function alinanlariSil() {
    const sayi = liste.filter(o => o.alindi).length;
    listeGuncelle(l => l.filter(o => !o.alindi));
    Vibration.vibrate(TITRESIM.dokunusOnay);
    sesliSoyele(sayi ? `${sayi} alınan ürün listeden silindi.` : 'Silinecek alınmış ürün yok.');
  }

  // Taranan ürün listedeki bir ürünse işaretle; söylenecek ek metni döndürür
  function listedeIsaretle(bilgi: UrunBilgisi): string {
    const eslesen = liste.find(o => !o.alindi && listeyleEslesir(o.ad, `${bilgi.ad} ${bilgi.kategori || ''}`));
    if (!eslesen) return '';
    listeGuncelle(l => l.map(o => (o === eslesen ? {...o, alindi: true} : o)));
    // Turdaki duraklardan da düş: durağa varınca "alınacaklar" arasında tekrar sayılmasın
    setDuraklar(d => d.map(x => ({...x, ogeler: x.ogeler.filter(o => o !== eslesen.ad)})));
    const kalan = liste.filter(o => !o.alindi).length - 1;
    return ` Listenizdeki ${eslesen.ad} bulundu ve işaretlendi. ${kalan ? `${kalan} ürün kaldı.` : 'Listedeki tüm ürünler alındı.'}`;
  }

  // İnternetten daha yeni bir düzen gelirse, kullanıcı hâlâ o binadaysa sessizce güncellenir
  function mekanGuncellendi(guncel: Mekan) {
    setMekan(m => (m?.id === guncel.id ? guncel : m));
  }

  // ── Adım adım rehber ──────────────────────────────────

  function rehberAyarla(r: Rehber | null) {
    rehberRef.current = r;
    setRehber(r);
    if (uyanikZamanlayiciRef.current) clearTimeout(uyanikZamanlayiciRef.current);
    setRehberUyanik(r !== null);
    if (r) uyanikZamanlayiciRef.current = setTimeout(() => setRehberUyanik(false), REHBER_UYANIK_MS);
    // Yeni bölüme geçilince yön izleyici sıfırlanır; yalnızca dönüşsüz yürüme bölümleri izlenir
    const parca = r ? r.parcalar[r.sira] : null;
    if (parca !== izlenenParcaRef.current) {
      izlenenParcaRef.current = parca;
      yonIzleyiciRef.current.bolumBasladi(!!parca && !parca.dikey && !/dön|yönelin/i.test(parca.metin));
    }
  }

  // Ayar açıksa adım sensörünü ve iznini bir kez hazırlar. Sonucu döndürür, çünkü state
  // güncellemesi aynı fonksiyon içinde henüz görünmez.
  async function rehberHazirla(): Promise<boolean> {
    if (!adimRehberiAyari) return false;
    if (adimSayarHazir !== null) return adimSayarHazir;
    const hazir = await adimSayarHazirla();
    setAdimSayarHazir(hazir);
    return hazir;
  }

  // Tüm yol tarifleri buradan geçer. Rehber açıksa yalnızca ilk talimat söylenir ve adımlar sayılır;
  // kapalıysa (ya da telefonda adım sensörü yoksa) tarif tek seferde okunur.
  function tarifEtici(y: Mekan, rehberAcik: boolean = adimRehberiAcik): TarifEt {
    return (baslangic, h) => {
      const rota = rehberAcik && baslangic !== h.nokta
        ? rotaParcalari(y, baslangic, h.nokta, kacinilacak, kisaAnlatim, adimCarpaniRef.current) : null;
      if (!rota || !rota.parcalar.length) {
        rehberAyarla(null);
        return rotaTarifi(y, baslangic, h, kacinilacak, kisaAnlatim, adimCarpaniRef.current);
      }
      const r = rehberOlustur(h, rota.parcalar);
      rehberAyarla(r);
      return rehberBaslangicMetni(r, rota.not);
    };
  }

  // "Devam": merdiven/asansör bitti ya da kullanıcı bir sonraki bölüme geçmek istiyor
  function devam() {
    const r = rehberRef.current;
    if (r) {
      const {rehber: yeni, soylenecek} = devamEt(r);
      if (!yeni) {
        // Son bölüm de bitti: hedefe varıldı, QR okutulmuş gibi durak tamamlanır
        sonrakiDurak();
        return;
      }
      rehberAyarla(yeni);
      Vibration.vibrate(TITRESIM.dokunusOnay);
      sesliSoyele(soylenecek);
      return;
    }
    if (duraklar.length) sonrakiDurak();
    else sesliSoyele('Devam eden bir yönlendirme yok.');
  }

  async function adimRehberiDegistir(acik: boolean) {
    setAdimRehberiAyari(acik);
    kayitYaz('ayar:adimRehberi', acik);
    Vibration.vibrate(TITRESIM.dokunusOnay);
    if (!acik) {
      rehberAyarla(null);
      sesliSoyele('Adım adım rehber kapatıldı. Tarifler tek seferde okunacak.');
      return;
    }
    const hazir = adimSayarHazir ?? await adimSayarHazirla();
    setAdimSayarHazir(hazir);
    sesliSoyele(hazir
      ? 'Adım adım rehber açıldı. Yürürken kalan adımları ve dönüşleri söyleyeceğim.'
      : 'Bu telefonda adım sensörü yok ya da izin verilmedi. Tarifler tek seferde okunacak.');
  }

  // ── Bina içi yönlendirme ──────────────────────────────

  // hazir: düzeni QR'ın içinde gelen kurum binası (bkz. qrVeri.ts); yoksa düzen telefonda ya da internette aranır
  async function mekanQrIsle(qr: MekanQr, hazir?: Mekan) {
    const yeniMekan = mekan?.id !== qr.mekanId || (!!hazir && hazir.surum !== mekan?.surum);
    setMod('ana');
    if (yeniMekan) {
      setDurum('Bina bilgisi yükleniyor...');
      sesliSoyele('Bina bilgisi yükleniyor.');
    }
    const y = hazir || (yeniMekan ? await mekanBul(qr.mekanId, mekanGuncellendi) : mekan);
    if (!y) {
      Vibration.vibrate(TITRESIM.urunBulunamadi);
      setDurum('Mekân tanınmadı');
      sesliSoyele(kurumMekaniMi(qr.mekanId)
        ? 'Bu binanın haritası telefonda yok. Önce bina girişindeki BAK QR kodunu okutun.'
        : 'Bu binanın yerleşim bilgisi bulunamadı. İnternet bağlantınızı kontrol edin ya da bir görevliye danışın.');
      return;
    }
    const nokta = qr.tur === 'mekan' ? y.giris : qr.noktaId;
    if (!y.noktalar.some(n => n.id === nokta)) {
      Vibration.vibrate(TITRESIM.urunBulunamadi);
      sesliSoyele('Bu QR kodu bina haritasında kayıtlı değil.');
      return;
    }
    const rehberAcik = await rehberHazirla();
    if (yeniMekan) {
      setMekan(y);
      kayitYaz('aktifMekan', {id: y.id, zaman: Date.now()});
    }
    // Rehberle yürürken okutulan QR adım uzunluğunu ölçmeye yarar: önceki QR'dan bu yana sayılan adım
    // haritadaki yolla karşılaştırılır (bkz. adimKalibrasyonu.ts)
    const kalibrasyonNotu = yeniMekan ? '' : adimiOlc(y, nokta);
    adimOlcumRef.current = {nokta, adim: 0};
    setKonumNoktasi(nokta);
    qrZamaniRef.current = Date.now();
    sonuclariTemizle();
    setDurum(`📍 ${y.ad} — ${noktaAdi(y, nokta)}`);

    // QR okutulan nokta kesin konumdur: rehber (varsa) buradan yeniden başlar, birikmiş adım hatası sıfırlanır
    const tarifEt = tarifEtici(y, rehberAcik);
    const dogrulanmadi = yeniMekan && kurumMekaniMi(y.id)
      ? 'Bu bina bilgisini kurum kendisi hazırladı, BAK tarafından doğrulanmadı. Tarifleri dikkatle izleyin. ' : '';
    let metin = (yeniMekan ? `Hoş geldiniz: ${y.ad}. ${dogrulanmadi}` : '') + noktaAciklamasi(y, nokta) + kalibrasyonNotu;
    const aktifDuraklar = yeniMekan ? [] : duraklar;
    const varis = varisIsle(y, nokta, aktifDuraklar, kacinilacak, tarifEt);
    if (varis) {
      if (!varis.kalan.length) rehberAyarla(null);
      metin += ` ${varis.metin}`;
      setDuraklar(varis.kalan);
    } else if (aktifDuraklar.length) {
      metin += ` ${tarifEt(nokta, aktifDuraklar[0].hedef)}`;
    } else {
      rehberAyarla(null);
      setDuraklar([]);
      // Yeni bina ya da aynı binanın giriş QR'ı yeniden okutuldu (kullanıcı listeyi yeniden duymak istiyor)
      if (yeniMekan || qr.tur === 'mekan') {
        // Kullanıcı yerlerin hangi adla kayıtlı olduğunu bilemez: girişte hepsi okunur ve seçim beklenir
        Vibration.vibrate(TITRESIM.urunBulundu);
        const alinacak = liste.filter(o => !o.alindi).length;
        if (y.tur === 'magaza' && alinacak) {
          metin += ` Alışveriş listenizde ${alinacak} ürün var; mağazada sırayla gezdirmem için listeyi gez deyin.`;
        }
        neleriVar(y, nokta, metin);
        return;
      }
      // Bölge etiketi (neredeyim QR'ı): yakındaki yerler de söylenir
      metin += yakindakilerMetni(y, nokta, adimCarpaniRef.current);
    }
    Vibration.vibrate(TITRESIM.urunBulundu);
    sesliSoyele(metin);
  }

  // Alışveriş listesindeki alınmamış ürünleri mağazada en kısa sırayla gezdir
  async function listeyiGez() {
    if (!mekan) {
      Vibration.vibrate(TITRESIM.hata);
      sesliSoyele('Önce mağaza girişindeki QR kodu okutun.');
      return;
    }
    const kalanlar = liste.filter(o => !o.alindi).map(o => o.ad);
    if (!kalanlar.length) {
      sesliSoyele('Listenizde alınacak ürün yok.');
      return;
    }
    const baslangic = konumNoktasi || mekan.giris;
    const tur = listeRotasi(mekan, baslangic, kalanlar, kacinilacak);
    setDuraklar(tur.duraklar);
    setMod('ana');
    setDurum(tur.duraklar.length ? `🧭 Tur: ${tur.duraklar.length} durak` : `📍 ${mekan.ad}`);
    Vibration.vibrate(tur.duraklar.length ? TITRESIM.urunBulundu : TITRESIM.urunBulunamadi);
    // Rehber (adım sensörü) uygulama yeniden açıldığında henüz hazırlanmamış olabilir: tarif vermeden önce hazırla
    const rehberAcik = await rehberHazirla();
    sesliSoyele(turOzeti(mekan, baslangic, tur, kacinilacak, tarifEtici(mekan, rehberAcik)) +
      (tur.duraklar.length ? ' Her durakta koridor QR kodunu okutun.' : ''));
  }

  // Durakta QR etiketi yoksa ya da okunamıyorsa kullanıcı durağı elle tamamlar
  function sonrakiDurak() {
    if (!mekan || !duraklar.length) return;
    const nokta = duraklar[0].hedef.nokta;
    // Etiket yoksa da adım ölçülür: kullanıcı "vardım" dediği an sayılan adım, haritadaki yolla karşılaştırılır
    const kalibrasyonNotu = adimiOlc(mekan, nokta);
    adimOlcumRef.current = {nokta, adim: 0};
    const varis = varisIsle(mekan, nokta, duraklar, kacinilacak, tarifEtici(mekan))!;
    if (!varis.kalan.length) rehberAyarla(null);
    setKonumNoktasi(nokta);
    qrZamaniRef.current = Date.now();
    setDuraklar(varis.kalan);
    Vibration.vibrate(TITRESIM.dokunusOnay);
    sesliSoyele(varis.metin + kalibrasyonNotu);
  }

  // Rehberle yürürken bir noktaya varılınca (etiket okutuldu ya da "vardım" denildi): son noktadan bu yana sayılan
  // adım, haritadaki yolla karşılaştırılır ve kullanıcının adım uzunluğu güncellenir. Kullanıcıya söylenecek not döner.
  function adimiOlc(y: Mekan, bitis: string): string {
    const olcum = adimOlcumRef.current;
    if (!olcum || !rehberRef.current) return '';
    const oran = adimOlcumu(y, olcum.nokta, bitis, olcum.adim);
    if (oran === null) return '';
    const eski = adimCarpaniRef.current;
    let not = '';
    // Art arda iki ölçüm aynı yönde belirgin saparsa adımlar değişmiştir (mevsim, ayakkabı): hızlı uyum
    const yon = Math.abs(oran - eski) / eski > SAPMA_ESIGI ? Math.sign(oran - eski) : 0;
    sapmaRef.current = yon !== 0 && Math.sign(sapmaRef.current) === yon ? sapmaRef.current + yon : yon;
    if (Math.abs(sapmaRef.current) >= 2 && hizliOlcumRef.current === 0) {
      hizliOlcumRef.current = 2;
      not = ' Adımlarınız değişmiş görünüyor; hızla yeniden ayarlıyorum.';
    }
    const hizli = hizliOlcumRef.current > 0;
    const yeni = carpaniGuncelle(eski, oran, hizli ? HIZLI_AGIRLIK : NORMAL_AGIRLIK);
    if (hizli) hizliOlcumRef.current -= 1;
    kayitYaz('ayar:adimHizliOlcum', hizliOlcumRef.current);
    if (!not && Math.abs(yeni - eski) / eski >= 0.08) {
      not = ` Adımlarınızı ölçtüm; adımınız şimdi yaklaşık ${adimUzunluguCm(yeni)} santim, adım sayılarını buna göre söyleyeceğim.`;
    }
    adimCarpaniAyarla(yeni);
    adimOlcumSayisiRef.current += 1;
    kayitYaz('ayar:adimOlcumSayisi', adimOlcumSayisiRef.current);
    return not;
  }

  function mekanGerekli(): boolean {
    if (mekan) return true;
    Vibration.vibrate(TITRESIM.hata);
    sesliSoyele('Önce bina ya da mağaza girişindeki QR kodu okutun. Barkod okumak için 2 kez dokunun ya da barkod oku deyin.');
    return false;
  }

  async function urunNerede() {
    if (!mekanGerekli()) return;
    const metin = await dinle('Nereye gitmek istiyorsunuz? Bilmiyorsanız neler var deyin.', '3 kez dokunun');
    if (!metin) return;
    if (nelerVarMi(metin)) neleriVar();
    else if (mekan) cevabiIsle(metin, mekan, konumNoktasi || mekan.giris);
  }

  // Binaya ilk girişte mekân ve konum state'e henüz yansımamış olur; bu yüzden aşağıdaki
  // fonksiyonlar binayı (y) ve başlangıç noktasını parametre olarak da alır.
  type Secenek = {kisi?: string; hedef: MekanHedefi};

  // Kullanıcı binadaki yerlerin adını bilmez: hepsi numaralı okunur, numarası ya da adıyla seçilir.
  // Uzun listeler onar onar okunur; "devam" denince sonraki sayfaya geçilir.
  async function neleriVar(y: Mekan | null = mekan, baslangic = konumNoktasi || y?.giris || '', onMetin = '') {
    if (!y) {
      mekanGerekli();
      return;
    }
    const secenekler = hedefSecenekleri(y);
    let bas = 0;
    let metin: string | null = null;
    for (;;) {
      const sayfa = hedefListesiMetni(y, secenekler, bas);
      const soru = (bas === 0 && onMetin ? `${onMetin} ` : '') +
        `${sayfa.metin} Gitmek istediğiniz yerin numarasını ya da adını söyleyin.`;
      metin = await dinle(soru, 'uzun basıp neler var deyin');
      if (!metin || !devamMi(metin)) break;
      // Son sayfadan sonra "devam" listeyi baştan okur
      bas = sayfa.sonraki ?? 0;
    }
    if (!metin) return;
    const secim = secimCoz(metin, secenekler.length);
    if (secim === null) {
      cevabiIsle(metin, y, baslangic);
      return;
    }
    // Aynı adlı yerlerden (her kattaki tuvalet) en yakını
    const secilenAd = harfSadelestir(listeAdi(secenekler[secim]));
    const ayniAdli = y.hedefler.filter(h => harfSadelestir(listeAdi(h)) === secilenAd);
    hedefeGit({hedef: ayniAdli.reduce((a, b) =>
      (yolUzunlugu(y, baslangic, b.nokta, kacinilacak) < yolUzunlugu(y, baslangic, a.nokta, kacinilacak) ? b : a))},
    y, baslangic);
  }

  // Ürün, reyon, birim, oda numarası ya da kişi adıyla hedef bulup yol tarif eder
  async function urunuBul(aranan: string, y: Mekan | null = mekan, baslangic = konumNoktasi || y?.giris || '') {
    if (!y) {
      mekanGerekli();
      return;
    }
    const sonuc = hedefBul(y, aranan, baslangic);
    if (!sonuc) {
      Vibration.vibrate(TITRESIM.urunBulunamadi);
      const benzer = benzerHedefler(y, aranan);
      if (benzer.length) {
        const adaylar = benzer.map(h => ({hedef: h}));
        secenekSor(adaylar, `${aranan} burada kayıtlı değil. Benzer yerler:`, y, baslangic);
        return;
      }
      sesliSoyele(`${aranan} burada kayıtlı değil. Buradaki tüm yerleri duymak için uzun basıp neler var deyin.`);
      return;
    }
    if (sonuc.tur === 'coklu') {
      Vibration.vibrate(TITRESIM.dokunusOnay);
      secenekSor(sonuc.adaylar, `${aranan} için birden fazla sonuç var.`, y, baslangic);
      return;
    }
    hedefeGit(sonuc, y, baslangic);
  }

  // Birden fazla aday: numaralı okunur, kullanıcı numarasını ya da adını söyler
  async function secenekSor(adaylar: Secenek[], giris: string, y: Mekan, baslangic: string) {
    const secenekMetni = adaylar.map((a, i) => `${i + 1}, ${a.kisi ? `${a.kisi}, ` : ''}${hedefEtiketi(y, {...a.hedef, ad: listeAdi(a.hedef)})}`).join('; ');
    const metin = await dinle(`${giris} ${secenekMetni}. Hangisi? Numarasını ya da adını söyleyin.`, 'yeniden sorun');
    if (!metin) return;
    const secim = secimCoz(metin, adaylar.length);
    if (secim !== null) {
      hedefeGit(adaylar[secim], y, baslangic);
      return;
    }
    // Adını söylediyse önce adaylar arasında aranır; yoksa yeni bir arama yapılır
    const soylenen = harfSadelestir(aramaMetniTemizle(metin));
    const eslesen = adaylar.filter(a => harfSadelestir(`${a.kisi || ''} ${a.hedef.ad} ${a.hedef.kisaAd || ''}`).includes(soylenen));
    if (soylenen && eslesen.length === 1) hedefeGit(eslesen[0], y, baslangic);
    else cevabiIsle(metin, y, baslangic);
  }

  async function hedefeGit({hedef: h, kisi}: Secenek, y: Mekan, baslangic: string) {
    setDuraklar([{hedef: h, ogeler: []}]);
    Vibration.vibrate(TITRESIM.urunBulundu);
    // Bina hatırlanarak açıldıysa konum bilinmiyor olabilir; QR yeni okutulduysa (y henüz state değil) biliniyor
    const ek = y === mekan && !konumNoktasi
      ? ' Konumunuzu güncellemek için yakındaki QR kodunu okutabilirsiniz.' : '';
    sesliSoyele(`${hedefEtiketi(y, h, kisi)}. ${tarifEtici(y, await rehberHazirla())(baslangic, h)}${ek}`);
  }

  function mekanDurumMetni(gpsYakin?: {nokta: string; metre: number} | null): string {
    if (!mekan) return 'Etkin bina yok.';
    const nokta = gpsYakin?.nokta || konumNoktasi || mekan.giris;
    let metin = `${mekan.ad}.`;
    if (duraklar.length > 1) metin += ` Turda ${duraklar.length} durak kaldı.`;
    // Rehber sürüyorsa son QR noktası artık geride kalmıştır; o anki bölüm söylenir
    if (rehber) return `${metin} ${rehberDurumMetni(rehber)}`;
    metin += gpsYakin && gpsYakin.metre > GPS_YAKIN
      ? ` GPS'e göre ${noktaAdi(mekan, nokta)} noktasına yaklaşık ${Math.round(gpsYakin.metre)} metre uzaklıktasınız.`
      : ` ${gpsYakin ? "GPS'e göre: " : ''}${noktaAciklamasi(mekan, nokta)}`;
    if (hedef) metin += ` ${rotaTarifi(mekan, nokta, hedef, kacinilacak, kisaAnlatim, adimCarpaniRef.current)}`;
    else metin += yakindakilerMetni(mekan, nokta, adimCarpaniRef.current);
    return metin;
  }

  function mekandanCik() {
    rehberAyarla(null);
    setMekan(null);
    setKonumNoktasi(null);
    setDuraklar([]);
    kayitYaz('aktifMekan', null);
    setDurum('Hazır');
    Vibration.vibrate(TITRESIM.dokunusOnay);
    sesliSoyele('Bina içi yönlendirme kapatıldı.');
  }

  function merdivenTercihiDegistir(kacin: boolean) {
    setMerdivendenKacin(kacin);
    kayitYaz('ayar:merdivendenKacin', kacin);
    Vibration.vibrate(TITRESIM.dokunusOnay);
    sesliSoyele(kacin
      ? 'Tariflerde merdiven yerine asansör ve rampa tercih edilecek.'
      : 'Tariflerde merdiven de kullanılacak.');
  }

  function hizAyarla(yeni: number) {
    if (yeni < 0 || yeni >= KONUSMA_HIZLARI.length) {
      sesliSoyele(yeni < 0 ? 'Zaten en yavaş hızdasınız.' : 'Zaten en hızlı hızdasınız.');
      return;
    }
    setHizIndex(yeni);
    Tts.setDefaultRate(KONUSMA_HIZLARI[yeni].deger);
    kayitYaz('ayar:konusmaHizi', yeni);
    Vibration.vibrate(TITRESIM.dokunusOnay);
    sesliSoyele(`Konuşma hızı: ${KONUSMA_HIZLARI[yeni].ad}.`);
  }

  function hiziDegistir() {
    hizAyarla((hizIndex + 1) % KONUSMA_HIZLARI.length);
  }

  function adimCarpaniAyarla(carpan: number, kaydet = true) {
    adimCarpaniRef.current = carpan;
    setAdimCarpani(carpan);
    if (kaydet) kayitYaz('ayar:adimCarpani', carpan);
  }

  // Elle seçilen adım boyu öğrenilmiş değeri sıfırlar; ölçüm o değerden yeniden başlar
  function adimBoyuAyarla(index: number) {
    setAdimBoyuIndex(index);
    kayitYaz('ayar:adimBoyu', index);
    adimCarpaniAyarla(ADIM_BOYLARI[index].carpan);
    adimOlcumSayisiRef.current = 0;
    kayitYaz('ayar:adimOlcumSayisi', 0);
    Vibration.vibrate(TITRESIM.dokunusOnay);
    sesliSoyele(`Adım boyu: ${ADIM_BOYLARI[index].ad}. Bir sonraki yol tarifinden itibaren adımlar buna göre sayılacak.`);
  }

  // "boyum 170": ölçüm yokken iyi bir başlangıç; rehberle yürüdükçe QR'lar arası ölçümle düzeltilir
  function boyAyarla(cm: number | null) {
    const carpan = cm === null ? null : boydanCarpan(cm);
    if (carpan === null) {
      sesliSoyele('Boyunuzu santim olarak söyleyin, örneğin: boyum yüz yetmiş.');
      return;
    }
    kayitYaz('ayar:boy', cm);
    adimCarpaniAyarla(carpan);
    adimOlcumSayisiRef.current = 0;
    kayitYaz('ayar:adimOlcumSayisi', 0);
    Vibration.vibrate(TITRESIM.dokunusOnay);
    sesliSoyele(`Boyunuz ${cm} santim; adımınız yaklaşık ${adimUzunluguCm(carpan)} santim. Adım sayılarını buna göre ` +
      'söyleyeceğim. Rehberle yürürken okuttuğunuz etiketlerle adımlarınızı ölçüp kendiliğinden düzelteceğim.');
  }

  // "Adımımı ölç": açık havada GPS ile 80 adımlık kalibrasyon yürüyüşü. GPS yeterince hassas değilse (bina içi,
  // yüksek binalar arası) sonraki yürüyüşlerde etiketlerle ve "vardım" ile hızlı ölçüme geçilir.
  // GPS yeni konum bulamazsa telefonun son bilinen (eski olabilen) konumu gelir; ölçümde ve "neredeyim"de yanıltır
  function taze(gps: GpsKonumu | null): GpsKonumu | null {
    return gps && Math.abs(Date.now() - gps.zaman) <= 30000 ? gps : null;
  }

  async function adimOlcumYuruyusu() {
    if (rehberRef.current) {
      sesliSoyele('Yol tarifi sürerken adım ölçümü yapılamaz. Vardığınızda ya da yönlendirmeyi kapatınca yeniden deneyin.');
      return;
    }
    if (!(await adimSayarHazirla())) {
      sesliSoyele('Bu telefonda adım sensörü yok ya da izin verilmedi; adım ölçülemiyor.');
      return;
    }
    const hizliyaGec = (neden: string) => {
      hizliOlcumRef.current = 3;
      kayitYaz('ayar:adimHizliOlcum', 3);
      sesliSoyele(`${neden} Bunun yerine bina içinde ölçeceğim: rehberle bir yere gidin; vardığınızda oradaki etiketi ` +
        'okutun ya da vardım deyin. Sonraki üç yürüyüşte adımlarınızı hızla yeniden ayarlayacağım.');
    };
    await konusVeBekle('Adım ölçümü. Açık havada, düz ve engelsiz bir yolun başında durun. Konumunuz alınıyor.');
    const bas = taze(await beklerkenBildir('Konum alınıyor.', konumAl(), 'Hâlâ konum alınıyor; açık havada olduğunuzdan emin olun.'));
    if (!bas || bas.dogruluk > 12) {
      hizliyaGec('Burada GPS yeterince hassas değil.');
      return;
    }
    await konusVeBekle(`Şimdi normal adımlarınızla düz yürüyün. ${KALIBRASYON_ADIMI} adım sonra durun diyeceğim.`);
    ekranAcikTut(true);   // yürürken telefon kilitlenip sayım kesilmesin
    const sayilan = await new Promise<number>(coz => {
      let n = 0;
      let bitti = false;
      let birak: () => void = () => {};
      const sure = setTimeout(() => bitir(), 180000);   // üç dakikada bitmezse vazgeçilir
      function bitir() {
        if (bitti) return;
        bitti = true;
        clearTimeout(sure);
        birak();
        coz(n);
      }
      birak = adimlariDinle(() => {
        n += 1;
        if (n === KALIBRASYON_ADIMI / 2) Vibration.vibrate(TITRESIM.dokunusOnay);
        if (n >= KALIBRASYON_ADIMI) bitir();
      });
    });
    ekranAcikTut(ekranAcikKalmaliRef.current);
    Vibration.vibrate(TITRESIM.urunBulundu);
    if (sayilan < KALIBRASYON_ADIMI) {
      sesliSoyele('Ölçüm tamamlanmadı. Yeniden denemek için uzun basıp adımımı ölç deyin.');
      return;
    }
    await konusVeBekle('Durun. Konumunuz alınıyor.');
    const son = taze(await beklerkenBildir('Konum alınıyor.', konumAl()));
    const sonuc = gpsAdimOlcumu(bas, son, sayilan);
    if ('hata' in sonuc) {
      hizliyaGec(sonuc.hata === 'gps' ? 'GPS konumu yeterince hassas alınamadı.'
        : 'Ölçüm güvenilir çıkmadı; yol düz değildi ya da GPS kaydı.');
      return;
    }
    // Bilerek yapılan ölçüm: ağırlığı yüksek, ama tek GPS ölçümü olduğu için eskisini tamamen silmez
    adimCarpaniAyarla(carpaniGuncelle(adimCarpaniRef.current, sonuc.carpan, HIZLI_AGIRLIK));
    adimOlcumSayisiRef.current += 1;
    kayitYaz('ayar:adimOlcumSayisi', adimOlcumSayisiRef.current);
    sesliSoyele(`Adımınız yaklaşık ${sonuc.adimCm} santim ölçüldü. Adım sayılarını buna göre söyleyeceğim; bina içinde ` +
      'etiketlerle ölçmeye devam edeceğim.');
  }

  // ── Kişisel alerjenler ──
  function alerjenleriKaydet(yeni: KisiselAlerjen[]) {
    setAlerjenlerim(yeni);
    kayitYaz('ayar:alerjenler', yeni);
  }

  function alerjenEkle(metin: string) {
    const eklenecek = kisiselAlerjenCoz(metin);
    if (!eklenecek.length) {
      sesliSoyele('Hangi alerjen? Örneğin fıstık alerjim var ya da alerjenim süt ve gluten deyin.');
      return;
    }
    const yeni = [...alerjenlerim];
    for (const a of eklenecek) if (!yeni.some(k => k.ad === a.ad)) yeni.push(a);
    alerjenleriKaydet(yeni);
    Vibration.vibrate(TITRESIM.urunBulundu);
    sesliSoyele(`Alerjenleriniz: ${yeni.map(kisiselAlerjenAdi).join(', ')}. Okuttuğunuz üründe bunlar varsa en başta ` +
      'uyaracağım ve telefon güçlü titreyecek.');
  }

  function alerjenleriSoyle() {
    sesliSoyele(alerjenlerim.length
      ? `Alerjenleriniz: ${alerjenlerim.map(kisiselAlerjenAdi).join(', ')}.`
      : 'Kayıtlı alerjeniniz yok. Eklemek için uzun basıp örneğin fıstık alerjim var deyin.');
  }

  // Ayarlar'dan tek alerjen ya da sesle söylenen ("fıstığı alerjenlerimden çıkar"); hiçbiri verilmezse hepsi
  function alerjenSil(silinecek?: KisiselAlerjen | string) {
    let cikan: KisiselAlerjen[] = alerjenlerim;
    if (typeof silinecek === 'string') {
      const istenen = kisiselAlerjenCoz(silinecek);
      cikan = alerjenlerim.filter(k => istenen.some(i =>
        harfSadelestir(i.ad) === harfSadelestir(k.ad) || (!!i.grup && i.grup === k.grup)));
      if (!cikan.length) {
        Vibration.vibrate(TITRESIM.hata);
        sesliSoyele(`${silinecek} alerjenleriniz arasında yok. Listeyi duymak için alerjenlerim deyin.`);
        return;
      }
    } else if (silinecek) {
      cikan = [silinecek];
    }
    alerjenleriKaydet(alerjenlerim.filter(k => !cikan.includes(k)));
    Vibration.vibrate(TITRESIM.dokunusOnay);
    sesliSoyele(silinecek ? `${cikan.map(k => k.ad).join(', ')} alerjenlerinizden çıkarıldı.` : 'Alerjenleriniz silindi.');
  }

  async function alerjenSesle() {
    const metin = await dinle('Alerjeninizi söyleyin, örneğin fıstık ve süt.', 'yeniden deneyin');
    if (metin) alerjenEkle(metin);
  }

  function adimAyariniSoyle() {
    const cm = adimUzunluguCm(adimCarpaniRef.current);
    const n = adimOlcumSayisiRef.current;
    sesliSoyele(`Adımınız yaklaşık ${cm} santim olarak ayarlı. ` + (n
      ? `Bu, yürüdüğünüz ${n} yolda ölçüldü; yürüdükçe daha da doğru olur.`
      : 'Henüz ölçülmedi. Rehberle yürürken yoldaki etiketleri okutursanız ölçerim; boyum yüz yetmiş gibi boyunuzu da söyleyebilirsiniz.'));
  }

  function kisaAnlatimDegistir(acik: boolean) {
    setKisaAnlatim(acik);
    kayitYaz('ayar:kisaAnlatim', acik);
    Vibration.vibrate(TITRESIM.dokunusOnay);
    sesliSoyele(acik ? 'Kısa anlatım açıldı. Tarifleri kısaca söyleyeceğim.' : 'Kısa anlatım kapatıldı. Tarifleri ayrıntılı söyleyeceğim.');
  }

  async function yonUyarisiDegistir(acik: boolean) {
    setYonUyarisi(acik);
    kayitYaz('ayar:yonUyarisi', acik);
    Vibration.vibrate(TITRESIM.dokunusOnay);
    if (!acik) {
      sesliSoyele('Yön uyarısı kapatıldı.');
      return;
    }
    sesliSoyele(await yonSensoruVarMi()
      ? 'Yön uyarısı açıldı. Adım adım rehberde düz gitmeniz gereken yerde yön değiştirirseniz uyaracağım.'
      : 'Yön uyarısı açıldı ancak bu telefonda yön sensörü bulunamadı.');
  }

  // ── Kayboldum ve acil yardım ──────────────────────────

  // Kampüs gibi açık alanda noktaların harita koordinatı varsa QR okutmadan GPS'ten en yakın nokta bulunur.
  // Bina içinde ya da GPS zayıfken null döner; o zaman son okutulan QR noktası söylenir.
  async function gpsYakinNokta(): Promise<{nokta: string; metre: number} | null> {
    if (!mekan || rehber || !gpsliNoktaVar(mekan)) return null;
    // QR az önce okutulduysa konum zaten kesin; son nokta bina içindeyse (haritada koordinatı yok) GPS büyük olasılıkla
    // bulamaz ve kullanıcı boşuna bekler: o zaman yalnızca epey zaman geçtiyse (dışarı çıkmış olabilir) denenir
    const gecen = Date.now() - qrZamaniRef.current;
    const sonNokta = mekan.noktalar.find(n => n.id === konumNoktasi);
    if (gecen < 2 * 60000 || (sonNokta && typeof sonNokta.enlem !== 'number' && gecen < 10 * 60000)) return null;
    const gps = await beklerkenBildir('Konum alınıyor.', konumAl());
    const yakin = gpsIleEnYakinNokta(mekan, taze(gps));
    if (yakin && yakin.metre <= GPS_YAKIN) setKonumNoktasi(yakin.nokta);
    return yakin;
  }

  async function neredeyim() {
    const yakin = await gpsYakinNokta();
    sesliSoyele(mekanDurumMetni(yakin));
  }

  async function kayboldum() {
    Vibration.vibrate(TITRESIM.dokunusOnay);
    const yakin = await gpsYakinNokta();
    const metin = mekan
      ? `Sakin olun, size yardım edeceğim. ${mekanDurumMetni(yakin)} ` +
        'Konumunuzu kesinleştirmek için yakındaki bir QR etiketini okutun; bulmak için uzun basıp etiket ara deyin.'
      : 'Sakin olun. Etkin bir bina yok. Girişteki QR kodu okutun ya da yakınınızdaki birinden yardım isteyin.';
    sesliSoyele(metin + (yardimNumarasi || acilKisiler.length
      ? ' Konumunuzu yakınınıza göndermek için uzun basıp konumumu gönder, aramak için yardım çağır deyin.'
      : ' Uzun basıp acil kişi ekle derseniz, sonra konumunuzu tek komutla gönderebilir ve yakınınızı arayabilirsiniz.'));
  }

  async function yardimCagir() {
    // Yardım numarası yoksa ilk acil kişi aranır
    const numara = yardimNumarasi || acilKisiler[0]?.numara;
    if (!numara) {
      Vibration.vibrate(TITRESIM.hata);
      sesliSoyele('Kayıtlı yardım numarası yok. Uzun basıp acil kişi ekle deyin ya da yardım numaram deyip ' +
        'numarayı söyleyin. Acil durumda 112 numarasını arayın.');
      return;
    }
    Vibration.vibrate(TITRESIM.urunBulundu);
    await konusVeBekle(yardimNumarasi ? `Yardım numaranız aranıyor: ${numarayiOkunurYap(numara)}.`
      : `${acilKisiler[0].ad} aranıyor.`);
    const sonuc = await yardimAra(numara);
    if (sonuc === 'ekran') sesliSoyele('Arama ekranı açıldı. Aramayı başlatmak için arama tuşuna basın.');
    else if (sonuc === 'hata') sesliSoyele('Arama başlatılamadı. Lütfen yakınınızdaki birinden yardım isteyin.');
  }

  // ── Acil kişiler ve konum paylaşımı ───────────────────

  function acilKisileriKaydet(yeni: AcilKisi[]) {
    setAcilKisiler(yeni);
    kayitYaz('acilKisiler', yeni);
  }

  async function acilKisiEkle() {
    await konusVeBekle('Rehber açılıyor. Eklemek istediğiniz kişiyi seçin.');
    const kisi = await kisiSec();
    if (!kisi?.numara) {
      sesliSoyele('Kişi seçilmedi.');
      return;
    }
    const rakam = (n: string) => n.replace(/\D/g, '').slice(-10);
    if (acilKisiler.some(k => rakam(k.numara) === rakam(kisi.numara))) {
      sesliSoyele(`${kisi.ad} zaten acil kişileriniz arasında.`);
      return;
    }
    acilKisileriKaydet([...acilKisiler, {ad: kisi.ad, numara: kisi.numara.replace(/[^\d+]/g, '')}]);
    Vibration.vibrate(TITRESIM.urunBulundu);
    sesliSoyele(`${kisi.ad} acil kişilerinize eklendi. Konumumu gönder ya da kişinin adıyla ara diyebilirsiniz.`);
  }

  function acilKisiSil(silinecek: AcilKisi) {
    acilKisileriKaydet(acilKisiler.filter(k => k !== silinecek));
    Vibration.vibrate(TITRESIM.dokunusOnay);
    sesliSoyele(`${silinecek.ad} acil kişilerden çıkarıldı.`);
  }

  function acilKisileriSoyle() {
    sesliSoyele(acilKisiler.length
      ? `${acilKisiler.length} acil kişiniz var: ${acilKisiler.map(k => k.ad).join(', ')}.`
      : 'Acil kişiniz yok. Rehberden eklemek için uzun basıp acil kişi ekle deyin.');
  }

  // Birden çok aday: numaralı okunur, numarası ya da adıyla seçilir
  async function kisiSor(soru: string, adaylar: AcilKisi[]): Promise<AcilKisi | null> {
    const metin = await dinle(`${soru} ${adaylar.map((k, i) => `${i + 1}, ${k.ad}`).join('; ')}.`, 'yeniden deneyin');
    if (!metin) return null;
    const secim = secimCoz(metin, adaylar.length);
    return secim !== null ? adaylar[secim] : kisiBul(adaylar, metin)[0] || null;
  }

  // Mesaja girecek konum: bina içindeyse bina, kat ve son nokta; GPS alınabildiyse harita bağlantısı
  async function konumMetniHazirla(): Promise<string | null> {
    const gps = await konumAl();
    const nokta = mekan ? konumNoktasi || mekan.giris : null;
    return konumMesaji({bina: mekan?.ad, nokta: mekan && nokta ? noktaTamAdi(mekan, nokta) : null, hedef: hedef?.ad, gps});
  }

  async function konumuGonder(kisiAdi: string | null = null, kanal: 'sms' | 'whatsapp' | null = null,
    canli = false) {
    setDurum('Konum hazırlanıyor...');
    const metin = await beklerkenBildir('Konumunuz hazırlanıyor.', konumMetniHazirla(),
      'Hâlâ konumunuzu bulmaya çalışıyorum; açık havada daha hızlı bulunur.');
    setDurum(mekan ? `📍 ${mekan.ad}` : 'Hazır');
    if (!metin) {
      Vibration.vibrate(TITRESIM.hata);
      sesliSoyele('Konumunuz bulunamadı. Konum iznini açın ya da yakındaki bir BAK etiketini okutun.');
      return;
    }
    const kisiler = yardimNumarasi && !acilKisiler.some(k => k.numara.replace(/\D/g, '').endsWith(yardimNumarasi.slice(-10)))
      ? [...acilKisiler, {ad: 'Yardım numaranız', numara: yardimNumarasi}] : acilKisiler;
    let kisi: AcilKisi | null = null;
    if (kisiAdi) {
      const bulunan = kisiBul(kisiler, kisiAdi);
      if (!bulunan.length) {
        Vibration.vibrate(TITRESIM.urunBulunamadi);
        sesliSoyele(`${kisiAdi} acil kişileriniz arasında yok. Rehberden eklemek için uzun basıp acil kişi ekle deyin.`);
        return;
      }
      kisi = bulunan.length === 1 ? bulunan[0] : await kisiSor('Kime göndereyim?', bulunan);
    } else if (kisiler.length === 1) {
      kisi = kisiler[0];
    } else if (kisiler.length > 1) {
      kisi = await kisiSor('Kime göndereyim?', kisiler);
    } else {
      // Acil kişi yok: paylaşım menüsünden herhangi bir uygulama ve kişi seçilir
      if (canli) await konusVeBekle(`Paylaşım menüsünden WhatsApp'ı ve kişiyi seçin. ${canliKonumAdimlari()}`);
      const paylasildi = await paylas(canli ? `${metin} Canlı konumumu da paylaşıyorum.` : metin);
      sesliSoyele(paylasildi ? 'Konumunuz paylaşıldı.'
        : 'Paylaşım menüsü kapandı. Acil kişi eklerseniz konumunuzu tek komutla gönderebilirsiniz.');
      return;
    }
    if (!kisi) return;
    if (canli && await canliKonumuOtomatikPaylas(kisi, `${metin} Canlı konumumu da paylaşıyorum.`)) return;
    if (canli) {
      await konusVeBekle(`${kisi.ad} ile WhatsApp sohbeti açılıyor. ${canliKonumAdimlari()}`);
      const acildi = await mesajAc(kisi.numara, `${metin} Canlı konumumu da paylaşıyorum.`, 'whatsapp');
      Vibration.vibrate(acildi ? TITRESIM.urunBulundu : TITRESIM.hata);
      if (!acildi) sesliSoyele('WhatsApp açılamadı. Telefonunuzda WhatsApp yüklü olmayabilir.');
      return;
    }
    // Varsayılan WhatsApp (görme engelli kullanıcıların çoğu onu kullanır; yardımcı açıksa Gönder'e de basılır).
    // "SMS ile gönder" denirse ya da WhatsApp yüklü değilse / açılamazsa mesaj uygulamasına düşülür.
    if (kanal !== 'sms') {
      setDurum('WhatsApp açılıyor...');
      const sonuc = await whatsappGonder(kisi.numara, metin);
      setDurum(mekan ? `📍 ${mekan.ad}` : 'Hazır');
      if (sonuc === 'gonderildi') {
        Vibration.vibrate(TITRESIM.urunBulundu);
        sesliSoyele(`Konumunuz WhatsApp'tan ${kisi.ad} kişisine gönderildi.`);
        return;
      }
      if (sonuc === 'acildi') {
        Vibration.vibrate(TITRESIM.urunBulundu);
        sesliSoyele(`${kisi.ad} için konum mesajı WhatsApp'ta hazır. Göndermek için sağ alttaki gönder tuşuna basın.`);
        return;
      }
      if (kanal === 'whatsapp') {
        Vibration.vibrate(TITRESIM.hata);
        sesliSoyele('WhatsApp açılamadı. Telefonunuzda WhatsApp yüklü olmayabilir. SMS ile göndermek için konumumu SMS ile gönder deyin.');
        return;
      }
    }
    const acildi = await mesajAc(kisi.numara, metin, 'sms');
    Vibration.vibrate(acildi ? TITRESIM.urunBulundu : TITRESIM.hata);
    sesliSoyele(acildi
      ? `${kisi.ad} için konum mesajı hazır. Göndermek için mesaj ekranındaki gönder tuşuna basın.`
      : 'Mesaj uygulaması açılamadı.');
  }

  // Canlı konum, BAK WhatsApp yardımcısıyla dokunmadan paylaşılır. Yardımcı kapalıysa ilk seferde nasıl açılacağı
  // anlatılıp ayarlar açılır (true döner: kullanıcı açtıktan sonra komutu yineler); daha önce sorulduysa false
  // döner ve adımlar sesle anlatılarak elle paylaşılır.
  async function canliKonumuOtomatikPaylas(kisi: AcilKisi, metin: string): Promise<boolean> {
    // iPhone başka uygulamaların düğmelerine basmaya izin vermez: yardımcı yok, adımlar sesle anlatılır
    if (Platform.OS !== 'android') return false;
    if (!(await whatsappYardimcisiAcikMi())) {
      if (await kayitOku<boolean>('whatsappYardimcisiSoruldu', false)) return false;
      kayitYaz('whatsappYardimcisiSoruldu', true);
      await konusVeBekle('Canlı konumu sizin yerinize paylaşabilmem için BAK WhatsApp yardımcısını bir kez açmanız ' +
        'gerekiyor. Erişilebilirlik ayarları açılıyor. Yüklü uygulamalar bölümünde BAK WhatsApp yardımcısını seçip ' +
        'açın, izin verin. Açılmıyor ve kısıtlanmış ayar diyorsa: telefon ayarlarında Uygulamalar, BAK, sağ üstteki ' +
        'menü, kısıtlanmış ayarlara izin ver. Sonra BAK’a dönüp yeniden canlı konumumu paylaş deyin.');
      erisilebilirlikAyarlariniAc();
      return true;
    }
    setDurum('Canlı konum paylaşılıyor...');
    await konusVeBekle(`Canlı konumunuz WhatsApp’ta ${kisi.ad} ile paylaşılıyor. Birkaç saniye ekrana dokunmayın.`);
    const {sonuc, adim} = await canliKonumPaylas(kisi.numara, metin);
    setDurum(mekan ? `📍 ${mekan.ad}` : 'Hazır');
    if (sonuc === 'paylasildi') {
      Vibration.vibrate(TITRESIM.urunBulundu);
      sesliSoyele(`Canlı konumunuz ${kisi.ad} ile bir saat boyunca paylaşılıyor. Konumunuz kendiliğinden güncellenir.`);
    } else if (sonuc === 'acilmadi') {
      Vibration.vibrate(TITRESIM.hata);
      sesliSoyele('WhatsApp açılamadı. Telefonunuzda WhatsApp yüklü olmayabilir.');
    } else {
      Vibration.vibrate(TITRESIM.hata);
      sesliSoyele(`Canlı konum ${adim ? `${adim} adımında ` : ''}tamamlanamadı. WhatsApp ekranında devam edin: ` +
        canliKonumAdimlari());
    }
    return true;
  }

  async function kisiyiAra(ad: string) {
    const bulunan = kisiBul(acilKisiler, ad);
    if (!bulunan.length) {
      // "süt ara" gibi: kişi değil, bir yer ya da ürün aranıyor
      if (mekan) urunuBul(aramaMetniTemizle(ad));
      else sesliSoyele(`${ad} acil kişileriniz arasında yok. Rehberden eklemek için uzun basıp acil kişi ekle deyin.`);
      return;
    }
    const kisi = bulunan.length === 1 ? bulunan[0] : await kisiSor('Kimi arayayım?', bulunan);
    if (!kisi) return;
    await konusVeBekle(`${kisi.ad} aranıyor.`);
    const sonuc = await yardimAra(kisi.numara);
    if (sonuc === 'ekran') sesliSoyele('Arama ekranı açıldı. Aramayı başlatmak için arama tuşuna basın.');
    else if (sonuc === 'hata') sesliSoyele('Arama başlatılamadı.');
  }

  function yardimNumarasiKaydet(numara: string | null) {
    if (!numara) {
      Vibration.vibrate(TITRESIM.urunBulunamadi);
      sesliSoyele('Numara anlaşılamadı. Alan koduyla birlikte en az on haneli numarayı söyleyin ya da yazın.');
      return;
    }
    setYardimNumarasi(numara);
    kayitYaz('ayar:yardimNumarasi', numara);
    Vibration.vibrate(TITRESIM.urunBulundu);
    sesliSoyele(`Yardım numarası kaydedildi: ${numarayiOkunurYap(numara)}.`);
  }

  async function yardimNumarasiSesle() {
    const metin = await dinle('Yardım numarasını rakam rakam söyleyin.', 'tekrar deneyin');
    if (metin) yardimNumarasiKaydet(telefonNumarasiCoz(metin));
  }

  // ── İlk açılış eğitimi ────────────────────────────────

  function egitimiBaslat() {
    const talkback = ekranOkuyucuAcikMi();
    setEgitimTalkback(talkback);
    setEgitimAdim(0);
    setMod('egitim');
    sesliSoyele(talkback ? EGITIM_TALKBACK : EGITIM_ADIMLARI[0].metin);
  }

  function egitimHareketi(hareket: EgitimHareketi) {
    const adim = EGITIM_ADIMLARI[egitimAdim];
    if (hareket !== adim.beklenen) {
      Vibration.vibrate(TITRESIM.urunBulunamadi);
      sesliSoyele(`Tekrar deneyelim. ${adim.metin.split('. ').filter(c => /dokunun|tutun/.test(c)).pop() || adim.metin}`);
      return;
    }
    Vibration.vibrate(TITRESIM.dokunusOnay);
    const sonraki = egitimAdim + 1;
    if (sonraki >= EGITIM_ADIMLARI.length) {
      egitimiBitir();
      return;
    }
    setEgitimAdim(sonraki);
    sesliSoyele(EGITIM_ADIMLARI[sonraki].metin);
  }

  function egitimiBitir() {
    kayitYaz('egitimTamam', true);
    setMod('ana');
    Vibration.vibrate(TITRESIM.urunBulundu);
    sesliSoyele(ekranOkuyucuAcikMi()
      ? 'Ana ekran. Sesli komut butonu en üstte.'
      : 'Ana ekran. Hazırsınız. Sesli komut için uzun basın.');
  }

  // Uzun bas → sesli komut. Dokunuş kısayollarının hepsi sesle de yapılabilir.
  async function sesliKomutAl() {
    const metin = await dinle('Komut verin.', 'uzun basın');
    if (metin) komutuIsle(metin);
  }

  // Soruya verilen cevap (yer listesi, seçenekler, "nereye gitmek istiyorsunuz") bir komutsa
  // ("sus", "kayboldum", "listeyi gez") komut olarak işlenir; değilse yer adı olarak aranır.
  // En güncel render'daki fonksiyon çağrılır: cevap gelene kadar bina state'e yerleşmiş olur.
  // Önce binadaki yerlere bakılır: "ödeme" (vezne) gibi bir yer adı komutla (POS) çakışabilir.
  function cevabiIsle(metin: string, y: Mekan, baslangic: string) {
    const aranan = aramaMetniTemizle(metin);
    const komut = sesliKomutCoz(metin);
    if (hedefBul(y, aranan, baslangic) || komut.tur === 'nerede' || komut.tur === 'bilinmiyor') {
      urunuBul(aranan, y, baslangic);
    } else {
      komutuIsleRef.current(metin);
    }
  }

  function komutuIsle(metin: string) {
    const komut = sesliKomutCoz(metin);
    switch (komut.tur) {
      case 'kamera':       kameraAc(komut.mod); break;
      case 'ekran':        setMod(komut.mod); break;
      case 'nerede':       urunuBul(komut.aranan); break;
      case 'neler':        neleriVar(); break;
      case 'etiketAra':    etiketAra(); break;
      case 'konumGonder':  konumuGonder(komut.kisi, komut.kanal, komut.canli); break;
      case 'acilKisiEkle': acilKisiEkle(); break;
      case 'acilKisiler':  acilKisileriSoyle(); break;
      case 'kisiAra':      kisiyiAra(komut.kisi); break;
      case 'liste':        listeKomutuUygula(komut.komut); break;
      case 'listeyiOku':   sesliSoyele(listeSesliMetin(liste)); break;
      case 'gez':          listeyiGez(); break;
      case 'sonrakiDurak':
        if (duraklar.length) sonrakiDurak();
        else sesliSoyele('Devam eden bir tur yok. Listeyi gez diyerek başlatabilirsiniz.');
        break;
      case 'neredeyim':
        if (mekan) neredeyim();
        else sesliSoyele('Etkin bina yok. Bina ya da mağaza girişindeki QR kodu okutun.');
        break;
      case 'mekandanCik':  if (mekan) mekandanCik(); else sesliSoyele('Etkin bir bina yönlendirmesi yok.'); break;
      case 'tekrarla':     sonucuTekrarla(); break;
      case 'merdiven':     merdivenTercihiDegistir(komut.kacin); break;
      case 'devam':        devam(); break;
      case 'adimRehberi':  adimRehberiDegistir(komut.acik); break;
      case 'hiz':          hizAyarla(hizIndex + (komut.yon === 'artir' ? 1 : -1)); break;
      case 'sustur':       sustur(); Vibration.vibrate(TITRESIM.dokunusOnay); break;
      case 'kayboldum':    kayboldum(); break;
      case 'yardimCagir':  yardimCagir(); break;
      case 'yardimNumarasi':
        if (komut.numara) yardimNumarasiKaydet(komut.numara);
        else yardimNumarasiSesle();
        break;
      case 'kisaAnlatim':  kisaAnlatimDegistir(komut.acik); break;
      case 'adimBoyu':     adimBoyuAyarla(ADIM_BOYLARI.findIndex(b => b.ad === komut.boy)); break;
      case 'boy':          boyAyarla(komut.cm); break;
      case 'adimAyari':    adimAyariniSoyle(); break;
      case 'adimOlc':      adimOlcumYuruyusu(); break;
      case 'alerjenEkle':  alerjenEkle(komut.metin); break;
      case 'alerjenler':   alerjenleriSoyle(); break;
      case 'alerjenSil':   alerjenSil(komut.metin); break;
      case 'yonUyarisi':   yonUyarisiDegistir(komut.acik); break;
      case 'egitim':       egitimiBaslat(); break;
      case 'yardim':       sesliSoyele(KOMUT_YARDIMI); break;
      default:
        Vibration.vibrate(TITRESIM.urunBulunamadi);
        sesliSoyele(`"${metin}" komutunu anlamadım. Komutları duymak için uzun basıp yardım deyin.`);
    }
  }
  komutuIsleRef.current = komutuIsle;

  function ekranaDokun() {
    const kamera = (m: 'barkod' | TaramaModu) => () => { Vibration.vibrate(TITRESIM.dokunusOnay); kameraAc(m); };
    // Az ve akılda kalan hareket: 1 sustur/tekrarla, 2 barkod, 3 yol tarifi. Gerisi sesli komutla.
    cokluDokunus({
      1: () => {
        if (!konusuyorMu()) return sonucuTekrarla();
        sustur();
        Vibration.vibrate(TITRESIM.dokunusOnay);
      },
      2: kamera('barkod'),
      3: () => { Vibration.vibrate(TITRESIM.dokunusOnay); urunNerede(); },
    }, 3);
  }

  // Tek dokun (sessizken): son sonucu tekrarla; sonuç yoksa durumu ve nasıl kullanılacağını söyle
  function sonucuTekrarla() {
    Vibration.vibrate(TITRESIM.dokunusOnay);
    if (urun) {
      sesliSoyele(urunSesliMetin(urun, alerjenlerim));
    } else if (tutar) {
      sesliSoyele(`Tutar ${tutarSesliMetin(tutar)}`);
    } else if (tarihSonuc) {
      sesliSoyele(tarihSonuc.sesliMesaj);
    } else if (banknot) {
      sesliSoyele(`${banknot} Türk lirası.`);
    } else if (okunanMetin) {
      sesliSoyele(okunanMetin);
    } else if (mekan) {
      sesliSoyele(mekanDurumMetni());
    } else {
      sesliSoyele(`Durum: ${durum}. Sesli komut için ekrana uzun basın. ` +
        'Barkod için 2, yol tarifi için 3 kez dokunun. Konuşurken bir kez dokunursanız susarım.');
    }
  }

  // Sık ama boğmadan: aynı tarif 4 saniyede, farklısı 2 saniyede bir söylenir
  function kodYonuSoyle(kod: Kutu) {
    const onizleme = onizlemeRef.current;
    if (!onizleme.width || !onizleme.height) return;
    yonSoyle(kodYonu(kod, onizleme));
  }

  function yonSoyle(metin: string) {
    const simdi = Date.now();
    const son = sonYonRef.current;
    if (simdi - son.zaman < (metin === son.metin ? 4000 : 2000)) return;
    sonYonRef.current = {metin, zaman: simdi};
    Vibration.vibrate(40);
    sesliSoyele(metin);
  }

  function etiketAra() {
    etiketAraniyorRef.current = true;
    kameraAc('barkod', ETIKET_ARAMA_BASLANGICI);
  }

  function kameraAc(hedefMod: 'barkod' | TaramaModu, mesaj?: string) {
    if (izinDurumu === 'denied') {
      Vibration.vibrate(TITRESIM.hata);
      Alert.alert('Kamera İzni Gerekli', 'Lütfen uygulama ayarlarından kamera iznini etkinleştirin.', [{text: 'Tamam'}]);
      sesliSoyele('Kamera izni gerekli.');
      return;
    }
    if (!device) {
      Vibration.vibrate(TITRESIM.hata);
      sesliSoyele('Kamera hazırlanıyor, lütfen 3 saniye bekleyip tekrar deneyin.');
      setDurum('Kamera hazırlanıyor...');
      return;
    }
    sonuclariTemizle();
    mesgulRef.current = false;

    const mesajlar = {
      barkod: 'Barkodu veya QR kodu kameraya tutun.',
      pos:    'POS cihazının ekranını kameraya tutun. Tutar otomatik okunacak.',
      tarih:  'Ürünü kameraya yaklaştırın. Son kullanma tarihi otomatik okunacak.',
      para:   'Banknotu düz şekilde kameraya tutun. Değeri otomatik okunacak.',
      icindekiler: 'Ambalajın arka yüzünü kameraya tutun, bir karış uzakta. İçindekiler yazısını bulunca okuyacağım.',
    };
    setDurum('Kamera açık');
    sesliSoyele(mesaj || mesajlar[hedefMod]);
    kameraAcilisRef.current = Date.now();
    setMod(hedefMod);
  }

  // Kamerayı kapat ve ana menüye dön
  function kameraKapat() {
    // Kamera açıldıktan hemen sonraki dokunuş (iki dokunuşun artığı, ürünü tutarken avucun değmesi) kapatmaz
    if (Date.now() - kameraAcilisRef.current < 1200) return;
    // interval temizleme useEffect tarafından yapılıyor (mod değişince)
    setMod('ana');
    setDurum('Hazır');
    Vibration.vibrate(TITRESIM.dokunusOnay);
    sesliSoyele('Ana menü.');
  }

  function fenerDegistir() {
    if (!device?.hasTorch) {
      Vibration.vibrate(TITRESIM.hata);
      sesliSoyele('Bu cihazda fener yok.');
      return;
    }
    const yeni = !fenerAcik;
    setFenerAcik(yeni);
    Vibration.vibrate(TITRESIM.dokunusOnay);
    sesliSoyele(yeni ? 'Fener açıldı.' : 'Fener kapandı.');
  }

  function anaMenuyeDon() {
    setMod('ana');
    setDurum('Hazır');
    sonuclariTemizle();
    Vibration.vibrate(TITRESIM.dokunusOnay);
    sesliSoyele('Ana menü.');
  }

  // Alt ekranlardan (liste, geçmiş, hakkında) uzun basışla dönüş
  function geriDon() {
    sustur();
    setMod('ana');
    sesliSoyele('Ana menü.');
  }

  const codeScanner = useCodeScanner({
    codeTypes: ['ean-13', 'ean-8', 'qr', 'code-128', 'upc-a', 'upc-e'],
    onCodeScanned: async (codes) => {
      if (tarandiRef.current) return;
      const deger = codes.find(c => c.value)?.value;
      if (!deger) {
        // Kod görüldü ama çözülemedi (uzak, bulanık, kenarda): konumuna göre yön tarif edilir
        const gorulen = codes.find(c => c.frame);
        if (gorulen?.frame) kodYonuSoyle(gorulen.frame);
        return;
      }
      await kodOkut(deger);
    },
  });

  async function kodOkut(deger: string) {
    if (tarandiRef.current) return;
    tarandiRef.current = true;
    try {
      await koduIsle(deger);
    } catch {
      // Beklenmedik bir hata tarayıcıyı kilitlemesin; kullanıcı ne olduğunu bilsin
      Vibration.vibrate(TITRESIM.hata);
      setDurum('Kod işlenemedi');
      sesliSoyele('Kod okundu ama işlenemedi. Tekrar denemek için iki kez dokunun.');
    } finally {
      setTimeout(() => { tarandiRef.current = false; }, 2000);
    }
  }

  // Barkod kamerası açıkken kod henüz çözülemiyorsa (uzak, kenarda, bulanık) görüntü yazı tanımadan geçirilir:
  // BAK etiketinin yazısına ya da barkodun altındaki rakamlara göre "sola çevirin / yaklaştırın" denir; rakamlar
  // tam ve doğruysa barkod o numarayla aranır (bkz. kodKonumu.ts gorselIpucu). Fotoğraf sessiz çekilir ve silinir.
  async function barkodGorselYardim() {
    if (tarandiRef.current || gorselMesgulRef.current || !cameraRef.current) return;
    gorselMesgulRef.current = true;
    try {
      const foto = await cameraRef.current.takePhoto({flash: 'off', enableShutterSound: false});
      try {
        const sonuc = await TextRecognition.recognize(`file://${foto.path}`);
        // Yazı tanıma kutuları dik (ekrandaki gibi) görüntüye göredir; sensör boyutu yan yatıksa çevrilir
        const dik = foto.orientation === 'portrait' || foto.orientation === 'portrait-upside-down';
        const boyut = dik === (foto.height >= foto.width)
          ? {width: foto.width, height: foto.height} : {width: foto.height, height: foto.width};
        const kutular = sonuc.blocks.flatMap(b => (b.lines.length
          ? b.lines.map(l => ({text: l.text, frame: l.frame})) : [{text: b.text, frame: b.frame}]));
        const ipucu = gorselIpucu(kutular, boyut);
        if (!ipucu || tarandiRef.current || modRef.current !== 'barkod') return;
        if (ipucu.tur === 'barkod') await kodOkut(ipucu.deger);
        else yonSoyle(ipucu.metin);
      } finally {
        unlink(foto.path).catch(() => {});
      }
    } catch {
      // Tek karede hata olabilir; bir sonraki denemede sürer
    } finally {
      gorselMesgulRef.current = false;
    }
  }
  gorselYardimRef.current = barkodGorselYardim;
  modRef.current = mod;

  async function koduIsle(deger: string) {
    setMod('ana');
    Vibration.vibrate(TITRESIM.barkodOkundu);

    // Kurumun kendi hazırladığı giriş QR'ı: düzen ya QR'ın içindedir ya da (büyük binalarda) kurumun
    // sitesinden indirilir. Sonraki nokta QR'ları ve internetsiz kullanım için telefona kaydedilir.
    const adres = adresQrCoz(deger);
    if (adres) setDurum('Bina bilgisi indiriliyor...');
    const kurumMekani = adres
      ? await beklerkenBildir('Bina bilgisi indiriliyor.', adrestenMekanIndir(adres), 'Hâlâ indiriyorum, internet yavaş olabilir.')
      : veriQrCoz(deger);
    if (adres && !kurumMekani) {
      Vibration.vibrate(TITRESIM.urunBulunamadi);
      setDurum('Bina bilgisi alınamadı');
      sesliSoyele('Bu binanın bilgisi indirilemedi. İnternet bağlantınızı kontrol edin ya da bir görevliye danışın.');
      return;
    }
    if (kurumMekani) {
      kayitYaz(`mekan:${kurumMekani.id}`, kurumMekani);
      await mekanQrIsle({tur: 'mekan', mekanId: kurumMekani.id}, kurumMekani);
      return;
    }
    const mekanQr = qrCoz(deger);
    if (mekanQr) {
      await mekanQrIsle(mekanQr);
      return;
    }

    setDurum('Ürün aranıyor...');
    let bilgi = await beklerkenBildir('Barkod okundu, ürün aranıyor.', urunAra(deger));
    if (bilgi && mekan) {
      // Mağaza biliniyorsa genel tahmin yerine o mağazanın yerleşimi kullanılır
      bilgi = {...bilgi, konum: hedefKonumu(mekan, `${bilgi.kategori || ''} ${bilgi.ad}`) || {
        bolum: 'Bilinmiyor', koridor: '', raf: '',
        yonTarifi: 'Bu ürünün bu mağazadaki yeri kayıtlı değil. Mağaza görevlisine danışabilirsiniz.',
      }};
    }
    if (bilgi) {
      sonuclariTemizle();
      setUrun(bilgi);
      gecmiseEkle(deger, bilgi);
      setDurum(`Ürün bulundu — ${bilgi.kaynak}`);
      // Kullanıcının kendi alerjeni varsa güçlü (hata) titreşimi: sesi duymasa da elinde hisseder
      Vibration.vibrate(kisiselAlerjenVar(bilgi, alerjenlerim) ? TITRESIM.hata
        : bilgi.alerjenler?.length ? TITRESIM.posBulundu : TITRESIM.urunBulundu);
      sesliSoyele(urunSesliMetin(bilgi, alerjenlerim) + listedeIsaretle(bilgi));
    } else {
      setDurum('Ürün bulunamadı');
      Vibration.vibrate(TITRESIM.urunBulunamadi);
      sesliSoyele('Bu ürün hiçbir veritabanında bulunamadı. İnternet bağlantınızı kontrol edip tekrar deneyebilirsiniz.');
    }
  }

  if (mod === 'egitim') {
    return (
      <EgitimEkrani
        metin={egitimTalkback ? EGITIM_TALKBACK : EGITIM_ADIMLARI[egitimAdim].metin}
        adim={egitimAdim}
        toplam={EGITIM_ADIMLARI.length}
        ekranOkuyucu={egitimTalkback}
        onDokun={() => cokluDokunus({
          1: () => egitimHareketi(1),
          2: () => egitimHareketi(2),
          3: () => egitimHareketi(3),
        }, 3)}
        onUzunBas={() => egitimHareketi('uzun')}
        onBitir={egitimiBitir}
      />
    );
  }

  if (mod === 'ayarlar') {
    return (
      <AyarlarEkrani
        hizAdi={KONUSMA_HIZLARI[hizIndex].ad}
        adimBoyu={ADIM_BOYLARI[adimBoyuIndex].carpan === adimCarpani ? ADIM_BOYLARI[adimBoyuIndex].ad
          : `size göre ${adimUzunluguCm(adimCarpani)} cm`}
        onAdimBoyu={() => adimBoyuAyarla((adimBoyuIndex + 1) % ADIM_BOYLARI.length)}
        kisaAnlatim={kisaAnlatim}
        merdivendenKacin={merdivendenKacin}
        adimRehberi={adimRehberiAyari}
        yonUyarisi={yonUyarisi}
        yardimNumarasi={yardimNumarasi}
        onHiz={hiziDegistir}
        onKisaAnlatim={() => kisaAnlatimDegistir(!kisaAnlatim)}
        onMerdiven={() => merdivenTercihiDegistir(!merdivendenKacin)}
        onAdimRehberi={() => adimRehberiDegistir(!adimRehberiAyari)}
        onYonUyarisi={() => yonUyarisiDegistir(!yonUyarisi)}
        onYardimNumarasiYaz={metin => yardimNumarasiKaydet(telefonNumarasiCoz(metin))}
        onYardimNumarasiSesle={yardimNumarasiSesle}
        onEgitim={egitimiBaslat}
        acilKisiler={acilKisiler}
        onAcilKisiEkle={acilKisiEkle}
        onAcilKisiSil={acilKisiSil}
        alerjenler={alerjenlerim}
        onAlerjenSesle={alerjenSesle}
        onAlerjenSil={alerjenSil}
        onAdimOlc={adimOlcumYuruyusu}
        onGeri={geriDon}
      />
    );
  }

  if (mod === 'hakkinda') {
    return <HakkindaEkrani onGeri={geriDon}/>;
  }

  if (mod === 'liste') {
    return (
      <ListeEkrani
        liste={liste}
        dinleniyor={dinleniyor}
        mekanVar={!!mekan}
        onDokun={() => cokluDokunus({
          1: () => soyleVeyaSustur(listeSesliMetin(liste)),
          2: sesleListeyiDuzenle,
          3: listeyiGez,
        }, 3)}
        onGez={listeyiGez}
        onSesle={sesleListeyiDuzenle}
        onOgeDegistir={listeOgesiDegistir}
        onAlinanlariSil={alinanlariSil}
        onGeri={geriDon}
      />
    );
  }

  if (mod === 'gecmis') {
    return <GecmisEkrani gecmis={gecmis} onGeri={geriDon}/>;
  }

  if ((mod === 'barkod' || taramaModuMu(mod)) && device) {
    return (
      <KameraEkrani
        mod={mod}
        device={device}
        cameraRef={cameraRef}
        fenerAcik={fenerAcik}
        codeScanner={codeScanner}
        onKapat={kameraKapat}
        onFener={fenerDegistir}
        onOnizlemeBoyutu={boyut => { onizlemeRef.current = boyut; }}
      />
    );
  }

  return (
    <AnaEkran
      durum={durum}
      kameraIzniYok={izinDurumu === 'denied'}
      kameraHazir={kameraHazir}
      gecmisSayisi={gecmis.length}
      kalanListeSayisi={liste.filter(o => !o.alindi).length}
      urun={urun}
      tutar={tutar}
      banknot={banknot}
      tarihSonuc={tarihSonuc}
      mekanAdi={mekan?.ad || null}
      konumAdi={mekan ? noktaAdi(mekan, konumNoktasi || mekan.giris) : null}
      hedefAdi={hedef?.ad || null}
      kalanDurakSayisi={duraklar.length}
      onSonrakiDurak={sonrakiDurak}
      dinleniyor={dinleniyor}
      onUrunNerede={urunNerede}
      onKonumGonder={() => konumuGonder()}
      onMekanDinle={() => sesliSoyele(mekanDurumMetni())}
      onMekandanCik={mekandanCik}
      rehberDurumu={rehber ? rehberKisaDurum(rehber) : null}
      onDokun={ekranaDokun}
      onUzunBas={sesliKomutAl}
      onSesliKomut={sesliKomutAl}
      onKameraAc={kameraAc}
      onEkranAc={setMod}
      onAnaMenu={anaMenuyeDon}
    />
  );
}
