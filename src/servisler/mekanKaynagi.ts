import {Mekan} from '../tipler';
import {yerlesimDogrula} from '../mekan/yerlesim';
import {mekanGetir} from '../mekan/mekanlar';
import {kurumMekaniMi} from '../mekan/qrVeri';
import {kayitOku, kayitYaz} from './kayit';
import {zamanAsimliFetch} from './ag';

// Mekân düzenlerinin yayınlandığı GitHub Pages adresi (sonunda "/" ile). Depo: github.com/burhanettiny/bak-mekanlar
// null yapılırsa yalnızca uygulamayla gelen ve daha önce indirilmiş düzenler kullanılır.
// Güvenlik: QR yalnızca mekân kimliği taşır, adres burada sabittir. Sahte bir QR
// kullanıcıyı başka bir sunucudaki sahte bir düzene yönlendiremez.
export const MEKAN_KAYNAGI: string | null = 'https://burhanettiny.github.io/bak-mekanlar/mekanlar/';

const EN_BUYUK_BOYUT = 512 * 1024;

export async function mekanIndir(id: string, kaynak: string | null = MEKAN_KAYNAGI): Promise<Mekan | null> {
  // Kurumların kendi QR'ıyla gelen binalar yalnızca telefonda tutulur, internette aranmaz
  if (!kaynak || !/^[\w-]+$/.test(id) || kurumMekaniMi(id)) return null;
  try {
    const res = await zamanAsimliFetch(`${kaynak}${id}.json`, {headers: {Accept: 'application/json'}}, 8000);
    if (!res.ok) return null;
    const metin = await res.text();
    if (metin.length > EN_BUYUK_BOYUT) return null;
    const mekan = yerlesimDogrula(JSON.parse(metin));
    // Dosyanın içindeki kimlik istenenle aynı olmalı; yanlış dosya yanlış binayı yükletmesin
    return mekan && mekan.id === id ? mekan : null;
  } catch {
    return null;
  }
}

function enYeni(a: Mekan | null, b: Mekan | null): Mekan | null {
  if (!a || !b) return a || b;
  return a.surum >= b.surum ? a : b;
}

// Telefonda bir kopya varsa (daha önce indirilmiş ya da uygulamayla gelen) beklemeden onu döndürür,
// arka planda internetteki sürüme bakar; daha yenisi gelirse saklar ve guncellendi'yi çağırır.
// Telefonda kopya yoksa internetten indirilmesini bekler.
export async function mekanBul(id: string, guncellendi?: (m: Mekan) => void,
  kaynak: string | null = MEKAN_KAYNAGI): Promise<Mekan | null> {
  const onbellek = yerlesimDogrula(await kayitOku<unknown>(`mekan:${id}`, null));
  const yerel = enYeni(onbellek, mekanGetir(id));

  const indirme = mekanIndir(id, kaynak).then(uzak => {
    if (!uzak || (yerel && uzak.surum <= yerel.surum)) return null;
    kayitYaz(`mekan:${id}`, uzak);
    return uzak;
  });

  if (yerel) {
    indirme.then(uzak => { if (uzak) guncellendi?.(uzak); });
    return yerel;
  }
  return indirme;
}

// Kurumun kendi sitesinde yayınladığı büyük bina düzeni (adres taşıyan giriş QR'ı, bkz. qrVeri.ts).
// İndirilen düzen telefonda saklanır; internet yoksa aynı adresten daha önce indirilen kopya kullanılır.
export async function adrestenMekanIndir(adres: string): Promise<Mekan | null> {
  try {
    const res = await zamanAsimliFetch(adres, {headers: {Accept: 'application/json'}}, 10000);
    if (res.ok) {
      const metin = await res.text();
      const mekan = metin.length <= EN_BUYUK_BOYUT ? yerlesimDogrula(JSON.parse(metin)) : null;
      if (mekan && kurumMekaniMi(mekan.id)) {
        kayitYaz(`mekanAdresi:${adres}`, mekan.id);
        return mekan;
      }
      return null;
    }
  } catch {
    // İnternet yok ya da sunucu yanıt vermedi: telefondaki kopyaya bakılır
  }
  const id = await kayitOku<string | null>(`mekanAdresi:${adres}`, null);
  return id ? yerlesimDogrula(await kayitOku<unknown>(`mekan:${id}`, null)) : null;
}
