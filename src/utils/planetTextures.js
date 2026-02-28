import * as THREE from "three";

/* ── Seeded PRNG (LCG) for deterministic textures ─────────────────────── */
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
  c.width = w;
  c.height = h;
  return { c, x: c.getContext("2d") };
}

/* ── Coarse pixel noise ────────────────────────────────────────────────── */
function noise(x, w, h, r, alpha = 0.12, px = 6) {
  for (let py = 0; py < h; py += px) {
    for (let xi = 0; xi < w; xi += px) {
      const v = r() * 60 - 30;
      const a = (Math.abs(v) / 30) * alpha;
      x.fillStyle = v > 0 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
      x.fillRect(xi, py, px, px);
    }
  }
}

/* ── Polar cap gradient ────────────────────────────────────────────────── */
function polarCap(x, w, h, frac, top = true) {
  const color = "rgba(230,245,255,";
  if (top) {
    const g = x.createLinearGradient(0, 0, 0, h * frac);
    g.addColorStop(0, color + "0.95)");
    g.addColorStop(1, color + "0)");
    x.fillStyle = g;
    x.fillRect(0, 0, w, h * frac);
  } else {
    const g = x.createLinearGradient(0, h * (1 - frac), 0, h);
    g.addColorStop(0, color + "0)");
    g.addColorStop(1, color + "0.9)");
    x.fillStyle = g;
    x.fillRect(0, h * (1 - frac), w, h * frac);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   MERCURY  — grey, heavily cratered
═══════════════════════════════════════════════════════════════════════════ */
function makeMercury() {
  const { c, x } = makeCanvas(1024, 512);
  const w = c.width, h = c.height;
  const r = rng(42);

  const g = x.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#9e9e9e");
  g.addColorStop(0.5, "#b8b0a8");
  g.addColorStop(1, "#8a8078");
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);

  // Large basins
  for (let i = 0; i < 12; i++) {
    const cx = r() * w, cy = r() * h, rad = r() * 60 + 20;
    const bg = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    bg.addColorStop(0, "rgba(80,75,70,0.55)");
    bg.addColorStop(0.7, "rgba(100,95,90,0.25)");
    bg.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = bg;
    x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.fill();
  }

  // Craters
  for (let i = 0; i < 150; i++) {
    const cx = r() * w, cy = r() * h;
    const rad = r() * 18 + 2;
    // rim
    const rim = x.createRadialGradient(cx - rad * 0.2, cy - rad * 0.2, 0, cx, cy, rad);
    rim.addColorStop(0, "rgba(210,205,200,0.6)");
    rim.addColorStop(0.7, "rgba(140,135,130,0.0)");
    x.fillStyle = rim;
    x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.fill();
    // floor
    const floor = x.createRadialGradient(cx, cy, 0, cx, cy, rad * 0.75);
    floor.addColorStop(0, "rgba(60,55,50,0.7)");
    floor.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = floor;
    x.beginPath(); x.arc(cx, cy, rad * 0.75, 0, Math.PI * 2); x.fill();
  }

  noise(x, w, h, r, 0.18, 5);
  return new THREE.CanvasTexture(c);
}

/* ══════════════════════════════════════════════════════════════════════════
   VENUS  — thick yellow-orange sulfuric cloud deck
═══════════════════════════════════════════════════════════════════════════ */
function makeVenus() {
  const { c, x } = makeCanvas(1024, 512);
  const w = c.width, h = c.height;
  const r = rng(7);

  x.fillStyle = "#d9a840";
  x.fillRect(0, 0, w, h);

  const BANDS = [
    [0.0,  0.12, "#c49030"], [0.12, 0.07, "#f0d060"], [0.19, 0.08, "#aa7020"],
    [0.27, 0.11, "#e8c050"], [0.38, 0.06, "#b88030"], [0.44, 0.09, "#f5d870"],
    [0.53, 0.07, "#9a6820"], [0.60, 0.10, "#ddb840"], [0.70, 0.08, "#c09030"],
    [0.78, 0.10, "#e8c858"], [0.88, 0.12, "#b07828"],
  ];

  BANDS.forEach(([y, bh, col]) => {
    const g = x.createLinearGradient(0, y * h, 0, (y + bh) * h);
    g.addColorStop(0, col + "00"); g.addColorStop(0.35, col + "ee");
    g.addColorStop(0.65, col + "ee"); g.addColorStop(1, col + "00");
    x.fillStyle = g;
    x.fillRect(0, y * h, w, bh * h + 2);
  });

  // Swirling cloud wisps
  for (let i = 0; i < 80; i++) {
    const cx = r() * w * 1.2, cy = r() * h;
    x.save(); x.translate(cx, cy); x.rotate(r() * 0.4 - 0.2);
    x.beginPath();
    x.ellipse(0, 0, r() * 90 + 30, r() * 10 + 3, 0, 0, Math.PI * 2);
    x.fillStyle = `rgba(255,230,130,${r() * 0.22 + 0.05})`;
    x.fill(); x.restore();
  }

  noise(x, w, h, r, 0.12, 7);
  return new THREE.CanvasTexture(c);
}

/* ══════════════════════════════════════════════════════════════════════════
   EARTH  — blue oceans, land masses, polar ice, clouds
═══════════════════════════════════════════════════════════════════════════ */
function makeEarth() {
  const { c, x } = makeCanvas(1024, 512);
  const w = c.width, h = c.height;
  const r = rng(123);

  // Deep ocean base
  x.fillStyle = "#1a4a80";
  x.fillRect(0, 0, w, h);

  // Ocean depth texture
  for (let py = 0; py < h; py += 3) {
    for (let xi = 0; xi < w; xi += 3) {
      const v = r();
      if (v < 0.15) { x.fillStyle = "rgba(10,30,80,0.35)"; x.fillRect(xi, py, 3, 3); }
      else if (v > 0.87) { x.fillStyle = "rgba(40,100,180,0.2)"; x.fillRect(xi, py, 3, 3); }
    }
  }

  // Shallow coastal gradient
  const shallowSpots = [
    [0.13, 0.38], [0.48, 0.45], [0.65, 0.38], [0.72, 0.60], [0.78, 0.62],
  ];
  shallowSpots.forEach(([lx, ly]) => {
    const sg = x.createRadialGradient(lx * w, ly * h, 0, lx * w, ly * h, 80);
    sg.addColorStop(0, "rgba(30,120,180,0.4)");
    sg.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = sg; x.fillRect(0, 0, w, h);
  });

  // Continents (simplified equirectangular shapes)
  const continents = [
    // North America
    { pts: [[0.04,0.20],[0.17,0.18],[0.19,0.30],[0.18,0.45],[0.14,0.50],[0.08,0.50],[0.05,0.38],[0.04,0.28]] },
    // South America
    { pts: [[0.15,0.52],[0.21,0.50],[0.23,0.60],[0.21,0.75],[0.17,0.80],[0.13,0.74],[0.12,0.62]] },
    // Europe + small
    { pts: [[0.47,0.25],[0.54,0.23],[0.56,0.30],[0.53,0.38],[0.48,0.36],[0.46,0.30]] },
    // Africa
    { pts: [[0.47,0.38],[0.56,0.37],[0.58,0.50],[0.55,0.68],[0.50,0.73],[0.46,0.66],[0.45,0.52]] },
    // Asia
    { pts: [[0.55,0.22],[0.72,0.18],[0.80,0.22],[0.82,0.35],[0.75,0.42],[0.65,0.45],[0.57,0.40],[0.55,0.32]] },
    // Australia
    { pts: [[0.73,0.60],[0.82,0.58],[0.84,0.68],[0.80,0.74],[0.74,0.72],[0.72,0.65]] },
    // Greenland
    { pts: [[0.22,0.12],[0.28,0.10],[0.30,0.18],[0.26,0.22],[0.22,0.20]] },
  ];

  continents.forEach(({ pts }) => {
    x.beginPath();
    x.moveTo(pts[0][0] * w, pts[0][1] * h);
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      const mx = ((ax + bx) / 2) * w, my = ((ay + by) / 2) * h;
      x.quadraticCurveTo(ax * w, ay * h, mx, my);
    }
    x.closePath();
    // Land gradient - greens to browns
    const lx = pts[0][0] * w, ly = pts[0][1] * h;
    const lg = x.createRadialGradient(lx, ly, 0, lx, ly, 200);
    lg.addColorStop(0, "#3d7a35");
    lg.addColorStop(0.3, "#5a8040");
    lg.addColorStop(0.6, "#7a6840");
    lg.addColorStop(1, "#8a7248");
    x.fillStyle = lg;
    x.fill();
    // Coastline hint
    x.strokeStyle = "rgba(30,100,160,0.4)"; x.lineWidth = 2; x.stroke();
  });

  // Desert / arid zones tint
  const deserts = [[0.55, 0.45, 60, 30], [0.50, 0.55, 50, 20], [0.18, 0.42, 35, 18]];
  deserts.forEach(([dx, dy, rx, ry]) => {
    const dg = x.createRadialGradient(dx * w, dy * h, 0, dx * w, dy * h, rx);
    dg.addColorStop(0, "rgba(200,160,80,0.5)");
    dg.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = dg;
    x.beginPath(); x.ellipse(dx * w, dy * h, rx, ry, 0, 0, Math.PI * 2); x.fill();
  });

  polarCap(x, w, h, 0.11, true);
  polarCap(x, w, h, 0.07, false);

  // Cloud layer
  for (let i = 0; i < 90; i++) {
    const cx = r() * w, cy = r() * h;
    x.save(); x.translate(cx, cy); x.rotate(r() * 0.6 - 0.3);
    x.beginPath();
    x.ellipse(0, 0, r() * 100 + 20, r() * 18 + 4, 0, 0, Math.PI * 2);
    x.fillStyle = `rgba(255,255,255,${r() * 0.35 + 0.08})`;
    x.fill(); x.restore();
  }

  return new THREE.CanvasTexture(c);
}

