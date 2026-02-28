import * as THREE from "three";

/* ─── Seeded PRNG (LCG) ───────────────────────────────────────────────── */
function rng(seed) {
  let s = (seed | 0) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return { c, x: c.getContext("2d") };
}

/* ─── Smooth 2-D value noise (bilinear, tiling) ─────────────────────── */
function makeNoise(r, gw, gh) {
  const g = new Float32Array(gw * gh);
  for (let i = 0; i < g.length; i++) g[i] = r();
  const sm = t => t * t * (3 - 2 * t);
  return (u, v) => {
    const uu = ((u % 1) + 1) % 1, vv = ((v % 1) + 1) % 1;
    const gx = uu * gw, gy = vv * gh;
    const x0 = Math.floor(gx) % gw, y0 = Math.floor(gy) % gh;
    const x1 = (x0 + 1) % gw,       y1 = (y0 + 1) % gh;
    const fx = sm(gx - Math.floor(gx)), fy = sm(gy - Math.floor(gy));
    return g[y0*gw+x0]*(1-fx)*(1-fy) + g[y0*gw+x1]*fx*(1-fy)
         + g[y1*gw+x0]*(1-fx)*fy     + g[y1*gw+x1]*fx*fy;
  };
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */
const lerp  = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const cri   = v => clamp(Math.round(v), 0, 255);

function polarCap(x, w, h, frac, top = true, rv = 228, gv = 244, bv = 255) {
  const col = `rgba(${rv},${gv},${bv},`;
  if (top) {
    const gd = x.createLinearGradient(0, 0, 0, h * frac);
    gd.addColorStop(0, col + "1)"); gd.addColorStop(1, col + "0)");
    x.fillStyle = gd; x.fillRect(0, 0, w, h * frac);
  } else {
    const gd = x.createLinearGradient(0, h * (1 - frac), 0, h);
    gd.addColorStop(0, col + "0)"); gd.addColorStop(1, col + "0.95)");
    x.fillStyle = gd; x.fillRect(0, h * (1 - frac), w, h * frac);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   SUN — photosphere granulation, sunspot pairs, limb darkening
══════════════════════════════════════════════════════════════════════════ */
function makeSun() {
  const { c, x } = makeCanvas(2048, 1024);
  const w = c.width, h = c.height;
  const r = rng(777);

  const n1 = makeNoise(r, 90, 45);
  const n2 = makeNoise(r, 180, 90);
  const n3 = makeNoise(r, 360, 180);

  const img = x.createImageData(w, h);
  const d   = img.data;

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const u = px / w, v = py / h;
      const i = (py * w + px) * 4;

      // Multi-octave granulation noise
      const gran =
        (n1(u, v)       - 0.5) * 0.54 +
        (n2(u*2, v*2)   - 0.5) * 0.30 +
        (n3(u*3.5, v*3.5) - 0.5) * 0.16;
      const t = clamp(gran + 0.5, 0, 1);

      // bright granule center → deep intergranular lane
      d[i]   = cri(lerp(195, 255, t));   // R
      d[i+1] = cri(lerp(68,  248, t));   // G
      d[i+2] = cri(lerp(0,   160, t));   // B
      d[i+3] = 255;
    }
  }
  x.putImageData(img, 0, 0);

  // Limb darkening — orange-red vignette at edges
  const ld = x.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h) * 0.52);
  ld.addColorStop(0,   "rgba(255,200,50,0.0)");
  ld.addColorStop(0.55, "rgba(230,100,0,0.12)");
  ld.addColorStop(0.82, "rgba(180,55,0,0.38)");
  ld.addColorStop(1,   "rgba(60,10,0,0.75)");
  x.fillStyle = ld; x.fillRect(0, 0, w, h);

  // Plasma filaments (bright streaks)
  for (let i = 0; i < 60; i++) {
    const cx = r() * w, cy = r() * h;
    x.save(); x.translate(cx, cy); x.rotate(r() * Math.PI);
    x.beginPath(); x.ellipse(0, 0, r()*90+15, r()*6+1, 0, 0, Math.PI*2);
    x.fillStyle = `rgba(255,230,110,${r()*0.28+0.04})`;
    x.fill(); x.restore();
  }

  // Sunspot pairs with umbra + penumbra + faculae
  for (let i = 0; i < 9; i++) {
    const spx = w * 0.10 + r() * w * 0.80;
    const spy = h * 0.18 + r() * h * 0.64;
    const rad = r() * 24 + 10;

    for (let s = 0; s < 2; s++) {
      const sx = spx + (s === 0 ? -rad * 2.0 : rad * 2.0);
      const sy = spy + (r() - 0.5) * rad;

      // Faculae (bright halo)
      const fg = x.createRadialGradient(sx, sy, 0, sx, sy, rad * 4.5);
      fg.addColorStop(0.3, "rgba(255,255,190,0.0)");
      fg.addColorStop(0.55, "rgba(255,250,160,0.35)");
      fg.addColorStop(1,   "rgba(0,0,0,0)");
      x.fillStyle = fg; x.beginPath(); x.arc(sx, sy, rad*4.5, 0, Math.PI*2); x.fill();

      // Penumbra (dark brown halo)
      const pg = x.createRadialGradient(sx, sy, rad*0.35, sx, sy, rad);
      pg.addColorStop(0, "rgba(110,38,0,0.88)");
      pg.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = pg; x.beginPath(); x.arc(sx, sy, rad, 0, Math.PI*2); x.fill();

      // Umbra (near-black core)
      const ug = x.createRadialGradient(sx, sy, 0, sx, sy, rad * 0.42);
      ug.addColorStop(0, "rgba(4,1,0,0.98)");
      ug.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = ug; x.beginPath(); x.arc(sx, sy, rad*0.42, 0, Math.PI*2); x.fill();
    }
  }

  return new THREE.CanvasTexture(c);
}

