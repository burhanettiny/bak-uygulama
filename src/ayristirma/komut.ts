import {ListeKomutu, TaramaModu} from '../tipler';
import {harfSadelestir, kucukHarf} from '../yazi';
import {boyCoz} from '../mekan/adimKalibrasyonu';
import {listeKomutuCoz} from './liste';
import {aramaMetniTemizle} from '../mekan/yerlesim';
import {telefonNumarasiCoz} from './telefon';

export type SesliKomut =
  | {tur: 'kamera'; mod: 'barkod' | TaramaModu}
  | {tur: 'ekran'; mod: 'liste' | 'gecmis' | 'hakkinda' | 'ayarlar'}
  | {tur: 'sustur'}
  | {tur: 'kayboldum'}
  | {tur: 'yardimCagir'}
  | {tur: 'yardimNumarasi'; numara: string | null}
  | {tur: 'kisaAnlatim'; acik: boolean}
  | {tur: 'yonUyarisi'; acik: boolean}
  | {tur: 'egitim'}
  | {tur: 'nerede'; aranan: string}
  | {tur: 'neler'}
  | {tur: 'etiketAra'}
  | {tur: 'konumGonder'; kisi: string | null; kanal: 'sms' | 'whatsapp' | null; canli: boolean}
  | {tur: 'acilKisiEkle'}
  | {tur: 'acilKisiler'}
  | {tur: 'kisiAra'; kisi: string}
  | {tur: 'liste'; komut: ListeKomutu}
  | {tur: 'listeyiOku'}
  | {tur: 'gez'}
  | {tur: 'sonrakiDurak'}
  | {tur: 'neredeyim'}
  | {tur: 'mekandanCik'}
  | {tur: 'merdiven'; kacin: boolean}
  | {tur: 'devam'}
  | {tur: 'adimRehberi'; acik: boolean}
  | {tur: 'adimBoyu'; boy: 'kısa' | 'normal' | 'uzun'}
  | {tur: 'boy'; cm: number | null}
  | {tur: 'adimAyari'}
  | {tur: 'tekrarla'}
  | {tur: 'hiz'; yon: 'artir' | 'azalt'}
  | {tur: 'yardim'}
  | {tur: 'bilinmiyor'};

export const KOMUT_YARDIMI =
  'Şunları söyleyebilirsiniz: barkod oku, son kullanma tarihi, para tanı, POS tutarı, ' +
  'neler var, süt nerede, kardiyoloji nerede, doktorun adı ve nerede, 112 numaralı oda, tuvalet nerede, ' +
  'listeye süt ekle, listeden süt sil, listemi oku, listeyi gez, vardım, neredeyim, etiket ara, devam, kayboldum, ' +
  'yardım çağır, yardım numaram ve ardından numara, konumumu gönder ya da yerimi gönder, konumumu Ayşe’ye gönder, canlı konumumu paylaş, acil kişi ekle, annemi ara, ' +
  'sus, tekrarla, kısa anlat, uzun anlat, daha hızlı konuş, yavaş konuş, ' +
  'merdiven kullanma, merdiven kullan, adımlarım kısa, boyum 170, adım ayarım ne, adım sayarı kapat, yön uyarısını kapat, ' +
  'son taranan ürünler, ayarlar, eğitim, yönlendirmeyi kapat.';

// Baştan sona eşleşir: "listede ne var" alışveriş listesi komutudur, bu değil
const NELER_VAR = new RegExp([
  '^(burada )?(neler|ne|hangi yerler|hangi birimler|hangi bolumler|nereler) var( burada)?$',
  '^(birimler|bolumler|yerler|hedefler|secenekler|bilmiyorum|emin degilim)$',
  '\\b(nerelere|nereye) (gidebilirim|gidilir)\\b',
  '\\b(yerleri|birimleri|bolumleri|hedefleri) (say|oku|soyle|listele)\\b',
].join('|'));

