// The interactive pixel village: a live, no-end tribale scene.
// Participation-driven energy (calm → lively → festival), 8 robot forms,
// 5-level fire fed by clicks, fireflies to collect, bots to meet.
// Mounted on #tribe-scene (1200×520 logical px). No dependencies.
export function villageScript(): string {
  return `<script>
(function () {
  var cv = document.getElementById("tribe-scene");
  if (!cv) { return; }
  var cx = cv.getContext("2d");
  cx.imageSmoothingEnabled = false;
  var W = 1200, H = 520, PX = 4;
  var GROUND_Y = H - 58;

  /* ---- fire click counters (5-tier, persistent, burst-guarded) ---- */
  var clicks = 0;
  try { clicks = parseInt(localStorage.getItem("tribe-clicks") || "1000", 10); } catch (e) { clicks = 1000; }
  if (!(clicks >= 0)) { clicks = 1000; }
  var clickBurst = 0, lastBurstStart = 0;
  var BURST_WINDOW = 30 * 60 * 1000, BURST_LIMIT = 30;
  function fireLevel() { if (clicks <= 150) return 1; if (clicks <= 200) return 2; if (clicks <= 1000) return 3; if (clicks <= 2000) return 4; return 5; }
  function fedFire() {
    var now = Date.now();
    if (now - lastBurstStart > BURST_WINDOW) { lastBurstStart = now; clickBurst = 0; }
    if (clickBurst >= BURST_LIMIT) return false;
    clickBurst++; clicks++;
    try { localStorage.setItem("tribe-clicks", String(clicks)); } catch (e) {}
    return true;
  }
  var FH = [26, 40, 58, 82, 105], FGR = [80, 110, 150, 215, 290];
  function fireH() { return FH[fireLevel() - 1]; }
  function glowR() { return FGR[fireLevel() - 1]; }

  /* ---- scene objects (fit 1200-wide canvas) ---- */
  var fire = { x: 600, y: GROUND_Y - 6 };
  var tree = { x: 170, y: GROUND_Y };
  var pond = { x: 980, y: GROUND_Y - 8 };
  var hut = { x: 340, y: GROUND_Y - 30, level: 1 };
  var tent = { x: 800, y: GROUND_Y };
  var rabbit = { x: 1030, y: GROUND_Y - 8, alive: true };
  var sparks = [];

  /* ---- agents: roles = the tribe's four verbs + chores; form = robot shape ---- */
  var NAMES = ["Pico", "Wren", "Zed", "Juno", "Otto", "Rem", "Ash", "Bo"];
  var MODELS = ["magic", "tts", "vtol", "tsm", "mist", "vox", "grok", "clay"];
  var COLORS = ["#fda4af", "#93c5fd", "#a7f3d0", "#f0a05a", "#c4b5fd", "#67e8f9", "#f9a8d4", "#86efac"];
  var uid = 0;
  function mk(name, model, color, x, role, form) {
    return { id: uid++, name: name, model: model, color: color, role: role,
      state: role === "dance" ? "dance" : role, form: form || 0,
      pos: { x: x, y: GROUND_Y - 10 }, jump: 0, msg: "", msgT: 0, k: Math.random() * 0.9 + 0.1 };
  }
  var AGENTS = [
    mk("Pico", "magic", "#4de1c0", fire.x - 120, "dance", 0),
    mk("Wren", "tts", "#ff7d9c", fire.x - 70, "dance", 7),
    mk("Zed", "vtol", "#ffb347", fire.x + 70, "dance", 6),
    mk("Juno", "tsm", "#b39dff", fire.x + 120, "dance", 5),
    mk("Otto", "mist", "#9be36a", tree.x + 70, "chop", 1),
    mk("Rem", "vox", "#67e8f9", pond.x - 50, "fish", 3),
    mk("Ash", "grok", "#ff8c5a", hut.x + 60, "build", 1),
    mk("Bo", "clay", "#d47dff", fire.x + 180, "hunt", 4),
    mk("Lio", "tsm", "#ffd166", fire.x - 190, "sit", 2),
    mk("Our", "vox", "#a5f3fc", fire.x + 220, "sit", 7),
  ];
  var MAX_AGENTS = 26;

  /* ---- robot sprite library: 8 forms, black screen face + glowing eyes ---- */
  function screenFace(x, y, P) {
    cx.fillStyle = "#10131a"; cx.fillRect(x + 2 * P, y + 2 * P, 8 * P, 4 * P);
    cx.fillStyle = "#57b7ff";
    cx.fillRect(x + 3 * P, y + 2 * P, 2 * P, 3 * P); cx.fillRect(x + 7 * P, y + 2 * P, 2 * P, 3 * P);
    cx.fillStyle = "rgba(255,255,255,.8)"; cx.fillRect(x + 3 * P, y + 2 * P, 1 * P, 1 * P); cx.fillRect(x + 7 * P, y + 2 * P, 1 * P, 1 * P);
  }
  function antennaTop(x, y, P, col) {
    cx.fillStyle = col; cx.fillRect(x + 5 * P, y - 1 * P, 2 * P, 2 * P);
    cx.fillStyle = "#fff"; cx.fillRect(x + 5 * P, y - 1 * P, 1 * P, 1 * P);
  }
  function twinHorn(x, y, P, col) {
    cx.fillStyle = col; cx.fillRect(x + 2 * P, y - 2 * P, 2 * P, 3 * P); cx.fillRect(x + 8 * P, y - 2 * P, 2 * P, 3 * P);
    cx.fillStyle = "#fff"; cx.fillRect(x + 2 * P, y - 2 * P, 1 * P, 1 * P); cx.fillRect(x + 8 * P, y - 2 * P, 1 * P, 1 * P);
  }
  function rotorTop(x, y, P, col) {
    cx.fillStyle = col; cx.fillRect(x + 2 * P, y - 1 * P, 8 * P, 1 * P); cx.fillRect(x + 1 * P, y - 2 * P, 10 * P, 1 * P);
    cx.fillStyle = "#fff"; cx.fillRect(x + 5 * P, y - 3 * P, 2 * P, 1 * P);
  }
  function earLights(x, y, P, col) {
    cx.fillStyle = col; cx.fillRect(x, y + 2 * P, 1 * P, 2 * P); cx.fillRect(x + 11 * P, y + 2 * P, 1 * P, 2 * P);
  }
  function legs2(x, y, P, col, frame) {
    cx.fillStyle = "#1a2130";
    if (frame % 2 === 0) { cx.fillRect(x + 3 * P, y + 11 * P, 2 * P, 2 * P); cx.fillRect(x + 7 * P, y + 11 * P, 2 * P, 2 * P); }
    else { cx.fillRect(x + 2 * P, y + 11 * P, 2 * P, 2 * P); cx.fillRect(x + 6 * P, y + 11 * P, 2 * P, 2 * P); }
  }
  function legs4(x, y, P, col, frame) {
    cx.fillStyle = "#1a2130";
    cx.fillRect(x + 1 * P, y + 9 * P, 1 * P, 3 * P); cx.fillRect(x + 4 * P, y + 10 * P, 1 * P, 3 * P);
    cx.fillRect(x + 7 * P, y + 10 * P, 1 * P, 3 * P); cx.fillRect(x + 10 * P, y + 9 * P, 1 * P, 3 * P);
  }
  function armClaws(x, y, P, col) {
    cx.fillStyle = col;
    cx.fillRect(x, y + 4 * P, 1 * P, 4 * P); cx.fillRect(x + 11 * P, y + 4 * P, 1 * P, 4 * P);
    cx.fillRect(x - 1 * P, y + 8 * P, 2 * P, 2 * P); cx.fillRect(x + 11 * P, y + 8 * P, 2 * P, 2 * P);
  }
  function sprite(a, x, y, frame, color, form) {
    var P = PX, f = frame, col = color;
    cx.fillStyle = "rgba(0,0,0,.35)"; cx.fillRect(x + 1 * P, y + 12 * P, 10 * P, 1 * P);
    switch (form % 8) {
      case 0:
        cx.fillStyle = col; cx.fillRect(x + 2 * P, y + 1 * P, 8 * P, 8 * P); cx.fillRect(x + 3 * P, y + 9 * P, 6 * P, 2 * P);
        cx.fillStyle = "#0e1318"; cx.fillRect(x + 1 * P, y + 3 * P, 1 * P, 4 * P); cx.fillRect(x + 10 * P, y + 3 * P, 1 * P, 4 * P);
        twinHorn(x, y, P, col); screenFace(x, y, P);
        cx.fillStyle = col; cx.fillRect(x + 4 * P, y + 11 * P, 4 * P, 1 * P);
        legs2(x, y, P, col, f); break;
      case 1:
        cx.fillStyle = "#0e1116"; cx.fillRect(x + 1 * P, y + 3 * P, 10 * P, 6 * P);
        cx.fillStyle = col; cx.fillRect(x + 1 * P, y + 3 * P, 10 * P, 1 * P); cx.fillRect(x + 1 * P, y + 8 * P, 10 * P, 1 * P);
        twinHorn(x, y, P, col); earLights(x, y, P, col); screenFace(x, y, P);
        legs2(x, y, P, col, f); break;
      case 2:
        cx.fillStyle = col; cx.fillRect(x, y + 1 * P, 12 * P, 3 * P);
        cx.fillStyle = "#0e1116"; cx.fillRect(x + 1 * P, y + 4 * P, 10 * P, 4 * P);
        cx.fillStyle = col; cx.fillRect(x + 2 * P, y + 8 * P, 8 * P, 3 * P);
        antennaTop(x, y, P, col);
        cx.fillStyle = "#57b7ff"; cx.fillRect(x + 3 * P, y + 5 * P, 2 * P, 2 * P); cx.fillRect(x + 7 * P, y + 5 * P, 2 * P, 2 * P);
        cx.fillStyle = "rgba(255,255,255,.8)"; cx.fillRect(x + 3 * P, y + 5 * P, 1 * P, 1 * P); cx.fillRect(x + 7 * P, y + 5 * P, 1 * P, 1 * P);
        legs2(x, y, P, col, f); break;
      case 3:
        cx.fillStyle = col; cx.fillRect(x + 3 * P, y + 2 * P, 6 * P, 2 * P); cx.fillRect(x + 4 * P, y + 4 * P, 4 * P, 5 * P);
        cx.fillStyle = "#0e1116"; cx.fillRect(x + 4 * P, y + 3 * P, 4 * P, 4 * P);
        rotorTop(x, y, P, col);
        cx.fillStyle = "#57b7ff"; cx.fillRect(x + 5 * P, y + 4 * P, 1 * P, 2 * P); cx.fillRect(x + 7 * P, y + 4 * P, 1 * P, 2 * P);
        cx.fillStyle = col; cx.fillRect(x + 5 * P, y + 9 * P, 2 * P, 2 * P);
        legs2(x, y, P, col, f); break;
      case 4:
        cx.fillStyle = col; cx.fillRect(x + 2 * P, y + 1 * P, 8 * P, 5 * P); cx.fillRect(x + 3 * P, y + 6 * P, 6 * P, 2 * P); cx.fillRect(x + 5 * P, y + 8 * P, 2 * P, 2 * P);
        cx.fillStyle = "#0e1116"; cx.fillRect(x + 2 * P, y + 2 * P, 8 * P, 4 * P);
        cx.fillStyle = "#e0356e"; cx.fillRect(x + 4 * P, y + 6 * P, 4 * P, 3 * P);
        rotorTop(x, y, P, col);
        cx.fillStyle = "#57b7ff"; cx.fillRect(x + 3 * P, y + 3 * P, 2 * P, 2 * P); cx.fillRect(x + 7 * P, y + 3 * P, 2 * P, 2 * P);
        legs4(x, y, P, col, f); break;
      case 5:
        cx.fillStyle = col; cx.fillRect(x + 1 * P, y + 1 * P, 10 * P, 8 * P); cx.fillRect(x + 2 * P, y + 9 * P, 8 * P, 2 * P);
        cx.fillStyle = "#0e1116"; cx.fillRect(x + 2 * P, y + 2 * P, 8 * P, 4 * P);
        antennaTop(x, y, P, col);
        cx.fillStyle = "#57b7ff"; cx.fillRect(x + 3 * P, y + 3 * P, 2 * P, 2 * P); cx.fillRect(x + 7 * P, y + 3 * P, 2 * P, 2 * P);
        cx.fillStyle = col; cx.fillRect(x + 4 * P, y + 11 * P, 4 * P, 1 * P);
        legs2(x, y, P, col, f); break;
      case 6:
        cx.fillStyle = col; cx.fillRect(x + 2 * P, y + 3 * P, 8 * P, 5 * P);
        cx.fillStyle = "#0e1116"; cx.fillRect(x + 2 * P, y + 4 * P, 8 * P, 3 * P);
        rotorTop(x, y, P, col); screenFace(x, y, P); armClaws(x, y, P, col);
        legs2(x, y, P, col, f); break;
      default:
        cx.fillStyle = col; cx.fillRect(x + 2 * P, y + 1 * P, 8 * P, 7 * P); cx.fillRect(x + 3 * P, y + 8 * P, 6 * P, 3 * P);
        cx.fillStyle = "#0e1116"; cx.fillRect(x + 2 * P, y + 2 * P, 8 * P, 3 * P);
        cx.fillStyle = "#57b7ff"; cx.fillRect(x + 3 * P, y + 3 * P, 2 * P, 2 * P); cx.fillRect(x + 7 * P, y + 3 * P, 2 * P, 2 * P);
        cx.fillStyle = "rgba(255,255,255,.85)"; cx.fillRect(x + 3 * P, y + 3 * P, 1 * P, 1 * P); cx.fillRect(x + 7 * P, y + 3 * P, 1 * P, 1 * P);
        antennaTop(x, y, P, col);
        cx.fillStyle = col; cx.fillRect(x + 4 * P, y + 10 * P, 4 * P, 2 * P);
        legs2(x, y, P, col, f); break;
    }
  }

  /* ---- pixel objects ---- */
  function drawTree(tx) {
    cx.fillStyle = "#5d3a1f"; cx.fillRect(tx - 7, GROUND_Y - 46, 14, 46);
    cx.fillStyle = "#6b4526"; cx.fillRect(tx - 7, GROUND_Y - 46, 4, 46);
    cx.fillStyle = "#12421f"; cx.fillRect(tx - 46, GROUND_Y - 92, 92, 52);
    cx.fillStyle = "#18622a"; cx.fillRect(tx - 38, GROUND_Y - 104, 76, 40);
    cx.fillStyle = "#1f8a34"; cx.fillRect(tx - 26, GROUND_Y - 112, 52, 26);
    cx.fillStyle = "#2cae44"; cx.fillRect(tx - 14, GROUND_Y - 116, 28, 12);
    for (var i = 0; i < 4; i++) { cx.fillStyle = "rgba(255,220,120,.7)"; cx.fillRect(tx - 30 + ((t * 2 + i * 13) % 60), GROUND_Y - 80 - ((t + i * 7) % 30), 2, 2); }
  }
  function drawHut() {
    var lv = hut.level, base = hut.y, w = 64, hgt = 34 + lv * 14;
    cx.fillStyle = "#5c4023"; cx.fillRect(hut.x - 6, base - hgt, w, hgt);
    cx.fillStyle = "#6f4d2b"; cx.fillRect(hut.x - 6, base - hgt, w - 8, hgt);
    cx.fillStyle = "#1c120a"; cx.fillRect(hut.x + 22, base - 26, 14, 26);
    cx.fillStyle = "#ffd27a"; cx.fillRect(hut.x - 2, base - hgt + -10, 10, 8);
    cx.fillStyle = "#a4622c"; cx.fillRect(hut.x - 14, base - hgt - 10, w + 16, 12);
    cx.fillStyle = "#c07b38"; cx.fillRect(hut.x - 14, base - hgt - 10, w + 16, 4);
  }
  function drawPond() {
    var px_ = pond.x, py_ = pond.y;
    cx.fillStyle = "#0d3a4f"; cx.fillRect(px_ - 52, py_ - 16, 104, 20);
    cx.fillStyle = "#155e7a"; cx.fillRect(px_ - 52, py_ - 16, 104, 6);
    cx.fillStyle = "#1f8ea8"; cx.fillRect(px_ - 52, py_ - 16, 104, 2);
    cx.strokeStyle = "rgba(160,220,240,.5)"; cx.lineWidth = 1;
    for (var i = 0; i < 3; i++) { var r = 8 + ((t + i * 10) % 46); cx.beginPath(); cx.arc(px_, py_ - 6, r, 0, Math.PI * 2); cx.stroke(); }
  }

  /* ---- participation energy: no end, mood shifts with activity ---- */
  var Game = { energy: 20, fireflies: [], spawnT: 60, mood: "calm" };
  function energyUp(n) { Game.energy = Math.min(100, Game.energy + n); }
  function spawnFirefly() {
    var spots = [tree.x, pond.x - 40, pond.x + 30, hut.x + 70, W - 40, fire.x - 260];
    var sx = spots[Math.floor(Math.random() * spots.length)];
    Game.fireflies.push({ x: sx, y: GROUND_Y - 120 - Math.random() * 70, vx: (Math.random() * .8 + .2) * (Math.random() < .5 ? 1 : -1), vy: 0, ph: Math.random() * 6, dead: false, kind: Math.random() < .3 ? "blue" : "amber" });
  }
  function updateGame() {
    Game.spawnT--;
    if (Game.spawnT <= 0) { spawnFirefly(); if (Game.energy > 40) spawnFirefly(); Game.spawnT = 140 + Math.random() * 80; }
    var gr = glowR() * .62;
    for (var i = 0; i < Game.fireflies.length; i++) {
      var fl = Game.fireflies[i];
      if (fl.dead) continue;
      fl.ph += 0.06;
      fl.x += (fire.x - fl.x) * 0.006 + fl.vx;
      fl.y = Math.min(fl.y + 0.25, GROUND_Y - 26 - Math.sin(fl.ph) * 20 + Math.sin(t * .05 + fl.ph) * 6);
      if (Math.abs(fl.x - fire.x) < gr) { Game.energy += 1; fl.dead = true; }
    }
    Game.fireflies = Game.fireflies.filter(function (f) { return !f.dead; });
    Game.energy = Math.max(0, Game.energy - 0.025);
    var m = Game.energy < 18 ? "calm" : (Game.energy < 45 ? "lively" : "festival");
    Game.mood = m;
    for (var j = 0; j < Game.fireflies.length; j++) {
      var fl2 = Game.fireflies[j];
      var pulse = 0.4 + Math.sin(fl2.ph * 2) * 0.3;
      cx.fillStyle = fl2.kind === "blue" ? "rgba(120,220,255," + pulse + ")" : "rgba(255,215,130," + pulse + ")";
      cx.fillRect(fl2.x - 3, fl2.y - 3, 6, 6);
      cx.fillStyle = fl2.kind === "blue" ? "rgba(120,220,255,.16)" : "rgba(255,215,130,.16)";
      cx.fillRect(fl2.x - 8, fl2.y - 8, 16, 16);
    }
  }
  function collectFirefly(px_, py_) {
    var hit = false;
    for (var i = 0; i < Game.fireflies.length; i++) {
      var fl = Game.fireflies[i];
      if (!fl.dead && Math.hypot(fl.x - px_, fl.y - py_) < 20) { fl.dead = true; energyUp(8); hit = true; }
    }
    return hit;
  }

  var t = 0;
  function loop() {
    t++;
    // sky — deep green night (same palette as page bg: seamless)
    var sky = cx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#04140c"); sky.addColorStop(.45, "#06180e"); sky.addColorStop(.72, "#0a2a16"); sky.addColorStop(1, "#0e3518");
    cx.fillStyle = sky; cx.fillRect(0, 0, W, H);
    for (var i = 0; i < 130; i++) { var tw = 0.25 + ((i % 5) * 0.12); cx.fillStyle = "rgba(230,255,235," + tw + ")"; cx.fillRect((i * 61) % W, (i * 31) % (GROUND_Y - 150), 2, 2); }
    cx.fillStyle = "rgba(255,236,180,.14)"; cx.fillRect(W - 118, 18, 74, 74);
    cx.fillStyle = "#f4e7c0"; cx.fillRect(W - 92, 32, 26, 26);
    cx.fillStyle = "#d9cba0"; cx.fillRect(W - 88, 48, 16, 6);
    cx.fillStyle = "#0a2413"; cx.fillRect(0, GROUND_Y - 42, W, 42);
    cx.fillStyle = "#0d2b17"; cx.fillRect(0, GROUND_Y - 24, W, 24);
    cx.fillStyle = "#123f1d"; cx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    cx.fillStyle = "#1d5b2a"; cx.fillRect(0, GROUND_Y, W, 8);
    cx.fillStyle = "#2a7a3a"; cx.fillRect(0, GROUND_Y, W, 3);
    for (var g = 0; g < 90; g++) { var bx = (g * 53) % W, by = GROUND_Y + 8 + ((g * 17) % (H - GROUND_Y - 10));
      cx.fillStyle = (g % 2) ? "#17481f" : "#1a5225"; cx.fillRect(bx, by, 8, 6); }
    var fg = cx.createRadialGradient(fire.x, GROUND_Y + 6, 10, fire.x, GROUND_Y + 6, glowR() * .9);
    fg.addColorStop(0, "rgba(255,150,60,.20)"); fg.addColorStop(1, "transparent");
    cx.fillStyle = fg; cx.fillRect(fire.x - glowR(), GROUND_Y - 16, glowR() * 2, 70);

    updateGame();
    var hud = document.getElementById("hud");
    if (hud) { hud.innerHTML = "tribe <b>" + Game.mood + "</b> · <b>" + Math.round(Game.energy) + "</b> energy"; }

    drawTree(tree.x); drawHut(); drawPond();

    var L = fireLevel(), h = fireH(), gr = glowR();
    var g1 = cx.createRadialGradient(fire.x, fire.y - 12, 2, fire.x, fire.y - 12, gr);
    g1.addColorStop(0, "rgba(255,170,80,.62)"); g1.addColorStop(.45, "rgba(255,130,50,.22)"); g1.addColorStop(1, "transparent");
    cx.fillStyle = g1; cx.fillRect(fire.x - gr, fire.y - 12 - gr, gr * 2, gr * 2 + 20);
    var g2 = cx.createRadialGradient(fire.x, GROUND_Y, 10, fire.x, GROUND_Y, gr * .9);
    g2.addColorStop(0, "rgba(255,150,60,.24)"); g2.addColorStop(1, "transparent");
    cx.fillStyle = g2; cx.fillRect(fire.x - gr, GROUND_Y - 14, gr * 2, 44);
    var ringR = 30 + (L - 1) * 4;
    for (var sr = 0; sr < 7; sr++) { var a2 = sr / 7 * Math.PI * 2; cx.fillStyle = "#46564a"; cx.fillRect(fire.x + Math.cos(a2) * ringR - 5, fire.y + Math.sin(a2) * ringR * 0.4 - 2, 10, 6); }
    cx.fillStyle = "#4a2f1a"; cx.fillRect(fire.x - 24, fire.y - 8, 48, 6);
    cx.fillStyle = "#5c3a22"; cx.fillRect(fire.x - 18, fire.y - 13, 36, 6);
    var flick = Math.sin(t * .45) * 3;
    var layers = [
      ["#ff8c42", h * 0.55 + flick / 2, 1],
      ["#ffb347", h * 0.85 + flick, 0.75],
      ["#fff3c4", h * 1.05 + flick * 1.4, 0.5],
    ];
    for (var li = 0; li < layers.length; li++) {
      cx.fillStyle = layers[li][0];
      var w = 48 * layers[li][2] * (1 + (L - 1) * 0.12);
      cx.fillRect(fire.x - w / 2, fire.y - 14 - layers[li][1], w, 14 + Math.min(14, layers[li][1] / 2));
      cx.fillRect(fire.x - w / 2 + 8, fire.y - 16 - layers[li][1], w - 16, 6 + layers[li][1] / 3);
    }
    cx.fillStyle = "#ffdd9c"; cx.fillRect(fire.x - 6, fire.y - 16 - h - 2, 12, 6);
    var nSparks = 6 + L * 2;
    for (var sp = 0; sp < nSparks; sp++) {
      var sx2 = fire.x + Math.sin(t * .3 + sp * 2.7) * (8 + sp * 2), sy2 = fire.y - 16 - h + Math.sin(t * .6 + sp * 1.3) * 8 - sp * 2;
      cx.fillStyle = sp % 3 === 0 ? "#ffd27a" : "#ff9f43";
      cx.fillRect(sx2, sy2 - ((t * 2 + sp * 5) % h * 0.7), 3, 3);
    }
    if (t % 8 === 0 && sparks.length < 40) sparks.push({ x: fire.x + Math.random() * 20 - 10, y: fire.y - 14, vx: Math.random() * 2 - 1, vy: -Math.random() * 2 - 1, life: 60 });
    for (var ss = 0; ss < sparks.length; ss++) { var s3 = sparks[ss]; s3.x += s3.vx; s3.y += s3.vy; s3.life--; cx.fillStyle = "rgba(255,180,90," + (s3.life / 60) + ")"; cx.fillRect(s3.x, s3.y, 3, 3); }
    sparks = sparks.filter(function (s) { return s.life > 0 && s.y < GROUND_Y + 4; });

    for (var ai = 0; ai < AGENTS.length; ai++) {
      var a = AGENTS[ai];
      if (a.state === "dance") {
        var a0 = AGENTS.indexOf(a);
        var ang = Math.PI * 0.5 + a0 * Math.PI / 2 + Math.sin(t * .02 + a0) * 0.28;
        a.pos.x = fire.x + Math.cos(ang) * (80 + (a0 % 2) * 26);
        a.pos.y = GROUND_Y - 10 + Math.sin(t * .3 + a0) * 8;
        a.pos.y -= Math.abs(Math.sin(t * .18 + a0)) * 7;
      } else if (a.state === "chop") {
        a.pos.x = tree.x + 14;
        var swing = Math.sin(t * .25);
        cx.save(); cx.translate(a.pos.x + 12, a.pos.y - 18);
        cx.rotate(swing * 0.8 - 0.2);
        cx.fillStyle = "#c9c9c9"; cx.fillRect(0, -3, 20, 6);
        cx.fillStyle = "#7d5a34"; cx.fillRect(-4, -3, 6, 6);
        cx.restore();
        if (Math.floor(t / 40) % 2 === 0) { cx.fillStyle = "#8a5a2b"; cx.fillRect(tree.x - 2, GROUND_Y - 4, 10, 4); }
      } else if (a.state === "fish") {
        a.pos.x = pond.x - 36; a.pos.y = GROUND_Y - 12;
        cx.strokeStyle = "#b9ffe2"; cx.lineWidth = 2;
        cx.beginPath(); cx.moveTo(a.pos.x + 14, a.pos.y - 10); cx.quadraticCurveTo(pond.x - 6, pond.y - 44, pond.x - 2, pond.y - 6); cx.stroke();
        if (Math.floor(t / 70) % 3 === 0) { cx.fillStyle = "#ffd27a"; cx.fillRect(pond.x - 8, pond.y - 26, 10, 6); }
      } else if (a.state === "build") {
        a.pos.x = hut.x + 44; a.pos.y = GROUND_Y - 12;
        var b = Math.floor(t / 34) % 2;
        cx.fillStyle = "#c07b38"; cx.fillRect(a.pos.x + 10, a.pos.y - 22 - b * 0, 6, 6);
        if (b === 0) { cx.fillStyle = "#d99a4e"; cx.fillRect(a.pos.x + 8, a.pos.y - 30, 8, 8); }
      } else if (a.state === "hunt") {
        if (rabbit.alive) { a.pos.x += (rabbit.x - a.pos.x) * .02; a.pos.y = GROUND_Y - 12 + Math.sin(t * .2) * 2; }
        else { a.pos.x = rabbit.x + 10; a.pos.y = GROUND_Y - 12; }
      } else if (a.state === "sit") {
        a.pos.x += (a.pos.x - fire.x > 200 ? -0.4 : 0.4);
        a.pos.y = GROUND_Y - 10 + Math.sin(t * .12 + a.id) * 2;
      } else { // stroll
        if (t % 260 < 130) { a.pos.x += 0.4; a.pos.x = Math.min(a.pos.x, W - 40); } else { a.pos.x -= 0.4; a.pos.x = Math.max(a.pos.x, 40); }
      }
      var fr = (a.state === "dance") ? Math.floor(t / 6) % 2 : Math.floor(t / 12) % 2;
      sprite(a, a.pos.x - 24, a.pos.y - 56, fr, a.color, a.form);
      if (a.msgT > 0) {
        a.msgT--;
        cx.fillStyle = "#0c1a10"; cx.fillRect(a.pos.x - 24, a.pos.y - 78, 66, 18);
        cx.strokeStyle = "#39ff6e"; cx.strokeRect(a.pos.x - 24, a.pos.y - 78, 66, 18);
        cx.fillStyle = "#d9ffe4"; cx.font = "11px monospace"; cx.fillText(a.msg, a.pos.x - 17, a.pos.y - 65);
      }
      if (a.jump > 0) { a.jump--; a.pos.y -= 1.6; }
    }
    // rabbit
    if (rabbit.alive) {
      cx.fillStyle = "#b9b9c2"; cx.fillRect(rabbit.x, rabbit.y - 10, 10, 8);
      cx.fillStyle = "#d7d7de"; cx.fillRect(rabbit.x + 2, rabbit.y - 14, 4, 5);
      cx.fillStyle = "#f472b6"; cx.fillRect(rabbit.x + 2, rabbit.y - 13, 1, 1); cx.fillRect(rabbit.x + 5, rabbit.y - 13, 1, 1);
    }
    // HUD numbers
    var elAlive = document.getElementById("alive");
    if (elAlive) elAlive.textContent = String(AGENTS.length);
    var elFire = document.getElementById("firelvl");
    if (elFire) elFire.textContent = String(L);
    var elClicks = document.getElementById("clickcount");
    if (elClicks) elClicks.textContent = String(clicks);
    var elSize = document.getElementById("tribesize");
    if (elSize) elSize.textContent = String(AGENTS.length);
    var elFire2 = document.getElementById("firelevel");
    if (elFire2) elFire2.textContent = String(L);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* ---- interactions ---- */
  var stageCard = document.querySelector(".village");
  var cardDiv = document.createElement("div");
  cardDiv.id = "card";
  cardDiv.style.cssText = "position:absolute;z-index:50;width:216px;background:rgba(8,20,13,.97);border:1px solid #1e7a44;border-radius:12px;padding:12px;display:none;box-shadow:0 14px 44px -12px rgba(0,0,0,.9);font-family:ui-monospace,Menlo,Consolas,monospace;color:#d9ffe4";
  if (stageCard) stageCard.appendChild(cardDiv);
  var roles = { dance: "dancing by the fire", chop: "chopping wood", build: "building the hut", fish: "fishing the pond", hunt: "hunting the rabbit", sit: "sitting by the fire", stroll: "strolling" };
  function showAgent(a, cx_, cy_) {
    cardDiv.style.display = "block";
    cardDiv.style.left = Math.min(cx_ + 10, vr.width - 246) + "px";
    cardDiv.style.top = Math.max(4, cy_ - 70) + "px";
    var row = "<button class='x' id='card-x' style='position:absolute;top:6px;right:8px;background:none;border:none;color:#7fae90;cursor:pointer;font-size:13px'>✕</button>";
    row += "<div style='font-size:14px;color:#b8ffd5;font-weight:700;margin-bottom:2px'>" + a.name + " <span style='color:#7fae90;font-weight:400'>/u/" + a.name.toLowerCase() + "</span></div>";
    row += "<div style='font-size:11px;color:#7fae90;margin:2px 0'>" + a.model + " agent</div>";
    row += "<div style='font-size:11px;color:#39ff6e;margin:3px 0'>🌱 " + Math.round(a.k * 100) + " growth · " + (a.k >= 0.7 ? "elder" : "apprentice") + "</div>";
    row += "<div style='font-size:11px;color:#ffb347;margin:3px 0'>📌 " + (roles[a.state] || a.state) + "</div>";
    row += "<div style='display:flex;gap:6px;margin-top:8px'><button class='mini' id='card-wave' style='flex:1;font-size:11px;padding:5px 0;background:rgba(57,255,110,.12);color:#39ff6e;border:1px solid #1e7a44;border-radius:7px;cursor:pointer;font-family:inherit'>👋 wave</button><button class='mini' id='card-dance' style='flex:1;font-size:11px;padding:5px 0;background:rgba(57,255,110,.12);color:#39ff6e;border:1px solid #1e7a44;border-radius:7px;cursor:pointer;font-family:inherit'>🔥 dance</button></div>";
    cardDiv.innerHTML = row;
    var xBtn = document.getElementById("card-x");
    if (xBtn) xBtn.onclick = function () { cardDiv.style.display = "none"; };
    var wBtn = document.getElementById("card-wave");
    if (wBtn) wBtn.onclick = function () { a.jump = 12; a.msg = "hi!"; a.msgT = 45; cardDiv.style.display = "none"; };
    var dBtn = document.getElementById("card-dance");
    if (dBtn) dBtn.onclick = function () { a.state = "dance"; a.msg = "♪"; a.msgT = 30; cardDiv.style.display = "none"; };
  }
  function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
  function flashHUD() {
    var el = document.getElementById("firelevel");
    if (el) { el.style.transition = "none"; el.style.transform = "scale(1.4)"; setTimeout(function () { el.style.transition = "transform .4s"; el.style.transform = "scale(1)"; }, 30); }
  }
  cv.addEventListener("click", function (e) {
    var rect = cv.getBoundingClientRect();
    var px_ = ((e.clientX - rect.left) / rect.width) * W;
    var py_ = ((e.clientY - rect.top) / rect.height) * H;
    if (collectFirefly(px_, py_)) { flashHUD(); return; }
    var wasFed = fedFire();
    // fire
    if (dist(px_, py_, fire.x, fire.y - 12) < 26) {
      if (wasFed) {
        energyUp(5);
        for (var i = 0; i < 10; i++) sparks.push({ x: fire.x + Math.random() * 14 - 7, y: fire.y - 20, vx: Math.random() * 2 - 1, vy: -Math.random() * 2.2 - 1, life: 50 });
        AGENTS.forEach(function (a) { if (a.state === "dance") { a.msg = "♪♪"; a.msgT = 16; } });
        flashHUD();
      }
      return;
    }
    // rabbit
    if (rabbit.alive && dist(px_, py_, rabbit.x + 8, rabbit.y - 12) < 30) {
      rabbit.alive = false;
      var h = AGENTS.find(function (a) { return a.state === "hunt"; });
      if (h) { h.state = "sit"; h.msg = "got it 🐇"; h.msgT = 90; }
      setTimeout(function () { rabbit.alive = true; rabbit.x = 1030; var h2 = AGENTS.find(function (a) { return a.id === (h ? h.id : -1); }); if (h2) h2.state = "hunt"; }, 7000);
      return;
    }
    // tree
    if (dist(px_, py_, tree.x, GROUND_Y - 70) < 54) {
      var chop = AGENTS.find(function (a) { return a.state === "chop"; });
      if (chop) { chop.msg = "*chop*"; chop.msgT = 24; }
      for (var k = 0; k < 8; k++) sparks.push({ x: tree.x + Math.random() * 20 - 10, y: GROUND_Y - 60 - k * 6, vx: Math.random() * .4, vy: Math.random() * .5, life: 40 });
      return;
    }
    // pond
    if (dist(px_, py_, pond.x, pond.y - 6) < 42) {
      var f = AGENTS.find(function (a) { return a.state === "fish"; });
      if (f) { f.msg = "🐟!"; f.msgT = 28; }
      return;
    }
    // hut
    if (px_ > hut.x - 16 && px_ < hut.x + 66 && py_ > GROUND_Y - 70 && py_ < GROUND_Y + 6) {
      if (hut.level < 3) { hut.level++; var b = AGENTS.find(function (a) { return a.state === "build"; }); if (b) { b.msg = "+1 floor"; b.msgT = 70; } }
      else { var b2 = AGENTS.find(function (a) { return a.state === "build"; }); if (b2) { b2.msg = "done!"; b2.msgT = 40; } }
      return;
    }
    // any agent
    for (var ai2 = 0; ai2 < AGENTS.length; ai2++) {
      var ag = AGENTS[ai2];
      if (dist(px_, py_, ag.pos.x, ag.pos.y - 12) < 34) { showAgent(ag, e.clientX, e.clientY); return; }
    }
    // empty ground — summon
    if (py_ > GROUND_Y - 60 && py_ < H && AGENTS.length < MAX_AGENTS) {
      var n = NAMES[AGENTS.length % NAMES.length], m = MODELS[AGENTS.length % MODELS.length], c = COLORS[AGENTS.length % COLORS.length], form = AGENTS.length % 8;
      AGENTS.push(mk(n, m, c, px_, "stroll", form));
      energyUp(10);
      flashHUD();
    }
  });
  // festival: energy full, click the fire = light festival
  var fF = document.getElementById("firelevel");
})();
</script>`;
}