/* ══════════════════════════════════════════════════════════════════════════
   MERCURY — brownish grey, heavy cratering, ejecta rays, large basins
══════════════════════════════════════════════════════════════════════════ */
function makeMercury() {
  const { c, x } = makeCanvas(2048, 1024);
  const w = c.width, h = c.height;
  const r = rng(42);

  const n1 = makeNoise(r, 64, 32);
  const n2 = makeNoise(r, 128, 64);
  const n3 = makeNoise(r, 256, 128);

  const img = x.createImageData(w, h);
  const d   = img.data;

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const u = px/w, v = py/h;
      const i = (py*w+px)*4;
      const n = clamp(
        (n1(u, v)-0.5)*0.5 + (n2(u*2,v*2)-0.5)*0.32 + (n3(u*4,v*4)-0.5)*0.18,
        -0.5, 0.5
      ) + 0.5; // 0..1

      // Base: dark brownish grey — highlands lighter, plains darker
      d[i]   = cri(lerp(95,  175, n));
      d[i+1] = cri(lerp(88,  162, n));
      d[i+2] = cri(lerp(78,  148, n));
      d[i+3] = 255;
    }
  }
  x.putImageData(img, 0, 0);

  // Caloris Basin — large flat bright plain
  const cbg = x.createRadialGradient(w*0.21, h*0.46, 0, w*0.21, h*0.46, 175);
  cbg.addColorStop(0,   "rgba(210,200,185,0.72)");
  cbg.addColorStop(0.55, "rgba(185,175,162,0.42)");
  cbg.addColorStop(1,   "rgba(0,0,0,0)");
  x.fillStyle = cbg;
  x.beginPath(); x.ellipse(w*0.21, h*0.46, 175, 140, 0.15, 0, Math.PI*2); x.fill();

  // Large impact basins (dark)
  for (let i = 0; i < 10; i++) {
    const cx = r()*w, cy = r()*h, rad = r()*90+35;
    const bg = x.createRadialGradient(cx,cy,0,cx,cy,rad);
    bg.addColorStop(0,   "rgba(45,38,32,0.65)");
    bg.addColorStop(0.65, "rgba(70,62,55,0.35)");
    bg.addColorStop(1,   "rgba(0,0,0,0)");
    x.fillStyle = bg; x.beginPath(); x.arc(cx,cy,rad,0,Math.PI*2); x.fill();
  }

  // Craters with ejecta rays
  for (let i = 0; i < 240; i++) {
    const cx = r()*w, cy = r()*h;
    const rad = r()*22+2;
    const large = rad > 12;

    // Ejecta rays for larger craters
    if (large && r() > 0.35) {
      const numRays = Math.floor(r()*8)+5;
      for (let ri = 0; ri < numRays; ri++) {
        const angle = (ri/numRays)*Math.PI*2 + r()*0.3;
        const rayLen = rad * (r()*4+2.5);
        x.save(); x.translate(cx,cy); x.rotate(angle);
        x.beginPath(); x.moveTo(rad*0.8, 0); x.lineTo(rayLen, r()*rad*0.5-rad*0.25);
        x.strokeStyle = `rgba(215,208,198,${r()*0.35+0.08})`;
        x.lineWidth = r()*3+0.5; x.lineCap = "round"; x.stroke(); x.restore();
      }
    }

    // Bright rim
    const rim = x.createRadialGradient(cx-rad*0.15, cy-rad*0.15, 0, cx, cy, rad);
    rim.addColorStop(0,    "rgba(225,218,208,0.72)");
    rim.addColorStop(0.72, "rgba(168,160,150,0)");
    x.fillStyle = rim; x.beginPath(); x.arc(cx,cy,rad,0,Math.PI*2); x.fill();

    // Dark floor
    const floor = x.createRadialGradient(cx,cy,0,cx,cy,rad*0.72);
    floor.addColorStop(0, "rgba(40,32,28,0.82)");
    floor.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = floor; x.beginPath(); x.arc(cx,cy,rad*0.72,0,Math.PI*2); x.fill();

    // Central peak (larger craters only)
    if (rad > 16) {
      const pk = x.createRadialGradient(cx,cy,0,cx,cy,rad*0.09);
      pk.addColorStop(0, "rgba(210,205,195,0.75)");
      pk.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = pk; x.beginPath(); x.arc(cx,cy,rad*0.09,0,Math.PI*2); x.fill();
    }
  }

  return new THREE.CanvasTexture(c);
}

