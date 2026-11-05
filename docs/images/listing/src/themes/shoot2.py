"""Render the theme cards used on the themes slide. Run `npm i` here first.
Writes ../img/t2-<name>.png. Needs: pip install playwright; playwright install chromium."""
import json, pathlib
from playwright.sync_api import sync_playwright
HERE = pathlib.Path(__file__).resolve().parent
with sync_playwright() as p:
    b = p.chromium.launch(args=["--allow-file-access-from-files"])
    pg = b.new_page(viewport={"width": 2400, "height": 1800})
    pg.goto((HERE / "themes2.html").as_uri())
    pg.wait_for_function("window.done===true", timeout=30000)
    for el in pg.query_selector_all("#out > div"):
        n = el.get_attribute("id")
        el.query_selector("svg").screenshot(path=str(HERE.parent / "img" / f"t2-{n}.png"))
        print(n)
    for n, cfg in pg.evaluate("window.CFGS").items():
        (HERE / "configs" / f"{n}.json").write_text(json.dumps(cfg, indent=2))
    b.close()