/* ══════════════════════════════════════════════════════════════════════════
   MARS  — iron-oxide red, polar caps, dust plains
═══════════════════════════════════════════════════════════════════════════ */
function makeMars() {
  const { c, x } = makeCanvas(1024, 512);
  const w = c.width, h = c.height;
  const r = rng(999);

  x.fillStyle = "#9e3a14";
  x.fillRect(0, 0, w, h);

  // Surface variation — highlands & plains
  for (let i = 0; i < 35; i++) {
    const cx = r() * w, cy = r() * h, rad = r() * 120 + 30;
    const hg = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    if (r() > 0.45) {
      hg.addColorStop(0, "rgba(190,90,40,0.5)");
    } else {
      hg.addColorStop(0, "rgba(60,20,5,0.5)");
    }
    hg.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = hg;
    x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.fill();
  }

  // Valles Marineris — long dark canyon band
  const vmg = x.createLinearGradient(0, h * 0.47, 0, h * 0.55);
  vmg.addColorStop(0, "rgba(0,0,0,0)");
  vmg.addColorStop(0.5, "rgba(40,10,5,0.6)");
  vmg.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = vmg;
  x.fillRect(w * 0.35, h * 0.47, w * 0.45, h * 0.08);

  // Olympus Mons — bright raised region
  const om = x.createRadialGradient(w * 0.28, h * 0.40, 0, w * 0.28, h * 0.40, 50);
  om.addColorStop(0, "rgba(210,120,70,0.7)");
  om.addColorStop(0.5, "rgba(180,90,50,0.3)");
  om.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = om;
  x.beginPath(); x.arc(w * 0.28, h * 0.40, 50, 0, Math.PI * 2); x.fill();

  // Dust storm wisps
  for (let i = 0; i < 20; i++) {
    const cx = r() * w, cy = r() * h;
    x.save(); x.translate(cx, cy); x.rotate(r() * 0.5);
    x.beginPath();
    x.ellipse(0, 0, r() * 80 + 20, r() * 8 + 2, 0, 0, Math.PI * 2);
    x.fillStyle = `rgba(210,130,70,${r() * 0.2})`;
    x.fill(); x.restore();
  }

  polarCap(x, w, h, 0.09, true);
  polarCap(x, w, h, 0.06, false);
  noise(x, w, h, r, 0.2, 4);

  return new THREE.CanvasTexture(c);
}