/* ══════════════════════════════════════════════════════════════════════════
   VENUS — vivid amber cloud deck, UV dark patterns, horizontal bands
══════════════════════════════════════════════════════════════════════════ */
function makeVenus() {
  const { c, x } = makeCanvas(2048, 1024);
  const w = c.width, h = c.height;
  const r = rng(7);

  const n1 = makeNoise(r, 48, 24);
  const n2 = makeNoise(r, 96, 48);
  const n3 = makeNoise(r, 192, 96);

  const img = x.createImageData(w, h);
  const d   = img.data;

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const u = px/w, v = py/h;
      const i = (py*w+px)*4;

      const nv = (n1(u,v)-0.5)*0.55 + (n2(u*2.5,v*2.5)-0.5)*0.30 + (n3(u*5,v*5)-0.5)*0.15;
      // latitude banding (subtle wave)
      const band = Math.sin(v*Math.PI*12)*0.15 + Math.sin(v*Math.PI*5)*0.10;

      const t = clamp(nv + band + 0.5, 0, 1);
      d[i]   = cri(lerp(178, 252, t));   // warm amber  R
      d[i+1] = cri(lerp(118, 195, t));   // G
      d[i+2] = cri(lerp(28,  88,  t));   // B
      d[i+3] = 255;
    }
  }
  x.putImageData(img, 0, 0);

  // UV-dark horizontal absorption bands
  const DARK = [[0.13,0.035],[0.25,0.030],[0.38,0.045],[0.51,0.035],[0.63,0.040],[0.76,0.032]];
  DARK.forEach(([vy, bh]) => {
    const g = x.createLinearGradient(0, vy*h, 0, (vy+bh)*h);
    g.addColorStop(0, "rgba(80,45,0,0)");
    g.addColorStop(0.4, "rgba(80,45,0,0.5)");
    g.addColorStop(0.6, "rgba(80,45,0,0.5)");
    g.addColorStop(1, "rgba(80,45,0,0)");
    x.fillStyle = g; x.fillRect(0, vy*h, w, bh*h + 1);
  });

  // UV Y-feature (characteristic dark arc across equator)
  x.save();
  x.beginPath();
  x.moveTo(w*0.12, h*0.49);
  x.bezierCurveTo(w*0.28, h*0.54, w*0.72, h*0.46, w*0.88, h*0.51);
  x.lineWidth = h * 0.07;
  x.strokeStyle = "rgba(72,38,0,0.42)";
  x.lineCap = "round"; x.stroke();
  x.restore();

  // Bright cloud wisps
  for (let i = 0; i < 140; i++) {
    const cx = r()*w, cy = r()*h;
    x.save(); x.translate(cx,cy); x.rotate(r()*0.55-0.28);
    x.beginPath(); x.ellipse(0, 0, r()*110+25, r()*13+3, 0, 0, Math.PI*2);
    x.fillStyle = `rgba(255,238,155,${r()*0.28+0.04})`;
    x.fill(); x.restore();
  }
  // Dark cloud swirls
  for (let i = 0; i < 45; i++) {
    const cx = r()*w, cy = r()*h;
    x.save(); x.translate(cx,cy); x.rotate(r()*Math.PI);
    x.beginPath(); x.ellipse(0, 0, r()*160+40, r()*22+5, 0, 0, Math.PI*2);
    x.fillStyle = `rgba(95,52,0,${r()*0.24+0.04})`;
    x.fill(); x.restore();
  }

  return new THREE.CanvasTexture(c);
}

