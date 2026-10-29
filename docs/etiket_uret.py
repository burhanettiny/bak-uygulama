"""Bir mekân düzeninden (mekan-deposu/mekanlar/<id>.json) internetsiz açılan, yazdırılabilir QR etiket sayfası üretir.

Kullanım:  python docs/etiket_uret.py mekan-deposu/mekanlar/gebze-b-tipi-3-1.json docs/ev-qr-etiketleri.html
Gerekli:   pip install qrcode

Girişe "BAK:MEKAN:<id>", diğer her noktaya "BAK:NOKTA:<id>:<nokta>" etiketi asılır. QR'lar SVG olarak
sayfaya gömülür; sayfa internet olmadan açılıp yazdırılabilir.
"""
import html
import io
import json
import sys

import qrcode
import qrcode.image.svg


def kat_adi(k):
    return 'Zemin kat' if k == 0 else 'Bodrum kat' if k == -1 else f'{k}. kat' if k > 0 else f'Eksi {-k}. kat'


def qr_svg(metin):
    resim = qrcode.make(metin, image_factory=qrcode.image.svg.SvgPathImage, box_size=10, border=2)
    tampon = io.BytesIO()
    resim.save(tampon)
    svg = tampon.getvalue().decode('utf-8')
    return svg[svg.index('<svg'):]  # XML bildirimi sayfanın içinde olmasın


def yer_tarifi(mekan, nokta):
    """Etiketin nereye yapıştırılacağı: kapı noktaları için kapı pervazı, diğerleri için duvar."""
    if nokta['id'] == mekan['giris']:
        return 'Giriş kapısının iç tarafına, kapı kolu yüksekliğine'
    if nokta['ad'].endswith('kapısı'):
        return 'Bu kapının pervazına, kapı kolunun olduğu tarafa, kapı kolu yüksekliğine'
    return 'Bu noktadaki duvara, kapı kolu yüksekliğine'


def main(duzen_yolu, cikti_yolu):
    with open(duzen_yolu, encoding='utf-8') as f:
        mekan = json.load(f)
    cok_katli = len({n.get('kat', 0) for n in mekan['noktalar']}) > 1
    hedefler = {}
    for h in mekan['hedefler']:
        hedefler.setdefault(h['nokta'], []).append(h['ad'])

    etiketler = []
    for n in mekan['noktalar']:
        # Ara noktalar (hol, koridor ayrımı) için etiket gerekmez; kapı ve hedef noktaları yeter
        if n['id'] != mekan['giris'] and n['id'] not in hedefler:
            continue
        giris = n['id'] == mekan['giris']
        kod = f"BAK:MEKAN:{mekan['id']}" if giris else f"BAK:NOKTA:{mekan['id']}:{n['id']}"
        ad = 'GİRİŞ' if giris else n['ad']
        if cok_katli and not giris:
            ad = f"{kat_adi(n.get('kat', 0))} — {ad}"
        etiketler.append(
            f'<div class="etiket{" giris" if giris else ""}">{qr_svg(kod)}'
            f'<div class="ad">{html.escape(ad)}</div>'
            f'<div class="yer">{html.escape(yer_tarifi(mekan, n))}</div>'
            f'<div class="kod">{html.escape(kod)}</div></div>')

    sayfa = f'''<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(mekan['ad'])} — QR Etiketleri</title>
<style>
  body {{ font-family: system-ui, sans-serif; margin: 24px; color: #111; background: #fff; }}
  h1 {{ font-size: 20px; margin: 0 0 4px; }}
  p {{ margin: 0 0 20px; color: #555; font-size: 14px; max-width: 760px; }}
  .izgara {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 16px; }}
  .etiket {{ border: 2px dashed #999; border-radius: 8px; padding: 14px; text-align: center; break-inside: avoid; }}
  .etiket svg {{ width: 170px; height: 170px; }}
  .ad {{ font-size: 18px; font-weight: bold; margin-top: 6px; }}
  .yer {{ font-size: 12px; color: #333; margin-top: 4px; }}
  .kod {{ font-family: monospace; font-size: 10px; color: #777; margin-top: 4px; word-break: break-all; }}
  .giris {{ border-color: #1e88e5; border-style: solid; }}
  @media print {{ p {{ display: none; }} body {{ margin: 8mm; }} }}
</style>
</head>
<body>
<h1>{html.escape(mekan['ad'])} — QR Etiketleri (sürüm {mekan['surum']})</h1>
<p>Etiketleri kesip her birinin altında yazan yere yapıştırın. Hepsini aynı yüksekliğe koyun ki
   elle kolayca bulunsun; mümkünse kenarına kabartma bir bant ya da yapışkanlı keçe ekleyin.
   Mavi çerçeveli GİRİŞ etiketi daireye girince okutulur. Yazdırmak için Ctrl+P.</p>
<div class="izgara">
{chr(10).join(etiketler)}
</div>
</body>
</html>
'''
    with open(cikti_yolu, 'w', encoding='utf-8') as f:
        f.write(sayfa)
    print(f'{cikti_yolu}: {len(etiketler)} etiket')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit('Kullanım: python docs/etiket_uret.py <düzen.json> <çıktı.html>')
    main(sys.argv[1], sys.argv[2])