/* ══════════════════════════════════════════════════════════════════════════
   JUPITER  — iconic banding + Great Red Spot
═══════════════════════════════════════════════════════════════════════════ */
function makeJupiter() {
  const { c, x } = makeCanvas(2048, 1024);
  const w = c.width, h = c.height;
  const r = rng(555);

  x.fillStyle = "#c8943a";
  x.fillRect(0, 0, w, h);

  const BANDS = [
    [0.00, 0.07, "#a07030"], [0.07, 0.05, "#e0b870"], [0.12, 0.06, "#7a4818"],
    [0.18, 0.05, "#d09850"], [0.23, 0.05, "#5a3410"], [0.28, 0.07, "#c88040"],
    [0.35, 0.04, "#e8c070"], [0.39, 0.09, "#6a3810"], // SEB dark
    [0.48, 0.07, "#d09040"], [0.55, 0.05, "#8a5020"], [0.60, 0.06, "#d4a050"],
    [0.66, 0.07, "#603010"], [0.73, 0.06, "#c07830"], [0.79, 0.07, "#7a4818"],
    [0.86, 0.06, "#b87030"], [0.92, 0.08, "#804020"],
  ];

  BANDS.forEach(([y, bh, col]) => {
    const g = x.createLinearGradient(0, y * h, 0, (y + bh) * h);
    g.addColorStop(0, col + "00"); g.addColorStop(0.3, col + "ff");
    g.addColorStop(0.7, col + "ff"); g.addColorStop(1, col + "00");
    x.fillStyle = g; x.fillRect(0, y * h - 1, w, bh * h + 2);
  });

  // Band-edge turbulence festoons
  for (let i = 0; i < 300; i++) {
    const bx = r() * w, by = r() * h;
    const ew = r() * 60 + 10, eh = r() * 12 + 3;
    x.save(); x.translate(bx, by); x.rotate(r() * 0.25 - 0.12);
    x.beginPath(); x.ellipse(0, 0, ew, eh, 0, 0, Math.PI * 2);
    const bright = r() > 0.5;
    x.fillStyle = bright ? `rgba(240,200,100,${r() * 0.28})` : `rgba(60,25,5,${r() * 0.28})`;
    x.fill(); x.restore();
  }

  // Great Red Spot
  const gx = w * 0.60, gy = h * 0.63, grx = 90, gry = 52;
  const gg = x.createRadialGradient(gx, gy, 0, gx, gy, grx);
  gg.addColorStop(0, "#cc2200"); gg.addColorStop(0.35, "#991800");
  gg.addColorStop(0.65, "#cc3311"); gg.addColorStop(1, "rgba(160,40,20,0)");
  x.fillStyle = gg;
  x.beginPath(); x.ellipse(gx, gy, grx, gry, -0.15, 0, Math.PI * 2); x.fill();
  // GRS bright center swirl
  const gs = x.createRadialGradient(gx, gy, 0, gx, gy, grx * 0.4);
  gs.addColorStop(0, "rgba(255,150,80,0.5)"); gs.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = gs; x.beginPath(); x.ellipse(gx, gy, grx * 0.4, gry * 0.4, 0, 0, Math.PI * 2); x.fill();

  // Oval BA
  const ox = w * 0.28, oy = h * 0.72;
  const og = x.createRadialGradient(ox, oy, 0, ox, oy, 38);
  og.addColorStop(0, "#bb3311"); og.addColorStop(0.5, "#991100"); og.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = og; x.beginPath(); x.ellipse(ox, oy, 38, 22, 0, 0, Math.PI * 2); x.fill();

  noise(x, w, h, r, 0.05, 4);
  return new THREE.CanvasTexture(c);
}