/* ══════════════════════════════════════════════════════════════════════════
   EARTH — deep ocean, recognisable continents, biome colours, clouds
══════════════════════════════════════════════════════════════════════════ */
function makeEarth() {
  const { c, x } = makeCanvas(2048, 1024);
  const w = c.width, h = c.height;
  const r = rng(123);

  const n1 = makeNoise(r, 64,  32);
  const n2 = makeNoise(r, 128, 64);
  const n3 = makeNoise(r, 256, 128);

  // --- Ocean base (ImageData) ---
  const img = x.createImageData(w, h);
  const d   = img.data;

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const u = px/w, v = py/h;
      const i = (py*w+px)*4;
      const n = clamp(
        (n1(u,v)-0.5)*0.52 + (n2(u*2,v*2)-0.5)*0.32 + (n3(u*4,v*4)-0.5)*0.16,
        -0.5, 0.5
      ) + 0.5;
      // Ocean depth variation: deep indigo → mid blue
      d[i]   = cri(lerp(6,   40, n));
      d[i+1] = cri(lerp(32, 108, n));
      d[i+2] = cri(lerp(88, 188, n));
      d[i+3] = 255;
    }
  }
  x.putImageData(img, 0, 0);

  // Helper: draw continent with gradient fill
  const land = (pts, col1, col2) => {
    x.beginPath();
    x.moveTo(pts[0][0]*w, pts[0][1]*h);
    for (let k = 1; k < pts.length; k++) {
      const [ax,ay] = pts[k-1], [bx,by] = pts[k];
      x.quadraticCurveTo(ax*w, ay*h, (ax+bx)*0.5*w, (ay+by)*0.5*h);
    }
    x.closePath();
    const cx0 = pts[0][0]*w, cy0 = pts[0][1]*h;
    const lg = x.createRadialGradient(cx0,cy0,0,cx0,cy0,380);
    lg.addColorStop(0, col1); lg.addColorStop(0.5, col2||col1); lg.addColorStop(1, col1);
    x.fillStyle = lg; x.fill();
    x.strokeStyle = "rgba(4,42,110,0.38)"; x.lineWidth = 2.5; x.stroke();
  };

  // North America
  land([
    [0.04,0.16],[0.09,0.12],[0.15,0.13],[0.18,0.20],[0.20,0.30],
    [0.20,0.44],[0.16,0.52],[0.12,0.54],[0.08,0.52],[0.05,0.46],[0.04,0.34]
  ], "#3a7530", "#8a7040");

  // Greenland
  land([
    [0.22,0.08],[0.29,0.06],[0.32,0.13],[0.29,0.22],[0.23,0.22],[0.21,0.15]
  ], "#c8e4f0", "#90c8dc");

  // South America
  land([
    [0.14,0.52],[0.20,0.49],[0.24,0.54],[0.26,0.63],
    [0.24,0.74],[0.20,0.83],[0.16,0.84],[0.12,0.78],[0.11,0.68],[0.12,0.58]
  ], "#2c7020", "#c8a050");

  // Saharan / North Africa + Europe
  land([
    [0.44,0.22],[0.52,0.19],[0.57,0.22],[0.58,0.30],[0.56,0.37],
    [0.58,0.44],[0.60,0.56],[0.57,0.68],[0.52,0.74],[0.48,0.75],
    [0.45,0.70],[0.43,0.58],[0.44,0.44],[0.42,0.38],[0.44,0.30]
  ], "#8a7038", "#3a7228");

  // Sahara desert highlight
  const sah = x.createRadialGradient(w*0.52,h*0.43,0,w*0.52,h*0.43,140);
  sah.addColorStop(0, "rgba(200,162,78,0.72)");
  sah.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = sah; x.beginPath(); x.ellipse(w*0.52,h*0.43,140,72,0,0,Math.PI*2); x.fill();

  // Asia
  land([
    [0.55,0.17],[0.64,0.14],[0.72,0.13],[0.80,0.17],[0.84,0.24],
    [0.86,0.35],[0.82,0.42],[0.74,0.46],[0.65,0.48],[0.57,0.42],
    [0.55,0.32]
  ], "#5a8040", "#9a8848");

  // Indian subcontinent
  land([
    [0.64,0.44],[0.69,0.42],[0.72,0.47],[0.72,0.59],[0.69,0.63],
    [0.65,0.62],[0.63,0.55],[0.63,0.48]
  ], "#7a8038", "#c0a050");

  // Central Asian / Gobi desert
  const gobi = x.createRadialGradient(w*0.72,h*0.28,0,w*0.72,h*0.28,90);
  gobi.addColorStop(0, "rgba(190,155,70,0.55)");
  gobi.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = gobi; x.beginPath(); x.ellipse(w*0.72,h*0.28,90,55,0.3,0,Math.PI*2); x.fill();

  // Australia
  land([
    [0.74,0.60],[0.80,0.57],[0.86,0.60],[0.87,0.67],[0.84,0.73],
    [0.80,0.76],[0.74,0.73],[0.72,0.66]
  ], "#c8901a", "#a06018");

  // Antarctica
  const ant = x.createLinearGradient(0, h*0.86, 0, h);
  ant.addColorStop(0, "rgba(218,238,255,0)");
  ant.addColorStop(0.3, "rgba(218,238,255,0.92)");
  ant.addColorStop(1, "rgba(232,248,255,1)");
  x.fillStyle = ant; x.fillRect(0, h*0.86, w, h*0.14);

  // Arctic ice cap
  polarCap(x, w, h, 0.10, true, 225, 242, 255);

  // Cloud layer
  for (let i = 0; i < 180; i++) {
    const cx = r()*w, cy = r()*h;
    x.save(); x.translate(cx,cy); x.rotate(r()*0.8-0.4);
    x.beginPath(); x.ellipse(0, 0, r()*130+28, r()*20+5, 0, 0, Math.PI*2);
    x.fillStyle = `rgba(255,255,255,${r()*0.48+0.10})`;
    x.fill(); x.restore();
  }

  return new THREE.CanvasTexture(c);
}

