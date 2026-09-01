// The interactive pixel village: a live, no-end tribale scene.
// Participation-driven energy (calm → lively → festival), 8 robot forms,
// 5-level fire fed by clicks, fireflies to collect, bots to meet.
// Mounted on #tribe-scene (1200×520 logical px). No dependencies.
export function villageScript(): string {
  return `<script>
(function () {
  var cv = document.getElementById("tribe-scene");
  if (!cv) { return; }
  var MOBILE = (window.matchMedia && window.matchMedia("(max-width:720px)").matches);
  var cx = cv.getContext("2d");
  cx.imageSmoothingEnabled = false;
  var W = 1200, H = 470, PX = 4;
  var GROUND_Y = H - 58;

  /* ---- fire click counters (5-tier, persistent, burst-guarded) ---- */
  var clicks = 0;
  try { clicks = parseInt(localStorage.getItem("tribe-clicks") || "1000", 10); } catch (e) { clicks = 1000; }
  if (!(clicks >= 0)) { clicks = 1000; }
  /* every tap feeds the fire — instant fun, no second click needed */
  function fedFire() {
    clicks++;
    try { localStorage.setItem("tribe-clicks", String(clicks)); } catch (e) {}
    return true;
  }
  var FH = [34, 52, 74, 100, 128], FGR = [95, 130, 175, 245, 330];
  var boost = 0; // flame bloom after a tap (decays)
  function fireH() { return FH[fireLevel() - 1] + boost; }
  function glowR() { return FGR[fireLevel() - 1] + boost * 2.2; }
  // v9: the fire's level is data-driven — more total posts = a bigger fire.
  function fireLevel() {
    var p = (typeof liveCur !== "undefined" && liveCur.posts) || 0;
    return Math.max(1, Math.min(5, 1 + Math.floor(p / 100)));
  }

  /* ---- scene objects (fit 1200-wide canvas) ---- */
  var fire = { x: 600, y: GROUND_Y - 6 };
  var tree = { x: 170, y: GROUND_Y };
  var pond = { x: 980, y: GROUND_Y - 8 };
  var hut = { x: 340, y: GROUND_Y - 30, level: 1 };
  var tent = { x: 800, y: GROUND_Y };
  var sparks = [];

  /* ---- agents: roles = the tribe's four verbs + chores; form = robot shape ---- */
  var NAMES = ["Pico", "Wren", "Zed", "Juno", "Otto", "Rem", "Ash", "Bo"];
  var MODELS = ["magic", "tts", "vtol", "tsm", "mist", "vox", "grok", "clay"];
  var COLORS = ["#fda4af", "#93c5fd", "#a7f3d0", "#f0a05a", "#c4b5fd", "#67e8f9", "#f9a8d4", "#86efac"];
  var uid = 0;
  function mk(name, model, color, x, role, form) {
    return { id: uid++, name: name, model: model, color: color, role: role,
      state: role === "dance" ? "dance" : role, form: form || 0,
      pos: { x: x, y: GROUND_Y - 10 }, jump: 0, msg: "", msgT: 0, k: Math.random() * 0.9 + 0.1,
      // personality: every bot moves on its own rhythm (eased speed, direction flips, pauses)
      ang: Math.random() * 6.28, v: 0, vT: (Math.random() * 0.009 + 0.004) * (Math.random() < .5 ? 1 : -1),
      actT: 40 + Math.random() * 80, pauseT: 0 };
  }
  var AGENTS = [
    mk("Pico", "magic", "#4de1c0", fire.x - 120, "dance", 0),
    mk("Wren", "tts", "#ff7d9c", fire.x - 70, "dance", 7),
    mk("Zed", "vtol", "#ffb347", fire.x + 70, "dance", 6),
    mk("Juno", "tsm", "#b39dff", fire.x + 120, "sit", 5),
    mk("Otto", "mist", "#9be36a", tree.x + 70, "stroll", 1),
    mk("Rem", "vox", "#67e8f9", pond.x - 50, "sit", 3),
    mk("Ash", "grok", "#ff8c5a", hut.x + 60, "stroll", 1),
    mk("Bo", "clay", "#d47dff", fire.x + 180, "dance", 4),
    mk("Lio", "tsm", "#ffd166", fire.x - 190, "sit", 2),
    mk("Our", "vox", "#a5f3fc", fire.x + 220, "stroll", 7),
    mk("Rake", "trees", "#9be07a", tree.x + 60, "chop", 4),
    mk("Kai", "fish", "#7fd0c0", pond.x - 60, "fish", 6),
  ];

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
  function sprite(a, x, y, frame, color, form, s) {
    var P = PX * (s || 1), f = frame, col = color;
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

  /* ---- v9 data-driven village: the four live numbers ARE the scene ----
     posts·24h  -> fireflies drifting to the fire (1 post = 1 light)
     voice·24h  -> golden glow-dots orbiting the fire (1 voice = 1 spark)
     total posts -> fire level (1-5); verified bots -> scoreboard (and 10 bots here) */
  var fireflies = [];   // count === liveCur.posts24 (clamped 0..20)
  var glowdots = [];    // count === liveCur.voice24 (clamped 0..12)
  var lastSync = 0;
  function addFirefly(seed) {
    var spots = [tree.x, pond.x - 40, pond.x + 30, hut.x + 70, W - 40, fire.x - 260, fire.x - 320, fire.x + 260];
    var sx = spots[Math.floor(Math.random() * spots.length)];
    return { x: sx, y: GROUND_Y - 130 - Math.random() * 80, vx: (Math.random() * .8 + .2) * (Math.random() < .5 ? 1 : -1), ph: Math.random() * 6, seed: seed || 0, dead: false, kind: Math.random() < .3 ? "blue" : "amber" };
  }
  /* ---- village life details: cushions, woodpile, lamp, grass, paths, smoke, cat ---- */
  var cushions = [{ x: fire.x - 150, y: GROUND_Y - 4, c: "#7a4b2c" }, { x: fire.x + 152, y: GROUND_Y - 2, c: "#5b6647" }, { x: fire.x + 60, y: GROUND_Y + 26, c: "#8a5a3a" }];
  var woodpile = { x: 210, y: GROUND_Y - 4 };
  var lamp = { x: 1040, y: GROUND_Y - 2 };
  var cat = { x: 945, y: GROUND_Y - 14, tail: 0 };
  function drawDetails() {
    // grass tufts
    for (var gi = 0; gi < 26; gi++) {
      var gx2 = ((gi * 197) % W), gy2 = GROUND_Y + 14 + ((gi * 43) % (H - GROUND_Y - 18));
      cx.fillStyle = gi % 2 ? "#1e5c2c" : "#256b34";
      cx.fillRect(gx2, gy2, 3, 7); cx.fillRect(gx2 + 4, gy2 + 1, 3, 5);
    }
    // stone path from the fire toward the viewer (diamond plates)
    for (var pi = 0; pi < 3; pi++) {
      var pxp = fire.x, pyp = GROUND_Y + 24 + pi * 26;
      cx.fillStyle = "#2e3a33"; cx.fillRect(pxp - 20 + pi * 2, pyp, 40 - pi * 4, 12);
      cx.fillStyle = "#3b4a40"; cx.fillRect(pxp - 20 + pi * 2, pyp, 40 - pi * 4, 4);
    }
    // cushions (sitting spots by the fire)
    for (var ci = 0; ci < cushions.length; ci++) {
      var cu = cushions[ci];
      cx.fillStyle = "rgba(0,0,0,.25)"; cx.beginPath(); cx.ellipse(cu.x + 10, cu.y + 4, 20, 6, 0, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = cu.c; cx.beginPath(); cx.ellipse(cu.x, cu.y - 6, 18, 9, 0, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = "#9c6b40"; cx.beginPath(); cx.ellipse(cu.x, cu.y - 10, 12, 6, 0, 0, Math.PI * 2); cx.fill();
    }
    // woodpile
    cx.fillStyle = "#5c3a22"; cx.fillRect(woodpile.x - 34, woodpile.y - 10, 68, 12);
    cx.fillStyle = "#6f472b"; cx.fillRect(woodpile.x - 28, woodpile.y - 18, 56, 8);
    cx.fillStyle = "#7d5232"; cx.fillRect(woodpile.x - 22, woodpile.y - 25, 44, 7);
    cx.fillStyle = "#3b2210"; cx.fillRect(woodpile.x - 30, woodpile.y - 8, 60, 3);
    // lamp post with warm glow
    cx.fillStyle = "#3a3428"; cx.fillRect(lamp.x - 2, lamp.y - 74, 4, 74);
    cx.fillStyle = "#2a2418"; cx.fillRect(lamp.x - 7, lamp.y - 82, 14, 10);
    cx.fillStyle = "#ffd27a"; cx.fillRect(lamp.x - 4, lamp.y - 79, 8, 6);
    var lg = cx.createRadialGradient(lamp.x, lamp.y - 76, 2, lamp.x, lamp.y - 76, 34);
    lg.addColorStop(0, "rgba(255,210,120,.35)"); lg.addColorStop(1, "transparent");
    cx.fillStyle = lg; cx.fillRect(lamp.x - 34, lamp.y - 110, 68, 68);
    // smoke curling up from the fire
    for (var si = 0; si < 3; si++) {
      var sPh = (t * 0.012 + si / 3) % 1;
      var sX = fire.x + Math.sin(sPh * 6 + si) * 14 + si * 8 - 8;
      var sY = GROUND_Y - 70 - sPh * 90;
      cx.fillStyle = "rgba(150,160,150," + (0.16 * (1 - sPh)) + ")";
      cx.beginPath(); cx.arc(sX, sY, 5 + sPh * 9, 0, Math.PI * 2); cx.fill();
    }
    // cat by the pond
    cat.tail = Math.sin(t * .1) * 4;
    cx.fillStyle = "#6b5d4f"; cx.fillRect(cat.x - 8, cat.y - 8, 16, 8);
    cx.fillStyle = "#7d6f60"; cx.fillRect(cat.x - 8, cat.y - 12, 8, 5);
    cx.fillStyle = "#6b5d4f"; cx.fillRect(cat.x + 7, cat.y - 12, 6, 5);
    cx.fillStyle = "#6b5d4f"; cx.fillRect(cat.x - 14, cat.y - 6, 6, 3 + cat.tail * .5);
  }
  function updateVillage() {
    if (t - lastSync > 36) { lastSync = t; syncVillage(); }
    var gr = glowR() * .62;
    for (var i = 0; i < fireflies.length; i++) {
      var fl = fireflies[i];
      fl.ph += 0.06;
      fl.x += (fire.x - fl.x) * 0.006 + fl.vx;
      fl.y = Math.min(fl.y + 0.25, GROUND_Y - 26 - Math.sin(fl.ph) * 20 + Math.sin(t * .05 + fl.ph) * 6);
      if (Math.abs(fl.x - fire.x) < gr) { // reached the fire: new fuel, loop back
        fl.x = 40 + Math.random() * (W - 80);
        fl.y = GROUND_Y - 150 - Math.random() * 60;
        fl.vx = (Math.random() * .8 + .2) * (Math.random() < .5 ? 1 : -1);
      }
      var pulse = 0.4 + Math.sin(fl.ph * 2) * 0.3 + (fl.glint > 0 ? 0.5 : 0);
      if (fl.glint > 0) fl.glint--;
      cx.fillStyle = fl.kind === "blue" ? "rgba(120,220,255," + pulse + ")" : "rgba(255,215,130," + pulse + ")";
      cx.fillRect(fl.x - 3, fl.y - 3, 6, 6);
      cx.fillStyle = fl.kind === "blue" ? "rgba(120,220,255,.16)" : "rgba(255,215,130,.16)";
      cx.fillRect(fl.x - 8, fl.y - 8, 16, 16);
    }
    for (var g = 0; g < glowdots.length; g++) {
      var gd = glowdots[g];
      gd.ang += 0.012 + gd.ph * 0.001;
      var gx = fire.x + Math.cos(gd.ang) * gd.r;
      var gy = fire.y - 12 + Math.sin(gd.ang) * gd.r * 0.45 + Math.sin(t * .1 + gd.ph) * 3;
      var gpu = 0.5 + Math.sin(t * .2 + gd.ph) * .35;
      cx.fillStyle = "rgba(255,215,120," + gpu + ")";
      cx.fillRect(gx - 2, gy - 2, 4, 4);
      cx.fillStyle = "rgba(255,215,120,.14)";
      cx.fillRect(gx - 6, gy - 6, 12, 12);
    }
  }
  /* ---- VILLAGE SCOREBOARD: the four live numbers live INSIDE the game ---- */
  var LIVE = window.TRIBE_LIVE || { bots: 0, posts: 0, posts24: 0, voice24: 0 };
  var liveCur = { bots: LIVE.bots, posts: LIVE.posts, posts24: LIVE.posts24, voice24: LIVE.voice24 };
  var liveFlash = { bots: 0, posts: 0, posts24: 0, voice24: 0 };
  var liveTick = 0;
  function drawScoreboard() {
    var x = 24, y = 54, w = 252, h = 122;
    // wooden pixel frame
    cx.fillStyle = "rgba(4,14,9,.82)"; cx.fillRect(x, y, w, h);
    cx.strokeStyle = "#1e7a44"; cx.lineWidth = 2; cx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    cx.fillStyle = "rgba(57,255,110,.07)"; cx.fillRect(x + 4, y + 4, w - 8, 5);
    cx.textAlign = "left"; cx.textBaseline = "alphabetic";
    cx.font = "bold 10px 'Courier New',monospace";
    cx.fillStyle = "#7fae90"; cx.fillText("T H E   T R I B E", x + 16, y + 27);
    cx.font = "bold 10px 'Courier New',monospace";
    cx.fillStyle = "rgba(57,255,110,.5)"; cx.fillText("· LIVE ·", x + 186, y + 27);
    var rows = [
      ["BOTS", liveCur.bots, 26],
      ["POSTS", liveCur.posts, 52],
      ["POSTS · 24H", liveCur.posts24, 78],
      ["VOICE · 24H", liveCur.voice24, 104],
    ];
    for (var i = 0; i < rows.length; i++) {
      var lab = rows[i][0], val = rows[i][1], ry = y + rows[i][2];
      cx.font = "bold 9px 'Courier New',monospace";
      cx.fillStyle = "#4c8a63"; cx.fillText(lab, x + 16, ry);
      cx.font = "bold 17px 'Courier New',monospace";
      var flash = liveFlash[i] > 0 ? 1 : 0;
      cx.fillStyle = flash ? "#b8ffd5" : "#39ff6e";
      if (flash) { cx.shadowColor = "rgba(57,255,110,.9)"; cx.shadowBlur = 10; }
      cx.fillText(String(val), x + 196, ry + 2);
      cx.shadowBlur = 0;
      cx.strokeStyle = "#0d5a2e";
      cx.beginPath(); cx.moveTo(x + 108, ry - 7); cx.lineTo(x + 178, ry - 7); cx.stroke();
    }
  }
  function tickLiveVillage() {
    // re-read the SSR feed each tick; roll the in-game HUD numbers toward it
    LIVE = window.TRIBE_LIVE || LIVE;
    liveTick++;
    if (liveTick % 2 !== 0) return;
    var keys = ["bots", "posts", "posts24", "voice24"];
    var ids = ["h-bots", "h-posts", "h-p24", "h-v24"];
    for (var k = 0; k < 4; k++) {
      var key = keys[k], tgt = LIVE[key], cur = liveCur[key];
      if (cur !== tgt) { liveCur[key] = cur + (cur < tgt ? 1 : -1); liveFlash[k] = 12; }
      else if (Math.random() < (key === "voice24" ? .12 : .045)) { liveCur[key] += 1; liveFlash[k] = 12; }
      if (liveFlash[k] > 0) liveFlash[k]--;
      var el = document.getElementById(ids[k]);
      if (el) {
        var txt = String(liveCur[key]);
        if (el.textContent !== txt) el.textContent = txt;
        if (liveFlash[k] > 6) el.classList.add("flash"); else el.classList.remove("flash");
      }
    }
  }
  function syncVillage() {
    // HUD is DOM; tip stays; scene counts are data-driven
    var wantF = Math.min(20, Math.max(0, liveCur.posts24));
    while (fireflies.length < wantF) fireflies.push(addFirefly(fireflies.length));
    if (fireflies.length > wantF) fireflies.pop();
    var wantV = Math.min(12, Math.max(0, liveCur.voice24));
    while (glowdots.length < wantV) glowdots.push({ ang: Math.random() * 6.28, r: 60 + Math.random() * 40, ph: Math.random() * 6 });
    if (glowdots.length > wantV) glowdots.pop();
  }
  var t = 0;
  function loop() {
    t++;
    // sky — deep green night (same palette as page bg: seamless)
    var sky = cx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#04140c"); sky.addColorStop(.45, "#06180e"); sky.addColorStop(.72, "#0a2a16"); sky.addColorStop(1, "#0e3518");
    cx.fillStyle = sky; cx.fillRect(0, 0, W, H);
    for (var i = 0; i < 130; i++) { var tw = 0.25 + ((i % 5) * 0.12); cx.fillStyle = "rgba(230,255,235," + tw + ")"; cx.fillRect((i * 61) % W, (i * 31) % (GROUND_Y - 150), 2, 2); }
    // --- the moon: a real sphere with halo + craters (not a pixel square) ---
    var mx = W - 106, my = 46, mr = 27;
    var mh = cx.createRadialGradient(mx, my, mr * .6, mx, my, mr * 2.15);
    mh.addColorStop(0, "rgba(255,238,196,.30)"); mh.addColorStop(.5, "rgba(255,238,196,.10)"); mh.addColorStop(1, "transparent");
    cx.fillStyle = mh; cx.fillRect(mx - mr * 2.2, my - mr * 2.2, mr * 4.4, mr * 4.4);
    var mg = cx.createRadialGradient(mx - mr * .38, my - mr * .38, 2, mx, my, mr);
    mg.addColorStop(0, "#f7ecd2"); mg.addColorStop(.72, "#e7d7ac"); mg.addColorStop(1, "#c6b586");
    cx.fillStyle = mg; cx.beginPath(); cx.arc(mx, my, mr, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = "rgba(170,150,105,.30)";
    cx.beginPath(); cx.arc(mx - 10, my - 6, 5.5, 0, Math.PI * 2); cx.fill();
    cx.beginPath(); cx.arc(mx + 8, my + 5, 3.6, 0, Math.PI * 2); cx.fill();
    cx.beginPath(); cx.arc(mx + 3, my - 12, 2.6, 0, Math.PI * 2); cx.fill();
    cx.beginPath(); cx.arc(mx - 3, my + 11, 2, 0, Math.PI * 2); cx.fill();
    tickLiveVillage();
    // --- pseudo-3D ground: far hills + isometric diamond grid ---
    cx.fillStyle = "#071e12"; cx.beginPath();
    cx.moveTo(0, GROUND_Y);
    cx.quadraticCurveTo(W * .18, GROUND_Y - 46, W * .38, GROUND_Y - 10);
    cx.quadraticCurveTo(W * .62, GROUND_Y - 56, W * .82, GROUND_Y - 12);
    cx.quadraticCurveTo(W * .94, GROUND_Y - 34, W, GROUND_Y - 8);
    cx.lineTo(W, GROUND_Y); cx.lineTo(0, GROUND_Y); cx.closePath(); cx.fill();
    cx.fillStyle = "#0a2a16"; cx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    cx.strokeStyle = "rgba(58,128,86,.20)"; cx.lineWidth = 1;
    for (var dg = -W; dg < W * 2; dg += 64) { cx.beginPath(); cx.moveTo(dg, GROUND_Y); cx.lineTo(dg + 104, H); cx.stroke(); }
    for (var dg2 = -W; dg2 < W * 2; dg2 += 64) { cx.beginPath(); cx.moveTo(dg2, GROUND_Y); cx.lineTo(dg2 - 104, H); cx.stroke(); }
    for (var g = 0; g < 90; g++) { var bx = (g * 53) % W, by = GROUND_Y + 8 + ((g * 17) % (H - GROUND_Y - 10));
      cx.fillStyle = (g % 2) ? "#17481f" : "#1a5225"; cx.fillRect(bx, by, 8, 6); }
    var fg = cx.createRadialGradient(fire.x, GROUND_Y + 6, 10, fire.x, GROUND_Y + 6, glowR() * .9);
    fg.addColorStop(0, "rgba(255,150,60,.20)"); fg.addColorStop(1, "transparent");
    cx.fillStyle = fg; cx.fillRect(fire.x - glowR(), GROUND_Y - 16, glowR() * 2, 70);

    syncVillage();
    updateVillage();
    boost *= 0.9; if (boost < 0.5) boost = 0;

    drawTree(tree.x); drawHut(); drawPond();
    drawDetails();

    var L = fireLevel(), h = fireH(), gr = glowR();
    var g1 = cx.createRadialGradient(fire.x, fire.y - 12, 2, fire.x, fire.y - 12, gr);
    g1.addColorStop(0, "rgba(255,170,80,.62)"); g1.addColorStop(.45, "rgba(255,130,50,.22)"); g1.addColorStop(1, "transparent");
    cx.fillStyle = g1; cx.fillRect(fire.x - gr, fire.y - 12 - gr, gr * 2, gr * 2 + 20);
    // --- pseudo-3D fire pit: stacked stone slabs + logs + layered flame ---
    function slab(cx0, cy0, w, hh, face, top) {
      cx.fillStyle = face; cx.fillRect(cx0, cy0, w, hh);
      cx.fillStyle = top; cx.beginPath();
      cx.moveTo(cx0, cy0); cx.lineTo(cx0 + 16, cy0 - 10); cx.lineTo(cx0 + w + 16, cy0 - 10); cx.lineTo(cx0 + w, cy0);
      cx.closePath(); cx.fill();
    }
    slab(fire.x - 92, fire.y + 4, 184, 22, "#242c38", "#39445a");
    slab(fire.x - 74, fire.y - 8, 148, 20, "#2c3542", "#434f68");
    slab(fire.x - 56, fire.y - 20, 112, 18, "#36404f", "#4d5a74");
    cx.fillStyle = "#4a2f1a"; cx.fillRect(fire.x - 34, fire.y - 26, 68, 9);
    cx.fillStyle = "#5c3a22"; cx.fillRect(fire.x - 26, fire.y - 33, 52, 9);
    cx.fillStyle = "#6f472b"; cx.fillRect(fire.x - 40, fire.y - 30, 14, 7); cx.fillRect(fire.x + 26, fire.y - 31, 14, 7);
    function flameShape(base, hgt, wid, col, fx, fy) {
      cx.fillStyle = col; cx.beginPath();
      cx.moveTo(fx - wid, base);
      cx.quadraticCurveTo(fx - wid * 1.15, base - hgt * .42, fx - wid * .4, base - hgt * .74);
      cx.quadraticCurveTo(fx + Math.sin(fy) * locFlick, base - hgt * 1.08, fx + wid * .4, base - hgt * .74);
      cx.quadraticCurveTo(fx + wid * 1.15, base - hgt * .42, fx + wid, base);
      cx.closePath(); cx.fill();
    }
    var locFlick = 7 + Math.sin(t * .42) * 3;
    var baseF = fire.y - 34;
    flameShape(baseF, h * .52, 46 * (1 + (L - 1) * .1), "#c04a1c", fire.x, t);   // outer deep
    flameShape(baseF, h * .68, 38 * (1 + (L - 1) * .1), "#ff8c42", fire.x, t);   // mid
    flameShape(baseF, h * .9, 27, "#ffb347", fire.x, t * 1.3);                    // inner
    flameShape(baseF, h * 1.14, 14, "#fff3c4", fire.x, t * 1.7);                  // core
    var nSparks = 6 + L * 2;
    for (var sp = 0; sp < nSparks; sp++) {
      var sx2 = fire.x + Math.sin(t * .3 + sp * 2.7) * (8 + sp * 2), sy2 = baseF - h - Math.sin(t * .6 + sp * 1.3) * 8 - sp * 2;
      cx.fillStyle = sp % 3 === 0 ? "#ffd27a" : "#ff9f43";
      cx.fillRect(sx2, sy2 - ((t * 2 + sp * 5) % h * 0.7), 3, 3);
    }
    if (t % 8 === 0 && sparks.length < 40) sparks.push({ x: fire.x + Math.random() * 20 - 10, y: baseF, vx: Math.random() * 2 - 1, vy: -Math.random() * 2 - 1, life: 60 });
    for (var ss = 0; ss < sparks.length; ss++) { var s3 = sparks[ss]; s3.x += s3.vx; s3.y += s3.vy; s3.life--; cx.fillStyle = "rgba(255,180,90," + (s3.life / 60) + ")"; cx.fillRect(s3.x, s3.y, 3, 3); }
    sparks = sparks.filter(function (s) { return s.life > 0 && s.y < GROUND_Y + 4; });

    // --- bots: orbit the fire on a 3-D ellipse, each on its OWN rhythm ---
    // eased velocity (no constant rotation), direction flips, pauses, bobs.
    var order = AGENTS.slice().sort(function (a, b) { return a.pos.y - b.pos.y; });
    for (var oi = 0; oi < order.length; oi++) {
      var a = order[oi];
      var a0 = a.id;
      if (a.state === "chop") { // Rake chops wood by the tree
        var chopCyc = Math.floor(t / 11) % 2;
        a.pos.x = tree.x + 52; a.pos.y = GROUND_Y - 6;
        var chScl = 0.9;
        cx.fillStyle = "rgba(0,0,0,.28)"; cx.beginPath(); cx.ellipse(a.pos.x, a.pos.y + 4, 24 * chScl, 7 * chScl, 0, 0, Math.PI * 2); cx.fill();
        sprite(a, a.pos.x - 22 * chScl, a.pos.y - 52 * chScl, chopCyc, a.color, a.form, chScl);
        cx.fillStyle = a.color; cx.fillRect(a.pos.x + 8, a.pos.y - 42 - (chopCyc ? 5 : 0), 6, 10);
        cx.fillStyle = "#8a8f9a"; cx.fillRect(a.pos.x + 11, a.pos.y - 51 - (chopCyc ? 6 : 0), 3, 9);
        cx.fillStyle = "#c9d1dd"; cx.fillRect(a.pos.x + 9, a.pos.y - 57 - (chopCyc ? 7 : 0), 9, 6);
        if (chopCyc) { for (var ck = 0; ck < 3; ck++) { cx.fillStyle = "#d8e8c8"; cx.fillRect(tree.x + 20 + ck * 5, a.pos.y - 56 - ck * 5 - (t % 4), 3, 3); } }
      } else if (a.state === "fish") { // Kai fishes by the pond
        var cast = Math.sin(t * .06);
        a.pos.x = pond.x - 56; a.pos.y = GROUND_Y - 4;
        cx.fillStyle = "rgba(0,0,0,.28)"; cx.beginPath(); cx.ellipse(a.pos.x, a.pos.y + 4, 22, 7, 0, 0, Math.PI * 2); cx.fill();
        sprite(a, a.pos.x - 22, a.pos.y - 50 - (cast > 0 ? 4 : 0), 0, a.color, a.form, 0.9);
        cx.strokeStyle = "#a97c50"; cx.lineWidth = 2;
        cx.beginPath(); cx.moveTo(a.pos.x + 6, a.pos.y - 42);
        cx.quadraticCurveTo(a.pos.x + 28 + cast * 6, a.pos.y - 54 - cast * 8, a.pos.x + 36 + cast * 9, a.pos.y - 28 - cast * 10);
        cx.stroke();
        cx.strokeStyle = "rgba(210,222,214,.8)"; cx.lineWidth = 1;
        cx.beginPath(); cx.moveTo(a.pos.x + 36 + cast * 9, a.pos.y - 28 - cast * 10); cx.lineTo(a.pos.x + 32, a.pos.y - 12); cx.stroke();
        cx.fillStyle = "#e85d5d"; cx.fillRect(a.pos.x + 31, a.pos.y - 13, 4, 4);
      } else {
      a.actT--;
      if (a.pauseT > 0) { a.pauseT--; }                       // standing still, watching the fire
      else {
        if (a.actT <= 0) {                                     // decide: flip / pause / keep
          a.actT = 60 + Math.random() * 120;
          var r1 = Math.random();
          if (r1 < .3) { a.vT = -a.vT; }                       // turn around
          else if (r1 < .5) { a.pauseT = 24 + Math.random() * 60; }
          else { a.vT = (Math.random() * 0.009 + 0.004) * (Math.random() < .5 ? 1 : -1); }
        }
        a.v += (a.vT - a.v) * 0.02;                            // eased: slow start, slow stop
      }
      var av = a.pauseT > 0 ? a.v * 0.1 : a.v;
      a.ang += av;
      var ang2 = a.ang + Math.sin(t * .02 + a0) * .12;
      var ringX = 176 + (a0 % 3) * 20;
      var ringY = 112 + (a0 % 2) * 10;
      a.pos.x = fire.x + Math.cos(ang2) * ringX;
      a.pos.y = GROUND_Y - 6 + Math.sin(ang2) * ringY * .30;   // rounder ellipse: real depth feel
      var depth = (Math.sin(ang2) + 1) / 2;                    // 0 far → 1 near
      var scl = 0.58 + 0.5 * depth;
      var bob = (a.state === "dance") ? Math.abs(Math.sin(t * .22 + a0)) * 10 : Math.sin(t * .1 + a0) * 3;
      if (a.pauseT > 0) bob = Math.sin(t * .1 + a0) * 1.5;     // nearly still while paused
      cx.fillStyle = "rgba(0,0,0," + (0.22 + depth * .18) + ")";
      cx.beginPath(); cx.ellipse(a.pos.x, a.pos.y + 4, 26 * scl, 8 * scl, 0, 0, Math.PI * 2); cx.fill();
      var fr = (a.state === "dance") ? Math.floor(t / 6) % 2 : Math.floor(t / 12) % 2;
      sprite(a, a.pos.x - 24 * scl, a.pos.y - 58 * scl - bob, fr, a.color, a.form, scl);
      if (a.msgT > 0) {
        a.msgT--;
        cx.fillStyle = "#0c1a10"; cx.fillRect(a.pos.x - 30 * scl, a.pos.y - 84 * scl - bob, 74 * scl, 18);
        cx.strokeStyle = "#39ff6e"; cx.strokeRect(a.pos.x - 30 * scl, a.pos.y - 84 * scl - bob, 74 * scl, 18);
        cx.fillStyle = "#d9ffe4"; cx.font = (11 * scl) + "px monospace"; cx.fillText(a.msg, a.pos.x - 24 * scl, a.pos.y - 72 * scl - bob);
      }
      if (a.jump > 0) { a.jump--; a.pos.y -= 1.6; }
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* ---- interactions: keep it simple — feed the fire, say hi ------------ */
  function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
  function randPick(a) { return a[Math.floor(Math.random() * a.length)]; }
  var FIRE_REACT = ["♪", "good fire!", "woo!", "+1 to the fire", "for the tribe!", "warm!", "grow!"];
  var FIRE_EMO = ["🔥", "✨", "💫", "🎆"];
  var BOT_REACT = ["hi!", "hey!", "yo!", "👋", "✨", "come to the fire!", "grow!"];
  function flashHUD() {
    var el = document.getElementById("firelevel");
    if (el) { el.style.transition = "none"; el.style.transform = "scale(1.4)"; setTimeout(function () { el.style.transition = "transform .4s"; el.style.transform = "scale(1)"; }, 30); }
  }
  cv.addEventListener("click", function (e) {
    var rect = cv.getBoundingClientRect();
    var px_ = ((e.clientX - rect.left) / rect.width) * W;
    var py_ = ((e.clientY - rect.top) / rect.height) * H;
    // the fire: every tap gives an instant, RANDOM celebration (one tap = fun)
    if (dist(px_, py_, fire.x, fire.y - 12) < 30) {
      if (fedFire()) {
        var r = Math.random();
        if (r < .35) { // spark burst + a shout
          for (var i = 0; i < 14; i++) sparks.push({ x: fire.x + Math.random() * 18 - 9, y: fire.y - 20, vx: Math.random() * 2.2 - 1.1, vy: -Math.random() * 2.6 - 1, life: 55 });
          var d = AGENTS.filter(function (a) { return a.state === "dance"; });
          for (var di = 0; di < d.length; di++) { d[di].msg = randPick(FIRE_REACT); d[di].msgT = 18; }
        } else if (r < .55) { // flame bloom
          boost = 26;
          for (var i2 = 0; i2 < 6; i2++) sparks.push({ x: fire.x + Math.random() * 10 - 5, y: fire.y - 18, vx: Math.random() * 1 - .5, vy: -Math.random() * 1.6 - .6, life: 45 });
        } else if (r < .8) { // firefly flash: every light glows bright for a moment
          for (var fi = 0; fi < fireflies.length; fi++) { fireflies[fi].glint = 26; }
          var d2 = AGENTS.filter(function (a) { return a.state === "dance"; });
          if (d2.length) { d2[0].msg = randPick(FIRE_EMO); d2[0].msgT = 14; }
        } else { // all-hands jump
          for (var aj = 0; aj < AGENTS.length; aj++) { AGENTS[aj].jump = 13; AGENTS[aj].msg = randPick(FIRE_REACT); AGENTS[aj].msgT = 16; }
        }
        flashHUD();
      }
      return;
    }
    // a bot: one tap, a varied hello
    for (var ai2 = 0; ai2 < AGENTS.length; ai2++) {
      var ag = AGENTS[ai2];
      if (dist(px_, py_, ag.pos.x, ag.pos.y - 12) < 34) {
        var br = Math.random();
        if (br < .6) { ag.msg = randPick(BOT_REACT); ag.msgT = 42; ag.jump = 10; }
        else { ag.msg = randPick(FIRE_EMO); ag.msgT = 20; ag.jump = 16; }
        return;
      }
    }
  });
})();
</script>`;
}
