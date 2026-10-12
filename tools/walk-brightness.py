"""Mean brightness of fixed walk views, for comparing lighting before and after a change.

  uv run --with playwright --with pillow python tools/walk-brightness.py LAYOUT.json [--ref GIT_REF] [--shots DIR]

Loads a layout exported from the app (the owner's are in the Dropbox project folder, `issue/`)
into headless Chromium with software WebGL, stands at four places in the living room by night
and by day, and prints the mean brightness (0-255) of the lower half of each frame and of the
whole frame. `--ref` serves `dist/scene.js` from that commit instead of the working tree, so
the same layout can be measured against the code before a change; `--shots` also saves the
frames. Numbers from different machines are not comparable: compare two runs on one machine.

It starts `server.mjs` itself (port 4173 must be free) and reaches the scene by serving
`app.js` with `window.__scene` exposed; nothing in `dist/` is changed.
"""
import argparse, asyncio, glob, io, os, subprocess, time, urllib.request
from playwright.async_api import async_playwright
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'http://127.0.0.1:4173/'
# name: x, z, yaw, pitch. Living room: looking north, down at the floor, back south, across.
VIEWS = {'north': (1.65, 4.6, 0, -0.12), 'floor': (1.65, 3.6, 0, -0.95), 'south': (1.65, 1.2, 3.14159, -0.3), 'across': (1.2, 4.9, 0.5, -0.5)}
POSE = '''([night,x,z,yaw,pitch])=>{const s=window.__scene;if(s.mode!=='walk')s.setMode('walk');s.stopTour?.();s.night=!!night;s.lightsOn=true;
  s.camera.position.set(x,s.eye,z);s.walkYaw=yaw;s.walkPitch=pitch;s.updateLight();s.requestRender?.();}'''


def mean(img, box=None):
    if box:
        img = img.crop(box)
    px = list(img.convert('RGB').resize((160, 100)).getdata())
    return round(sum(.2126 * r + .7152 * g + .0722 * b for r, g, b in px) / len(px), 1)


async def measure(args):
    chrome = sorted(glob.glob(os.path.expanduser('~/.cache/ms-playwright/chromium-*/chrome-linux*/chrome')))[-1]
    old = subprocess.check_output(['git', '-C', ROOT, 'show', args.ref + ':dist/scene.js'], text=True) if args.ref else None
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=chrome, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))

        async def expose(route):
            response = await route.fetch()
            text = await response.text()
            assert 'scene=new SpaceScene(' in text, 'app.js no longer builds the scene this way'
            await route.fulfill(response=response, body=text.replace('scene=new SpaceScene(', 'window.__scene=scene=new SpaceScene(', 1))
        await page.route('**/app.js', expose)
        if old:
            async def served(route):
                await route.fulfill(status=200, content_type='text/javascript; charset=utf-8', body=old)
            await page.route('**/scene.js', served)
        await page.goto(URL)
        await page.wait_for_function('window.__scene')
        await page.set_input_files('#file', args.layout)
        await page.wait_for_timeout(2500)
        await page.add_style_tag(content='#workspace>*:not(#canvasHost){visibility:hidden!important}')
        if args.shots:
            os.makedirs(args.shots, exist_ok=True)
        for night in (1, 0):
            row = {}
            for name, (x, z, yaw, pitch) in VIEWS.items():
                await page.evaluate(POSE, [night, x, z, yaw, pitch])
                await page.wait_for_timeout(1500)
                png = await page.locator('#canvasHost canvas').screenshot()
                if args.shots:
                    open(os.path.join(args.shots, f"{'night' if night else 'day'}-{name}.png"), 'wb').write(png)
                img = Image.open(io.BytesIO(png))
                w, h = img.size
                row[name] = (mean(img, (0, h // 2, w, h)), mean(img))
            print('night' if night else 'day  ', ' '.join(f'{k} {a}/{b}' for k, (a, b) in row.items()))
        state = await page.evaluate("()=>{const s=window.__scene;return{items:s.items.length,lamps:s.lightObjects.filter(o=>o.point).length,painted:s.lightObjects.filter(o=>o.strip||o.cove).length,fill:+s.coveFill.intensity.toFixed(3)}}")
        print(state, 'errors', errors[:3])
        await browser.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('layout')
    parser.add_argument('--ref', help='measure dist/scene.js from this commit instead of the working tree')
    parser.add_argument('--shots', help='directory to save the frames in')
    args = parser.parse_args()
    args.layout = os.path.abspath(args.layout)
    server = subprocess.Popen(['node', 'server.mjs'], cwd=ROOT, stdout=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                urllib.request.urlopen(URL, timeout=1)
                break
            except OSError:
                time.sleep(.2)
        asyncio.run(measure(args))
    finally:
        server.terminate()


main()