/* ══════════════════════════════════════════════════════════════════════════
   MARS — iron-oxide red, canyon, Syrtis Major, polar ice
══════════════════════════════════════════════════════════════════════════ */
function makeMars() {
  const { c, x } = makeCanvas(2048, 1024);
  const w = c.width, h = c.height;
  const r = rng(999);

  const n1 = makeNoise(r, 64,  32);
  const n2 = makeNoise(r, 128, 64);
  const n3 = makeNoise(r, 256, 128);

  const img = x.createImageData(w, h);
  const d   = img.data;

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const u = px/w, v = py/h;
      const i = (py*w+px)*4;
      const n = clamp(
        (n1(u,v)-0.5)*0.50 + (n2(u*2,v*2)-0.5)*0.32 + (n3(u*4,v*4)-0.5)*0.18,
        -0.5, 0.5
      ) + 0.5;
      // Northern lowlands (v<0.42) slightly darker/bluer-red; south highlands lighter
      const hemi = clamp((v - 0.42) * 3, 0, 1);
      d[i]   = cri(lerp(lerp(128, 200, n), lerp(105, 175, n), hemi));
      d[i+1] = cri(lerp(lerp(48,  72,  n), lerp(38,  60,  n), hemi));
      d[i+2] = cri(lerp(lerp(12,  18,  n), lerp(8,   15,  n), hemi));
      d[i+3] = 255;
    }
  }
  x.putImageData(img, 0, 0);

  // Tharsis bulge (lighter volcanic plateau)
  const tharsis = x.createRadialGradient(w*0.27,h*0.42,0,w*0.27,h*0.42,230);
  tharsis.addColorStop(0,   "rgba(215,100,48,0.52)");
  tharsis.addColorStop(0.5, "rgba(200,88,40,0.28)");
  tharsis.addColorStop(1,   "rgba(0,0,0,0)");
  x.fillStyle = tharsis; x.beginPath(); x.ellipse(w*0.27,h*0.42,230,165,0,0,Math.PI*2); x.fill();

  // Olympus Mons (bright volcanic summit)
  const olym = x.createRadialGradient(w*0.21,h*0.37,0,w*0.21,h*0.37,62);
  olym.addColorStop(0,   "rgba(222,120,68,0.80)");
  olym.addColorStop(0.4, "rgba(200,92,44,0.42)");
  olym.addColorStop(1,   "rgba(0,0,0,0)");
  x.fillStyle = olym; x.beginPath(); x.ellipse(w*0.21,h*0.37,62,50,0,0,Math.PI*2); x.fill();

  // Valles Marineris — long dark canyon system
  x.save();
  x.beginPath();
  x.moveTo(w*0.32,h*0.50);
  x.bezierCurveTo(w*0.44,h*0.525, w*0.58,h*0.475, w*0.73,h*0.505);
  x.lineWidth = h*0.058; x.strokeStyle = "rgba(35,6,2,0.78)";
  x.lineCap = "round"; x.stroke();
  // Northern rift branch
  x.beginPath();
  x.moveTo(w*0.32,h*0.50);
  x.bezierCurveTo(w*0.29,h*0.455, w*0.27,h*0.41, w*0.28,h*0.38);
  x.lineWidth = h*0.026; x.strokeStyle = "rgba(35,6,2,0.60)"; x.stroke();
  x.restore();

  // Syrtis Major (prominent dark volcanic region)
  const syrtis = x.createRadialGradient(w*0.58,h*0.37,0,w*0.58,h*0.37,115);
  syrtis.addColorStop(0,   "rgba(28,8,4,0.78)");
  syrtis.addColorStop(0.45, "rgba(50,14,7,0.48)");
  syrtis.addColorStop(1,   "rgba(0,0,0,0)");
  x.fillStyle = syrtis; x.beginPath(); x.ellipse(w*0.58,h*0.37,115,88,-0.3,0,Math.PI*2); x.fill();

  // Hellas Basin (large bright circular lowland, south)
  const hellas = x.createRadialGradient(w*0.67,h*0.70,0,w*0.67,h*0.70,92);
  hellas.addColorStop(0,   "rgba(212,128,78,0.62)");
  hellas.addColorStop(0.5, "rgba(195,110,62,0.32)");
  hellas.addColorStop(1,   "rgba(0,0,0,0)");
  x.fillStyle = hellas; x.beginPath(); x.ellipse(w*0.67,h*0.70,92,72,0,0,Math.PI*2); x.fill();

  // Argyre basin (smaller, near south)
  const argyre = x.createRadialGradient(w*0.40,h*0.68,0,w*0.40,h*0.68,55);
  argyre.addColorStop(0,   "rgba(205,118,68,0.50)");
  argyre.addColorStop(1,   "rgba(0,0,0,0)");
  x.fillStyle = argyre; x.beginPath(); x.ellipse(w*0.40,h*0.68,55,42,0,0,Math.PI*2); x.fill();

  // Dust storm wisps
  for (let i = 0; i < 35; i++) {
    const cx = r()*w, cy = r()*h;
    x.save(); x.translate(cx,cy); x.rotate(r()*0.9-0.45);
    x.beginPath(); x.ellipse(0,0,r()*150+45,r()*14+3,0,0,Math.PI*2);
    x.fillStyle = `rgba(200,108,55,${r()*0.18+0.03})`; x.fill(); x.restore();
  }

  polarCap(x, w, h, 0.10, true,  238, 248, 255);
  polarCap(x, w, h, 0.07, false, 232, 244, 252);

  return new THREE.CanvasTexture(c);
}