// "Nereye gitmek istiyorsunuz?" sorusuna "bilmiyorum" ya da "neler var" cevabı
// Konum paylaşımı birçok biçimde söylenir; ayrıca ses tanıma "konumumu"yu sık sık "konumu mu", "konu mu" diye böler.
// "Konum" yerine: yerimi, nerede olduğumu, lokasyonumu, adresimi. "Gönder" yerine: paylaş, yolla, at, ilet, bildir, haber ver.
const KONUM_SOZU = /\b(konum\w*|konu mu\w*|konu mi|lokasyon\w*|yerimi|nerede oldugumu|nerde oldugumu|adresimi)\b/;
const GONDER_SOZU = /\b(gonder\w*|paylas\w*|yolla\w*|ilet\w*|at|atar|atin|bildir\w*|haber ver\w*)\b/;

// "konumumu Ayşe'ye WhatsApp'tan gönder" → "Ayşe'ye": komut sözcükleri atılınca kalan kişi adıdır
const KONUM_KOMUT_SOZCUKLERI = /^(canli|konum\w*|konu|mu|mi|lokasyon\w*|yerimi|nerede|nerde|oldugumu|adresimi|haber|ver|verin|verir|gonder\w*|paylas\w*|yolla\w*|ilet\w*|at|atar|atin|bildir\w*|whatsapp\w*|vatsap\w*|wp|sms\w*|kisa|mesaj\w*|ile|olarak|benim|lutfen|simdi|hemen|bana)$/;

