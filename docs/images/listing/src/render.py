"""Render the listing slides to PNG.

Usage: python3 render.py   (needs: pip install playwright pillow; playwright install chromium)
Writes ../NN-name.png (1200x800, the community-directory size) and ../2x/NN-name@2x.png (2400x1600),
../mobile/mN-name.png (900x1600), and ../../reddit/NN-name.png (1280x800: the same slides on a wider frame).
"""
import pathlib
from playwright.sync_api import sync_playwright
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent
SLIDES = [
    ("s1", "01-hero"), ("s2", "02-track-anything"), ("s3", "03-trip-map"),
    ("s4", "04-themes"), ("s4b", "04b-themes-dark-front"), ("s5", "05-per-note-data"),
    ("s6", "06-big-numbers"), ("s7", "07-if-vega-can-draw-it"), ("s8", "08-redlining"),
    ("s9", "09-charting-with-ai"),
]
MOBILE = [("m1", "m1-trip-map"), ("m2", "m2-big-numbers"), ("m3", "m3-redlining"),
          ("m4", "m4-hero"), ("m5", "m5-track-anything"), ("m6", "m6-themes"), ("m6b", "m6b-themes-dark-front"),
          ("m7", "m7-per-note-data"), ("m8", "m8-if-vega-can-draw-it"), ("m9", "m9-charting-with-ai")]
# Reddit post: same slides, 1280 wide, content shifted to stay centred.
WIDE = [("s2", "02-options"), ("s3", "03-travels"), ("s8", "04-argument"), ("s5", "05-horizonts"),
        ("s7", "05-if-vega"), ("s6", "05-numbers"), ("s4", "07-themes"), ("s9", "08-ai")]
(OUT / "2x").mkdir(exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1200, "height": 800}, device_scale_factor=2)
    page.goto((HERE / "slides.html").as_uri())
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(600)
    for sid, name in SLIDES:
        big = OUT / "2x" / f"{name}@2x.png"
        page.locator("#" + sid).screenshot(path=str(big))
        Image.open(big).resize((1200, 800), Image.LANCZOS).save(OUT / f"{name}.png", optimize=True)
        print(name)
    # mobile listing: 900x1600
    (OUT / "mobile" / "2x").mkdir(parents=True, exist_ok=True)
    for sid, name in MOBILE:
        big = OUT / "mobile" / "2x" / f"{name}@2x.png"
        page.locator("#" + sid).screenshot(path=str(big))
        Image.open(big).resize((900, 1600), Image.LANCZOS).save(OUT / "mobile" / f"{name}.png", optimize=True)
        print("mobile/" + name)
    # reddit: 1280x800
    reddit = OUT.parent / "reddit"
    (reddit / "2x").mkdir(parents=True, exist_ok=True)
    page.add_style_tag(content=".s{width:1280px}.s>*{translate:40px 0}")
    page.set_viewport_size({"width": 1280, "height": 800})
    for sid, name in WIDE:
        big = reddit / "2x" / f"{name}@2x.png"
        page.locator("#" + sid).screenshot(path=str(big))
        Image.open(big).resize((1280, 800), Image.LANCZOS).save(reddit / f"{name}.png", optimize=True)
        print("reddit/" + name)
    browser.close()