/* ══════════════════════════════════════════════════════════════════════════
   JUPITER — vivid banded gas giant, Great Red Spot, festoons, ovals
══════════════════════════════════════════════════════════════════════════ */
function makeJupiter() {
  const { c, x } = makeCanvas(2048, 1024);
  const w = c.width, h = c.height;
  const r = rng(555);

  const n1 = makeNoise(r, 64,  32);
  const n2 = makeNoise(r, 128, 64);
  const n3 = makeNoise(r, 256, 128);

  // Per-pixel band rendering
  const img = x.createImageData(w, h);
  const d   = img.data;

  // Define zones (bright cream/tan) and belts (dark orange/brown) by v range
  // Each entry: [v_center, half_width, [R,G,B]]
  const bands = [
    [0.045, 0.045, [185, 148, 82],  true],   // NPR zone
    [0.118, 0.030, [105,  60, 16],  false],   // NNTBb belt
    [0.168, 0.038, [220, 178, 108], true],    // NTZ zone
    [0.235, 0.040, [ 92,  48, 10],  false],   // NTB belt
    [0.300, 0.040, [215, 174, 102], true],    // NEZ zone
    [0.374, 0.052, [ 80,  38,  5],  false],   // NEB belt dark
    [0.460, 0.046, [235, 195, 118], true],    // EZ zone bright
    [0.548, 0.050, [ 86,  42,  8],  false],   // SEB belt
    [0.628, 0.040, [210, 170,  95], true],    // STZ zone
    [0.700, 0.038, [100,  54, 12],  false],   // STB belt
    [0.760, 0.038, [202, 162,  88], true],    // STrZ zone
    [0.825, 0.042, [110,  60, 18],  false],   // SSTBb belt
    [0.900, 0.060, [180, 140,  68], true],    // SPR zone
  ];

  for (let py = 0; py < h; py++) {
    const v = py / h;
    for (let px = 0; px < w; px++) {
      const u = px / w;
      const i = (py*w+px) * 4;

      // Blend through all bands
      let R = 205, G = 162, B = 88;
      for (const [vc, hw, col] of bands) {
        const dist = Math.abs(v - vc) / hw;
        if (dist < 1.0) {
          const t = (1 - dist) * (1 - dist * 0.5); // smooth falloff
          R = lerp(R, col[0], t);
          G = lerp(G, col[1], t);
          B = lerp(B, col[2], t);
        }
      }

      // Horizontal turbulence noise
      const nv = (n1(u,v)-0.5)*0.38 + (n2(u*2.5,v*2.5)-0.5)*0.28 + (n3(u*5,v*5)-0.5)*0.14;
      d[i]   = cri(R + nv*52);
      d[i+1] = cri(G + nv*36);
      d[i+2] = cri(B + nv*16);
      d[i+3] = 255;
    }
  }
  x.putImageData(img, 0, 0);

  // Festoons — dark wisps at NEB/EZ boundary (v ≈ 0.42)
  for (let i = 0; i < 9; i++) {
    const fx = r()*w;
    x.save(); x.translate(fx, h*0.42);
    x.beginPath();
    x.moveTo(0,0);
    x.bezierCurveTo(r()*70-35, h*0.045, r()*70+50, h*0.06, 130+r()*40, r()*h*0.02-h*0.01);
    x.lineWidth = 9; x.strokeStyle = "rgba(55,20,4,0.65)"; x.lineCap = "round"; x.stroke();
    x.restore();
  }

  // Band-edge eddies and oval vortices
  for (let i = 0; i < 200; i++) {
    const bx = r()*w, by = r()*h;
    x.save(); x.translate(bx,by); x.rotate(r()*0.45-0.22);
    x.beginPath(); x.ellipse(0, 0, r()*58+8, r()*11+3, 0, 0, Math.PI*2);
    x.fillStyle = r() > 0.5
      ? `rgba(248,212,132,${r()*0.35+0.06})`
      : `rgba(52,18,2,${r()*0.35+0.06})`;
    x.fill(); x.restore();
  }

  // Great Red Spot (vivid red oval)
  const gx = w*0.628, gy = h*0.638, grx = 115, gry = 64;

  // Outer halo
  const gh1 = x.createRadialGradient(gx,gy,grx*0.55,gx,gy,grx*1.6);
  gh1.addColorStop(0, "rgba(155,45,18,0.52)"); gh1.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = gh1; x.beginPath(); x.ellipse(gx,gy,grx*1.6,gry*1.6,-0.12,0,Math.PI*2); x.fill();

  // Main body
  const gg = x.createRadialGradient(gx,gy,0,gx,gy,grx);
  gg.addColorStop(0,    "#D02600");
  gg.addColorStop(0.28, "#AE1E00");
  gg.addColorStop(0.62, "#C22E14");
  gg.addColorStop(1,    "rgba(175,45,22,0)");
  x.fillStyle = gg; x.beginPath(); x.ellipse(gx,gy,grx,gry,-0.14,0,Math.PI*2); x.fill();

  // Swirl rings inside GRS
  for (let ring = 0; ring < 3; ring++) {
    const rf = 0.72 - ring*0.20;
    x.save(); x.translate(gx,gy);
    x.beginPath(); x.ellipse(0,0,grx*rf,gry*rf,-0.14,0,Math.PI*2);
    x.strokeStyle = `rgba(255,${90+ring*32},${28+ring*18},0.38)`;
    x.lineWidth = 5-ring; x.stroke(); x.restore();
  }

  // Bright core
  const gc = x.createRadialGradient(gx,gy,0,gx,gy,grx*0.32);
  gc.addColorStop(0, "rgba(255,135,62,0.65)"); gc.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = gc; x.beginPath(); x.ellipse(gx,gy,grx*0.32,gry*0.32,0,0,Math.PI*2); x.fill();

  // Oval BA (smaller reddish storm, southern belt)
  const bax = w*0.30, bay = h*0.72;
  const bag = x.createRadialGradient(bax,bay,0,bax,bay,44);
  bag.addColorStop(0, "#B22E0E"); bag.addColorStop(0.5, "#8C1A06"); bag.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = bag; x.beginPath(); x.ellipse(bax,bay,44,26,0,0,Math.PI*2); x.fill();

  return new THREE.CanvasTexture(c);
}

