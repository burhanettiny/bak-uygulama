import sys, pathlib
from playwright.sync_api import sync_playwright
KOK = pathlib.Path(sys.argv[1]); CIKTI = pathlib.Path(sys.argv[2])
BLOB = {"89aa05be43a4f00101891a4307039509": "logo.png", "dc023a2e53b74ffcf7bfa4918dddd1e4": "sihirbaz.png",
        "20e2069ef55c384a1b2beffd90072f22": "plan.png"}
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1920, "height": 1080})
    for f in sorted((KOK / "project" / "slides").glob("*.html")):
        h = f.read_text(encoding="utf-8")
        for k, v in BLOB.items():
            h = h.replace(f"/_blob/{k}", (KOK / v).as_uri())
        h = h.replace("<aside>", "<aside style='display:none'>")
        html = ("<!doctype html><html><head><meta charset='utf-8'><link rel='stylesheet' "
                "href='https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap'>"
                "<style>html,body{margin:0;width:1920px;height:1080px;overflow:hidden}section{box-sizing:border-box;"
                "width:1920px;height:1080px}p,h1,h2,h3{margin:0}</style></head><body>" + h + "</body></html>")
        t = CIKTI / (f.stem + ".html"); t.write_text(html, encoding="utf-8")
        pg.goto(t.as_uri(), wait_until="networkidle"); pg.wait_for_timeout(500)
        pg.screenshot(path=str(CIKTI / (f.stem + ".png")))
        print(f.stem)
    b.close()
