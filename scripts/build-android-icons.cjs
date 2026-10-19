/**
 * Builds the Android launcher icons and splash from the title key art
 * (public/assets/ui/home.png): its painted "Surge RPG" sign, centred on the art's sky.
 * Writes straight into android/app/src/main/res (mipmaps, adaptive icon XML, the
 * background colour and one portrait splash, since the activity is portrait-locked).
 *
 * Usage: npm run build:android-icons
 */
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ART = path.join(ROOT, 'public/assets/ui/home.png');
const RES = path.join(ROOT, 'android/app/src/main/res');

// The sign in home.png (941x1672): its box, in source pixels.
const LOGO = { x: 118, y: 82, w: 506, h: 392 };
// Launcher densities: legacy icon is 48dp, adaptive layers are 108dp.
const DENSITIES = { ldpi: 0.75, mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const SPLASH = { w: 1080, h: 1920 };

/**
 * Runs in the page. Draws the art over its own sky colour (sampled at the top edge) and
 * returns { png, sky }. `fill` > 0: the sign spans that fraction of the width, centred;
 * `fill` 0: the whole art at full height (cover). `round`: clipped to a circle.
 */
function render(artUrl, w, h, fill, logo, round, jpeg, feather) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      if (round) {
        g.beginPath();
        g.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
        g.clip();
      }
      const probe = document.createElement('canvas');
      probe.width = img.width;
      probe.height = 1;
      probe.getContext('2d').drawImage(img, 0, 0);
      const px = probe.getContext('2d').getImageData(Math.floor(img.width * 0.35), 0, 1, 1).data;
      const sky = '#' + [px[0], px[1], px[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
      g.fillStyle = sky;
      g.fillRect(0, 0, w, h);
      const s = fill ? (w * fill) / logo.w : Math.max(h / img.height, w / img.width);
      const cx = fill ? logo.x + logo.w / 2 : img.width / 2;
      const cy = fill ? logo.y + logo.h / 2 : img.height / 2;
      const dx = w / 2 - cx * s;
      const dy = h / 2 - cy * s;
      if (feather) {
        // only the sign, its surroundings faded out into the flat sky (an ellipse around it)
        const t = document.createElement('canvas');
        t.width = w;
        t.height = h;
        const tg = t.getContext('2d');
        tg.drawImage(img, dx, dy, img.width * s, img.height * s);
        tg.globalCompositeOperation = 'destination-in';
        tg.translate(w / 2, h / 2);
        tg.scale(1, logo.h / logo.w);
        const r = (logo.w * s) / 2;
        const grad = tg.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 1.0);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        tg.fillStyle = grad;
        tg.fillRect(-w, -h * 2, w * 2, h * 4);
        g.drawImage(t, 0, 0);
        resolve({ data: c.toDataURL('image/png'), sky });
        return;
      }
      // past the art's edges, stretch its outermost row/column so no seam shows
      if (dy > 0) g.drawImage(img, 0, 0, img.width, 1, dx, 0, img.width * s, dy + 1);
      if (dx > 0) g.drawImage(img, 0, 0, 1, img.height, 0, Math.max(dy, 0), dx + 1, img.height * s);
      g.drawImage(img, dx, dy, img.width * s, img.height * s);
      resolve({ data: c.toDataURL(jpeg ? 'image/jpeg' : 'image/png', 0.88), sky });
    };
    img.src = artUrl;
  });
}

let artUrl = null;

async function draw(win, w, h, fill, { round = false, jpeg = false, feather = false } = {}) {
  const args = [artUrl, w, h, fill, LOGO, round, jpeg, feather].map((a) => JSON.stringify(a)).join(', ');
  const { data, sky } = await win.webContents.executeJavaScript(`(${render.toString()})(${args})`);
  return { buf: Buffer.from(data.split(',')[1], 'base64'), sky };
}

function write(rel, content) {
  const file = path.join(RES, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;

app.whenReady().then(async () => {
  artUrl = `data:image/png;base64,${fs.readFileSync(ART).toString('base64')}`;
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  let sky = null;
  for (const [name, k] of Object.entries(DENSITIES)) {
    const legacy = Math.round(48 * k);
    const layer = Math.round(108 * k);
    // Legacy icon (Android 7): shown nearly whole, so the sign is large.
    write(`mipmap-${name}/ic_launcher.png`, (await draw(win, legacy, legacy, 0.86)).buf);
    write(`mipmap-${name}/ic_launcher_round.png`, (await draw(win, legacy, legacy, 0.86, { round: true })).buf);
    // Adaptive foreground: masks keep only the centre ~66% (a circle on many launchers).
    const fg = await draw(win, layer, layer, 0.56);
    write(`mipmap-${name}/ic_launcher_foreground.png`, fg.buf);
    sky = fg.sky;
  }
  write('mipmap-anydpi-v26/ic_launcher.xml', adaptiveXml);
  write('mipmap-anydpi-v26/ic_launcher_round.xml', adaptiveXml);
  write(
    'values/ic_launcher_background.xml',
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${sky}</color>\n</resources>\n`,
  );

  // Android 12+ splash icon: 288dp, masked to its centre 192dp circle; the sign floats on the
  // flat sky (same colour as the splash background), so the mask edge never shows.
  write('drawable-nodpi/splash_icon.png', (await draw(win, 1152, 1152, 0.64, { feather: true })).buf);

  // Splash (pre-Android 12 and the window background): the title art, one portrait JPEG.
  for (const f of fs.readdirSync(RES)) {
    if (!f.startsWith('drawable')) continue;
    for (const ext of ['png', 'jpg']) fs.rmSync(path.join(RES, f, `splash.${ext}`), { force: true });
  }
  write('drawable/splash.jpg', (await draw(win, SPLASH.w, SPLASH.h, 0, { jpeg: true })).buf);
  app.quit();
});