/* ══════════════════════════════════════════════════════════════════════════
   SATURN  — warm cream bands, subtler than Jupiter
═══════════════════════════════════════════════════════════════════════════ */
function makeSaturn() {
  const { c, x } = makeCanvas(1024, 512);
  const w = c.width, h = c.height;
  const r = rng(888);

  x.fillStyle = "#e8d898";
  x.fillRect(0, 0, w, h);

  const BANDS = [
    [0.00, 0.10, "#c8b060"], [0.10, 0.08, "#d8c870"], [0.18, 0.07, "#b09040"],
    [0.25, 0.09, "#e0d080"], [0.34, 0.07, "#b89848"], [0.41, 0.09, "#d4c060"],
    [0.50, 0.08, "#c4a840"], [0.58, 0.09, "#ddd070"], [0.67, 0.08, "#b89040"],
    [0.75, 0.09, "#d0b858"], [0.84, 0.08, "#c0a048"], [0.92, 0.08, "#d4b860"],
  ];

  BANDS.forEach(([y, bh, col]) => {
    const g = x.createLinearGradient(0, y * h, 0, (y + bh) * h);
    g.addColorStop(0, col + "00"); g.addColorStop(0.35, col + "ee");
    g.addColorStop(0.65, col + "ee"); g.addColorStop(1, col + "00");
    x.fillStyle = g; x.fillRect(0, y * h, w, bh * h + 1);
  });

  for (let i = 0; i < 80; i++) {
    const bx = r() * w, by = r() * h;
    x.save(); x.translate(bx, by);
    x.beginPath(); x.ellipse(0, 0, r() * 70 + 10, r() * 7 + 2, 0, 0, Math.PI * 2);
    x.fillStyle = r() > 0.5 ? `rgba(255,240,160,${r() * 0.18})` : `rgba(140,110,30,${r() * 0.18})`;
    x.fill(); x.restore();
  }

  noise(x, w, h, r, 0.04, 5);
  return new THREE.CanvasTexture(c);
}

