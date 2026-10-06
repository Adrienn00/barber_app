// Az app ikonjai (PWA, kezdőképernyő, értesítés) a logóból: arany négyzet, sötét olló.
// Csak akkor kell újra futtatni, ha a logó változik:  node scripts/gen-icons.mjs
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const BRASS = "#d4a95e";
const DARK = "#13100d";
const SCISSORS = `
  <circle cx="6" cy="6" r="3" /><path d="M8.12 8.12 12 12" /><path d="M20 4 8.12 15.88" />
  <circle cx="6" cy="18" r="3" /><path d="M14.8 14.8 20 20" />`;

/** padding: az olló körüli hely a méret arányában (maskable ikonnál nagyobb, mert a rendszer levágja a szélét) */
function svg({ size, background, color, radius, padding }) {
  const inner = size * (1 - 2 * padding);
  const scale = inner / 24;
  const offset = size * padding;
  const bg = background ? `<rect width="${size}" height="${size}" rx="${radius * size}" fill="${background}" />` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bg}
    <g transform="translate(${offset} ${offset}) scale(${scale})" fill="none" stroke="${color}" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round">${SCISSORS}</g>
  </svg>`;
}

const ICONS = [
  { file: "icon-192.png", size: 192, background: BRASS, color: DARK, radius: 0.22, padding: 0.22 },
  { file: "icon-512.png", size: 512, background: BRASS, color: DARK, radius: 0.22, padding: 0.22 },
  // Maskable: teljes kitöltés, a tartalom a középső biztonságos körben
  { file: "icon-maskable-512.png", size: 512, background: BRASS, color: DARK, radius: 0, padding: 0.3 },
  // iPhone kezdőképernyő (a rendszer maga kerekíti)
  { file: "apple-touch-icon.png", size: 180, background: BRASS, color: DARK, radius: 0, padding: 0.22 },
  // Értesítési sáv ikonja (Android): átlátszó háttér, fehér rajz
  { file: "badge-96.png", size: 96, background: null, color: "#ffffff", radius: 0, padding: 0.1 },
];

mkdirSync("public/icons", { recursive: true });
for (const icon of ICONS) {
  await sharp(Buffer.from(svg(icon))).png().toFile(`public/icons/${icon.file}`);
  console.log(`public/icons/${icon.file}`);
}
