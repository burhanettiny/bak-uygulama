export interface KonumBilgisi {
  bolum: string;
  koridor: string;
  raf: string;
  yonTarifi: string;
}

export interface UrunBilgisi {
  ad: string;
  marka: string;
  kategori?: string;
  konum?: KonumBilgisi;
  kaynak?: string;
  alerjenler?: string[];
  eserAlerjenler?: string[];       // "eser miktarda içerebilir"
  icindekiler?: string;            // içindekiler metni (varsa): kişisel alerjen bu metinde de aranır
  alerjenBilgisiVar?: boolean;     // veritabanında alerjen ya da içindekiler bilgisi vardı
}

export interface TarihSonuc {
  tarih: string;
  durum: 'gecmis' | 'yakin' | 'iyi' | 'yok';
  mesaj: string;
  sesliMesaj: string;
  gunKaldi: number;
}

export type Mod = 'ana' | 'barkod' | 'pos' | 'tarih' | 'para' | 'icindekiler' | 'gecmis' | 'liste' | 'hakkinda' | 'ayarlar' | 'egitim';

export interface GecmisKaydi {
  barkod: string;
  ad: string;
  marka: string;
  zaman: number;
}

export interface ListeOgesi {
  ad: string;
  alindi: boolean;
}

export type SesHatasi = 'izin' | 'yok' | 'sessiz' | 'anlasilmadi' | 'ag' | 'dil' | 'mesgul' | 'servis';
export type SesSonucu = {metin: string} | {hata: SesHatasi; kod?: string};

export type ListeKomutu =
  | {tur: 'ekle'; ogeler: string[]}
  | {tur: 'sil'; oge: string}
  | {tur: 'temizle'};

export type TaramaModu = 'pos' | 'tarih' | 'para' | 'icindekiler';

// ── Mekân yerleşimi (mağaza, hastane, kamu binası…) ──────
// Mekân; noktalar (giriş, koridor, oda kapısı, asansör önü) ve aralarındaki yollardan oluşan bir haritadır.
// Girişteki QR "BAK:MEKAN:<id>", her noktadaki QR "BAK:NOKTA:<id>:<noktaId>" taşır.
export interface MekanNoktasi {
  id: string;
  ad: string;
  // 0 zemin kat; belirtilmezse 0
  kat?: number;
}

export type BaglantiTuru = 'yuru' | 'rampa' | 'kapi' | 'merdiven' | 'yuruyen-merdiven' | 'asansor';

// Yürüme yollarında tarif iki yön için ayrı yazılır, çünkü "sağa dön" geliş yönüne göre değişir.
// Merdiven ve asansörde kat ve yön bilgisi otomatik söylenir; tarif yalnızca ek bilgi içindir (korkuluk tarafı gibi).
export interface MekanBaglantisi {
  a: string;
  b: string;
  adim: number;
  tur?: BaglantiTuru;
  tarif?: string;
  geriTarif?: string;
  // Tek yönlü yollarda (kasa şeritleri, turnike) yalnızca a → b yürünebilir
  tekYon?: boolean;
  basamak?: number;
  // Kurum QR oluşturucusunun çiziminden: a → b yönü (pusula derecesi, çizimin üstü 0, saat yönünde) ve tarifin
  // çizimden üretildiği. İkisi varsa uygulama dönüşü gerçekte izlenen rotaya göre kendisi söyler.
  yon?: number;
  oto?: boolean;
}

// Kullanıcının gidebileceği yer: reyon, oda, birim, tuvalet, çıkış…
export interface MekanHedefi {
  ad: string;
  nokta: string;
  koridor?: string;
  raf?: string;
  oda?: string;
  // Kapı numarasıyla aranabilen hedefler (daire numarası gibi): "12 numaralı daire"
  no?: string;
  // Noktaya varınca söylenecek son yönlendirme
  tarif: string;
  anahtarlar: string[];
  // Yer listesinde ve seçeneklerde okunacak kısa ad ("Kardiyoloji Polikliniği" → "Kardiyoloji");
  // söylenince de bulunur. Yoksa ad okunur.
  kisaAd?: string;
  // Bu hedefte bulunan kişiler (doktorlar, görevliler): "Dr. Ayşe Yılmaz"
  kisiler?: string[];
}

export interface Mekan {
  id: string;
  ad: string;
  tur?: 'magaza' | 'hastane' | 'kurum' | 'diger';
  surum: number;
  giris: string;
  // Mağazada alışveriş bitince yönlendirilecek nokta
  kasa?: string;
  noktalar: MekanNoktasi[];
  baglantilar: MekanBaglantisi[];
  hedefler: MekanHedefi[];
}

// Kurumların kendi hazırladığı, düzeni içinde taşıyan giriş QR'ı ayrıca çözülür (bkz. mekan/qrVeri.ts)
export type MekanQr =
  | {tur: 'mekan'; mekanId: string}
  | {tur: 'nokta'; mekanId: string; noktaId: string};

// Turun bir durağı: gidilecek hedef ve oradan alınacak liste ürünleri
export interface Durak {
  hedef: MekanHedefi;
  ogeler: string[];
}