/* ══════════════════════════════════════════════════════════════════════════
   URANUS  — pale cyan, tilted subtle bands
═══════════════════════════════════════════════════════════════════════════ */
function makeUranus() {
  const { c, x } = makeCanvas(512, 256);
  const w = c.width, h = c.height;
  const r = rng(333);

  // Limb darkening gradient
  const lg = x.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.5);
  lg.addColorStop(0, "#a8f0f0");
  lg.addColorStop(0.6, "#7de8e8");
  lg.addColorStop(1, "#4ab8c8");
  x.fillStyle = lg; x.fillRect(0, 0, w, h);

  // Subtle banding
  for (let i = 0; i < 10; i++) {
    const by = (i / 10) * h;
    const g = x.createLinearGradient(0, by, 0, by + h / 10);
    const col = i % 2 === 0 ? "rgba(90,210,215,0.18)" : "rgba(50,160,170,0.14)";
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.5, col); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, by, w, h / 10);
  }

  noise(x, w, h, r, 0.05, 6);
  return new THREE.CanvasTexture(c);
}

/* ══════════════════════════════════════════════════════════════════════════
   NEPTUNE  — deep cobalt blue, Great Dark Spot, cloud streaks
═══════════════════════════════════════════════════════════════════════════ */
function makeNeptune() {
  const { c, x } = makeCanvas(512, 256);
  const w = c.width, h = c.height;
  const r = rng(222);

  const bg = x.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.55);
  bg.addColorStop(0, "#2255cc");
  bg.addColorStop(0.5, "#1a3a9a");
  bg.addColorStop(1, "#0e1f5e");
  x.fillStyle = bg; x.fillRect(0, 0, w, h);

  for (let i = 0; i < 12; i++) {
    const by = (i / 12) * h;
    const g = x.createLinearGradient(0, by, 0, by + h / 12);
    const col = i % 2 === 0 ? "rgba(40,90,200,0.3)" : "rgba(15,35,110,0.25)";
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.5, col); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, by, w, h / 12);
  }

  // Great Dark Spot
  const dg = x.createRadialGradient(w * 0.38, h * 0.44, 0, w * 0.38, h * 0.44, 32);
  dg.addColorStop(0, "rgba(5,12,60,0.85)"); dg.addColorStop(0.5, "rgba(10,20,80,0.5)"); dg.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = dg; x.beginPath(); x.ellipse(w * 0.38, h * 0.44, 32, 20, -0.3, 0, Math.PI * 2); x.fill();

  // Scooter (bright cloud)
  const sg = x.createRadialGradient(w * 0.55, h * 0.50, 0, w * 0.55, h * 0.50, 16);
  sg.addColorStop(0, "rgba(160,200,255,0.7)"); sg.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = sg; x.beginPath(); x.ellipse(w * 0.55, h * 0.50, 16, 8, 0.2, 0, Math.PI * 2); x.fill();

  // Cloud streaks
  for (let i = 0; i < 20; i++) {
    x.save(); x.translate(r() * w, r() * h); x.rotate(r() * 0.4 - 0.2);
    x.beginPath(); x.ellipse(0, 0, r() * 45 + 8, r() * 5 + 1, 0, 0, Math.PI * 2);
    x.fillStyle = `rgba(130,170,255,${r() * 0.35})`; x.fill(); x.restore();
  }

  noise(x, w, h, r, 0.06, 4);
  return new THREE.CanvasTexture(c);
}

