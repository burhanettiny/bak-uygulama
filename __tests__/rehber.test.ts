import {Rehber, adimAtildi, devamEt, rehberBaslangicMetni, rehberDurumMetni, rehberKisaDurum, rehberOlustur} from '../src/mekan/rehber';
import {rotaParcalari, rotaTarifi, turOzeti, listeRotasi, varisIsle} from '../src/mekan/yerlesim';
import {mekanGetir} from '../src/mekan/mekanlar';
import {Mekan} from '../src/tipler';

const hastane = mekanGetir('ornek-hastane') as Mekan;
const market = mekanGetir('ornek-market') as Mekan;
const kardiyoloji = hastane.hedefler.find(h => h.ad === 'Kardiyoloji Polikliniği')!;

function rehberKur(baslangic = 'giris'): Rehber {
  const rota = rotaParcalari(hastane, baslangic, kardiyoloji.nokta)!;
  return rehberOlustur(kardiyoloji, rota.parcalar);
}

// n adım at, söylenenleri sırayla topla
function yuru(r: Rehber, n: number, carpan = 1): {rehber: Rehber; soylenenler: string[]} {
  const soylenenler: string[] = [];
  for (let i = 0; i < n; i++) {
    const s = adimAtildi(r, carpan);
    r = s.rehber;
    if (s.soylenecek) soylenenler.push(s.soylenecek);
  }
  return {rehber: r, soylenenler};
}

describe('rota parçaları', () => {
  test('hastanede giriş → kardiyoloji: yürüme, merdiven, yürüme', () => {
    const {parcalar} = rotaParcalari(hastane, 'giris', 'kardiyoloji')!;
    expect(parcalar.map(p => [p.adim, p.dikey])).toEqual([[10, false], [5, false], [30, true], [4, false], [10, false]]);
    expect(parcalar[2].varisAdi).toBe('1. kat, Merdiven başı');
  });

  test('tam tarif parçalardan üretilir (adım rehberi kapalıyken değişmedi)', () => {
    const {parcalar} = rotaParcalari(market, 'giris', 'k3')!;
    expect(parcalar).toHaveLength(2);           // aynı yöndeki ön koridor adımları birleşti
    expect(parcalar[1].adim).toBe(12);
    expect(rotaTarifi(market, 'giris', market.hedefler[2])).toMatch(/^Süt Ürünleri için: Girişten düz ilerleyin, yaklaşık 8 adım/);
  });

  test('yol yoksa null', () => {
    expect(rotaParcalari({...hastane, baglantilar: []}, 'giris', 'kardiyoloji')).toBeNull();
  });
});