function kisiAdiAyikla(ham: string): string | null {
  const kalan = ham.split(' ').filter(w => !KONUM_KOMUT_SOZCUKLERI.test(harfSadelestir(w.replace(/['’].*$/, ''))));
  return kalan.length ? kalan.join(' ') : null;
}

export function nelerVarMi(metin: string): boolean {
  return NELER_VAR.test(harfSadelestir(kucukHarf(metin).replace(/[.!?,]+/g, ' ').replace(/\s+/g, ' ').trim()));
}

// Konuşma tanıma noktalama ve büyük harf ekleyebilir; kurallar sadeleştirilmiş metin üzerinde çalışır.
// Sıra önemli: daha özel kalıplar ("neredeyim", "listeye … ekle") genel olanlardan ("… nerede", "tara") önce gelir.
export function sesliKomutCoz(metin: string): SesliKomut {
  const ham = kucukHarf(metin).replace(/[.!?,]+/g, ' ').replace(/\s+/g, ' ').trim();
  const s = harfSadelestir(ham);
  if (!s) return {tur: 'bilinmiyor'};

  // Acil durum ve yardım numarası, genel "yardım" (komut listesi) isteğinden önce
  if (/\b(yardim|acil) (numaram|numarasi|numarami|numarami kaydet)\b/.test(s)) {
    return {tur: 'yardimNumarasi', numara: telefonNumarasiCoz(ham)};
  }
  if (/\b(yardim cagir|yardim iste|acil durum|acil arama|imdat|yakinimi ara|beni kurtar)\b/.test(s)) return {tur: 'yardimCagir'};
  // Konum paylaşımı: "konumumu gönder", "konumumu Ayşe'ye WhatsApp'tan gönder", "annemlere konumumu at"
  if (KONUM_SOZU.test(s) && GONDER_SOZU.test(s)) {
    // Canlı konum yalnızca WhatsApp'ın kendi özelliğiyle başlatılabilir (bkz. App konumuGonder)
    const canli = /\bcanli\b/.test(s);
    const kanal = canli || /\b(whatsapp|vatsap|vatsapp|wp)/.test(s) ? 'whatsapp'
      : /\b(sms|kisa mesaj|mesajla)\b/.test(s) ? 'sms' : null;
    return {tur: 'konumGonder', kisi: kisiAdiAyikla(ham), kanal, canli};
  }
  if (/\b(acil kisi|yakin|kisi|kisiyi)\w* (ekle|kaydet)|\brehberden (kisi )?(ekle|sec)/.test(s)) return {tur: 'acilKisiEkle'};
  if (/^(acil kisilerim|acil kisiler|yakinlarim|kayitli kisiler|kisilerim)$/.test(s)) return {tur: 'acilKisiler'};
  if (/^(sus|dur|kes|yeter|sessiz|sessiz ol|sesi kes|sustur)$/.test(s)) return {tur: 'sustur'};
  if (/\b(kayboldum|yolumu kaybettim|nerede oldugumu bilmiyorum|neredeyim bilmiyorum)\b/.test(s)) return {tur: 'kayboldum'};
  if (/\b(kisa anlat|kisa anlatim|kisa konus|kisa soyle)/.test(s)) {
    return {tur: 'kisaAnlatim', acik: !/\b(kapat|kapa|istemiyorum)\b/.test(s)};
  }
  if (/\b(uzun|detayli|ayrintili) (anlat|anlatim|konus)/.test(s)) return {tur: 'kisaAnlatim', acik: false};
  if (/\byon (uyarisi|uyarisini|uyarilari)/.test(s)) {
    return {tur: 'yonUyarisi', acik: !/\b(kapat|kapa|istemiyorum)\b/.test(s)};
  }
  if (/\b(egitim|egitimi baslat|nasil kullanilir|kullanmayi ogret)\b/.test(s)) return {tur: 'egitim'};
  if (/^(ayarlar|ayarlari ac|ayarlar ekrani|ayarlara git)$/.test(s)) return {tur: 'ekran', mod: 'ayarlar'};
  // Binada hangi yerlerin hangi adla kayıtlı olduğu: "neler var", "hangi birimler var", "nereye gidebilirim"
  if (NELER_VAR.test(s)) return {tur: 'neler'};
  // Duvardaki BAK etiketini bulma: "nerede" ve "qr oku" kurallarından önce bakılır
  if (/\b(etiket|etiketi|qr|qr u|karekod|kare kod|kodu) (ara|bul|nerede)\b|^etiket ara/.test(s)) return {tur: 'etiketAra'};
  // "Annemi ara", "Ayşe'yi ara": acil kişilerden biri. Eşleşen kişi yoksa uygulama yer adı olarak arar ("süt ara").
  const arama = ham.match(/^(.+?)\s+ara$/);
  if (arama && !/\b(barkod|qr|kod|karekod|etiket|yardim|urun)/.test(s)) return {tur: 'kisiAra', kisi: arama[1]};
  if (/\b(yardim|komutlar|ne yapabilirim|neler yapabilirim|ne diyebilirim)\b/.test(s)) return {tur: 'yardim'};
  // Yalnızca cümlenin tamamı tekrar isteğiyse: "tekrar barkod oku" barkod komutudur
  if (/^(tekrar|tekrarla|tekrar et|tekrar soyle|ne dedin|bir daha soyle|bir daha)$/.test(s)) return {tur: 'tekrarla'};
  if (/\b(neredeyim|nerdeyim|konumum|neresi burasi)\b/.test(s)) return {tur: 'neredeyim'};
  // Adım adım rehberde merdiven/asansör bitince
  if (/^(devam|devam et|ciktim|indim|merdiveni (ciktim|indim)|merdivenden (ciktim|indim)|asansorden indim|asansordan indim)$/.test(s)) {
    return {tur: 'devam'};
  }
  // "boyum 170", "boyum bir yetmiş": adım uzunluğu boydan tahmin edilir
  if (/\bboy(um|umu| uzunlugum)\b/.test(s) && !/\badim/.test(s)) return {tur: 'boy', cm: boyCoz(s)};
  // "adım ayarım ne", "adımlarım ne kadar", "adım boyum ne"
  if (/\badim (ayarim|ayari|olcumum|uzunlugum)\b|\badimlarim ne\b|\badim boyum ne\b/.test(s)) return {tur: 'adimAyari'};
  // "adımlarım kısa", "adım boyum uzun", "adım boyunu normal yap"
  const boy = s.match(/\badim(larim| boyu| boyum| boyunu)? (kisa|normal|orta|uzun)\b/);
  if (boy) return {tur: 'adimBoyu', boy: boy[2] === 'kisa' ? 'kısa' : boy[2] === 'uzun' ? 'uzun' : 'normal'};
  if (/\badim (sayar|sayari|sayaci|rehber|rehberi)|\badim adim/.test(s)) {
    return {tur: 'adimRehberi', acik: !/\b(kapat|kapa|durdur|istemiyorum)\b/.test(s)};
  }
  if (/\b(vardim|geldim|sonraki durak|siradaki durak)\b/.test(s)) return {tur: 'sonrakiDurak'};
  if (/\b(magazadan|binadan) cik|\byonlendirmeyi (kapat|bitir)/.test(s)) return {tur: 'mekandanCik'};
  // "merdiven kullanma", "merdiven kullan"ı içerdiği için önce bakılır
  if (/\bmerdiven(den)? (kullanma|istemiyorum|kacin)|\basansor(u)? (kullan|tercih)/.test(s)) return {tur: 'merdiven', kacin: true};
  if (/\bmerdiven (kullan|kullanabilirim|olur)\b/.test(s)) return {tur: 'merdiven', kacin: false};
  if (/\b(listeyi|listemi|magazada) gez|\btur(u)? baslat|\balisverise basla/.test(s)) return {tur: 'gez'};

  // Listeye ekleme / çıkarma: "listeye süt ekle", "ekmek ekle", "listeden sütü sil", "listeyi temizle"
  if (/^(listeye|listeme|listeden|listemden)\b|\b(ekle|ekleyin)$|^listeyi (temizle|bosalt)/.test(s)) {
    return {tur: 'liste', komut: listeKomutuCoz(ham)};
  }
  if (/\b(listemi|listeyi) oku|\blistede ne var|\blistemde ne var/.test(s)) return {tur: 'listeyiOku'};
  if (/^(alisveris )?listem(i)?( ac)?$|^liste(yi)? ac$|^alisveris listesi$/.test(s)) return {tur: 'ekran', mod: 'liste'};
  if (/\b(son taranan|son taranlar|gecmis)/.test(s)) return {tur: 'ekran', mod: 'gecmis'};
  if (/\bhakkinda\b/.test(s)) return {tur: 'ekran', mod: 'hakkinda'};

  if (/\b(daha )?(hizli|hizlandir)/.test(s)) return {tur: 'hiz', yon: 'artir'};
  if (/\b(daha )?(yavas|yavaslat)/.test(s)) return {tur: 'hiz', yon: 'azalt'};

  if (/\s(nerede|nerde|nerededir|ne tarafta|hangi reyonda|hangi katta)$|\s(ariyorum|lazim)$/.test(s) ||
      /\s(odasi|odasina|odasini bul|odasina git|odasina gotur|nasil giderim|nasil gidilir)$/.test(s) ||
      /\b\d+ ?(numarali|nolu) (oda|daire)|\b(oda|daire) \d+|\b\d+ numara\b/.test(s)) {
    return {tur: 'nerede', aranan: aramaMetniTemizle(ham)};
  }

  // Kamera modları: "son kullanma tarihi" "oku" içerdiği için barkoddan önce bakılır
  if (/\b(son kullanma|skt|tarih)/.test(s)) return {tur: 'kamera', mod: 'tarih'};
  if (/\b(para|banknot|kac lira)\b/.test(s)) return {tur: 'kamera', mod: 'para'};
  if (/\b(pos|tutar|odeme|ne kadar)\b/.test(s)) return {tur: 'kamera', mod: 'pos'};
  if (/\b(barkod|qr|kare kod|karekod|tara|urun oku|urunu oku|oku)\b/.test(s)) return {tur: 'kamera', mod: 'barkod'};

  return {tur: 'bilinmiyor'};
}
