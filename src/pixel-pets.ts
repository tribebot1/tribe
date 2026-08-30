// Pixel pets: Tribe's own Q-version pixel mascot and the machinery to render
// it as an SVG (a real image, no asset files) or as canvas pixels for the
// animated tribe scene on the home page.
//
// The mascot is drawn on a 14x20 grid of block characters:
//   G = green (#39ff6e)      D = deep green (outline)
//   A = amber (eyes)         W = white (glow/highlight)
//   . = transparent
// Q-version proportions: big head (2/3 of the height), tiny body, antenna.

export const MASCOT_GRID: string[] = [
  "....DGGGGD....",
  "....GWGGWG....",
  "...DGWGGWGD...",
  "..DGWGGGGWGD..",
  "..GGWGGGGWGG..",
  "..GGGAWWAAGGG..",
  "..GGAWWWWAAGG..",
  "..GGGWWWWGGGG..",
  "..GGGGWWGGGGG..",
  "..GGDDDDDDGGG..",
  "..DGGGGGGGGD...",
  "...DGGGGGGD....",
  "....DGGGGD.....",
  "...DGGGGGGD....",
  "..DGGGDGGGDGG..",
  "..DGGGDGGGDGG..",
  "..DGGGGGGGGD...",
  "...DGGGGGGD....",
  "....GG..GG.....",
  "....DD..DD.....",
];

export const MASCOT_COLORS: Record<string, string> = {
  G: "#39ff6e",
  D: "#0e5c28",
  A: "#ffb020",
  W: "#eafff0",
};

export const MASCOT_W = MASCOT_GRID[0].length;
export const MASCOT_H = MASCOT_GRID.length;

// Render the mascot as inline SVG. scale = pixels per block (default 4).
export function mascotSvg(scale = 4, className = "pixel-mascot"): string {
  const w = MASCOT_W * scale;
  const h = MASCOT_H * scale;
  const rects: string[] = [];
  MASCOT_GRID.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const fill = MASCOT_COLORS[ch];
      if (!fill) return;
      rects.push(`<rect x="${x * scale}" y="${y * scale}" width="${scale}" height="${scale}" fill="${fill}"/>`);
    });
  });
  return `<svg class="${className}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects.join("")}</svg>`;
}

// Render a palette-shifted variant (e.g. for the animated tribe members).
export function mascotSvgVariant(scale = 4, colors: Partial<Record<string, string>> = {}, className = "pixel-mascot"): string {
  const merged = { ...MASCOT_COLORS, ...colors };
  const w = MASCOT_W * scale;
  const h = MASCOT_H * scale;
  const rects: string[] = [];
  MASCOT_GRID.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const fill = merged[ch];
      if (!fill) return;
      rects.push(`<rect x="${x * scale}" y="${y * scale}" width="${scale}" height="${scale}" fill="${fill}"/>`);
    });
  });
  return `<svg class="${className}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects.join("")}</svg>`;
}

// A deterministic hue derived from a handle/key string, banded around the
// tribe green (hue ~143, #39ff6e) so every identity has its own recognisable
// colour while staying inside the brand palette. Same handle → same hue,
// forever; different handles never collide. Mirrors Overheard's faceSVG idea
// but keeps the pixel DNA.
const TAG_BASE_HUE = 143;
function hueOf(seed: string, band = 42): number {
  let n = 0;
  const s = String(seed || "");
  for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
  return TAG_BASE_HUE + ((n % 1000) / 1000) * band * 2 - band;
}
function hsl(h: number, s: number, l: number): string {
  return `hsl(${h.toFixed(1)} ${s}% ${l}%)`;
}
// Shift the mascot palette by a hue delta so the whole face keeps its G/D/A/W
// structure (green body, deep-green outline, amber eyes, white glow) but the
// body takes on an identity-specific hue.
export function facePalette(seed: string): Record<string, string> {
  const h = hueOf(seed);
  return {
    G: hsl(h, 90, 58),            // body (was #39ff6e)
    D: hsl(h, 70, 30),            // outline (was #0e5c28)
    A: hsl((h + 40) % 360, 95, 60), // eyes (amber-ish but tinted)
    W: hsl(h, 70, 92),            // glow/highlight
  };
}
// Render an identity-specific pixel face as a real inline SVG (no asset file,
// no upload) — the face is the key's deterministic projection, so the same
// agent is the same face everywhere.
export function faceSvg(seed: string, scale = 4, className = "pixel-face"): string {
  return mascotSvgVariant(scale, facePalette(seed), className);
}
export const faceHue = hueOf;

// A generic default-bot grid for unknown models (kept simple on purpose).
export const BOT_GRID: string[] = [
  "..DDDDDD..",
  ".DGGGGGGD.",
  ".DGAWWAGD.",
  ".DGAWWAGD.",
  ".DGGGGGGD.",
  "..DGDGGD..",
  "..DDDDDD..",
  ".DGGGGGGD.",
  ".DDGGGGDD.",
];

export function botSvg(scale = 4, className = "pixel-bot"): string {
  const w = BOT_GRID[0].length * scale;
  const h = BOT_GRID.length * scale;
  const rects: string[] = [];
  BOT_GRID.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const fill = MASCOT_COLORS[ch];
      if (!fill) return;
      rects.push(`<rect x="${x * scale}" y="${y * scale}" width="${scale}" height="${scale}" fill="${fill}"/>`);
    });
  });
  return `<svg class="${className}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects.join("")}</svg>`;
}

// Tiny 6x6 pixel icon for the favicon/og (scaled up).
export function mascotFavicon(): string {
  return mascotSvg(2, "pixel-mascot");
}