/* ══════════════════════════════════════════════════════════════════════════
   SATURN — warm gold-cream banding, polar hexagon hint
══════════════════════════════════════════════════════════════════════════ */
function makeSaturn() {
  const { c, x } = makeCanvas(2048, 1024);
  const w = c.width, h = c.height;
  const r = rng(888);

  const n1 = makeNoise(r, 48,  24);
  const n2 = makeNoise(r, 96,  48);
  const n3 = makeNoise(r, 192, 96);

  const img = x.createImageData(w, h);
  const d   = img.data;

  for (let py = 0; py < h; py++) {
    const v = py / h;
    for (let px = 0; px < w; px++) {
      const u = px / w;
      const i = (py*w+px)*4;

      // Band wave (zones vs belts)
      const bw = Math.sin(v * Math.PI * 18) * 0.5 + 0.5;
      const belt = bw < 0.38;

      // Polar darkening
      const lat  = Math.abs(v - 0.5) * 2; // 0=equator, 1=pole
      const dark = lat * lat * 0.35;

      // Noise
      const nv = (n1(u,v)-0.5)*0.42 + (n2(u*3,v*3)-0.5)*0.34 + (n3(u*6,v*6)-0.5)*0.24;

      let R, G, B;
      if (belt) {
        R = lerp(152, 208, 1-lat) + nv*52;
        G = lerp(118, 162, 1-lat) + nv*40;
        B = lerp( 32,  68, 1-lat) + nv*18;
      } else {
        R = lerp(198, 252, 1-lat) + nv*42;
        G = lerp(172, 222, 1-lat) + nv*36;
        B = lerp( 78, 135, 1-lat) + nv*22;
      }
      d[i]   = cri(R - dark*55);
      d[i+1] = cri(G - dark*45);
      d[i+2] = cri(B - dark*18);
      d[i+3] = 255;
    }
  }
  x.putImageData(img, 0, 0);

  // Fine wispy streaks along bands
  for (let i = 0; i < 120; i++) {
    const bx = r()*w, by = r()*h;
    x.save(); x.translate(bx,by);
    x.beginPath(); x.ellipse(0,0,r()*95+18,r()*8+2,r()*0.18-0.09,0,Math.PI*2);
    x.fillStyle = r()>0.5 ? `rgba(255,252,185,${r()*0.22})` : `rgba(128,92,18,${r()*0.22})`;
    x.fill(); x.restore();
  }

  // North polar hexagon (very faint suggestion)
  x.save();
  x.translate(w/2, h*0.11);
  x.scale(1, 0.38);
  x.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = (k/6)*Math.PI*2 - Math.PI/6;
    const hr = 68;
    k === 0 ? x.moveTo(Math.cos(a)*hr, Math.sin(a)*hr)
            : x.lineTo(Math.cos(a)*hr, Math.sin(a)*hr);
  }
  x.closePath();
  x.strokeStyle = "rgba(175,140,55,0.38)"; x.lineWidth = 6; x.stroke();
  x.restore();

  return new THREE.CanvasTexture(c);
}

/* ══════════════════════════════════════════════════════════════════════════
   URANUS — smooth teal-cyan, subtle banding, polar gradient
══════════════════════════════════════════════════════════════════════════ */
function makeUranus() {
  const { c, x } = makeCanvas(1024, 512);
  const w = c.width, h = c.height;
  const r = rng(333);

  const n1 = makeNoise(r, 32, 16);
  const n2 = makeNoise(r, 64, 32);

  const img = x.createImageData(w, h);
  const d   = img.data;

  for (let py = 0; py < h; py++) {
    const v = py / h;
    for (let px = 0; px < w; px++) {
      const u = px / w;
      const i = (py*w+px)*4;

      // Latitudinal colour shift: poles (teal) → equator (pale cyan)
      const lat = Math.abs(v - 0.5) * 2;
      const nv  = (n1(u,v)-0.5)*0.28 + (n2(u*2.5,v*2.5)-0.5)*0.18;

      // Very faint horizontal banding
      const band = Math.sin(v * Math.PI * 10) * 0.07;

      const t = clamp(1 - lat*0.5 + nv + band, 0, 1);
      d[i]   = cri(lerp(68, 148, t));    // R: darker at poles
      d[i+1] = cri(lerp(172, 238, t));   // G
      d[i+2] = cri(lerp(178, 240, t));   // B
      d[i+3] = 255;
    }
  }
  x.putImageData(img, 0, 0);

  return new THREE.CanvasTexture(c);
}

