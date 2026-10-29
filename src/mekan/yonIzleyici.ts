// Düz gidilmesi gereken bir bölümde kullanıcının yönünün kaydığını fark eder (yanlış kapıya dönmek gibi).
// Telefon elde taşındığı için yön, vücudun yönünü yaklaşık izler. Yanlış alarm vermemek için temkinli:
//  - Referans yön, bölümde 3 adım sayıldıktan sonra öğrenilir (bölüm başındaki dönüş bitmiş olur).
//  - Sapma esikDerece'yi sureMs boyunca aşarsa ve kullanıcı yürüyorsa uyarılır; her bölümde en fazla bir kez.

// İki yön arasındaki işaretli fark, -180..180 derece
export function aciFarki(a: number, b: number): number {
  return ((a - b + 540) % 360) - 180;
}

export interface YonIzleyici {
  bolumBasladi(dogruGidilecek: boolean): void;
  adim(zamanMs: number, bolumdekiAdim: number): void;
  // true dönerse kullanıcı uyarılmalı
  olcum(derece: number, zamanMs: number): boolean;
}

export function yonIzleyici(esikDerece = 70, sureMs = 2500, yuruyusAraligiMs = 2500): YonIzleyici {
  let izle = false;
  let guncel: number | null = null;
  let referans: number | null = null;
  let sapmaBasi: number | null = null;
  let uyarildi = false;
  let sonAdim = -Infinity;

  return {
    bolumBasladi(dogruGidilecek) {
      izle = dogruGidilecek;
      referans = null;
      sapmaBasi = null;
      uyarildi = false;
    },
    adim(zamanMs, bolumdekiAdim) {
      sonAdim = zamanMs;
      if (izle && referans === null && bolumdekiAdim >= 3 && guncel !== null) referans = guncel;
    },
    olcum(derece, zamanMs) {
      // Titremeyi azaltmak için yumuşatma (açısal, 0/360 sınırında doğru çalışır)
      guncel = guncel === null ? derece : (guncel + aciFarki(derece, guncel) * 0.3 + 360) % 360;
      if (!izle || referans === null || uyarildi) return false;
      const yuruyor = zamanMs - sonAdim <= yuruyusAraligiMs;
      if (!yuruyor || Math.abs(aciFarki(guncel, referans)) <= esikDerece) {
        sapmaBasi = null;
        return false;
      }
      sapmaBasi ??= zamanMs;
      if (zamanMs - sapmaBasi < sureMs) return false;
      uyarildi = true;
      return true;
    },
  };
}