describe('adım adım rehber', () => {
  test('başlangıçta yalnızca ilk talimat söylenir', () => {
    expect(rehberBaslangicMetni(rehberKur())).toBe(
      'Kardiyoloji Polikliniği için adım adım yönlendiriyorum. Girişten düz ilerleyin, yaklaşık 10 adım. Zemin kat, Danışma noktasına ulaşacaksınız.');
  });

  test('10 adımlık bölümde 5 adım kala uyarılır, sonunda sıradaki talimat söylenir', () => {
    const {rehber, soylenenler} = yuru(rehberKur(), 10);
    expect(soylenenler).toEqual([
      '5 adım kaldı.',
      'Yaklaşık olarak zemin kat, Danışma noktasına geldiniz. Şimdi: Danışmanın hemen sağındaki merdivene yönelin, yaklaşık 5 adım. Zemin kat, Merdiven başı noktasına ulaşacaksınız.',
    ]);
    expect(rehber.sira).toBe(1);
    expect(rehber.sayac).toBe(0);
  });

  test('kısa bölümde (10 adımdan az) "5 adım kaldı" denmez', () => {
    const {soylenenler} = yuru(yuru(rehberKur(), 10).rehber, 5);
    expect(soylenenler).toHaveLength(1);
    expect(soylenenler[0]).toMatch(/^Yaklaşık olarak zemin kat, Merdiven başı noktasına geldiniz\. Şimdi: Dikkat, merdiven\. .* Bitince devam deyin ya da oradaki QR kodunu okutun\.$/);
  });

  test('merdivende adım sayılmaz, "devam" ile sonraki bölüme geçilir', () => {
    const merdivende = yuru(rehberKur(), 15).rehber;
    expect(merdivende.parcalar[merdivende.sira].dikey).toBe(true);
    const bekle = yuru(merdivende, 40);
    expect(bekle.soylenenler).toEqual([]);
    expect(bekle.rehber.sira).toBe(merdivende.sira);

    const {rehber, soylenecek} = devamEt(merdivende);
    expect(soylenecek).toBe('Şimdi: Merdivenden çıkınca sağa dönün, yaklaşık 4 adım. 1. kat, Poliklinikler koridoru noktasına ulaşacaksınız.');
    expect(rehber!.sira).toBe(3);
  });

  test('son bölümün sonunda hedef tarifi söylenir, fazla yürüyünce uyarılır', () => {
    let r = devamEt(yuru(rehberKur(), 15).rehber).rehber!;
    r = yuru(r, 4).rehber;                       // koridora gelindi
    const son = yuru(r, 10);
    expect(son.soylenenler).toEqual(['5 adım kaldı.', 'Yaklaşık olarak vardınız. Kardiyoloji kapısı solunuzda, oda 112.']);
    const fazla = yuru(son.rehber, 3);
    expect(fazla.soylenenler).toEqual([expect.stringMatching(/^Beklenenden fazla yürüdünüz/)]);
    expect(yuru(fazla.rehber, 10).soylenenler).toEqual([]);   // uyarı bir kez yapılır
  });

  test('son bölümde "devam" hedefe varıldı demektir', () => {
    let r = rehberKur('k1-koridor');
    expect(r.parcalar).toHaveLength(1);
    const sonuc = devamEt(r);
    expect(sonuc.rehber).toBeNull();
    expect(sonuc.soylenecek).toBe('Hedefinize ulaştınız. Kardiyoloji kapısı solunuzda, oda 112.');
  });

  test('adım uzunluğu çarpanı: kısa adımlı kullanıcı için adımlar artar', () => {
    const {soylenenler} = yuru(rehberKur(), 13, 1.3);    // 10 standart adım ≈ 13 kısa adım
    expect(soylenenler).toEqual(['5 adım kaldı.', expect.stringMatching(/^Yaklaşık olarak zemin kat, Danışma/)]);
  });

  test('durum metinleri', () => {
    const r = yuru(rehberKur(), 3).rehber;
    expect(rehberDurumMetni(r)).toBe(
      'Kardiyoloji Polikliniği yolundasınız. Girişten düz ilerleyin, yaklaşık 10 adım. Zemin kat, Danışma noktasına ulaşacaksınız. Bu bölümde yaklaşık 7 adım kaldı.');
    expect(rehberKisaDurum(r)).toBe('👣 ~7 adım');
    const merdivende = yuru(rehberKur(), 15).rehber;
    expect(rehberKisaDurum(merdivende)).toBe('⏸ Bitince "devam" deyin');
  });
});

describe('tur ve varışta tarif edici', () => {
  test('rehber açıkken sonraki durak için yalnızca ilk talimat söylenir', () => {
    const tarifEt = (b: string, h: {ad: string}) => `[rehber: ${h.ad}, ${b}]`;
    const {duraklar} = listeRotasi(market, 'giris', ['domates', 'süt']);
    expect(varisIsle(market, 'k1', duraklar, [], tarifEt)!.metin).toMatch(/Sonraki durak\. \[rehber: Süt Ürünleri, k1\]$/);
    expect(turOzeti(market, 'giris', {duraklar, bulunamayanlar: []}, [], tarifEt)).toMatch(/İlk durak\. \[rehber: Meyve Sebze, giris\]$/);
  });
});