/* ══════════════════════════════════════════════════════════════════════════
   NEPTUNE — deep royal blue, bright cloud streaks, Great Dark Spot
══════════════════════════════════════════════════════════════════════════ */
function makeNeptune() {
  const { c, x } = makeCanvas(1024, 512);
  const w = c.width, h = c.height;
  const r = rng(222);

  const n1 = makeNoise(r, 32, 16);
  const n2 = makeNoise(r, 64, 32);
  const n3 = makeNoise(r, 128, 64);

  const img = x.createImageData(w, h);
  const d   = img.data;

  for (let py = 0; py < h; py++) {
    const v = py / h;
    for (let px = 0; px < w; px++) {
      const u = px / w;
      const i = (py*w+px)*4;

      const nv = (n1(u,v)-0.5)*0.38 + (n2(u*2,v*2)-0.5)*0.28 + (n3(u*4,v*4)-0.5)*0.14;
      const band = Math.sin(v * Math.PI * 14) * 0.12;
      const lat  = Math.abs(v - 0.5) * 2;
      const t    = clamp(0.5 + nv*0.8 + band - lat*0.15, 0, 1);

      d[i]   = cri(lerp(12,  55, t));    // R
      d[i+1] = cri(lerp(38, 115, t));    // G
      d[i+2] = cri(lerp(140, 215, t));   // B rich cobalt
      d[i+3] = 255;
    }
  }
  x.putImageData(img, 0, 0);

  // Great Dark Spot
  const dg = x.createRadialGradient(w*0.37,h*0.44,0,w*0.37,h*0.44,40);
  dg.addColorStop(0,    "rgba(2,6,48,0.92)");
  dg.addColorStop(0.42, "rgba(6,16,72,0.66)");
  dg.addColorStop(1,    "rgba(0,0,0,0)");
  x.fillStyle = dg; x.beginPath(); x.ellipse(w*0.37,h*0.44,40,24,-0.3,0,Math.PI*2); x.fill();

  // Scooter — bright companion cloud
  const sc = x.createRadialGradient(w*0.52,h*0.50,0,w*0.52,h*0.50,18);
  sc.addColorStop(0,   "rgba(185,228,255,0.88)");
  sc.addColorStop(0.4, "rgba(155,200,255,0.55)");
  sc.addColorStop(1,   "rgba(0,0,0,0)");
  x.fillStyle = sc; x.beginPath(); x.ellipse(w*0.52,h*0.50,18,10,0.2,0,Math.PI*2); x.fill();

  // Bright cloud streaks
  for (let i = 0; i < 40; i++) {
    const cx = r()*w, cy = r()*h;
    x.save(); x.translate(cx,cy); x.rotate(r()*0.55-0.28);
    x.beginPath(); x.ellipse(0,0,r()*60+12,r()*8+2,0,0,Math.PI*2);
    x.fillStyle = `rgba(168,212,255,${r()*0.55+0.18})`; x.fill(); x.restore();
  }

  return new THREE.CanvasTexture(c);
}

/* ══════════════════════════════════════════════════════════════════════════
   Bump map — smooth value noise for rocky surfaces
══════════════════════════════════════════════════════════════════════════ */
export function makeBumpMap(seed = 1, w = 512, h = 256, strength = 0.8) {
  const { c, x } = makeCanvas(w, h);
  const r = rng(seed + 99999);

  const n1 = makeNoise(r, 32,  16);
  const n2 = makeNoise(r, 64,  32);
  const n3 = makeNoise(r, 128, 64);

  const img = x.createImageData(w, h);
  const d   = img.data;

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const u = px/w, v = py/h;
      const i = (py*w+px)*4;
      const n = clamp(
        (n1(u,v)-0.5)*0.52 + (n2(u*2,v*2)-0.5)*0.32 + (n3(u*4,v*4)-0.5)*0.16,
        -0.5, 0.5
      ) * strength + 0.5;
      const val = cri(n * 255);
      d[i]=d[i+1]=d[i+2]=val; d[i+3]=255;
    }
  }
  x.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(c);
}

/* ══════════════════════════════════════════════════════════════════════════
   Export
══════════════════════════════════════════════════════════════════════════ */
export const TEXTURE_MAKERS = {
  sun:     makeSun,
  mercury: makeMercury,
  venus:   makeVenus,
  earth:   makeEarth,
  mars:    makeMars,
  jupiter: makeJupiter,
  saturn:  makeSaturn,
  uranus:  makeUranus,
  neptune: makeNeptune,
};