/* ══════════════════════════════════════════════════════════════════════════
   SUN  — convection granulation, sunspots, chromosphere hues
═══════════════════════════════════════════════════════════════════════════ */
function makeSun() {
  const { c, x } = makeCanvas(1024, 512);
  const w = c.width, h = c.height;
  const r = rng(777);

  // Photosphere base gradient
  const bg = x.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#ffd04a"); bg.addColorStop(0.5, "#ffe870"); bg.addColorStop(1, "#ff9900");
  x.fillStyle = bg; x.fillRect(0, 0, w, h);

  // Granulation cells — convection pattern
  for (let i = 0; i < 600; i++) {
    const cx = r() * w, cy = r() * h, rad = r() * 22 + 4;
    const cg = x.createRadialGradient(cx - rad * 0.2, cy - rad * 0.25, 0, cx, cy, rad);
    cg.addColorStop(0, `rgba(255,250,180,${r() * 0.55 + 0.25})`);
    cg.addColorStop(0.55, `rgba(255,180,0,${r() * 0.15})`);
    cg.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = cg; x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.fill();
  }

  // Bright plasma plumes
  for (let i = 0; i < 40; i++) {
    const cx = r() * w, cy = r() * h;
    x.save(); x.translate(cx, cy); x.rotate(r() * Math.PI * 2);
    x.beginPath(); x.ellipse(0, 0, r() * 50 + 10, r() * 8 + 2, 0, 0, Math.PI * 2);
    x.fillStyle = `rgba(255,255,160,${r() * 0.3})`; x.fill(); x.restore();
  }

  // Sunspots with umbra + penumbra
  for (let i = 0; i < 10; i++) {
    const cx = w * 0.15 + r() * w * 0.7, cy = h * 0.2 + r() * h * 0.6;
    const rad = r() * 20 + 7;
    // Penumbra
    const pg = x.createRadialGradient(cx, cy, rad * 0.4, cx, cy, rad);
    pg.addColorStop(0, "rgba(150,80,0,0.7)"); pg.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = pg; x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.fill();
    // Umbra
    const ug = x.createRadialGradient(cx, cy, 0, cx, cy, rad * 0.42);
    ug.addColorStop(0, "rgba(20,10,0,0.92)"); ug.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = ug; x.beginPath(); x.arc(cx, cy, rad * 0.42, 0, Math.PI * 2); x.fill();
  }

  return new THREE.CanvasTexture(c);
}

/* ══════════════════════════════════════════════════════════════════════════
   Simple bump map (grayscale noise) for rocky planets
═══════════════════════════════════════════════════════════════════════════ */
export function makeBumpMap(seed = 1, w = 512, h = 256, strength = 0.8) {
  const { c, x } = makeCanvas(w, h);
  const r = rng(seed + 99999);
  x.fillStyle = "#808080"; x.fillRect(0, 0, w, h);
  for (let py = 0; py < h; py += 3) {
    for (let xi = 0; xi < w; xi += 3) {
      const v = Math.floor(r() * 255);
      x.fillStyle = `rgba(${v},${v},${v},${strength})`;
      x.fillRect(xi, py, 3, 3);
    }
  }
  return new THREE.CanvasTexture(c);
}

/* ══════════════════════════════════════════════════════════════════════════
   Export map
═══════════════════════════════════════════════════════════════════════════ */
export const TEXTURE_MAKERS = {
  sun: makeSun,
  mercury: makeMercury,
  venus: makeVenus,
  earth: makeEarth,
  mars: makeMars,
  jupiter: makeJupiter,
  saturn: makeSaturn,
  uranus: makeUranus,
  neptune: makeNeptune,
};
