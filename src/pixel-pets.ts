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
