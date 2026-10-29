// Telefonun adım sensörü, telefon elde sallandığında ya da ekrana dokunurken de "adım" bildirebiliyor.
// Kullanıcı dururken bu sahte adımlar sayılırsa rehber "vardınız" der; görme engelli biri için tehlikeli.
// Bu filtre yalnızca gerçek yürüyüşü sayar:
//  - Yürüyüş başlamış sayılması için pencereMs içinde en az esik adım gelmeli; o adımların hepsi sayılır.
//  - Yürüyüş sürerken, bir öncekinden en fazla araMs sonra gelen her adım sayılır.
//  - Daha uzun bir duraklamada yürüyüş biter; yeniden esik adım beklenir.
// Zaman olarak sensörün kendi zaman damgası (ms) kullanılır: adımlar topluca iletilse de tempo doğru ölçülür.
export function yuruyusFiltresi(esik = 3, pencereMs = 3000, araMs = 2500): (zamanMs: number) => number {
  let bekleyen: number[] = [];
  let yuruyor = false;
  let sonAdim = -Infinity;

  return zamanMs => {
    if (yuruyor && zamanMs - sonAdim <= araMs) {
      sonAdim = zamanMs;
      return 1;
    }
    yuruyor = false;
    bekleyen = bekleyen.filter(t => zamanMs - t <= pencereMs);
    bekleyen.push(zamanMs);
    sonAdim = zamanMs;
    if (bekleyen.length < esik) return 0;
    const sayilacak = bekleyen.length;
    bekleyen = [];
    yuruyor = true;
    return sayilacak;
  };
}
