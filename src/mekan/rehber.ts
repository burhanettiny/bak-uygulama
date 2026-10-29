import {MekanHedefi} from '../tipler';
import {RotaParcasi} from './yerlesim';

// Adım adım rehber: rota parçalara bölünür, yürüme parçalarında adım sensörüyle geri sayılır.
// Adım uzunluğu kişiden kişiye değiştiği için sayılar "yaklaşık"tır; sapmalar koridor
// QR'larıyla düzeltilir (QR okutulunca rehber o noktadan yeniden başlar).
export interface Rehber {
  hedef: MekanHedefi;
  parcalar: RotaParcasi[];
  sira: number;
  sayac: number;
  besUyarisi: boolean;
  asimUyarisi: boolean;
}

const DIKEY_BEKLEME = 'Bitince devam deyin ya da oradaki QR kodunu okutun.';
const ASIM_UYARISI = 'Beklenenden fazla yürüdünüz, hedefi geçmiş olabilirsiniz. ' +
  'Yakındaki QR kodunu okutun ya da bir görevliye sorun.';

export function rehberOlustur(hedef: MekanHedefi, parcalar: RotaParcasi[]): Rehber {
  return {hedef, parcalar, sira: 0, sayac: 0, besUyarisi: false, asimUyarisi: false};
}

function talimat(p: RotaParcasi): string {
  return p.dikey ? `${p.metin} ${DIKEY_BEKLEME}` : p.metin;
}

// Kullanıcının adım uzunluğu kayıttaki "standart adım"dan farklıysa carpan ile ölçeklenir
function hedefAdim(p: RotaParcasi, carpan: number): number {
  return Math.max(1, Math.round(p.adim * carpan));
}

export function rehberBaslangicMetni(r: Rehber, not = ''): string {
  return `${not}${r.hedef.ad} için adım adım yönlendiriyorum. ${talimat(r.parcalar[0])}`;
}

function sonParcaMi(r: Rehber): boolean {
  return r.sira === r.parcalar.length - 1;
}

function sonrakiParca(r: Rehber): Rehber {
  return {...r, sira: r.sira + 1, sayac: 0, besUyarisi: false, asimUyarisi: false};
}

// Sensörden gelen her adımda çağrılır. Söylenecek bir şey yoksa soylenecek null'dır.
export function adimAtildi(r: Rehber, carpan = 1): {rehber: Rehber; soylenecek: string | null} {
  const p = r.parcalar[r.sira];
  // Merdiven ve asansörde adım sayılmaz; kullanıcının "devam" demesi beklenir
  if (!p || p.dikey) return {rehber: r, soylenecek: null};

  const toplam = hedefAdim(p, carpan);
  const guncel = {...r, sayac: r.sayac + 1};
  const kalan = toplam - guncel.sayac;

  if (kalan === 5 && toplam >= 10 && !r.besUyarisi) {
    return {rehber: {...guncel, besUyarisi: true}, soylenecek: '5 adım kaldı.'};
  }
  if (kalan === 0) {
    if (sonParcaMi(r)) {
      return {rehber: guncel, soylenecek: `Yaklaşık olarak vardınız. ${r.hedef.tarif}`};
    }
    const sonraki = sonrakiParca(guncel);
    return {
      rehber: sonraki,
      soylenecek: `Yaklaşık olarak ${p.varisAdi} noktasına geldiniz. Şimdi: ${talimat(sonraki.parcalar[sonraki.sira])}`,
    };
  }
  // Yalnızca son parçada anlamlı: ara parçalar kalan 0'da kendiliğinden bir sonrakine geçer
  if (kalan < 0 && sonParcaMi(r) && !r.asimUyarisi && -kalan >= Math.max(3, Math.round(toplam * 0.3))) {
    return {rehber: {...guncel, asimUyarisi: true}, soylenecek: ASIM_UYARISI};
  }
  return {rehber: guncel, soylenecek: null};
}

// "Devam" (merdiveni çıktım, asansörden indim): sıradaki parçaya geçilir. Son parçadaysa hedefe varılmıştır.
export function devamEt(r: Rehber): {rehber: Rehber | null; soylenecek: string} {
  if (sonParcaMi(r)) return {rehber: null, soylenecek: `Hedefinize ulaştınız. ${r.hedef.tarif}`};
  const sonraki = sonrakiParca(r);
  return {rehber: sonraki, soylenecek: `Şimdi: ${talimat(sonraki.parcalar[sonraki.sira])}`};
}

// "Neredeyim" / tek dokunuş: o anki talimat ve kalan adım
export function rehberDurumMetni(r: Rehber, carpan = 1): string {
  const p = r.parcalar[r.sira];
  if (p.dikey) return `${r.hedef.ad} yolundasınız. ${talimat(p)}`;
  const kalan = hedefAdim(p, carpan) - r.sayac;
  const kalanMetni = kalan > 0 ? `Bu bölümde yaklaşık ${kalan} adım kaldı.` : 'Bu bölümün sonuna geldiniz.';
  return `${r.hedef.ad} yolundasınız. ${p.metin} ${kalanMetni}`;
}

// Ekranda gösterilecek kısa durum: "~12 adım" ya da "Merdiven: bitince devam deyin"
export function rehberKisaDurum(r: Rehber, carpan = 1): string {
  const p = r.parcalar[r.sira];
  if (p.dikey) return '⏸ Bitince "devam" deyin';
  return `👣 ~${Math.max(0, hedefAdim(p, carpan) - r.sayac)} adım`;
}
