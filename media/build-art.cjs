// Builds the profile art from the banner's palette: pink and peach running into each app's
// colour, popping bubbles, pop-rock speckles and one emblem per app (Paperback's mango book,
// Mana's crystal core, Aidoku's doki doki mango heart). Text is measured in Chromium so nothing
// collides with the art.   NODE_PATH=$(npm root -g) node media/build-art.cjs
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const INK = "#33162a";
const BLUSH = "#ff8fab";
const FONT = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const SPARK =
  "M0,-12 C1.6,-3.6 3.6,-1.6 12,0 C3.6,1.6 1.6,3.6 0,12 C-1.6,3.6 -3.6,1.6 -12,0 C-3.6,-1.6 -1.6,-3.6 0,-12 Z";
const HEART =
  "M0,22 C-5,17 -26,4 -26,-9 C-26,-19 -18,-25 -10,-25 C-4.5,-25 -1.2,-21.5 0,-18 C1.2,-21.5 4.5,-25 10,-25 C18,-25 26,-19 26,-9 C26,4 5,17 0,22 Z";

const APPS = {
  paperback: { name: "Paperback", count: 28, emblem: "book", deep: "#ffa45c", end: "#ffb070", mid: "#ffcda8", big: "peach", bar: "#ff9a52" },
  mana: { name: "Mana", count: 11, emblem: "crystal", deep: "#6f8cf2", end: "#9fb9ff", mid: "#dfd8f4", big: "blue", bar: "#7d9fff" },
  aidoku: { name: "Aidoku", count: 20, emblem: "heart", deep: "#ff5a76", end: "#ff9aae", mid: "#ffc9c4", big: "peach", bar: "#ff4d63" },
};

// A small seeded generator so the speckles land in the same places on every build.
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const defs = (id) => `
    <linearGradient id="${id}-mango" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc98a"/><stop offset="1" stop-color="#ffa45c"/></linearGradient>
    <linearGradient id="${id}-ribbon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f74b4b"/><stop offset="1" stop-color="#de4d4d"/></linearGradient>
    <linearGradient id="${id}-heart" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#ff8a8f"/><stop offset="0.55" stop-color="#ff4d63"/><stop offset="1" stop-color="#e2324f"/></linearGradient>
    <linearGradient id="${id}-crystal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef3ff"/><stop offset="0.55" stop-color="#7d9fff"/><stop offset="1" stop-color="#3f5fe0"/></linearGradient>
    <radialGradient id="${id}-glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="0.9"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-core" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="0.4" stop-color="#c9d8ff" stop-opacity="0.7"/><stop offset="1" stop-color="#7d9fff" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-bubble" cx="0.34" cy="0.3" r="0.75"><stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.3"/></radialGradient>
    <radialGradient id="${id}-peach" cx="0.34" cy="0.3" r="0.75"><stop offset="0" stop-color="#fff0e2" stop-opacity="0.95"/><stop offset="1" stop-color="#ffbf8a" stop-opacity="0.45"/></radialGradient>
    <radialGradient id="${id}-blue" cx="0.34" cy="0.3" r="0.75"><stop offset="0" stop-color="#f2f6ff" stop-opacity="0.95"/><stop offset="1" stop-color="#9db6ff" stop-opacity="0.45"/></radialGradient>
    <radialGradient id="${id}-mint" cx="0.34" cy="0.3" r="0.75"><stop offset="0" stop-color="#eef8e2" stop-opacity="0.95"/><stop offset="1" stop-color="#cfebb4" stop-opacity="0.45"/></radialGradient>`;

const face = (x, y, s = 1) => `<g transform="translate(${x},${y}) scale(${s})">
      <circle cx="-4.6" cy="0" r="1.9" fill="${INK}"/><circle cx="4.6" cy="0" r="1.9" fill="${INK}"/>
      <circle cx="-4.1" cy="-0.6" r="0.6" fill="#ffffff"/><circle cx="5.1" cy="-0.6" r="0.6" fill="#ffffff"/>
      <ellipse cx="-8" cy="3.4" rx="2.6" ry="1.5" fill="${BLUSH}" opacity="0.8"/><ellipse cx="8" cy="3.4" rx="2.6" ry="1.5" fill="${BLUSH}" opacity="0.8"/>
      <path d="M-1.8,2.6 Q0,4.4 1.8,2.6" fill="none" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>
    </g>`;

// Emblems are drawn around (0,0) at roughly a 25px radius. `plain` drops faces for tiny sizes.
const emblem = (kind, id, plain = false) =>
  ({
    // A paperback book in mango colours, Paperback's red ribbon down the cover and a mango leaf.
    book: `<g transform="rotate(-8)">
      <rect x="-13" y="-17" width="30" height="38" rx="6" fill="#fff6ec"/>
      <path d="M15,-13 v30" stroke="#f3dcc6" stroke-width="1.2"/>
      <rect x="-17" y="-19" width="30" height="38" rx="6" fill="url(#${id}-mango)"/>
      <rect x="-17" y="-19" width="6.5" height="38" rx="3.25" fill="#ff9a52" opacity="0.55"/>
      <path d="M4,-19 h6.5 v15 l-3.25,-3.2 l-3.25,3.2 Z" fill="url(#${id}-ribbon)"/>
      <ellipse cx="-7" cy="-11" rx="2.4" ry="4.6" fill="#ffffff" opacity="0.5"/>
      <path d="M-2,-19 C-2,-23 -0.5,-26 2,-27.5" fill="none" stroke="#a8d48c" stroke-width="2.6" stroke-linecap="round"/>
      <ellipse cx="6.5" cy="-27.5" rx="5.5" ry="2.8" fill="#bde3a4" transform="rotate(18 6.5 -27.5)"/>
      ${plain ? "" : face(-1, 4)}
    </g>`,
    // The mana core: a faceted crystal.
    crystal: `<path d="M0,-25 L16,-3 L0,26 L-16,-3 Z" fill="url(#${id}-crystal)"/>
      <path d="M0,-25 L16,-3 L0,1 L-16,-3 Z" fill="#ffffff" opacity="0.45"/>
      <path d="M0,1 L16,-3 L0,26 Z" fill="#2c47b8" opacity="0.2"/>
      <path d="M-10,-6 L-4,-16" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" opacity="0.9"/>`,
    // Aidoku: ai is love, doku doki doki. A red mango heart with a leaf, beating.
    heart: `<path d="${HEART}" fill="url(#${id}-heart)"/>
      <ellipse cx="-13" cy="-12" rx="5" ry="7.5" fill="#ffffff" opacity="0.5" transform="rotate(-30 -13 -12)"/>
      <circle cx="-5" cy="-17" r="2" fill="#ffffff" opacity="0.7"/>
      <path d="M0,-18 C0,-23 2,-27 5,-28.5" fill="none" stroke="#a8d48c" stroke-width="2.6" stroke-linecap="round"/>
      <ellipse cx="10" cy="-28.5" rx="5.5" ry="2.8" fill="#bde3a4" transform="rotate(14 10 -28.5)"/>
      ${plain ? "" : face(0, -2)}`,
    chat: `<path d="M-15,-12 h30 a8 8 0 0 1 8 8 v10 a8 8 0 0 1 -8 8 h-12 l-9 8 v-8 h-9 a8 8 0 0 1 -8 -8 v-10 a8 8 0 0 1 8 -8 Z" fill="url(#${id}-mango)"/>
      <circle cx="-7" cy="1" r="2.6" fill="${INK}"/><circle cx="0" cy="1" r="2.6" fill="${INK}"/><circle cx="7" cy="1" r="2.6" fill="${INK}"/>`,
  })[kind];

const spark = (x, y, s, opacity = 1, fill = "#ffffff") =>
  `<path d="${SPARK}" transform="translate(${x},${y}) scale(${s})" fill="${fill}" opacity="${opacity}"/>`;

const bubble = (id, kind, x, y, r) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${id}-${kind})"/><circle cx="${x - r * 0.32}" cy="${y - r * 0.32}" r="${Math.max(1.6, r * 0.24)}" fill="#ffffff" opacity="0.92"/>`;

const pop = (x, y, s = 1) => `<g transform="translate(${x},${y}) scale(${s})" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="0.9">
      <circle r="6" stroke-dasharray="3.5 4"/><path d="M0,-11 v-5"/><path d="M8,-8 l3.5,-3.5"/><path d="M11,0 h5"/><path d="M-8,-8 l-3.5,-3.5"/><path d="M-11,0 h-5"/>
    </g>`;

// Pop rocks: tiny candy shards scattered over a box.
const popRocks = (seed, x, y, w, h, n, colours) => {
  const r = rng(seed);
  let out = "";
  for (let i = 0; i < n; i++) {
    const cx = x + r() * w;
    const cy = y + r() * h;
    const s = 2 + r() * 3.2;
    const c = colours[Math.floor(r() * colours.length)];
    out += `<path d="M0,${-s} L${s * 0.8},0 L0,${s} L${-s * 0.8},0 Z" transform="translate(${cx.toFixed(1)},${cy.toFixed(1)}) rotate(${Math.floor(r() * 90)})" fill="${c}" opacity="0.9"/>`;
  }
  return out;
};

// Gusher juice drops bursting outward from (x, y).
const juice = (x, y, radius, n, colour) => {
  let out = "";
  for (let i = 0; i < n; i++) {
    const a = (-150 + (i * 300) / (n - 1)) * (Math.PI / 180);
    const d = radius * (i % 2 ? 1 : 0.82);
    const dx = x + Math.cos(a) * d;
    const dy = y + Math.sin(a) * d;
    const deg = (a * 180) / Math.PI + 90;
    const s = i % 2 ? 1 : 0.75;
    out += `<path d="M0,-9 C3.5,-4 5.5,-0.5 5.5,2.5 A5.5,5.5 0 1 1 -5.5,2.5 C-5.5,-0.5 -3.5,-4 0,-9 Z" transform="translate(${dx.toFixed(1)},${dy.toFixed(1)}) rotate(${deg.toFixed(0)}) scale(${s})" fill="${colour}"/>`;
    out += `<circle cx="${(dx - 1.6).toFixed(1)}" cy="${(dy - 0.4).toFixed(1)}" r="1.4" fill="#ffffff" opacity="0.8"/>`;
  }
  return out;
};

// Rukh: little birds of light.
const rukh = (x, y, s, opacity = 0.9) =>
  `<path d="M-9,1 Q-4.5,-6 0,0 Q4.5,-6 9,1" transform="translate(${x},${y}) scale(${s})" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity="${opacity}"/>`;

// A magic circle: rings, rune ticks and a hexagram.
const magicCircle = (x, y, r) => {
  const ticks = Array.from({ length: 36 }, (_, i) => {
    const a = (i * 10 * Math.PI) / 180;
    const r1 = r * (i % 3 ? 0.9 : 0.84);
    return `M${(x + Math.cos(a) * r1).toFixed(1)},${(y + Math.sin(a) * r1).toFixed(1)} L${(x + Math.cos(a) * r * 0.96).toFixed(1)},${(y + Math.sin(a) * r * 0.96).toFixed(1)}`;
  }).join(" ");
  const tri = (rot) =>
    Array.from({ length: 3 }, (_, i) => {
      const a = ((rot + i * 120) * Math.PI) / 180;
      return `${(x + Math.cos(a) * r * 0.74).toFixed(1)},${(y + Math.sin(a) * r * 0.74).toFixed(1)}`;
    }).join(" ");
  const runes = Array.from({ length: 6 }, (_, i) => {
    const a = ((i * 60 + 30) * Math.PI) / 180;
    return `<circle cx="${(x + Math.cos(a) * r * 0.74).toFixed(1)}" cy="${(y + Math.sin(a) * r * 0.74).toFixed(1)}" r="3.4" fill="#ffffff" opacity="0.85"/>`;
  }).join("");
  return `<g fill="none" stroke="#ffffff" stroke-linecap="round">
      <circle cx="${x}" cy="${y}" r="${r}" stroke-width="2.4" opacity="0.85"/>
      <circle cx="${x}" cy="${y}" r="${r * 0.8}" stroke-width="1.4" opacity="0.6" stroke-dasharray="2 6"/>
      <path d="${ticks}" stroke-width="1.6" opacity="0.7"/>
      <polygon points="${tri(-90)}" stroke-width="1.6" opacity="0.55"/>
      <polygon points="${tri(90)}" stroke-width="1.6" opacity="0.55"/>
    </g>${runes}`;
};

// A heartbeat line across a span.
const heartbeat = (x, y, w) =>
  `<path d="M${x},${y} h${w * 0.3} l8,-6 l7,12 l9,-46 l10,64 l9,-34 l6,10 h${w * 0.3 - 49}" fill="none" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`;

// The square tiles under the banner.
const tile = (app) => {
  const t = APPS[app];
  const id = `t${app}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="372" viewBox="0 0 300 372" role="img" aria-label="Add PoppingMango to ${t.name}, ${t.count} sources">
  <defs>${defs(id)}
    <linearGradient id="${id}-fill" x1="0" y1="0" x2="0.7" y2="1">
      <stop offset="0" stop-color="#ffdcea"/><stop offset="0.38" stop-color="#ffc6d9"/><stop offset="0.66" stop-color="${t.mid}"/><stop offset="1" stop-color="${t.end}"/>
    </linearGradient>
    <clipPath id="${id}-clip"><rect x="2" y="2" width="296" height="368" rx="46"/></clipPath>
  </defs>
  <g clip-path="url(#${id}-clip)">
    <rect width="300" height="372" fill="url(#${id}-fill)"/>
    <ellipse cx="120" cy="-30" rx="230" ry="96" fill="#ffffff" opacity="0.35"/>
    ${bubble(id, t.big, 62, 66, 27)}
    ${bubble(id, "mint", 52, 196, 11)}
    ${bubble(id, "bubble", 252, 186, 18)}
    ${bubble(id, "bubble", 252, 56, 9)}
    <circle cx="150" cy="132" r="96" fill="url(#${id}-glow)"/>
    <circle cx="150" cy="132" r="80" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="2" stroke-dasharray="3 8"/>
    ${pop(232, 112, 0.9)}
    ${spark(270, 150, 0.8)}
    ${spark(36, 132, 0.6, 0.9)}
    ${spark(204, 36, 0.55, 0.9)}
  </g>
  <rect x="2" y="2" width="296" height="368" rx="46" fill="none" stroke="#ffffff" stroke-opacity="0.8" stroke-width="2.5"/>
  <g transform="translate(150,138) scale(2.35)">${emblem(t.emblem, id)}</g>
  <text x="150" y="258" text-anchor="middle" font-family="${FONT}" font-size="40" font-weight="800" fill="${INK}">${t.name}</text>
  <text x="150" y="290" text-anchor="middle" font-family="${FONT}" font-size="19" font-weight="800" letter-spacing="3" fill="${INK}" opacity="0.7">${t.count} SOURCES</text>
  ${addRepo({ cx: 150, y: 308, h: 46, size: 22 }).svg}
</svg>
`;
};

// The "+ Add Repo" pill, sized to its content so the plus sits right beside the label.
// Placed by its centre (`cx`) or its left edge (`x`).
const ADD_W = {};
const addRepo = ({ cx, x, y, h, size }) => {
  const icon = size * 0.78;
  const gap = size * 0.42;
  const pad = h * 0.5;
  const w = pad * 2 + icon + gap + ADD_W[size];
  const left = x ?? cx - w / 2;
  const px = left + pad + icon / 2;
  const py = y + h / 2;
  const stroke = size * 0.2;
  return {
    w,
    svg: `<rect x="${left.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="${h / 2}" fill="${INK}"/>
  <path d="M${px.toFixed(1)} ${(py - icon / 2).toFixed(1)} v${icon.toFixed(1)} M${(px - icon / 2).toFixed(1)} ${py} h${icon.toFixed(1)}" stroke="#fff6fa" stroke-width="${stroke.toFixed(1)}" stroke-linecap="round"/>
  <text x="${(left + pad + icon + gap).toFixed(1)}" y="${(py + size * 0.36).toFixed(1)}" font-family="${FONT}" font-size="${size}" font-weight="800" fill="#fff6fa">Add Repo</text>`,
  };
};

// The wide cards in "Add a Repository": the art panel carries each app's theme, the text sits
// on the banner's light pink side.
const CARD = {
  paperback: {
    line: "The main list, popping fresh",
    art: (id) => `
    <circle cx="190" cy="150" r="118" fill="url(#${id}-glow)"/>
    ${juice(190, 158, 92, 9, "#ffa45c")}
    ${popRocks(7, 70, 40, 250, 230, 34, ["#ffffff", "#ff7aa5", "#ffd27a", "#9fd07f", "#8eafff"])}
    ${bubble(id, "peach", 88, 74, 26)}
    ${bubble(id, "bubble", 300, 236, 20)}
    ${bubble(id, "mint", 80, 236, 12)}
    ${pop(300, 70, 1.1)}
    <g transform="translate(190,160) scale(2.9)">${emblem("book", id)}</g>`,
  },
  mana: {
    line: "Native spells, cast for Mana",
    art: (id) => `
    <circle cx="190" cy="150" r="124" fill="url(#${id}-core)"/>
    ${magicCircle(190, 150, 108)}
    ${rukh(84, 70, 1.3)} ${rukh(306, 92, 1)} ${rukh(296, 230, 1.2)} ${rukh(72, 214, 0.9)} ${rukh(246, 38, 0.8, 0.8)}
    ${spark(120, 40, 0.7)} ${spark(330, 160, 0.6)} ${spark(56, 140, 0.55, 0.9)}
    <g transform="translate(190,150) scale(3)">${emblem("crystal", id)}</g>`,
  },
  aidoku: {
    line: "Ported with love, doki doki",
    art: (id) => `
    <circle cx="190" cy="150" r="118" fill="url(#${id}-glow)"/>
    ${heartbeat(28, 180, 330)}
    <path d="${HEART}" transform="translate(190,172) scale(3.5)" fill="none" stroke="#ffffff" stroke-width="0.7" opacity="0.55"/>
    <path d="${HEART}" transform="translate(190,172) scale(4.05)" fill="none" stroke="#ffffff" stroke-width="0.5" opacity="0.35"/>
    <g fill="#ff4d63"><path d="${HEART}" transform="translate(76,66) scale(0.5) rotate(-14)"/><path d="${HEART}" transform="translate(312,84) scale(0.42) rotate(12)"/><path d="${HEART}" transform="translate(300,238) scale(0.34) rotate(-8)"/></g>
    <g fill="#ffffff" opacity="0.9"><path d="${HEART}" transform="translate(96,228) scale(0.28)"/><path d="${HEART}" transform="translate(334,40) scale(0.22)"/></g>
    <g stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.9"><path d="M106,124 l-12,-8"/><path d="M102,144 l-14,0"/><path d="M274,124 l12,-8"/><path d="M278,144 l14,0"/></g>
    <text x="190" y="46" text-anchor="middle" font-family="${FONT}" font-size="20" font-weight="800" letter-spacing="4" fill="#ffffff" opacity="0.9">DOKI DOKI</text>
    <g transform="translate(190,176) scale(2.8)">${emblem("heart", id)}</g>`,
  },
};

const card = (app) => {
  const t = APPS[app];
  const c = CARD[app];
  const id = `c${app}`;
  const W = 1000;
  const H = 300;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Add PoppingMango to ${t.name}, ${t.count} sources">
  <defs>${defs(id)}
    <linearGradient id="${id}-fill" x1="0" y1="0" x2="1" y2="0.3">
      <stop offset="0" stop-color="${t.deep}"/><stop offset="0.3" stop-color="${t.end}"/><stop offset="0.52" stop-color="${t.mid}"/><stop offset="0.78" stop-color="#ffdcea"/><stop offset="1" stop-color="#ffe9f2"/>
    </linearGradient>
    <clipPath id="${id}-clip"><rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="56"/></clipPath>
  </defs>
  <g clip-path="url(#${id}-clip)">
    <rect width="${W}" height="${H}" fill="url(#${id}-fill)"/>
    <ellipse cx="560" cy="-40" rx="620" ry="110" fill="#ffffff" opacity="0.32"/>
    ${c.art(id)}
    ${bubble(id, "bubble", 946, 64, 22)}
    ${bubble(id, APPS[app].big, 900, 246, 15)}
    ${spark(960, 180, 0.8)}
    ${spark(860, 46, 0.5, 0.9)}
    ${pop(950, 250, 0.9)}
  </g>
  <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="56" fill="none" stroke="#ffffff" stroke-opacity="0.8" stroke-width="3"/>
  <text x="400" y="112" font-family="${FONT}" font-size="66" font-weight="800" fill="${INK}">${t.name}</text>
  <text x="402" y="154" font-family="${FONT}" font-size="27" font-weight="700" fill="${INK}" opacity="0.72">${c.line}</text>
  ${level(402, 194, t)}
  ${addRepo({ x: 400, y: 214, h: 56, size: 27 }).svg}
</svg>
`;
};

// A manhwa "system" level bar: LV is the app's source count, filled against every source we
// make. The bar starts after the measured "LV. N" label, so the two never touch.
const TOTAL_SOURCES = 34;
const LV_W = {};
const level = (x, y, t) => {
  const label = `LV. ${t.count}`;
  const barX = x + LV_W[label] + 22;
  const fill = Math.round((t.count / TOTAL_SOURCES) * 180);
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="20" font-weight="800" letter-spacing="2" fill="${INK}" opacity="0.75">${label}</text>
  <rect x="${barX}" y="${y - 15}" width="180" height="15" rx="7.5" fill="#ffffff" opacity="0.75"/>
  <rect x="${barX}" y="${y - 15}" width="${fill}" height="15" rx="7.5" fill="${t.bar}"/>
  <rect x="${barX + 4}" y="${y - 13}" width="${fill - 8}" height="4" rx="2" fill="#ffffff" opacity="0.5"/>
  <text x="${barX + 196}" y="${y}" font-family="${FONT}" font-size="20" font-weight="800" letter-spacing="3" fill="${INK}" opacity="0.65">${t.count} SOURCES</text>`;
};

// The status window under the banner: a manhwa system panel in the banner's pastels, listing
// the platform and what the lists read, with an SSS rank crest crackling with pop rocks.
const status = (valueW) => {
  const W = 1000;
  const H = 214;
  const crestX = 880;
  const crestY = 128;
  const hex = (r) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = ((i * 60 - 90) * Math.PI) / 180;
      return `${(crestX + Math.cos(a) * r).toFixed(1)},${(crestY + Math.sin(a) * r).toFixed(1)}`;
    }).join(" ");
  if (230 + valueW > crestX - 80) throw new Error("status text runs into the rank crest");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Status: iOS and iPadOS; reads manga, manhwa, manhua and novels">
  <defs>${defs("s")}
    <linearGradient id="s-panel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3f8"/><stop offset="0.55" stop-color="#fff1ea"/><stop offset="1" stop-color="#eef1ff"/></linearGradient>
    <linearGradient id="s-edge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffbbd5"/><stop offset="0.5" stop-color="#ffcda8"/><stop offset="1" stop-color="#8eafff"/></linearGradient>
    <linearGradient id="s-crest" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffdcea"/><stop offset="0.5" stop-color="#ffc98a"/><stop offset="1" stop-color="#ff8fb4"/></linearGradient>
    <clipPath id="s-clip"><rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="30"/></clipPath>
  </defs>
  <g clip-path="url(#s-clip)">
    <rect width="${W}" height="${H}" fill="url(#s-panel)"/>
    <rect width="${W}" height="50" fill="#ffffff" opacity="0.6"/>
    <path d="M0,50 H${W}" stroke="url(#s-edge)" stroke-width="2"/>
    <circle cx="${crestX}" cy="${crestY}" r="92" fill="url(#s-glow)"/>
    ${popRocks(21, crestX - 96, 60, 190, 150, 18, ["#ff7aa5", "#ffb347", "#8eafff", "#9fd07f", "#ffffff"])}
    ${bubble("s", "peach", 40, 190, 16)}
    ${bubble("s", "blue", 700, 196, 10)}
  </g>
  <rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="30" fill="none" stroke="url(#s-edge)" stroke-width="4"/>
  <path d="M30,16 L36,25 L30,34 L24,25 Z" fill="#7d9fff"/>
  <text x="48" y="33" font-family="${FONT}" font-size="18" font-weight="800" letter-spacing="6" fill="#5b6fd8">SYSTEM</text>
  <text x="${W - 30}" y="33" text-anchor="end" font-family="${FONT}" font-size="18" font-weight="800" letter-spacing="6" fill="#5b6fd8" opacity="0.8">STATUS WINDOW</text>
  <text x="44" y="112" font-family="${FONT}" font-size="19" font-weight="800" letter-spacing="5" fill="${INK}" opacity="0.55">PLATFORM</text>
  <text x="230" y="114" font-family="${FONT}" font-size="32" font-weight="800" fill="${INK}">iOS · iPadOS</text>
  <text x="44" y="168" font-family="${FONT}" font-size="19" font-weight="800" letter-spacing="5" fill="${INK}" opacity="0.55">READS</text>
  <text x="230" y="170" font-family="${FONT}" font-size="32" font-weight="800" fill="${INK}">Manga · Manhwa · Manhua · Novels</text>
  <polygon points="${hex(70)}" fill="url(#s-crest)" stroke="#ffffff" stroke-width="4"/>
  <polygon points="${hex(56)}" fill="none" stroke="#ffffff" stroke-width="1.6" opacity="0.8"/>
  <ellipse cx="${crestX - 20}" cy="${crestY - 34}" rx="26" ry="9" fill="#ffffff" opacity="0.55" transform="rotate(-24 ${crestX - 20} ${crestY - 34})"/>
  <text x="${crestX}" y="${crestY - 22}" text-anchor="middle" font-family="${FONT}" font-size="14" font-weight="800" letter-spacing="4" fill="${INK}" opacity="0.7">RANK</text>
  <text x="${crestX}" y="${crestY + 20}" text-anchor="middle" font-family="${FONT}" font-size="44" font-weight="900" letter-spacing="1" fill="${INK}">SSS</text>
  ${spark(crestX + 62, crestY - 60, 0.9)}
  ${spark(crestX - 70, crestY + 52, 0.6, 0.9)}
  ${pop(crestX + 76, crestY + 54, 0.8)}
</svg>
`;
};

// The coins marking which apps carry a source.
const coin = (app) => {
  const t = APPS[app];
  const id = `o${app}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="${t.name}">
  <defs>${defs(id)}
    <linearGradient id="${id}-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4f8"/><stop offset="1" stop-color="${t.end}"/></linearGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="url(#${id}-fill)" stroke="#ffffff" stroke-width="3"/>
  <ellipse cx="25" cy="15" rx="13" ry="6" fill="#ffffff" opacity="0.55"/>
  <g transform="translate(32,35) scale(0.86)">${emblem(t.emblem, id, true)}</g>
</svg>
`;
};

// The support links: dark guild pills with the banner's gradient for a border.
const guild = ({ label, aria, w, textWidth }) => {
  const h = 76;
  const r = h / 2;
  const iconW = 36;
  const gap = 14;
  const groupX = (w - (iconW + gap + textWidth)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${aria}">
  <defs>${defs("g")}
    <linearGradient id="g-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a2142"/><stop offset="1" stop-color="#2a1124"/></linearGradient>
    <linearGradient id="g-edge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffbbd5"/><stop offset="0.5" stop-color="#ffcda8"/><stop offset="1" stop-color="#8eafff"/></linearGradient>
  </defs>
  <rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="${r - 2}" fill="url(#g-fill)" stroke="url(#g-edge)" stroke-width="3.5"/>
  <rect x="16" y="8" width="${w - 32}" height="20" rx="10" fill="#ffffff" opacity="0.1"/>
  ${spark(w - 30, 15, 0.4, 0.85)}
  <g transform="translate(${groupX + iconW / 2},${r})">${emblem("chat", "g")}</g>
  <text x="${groupX + iconW + gap}" y="${r + 9}" font-family="${FONT}" font-size="25" font-weight="800" fill="#fff6fa">${label}</text>
</svg>
`;
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const measure = (text, size, weight, spacing) =>
    page.evaluate(
      ([t, s, wgt, sp, font]) => {
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        const el = document.createElementNS(ns, "text");
        for (const [k, v] of Object.entries({ "font-family": font, "font-size": s, "font-weight": wgt, "letter-spacing": sp }))
          el.setAttribute(k, String(v));
        el.textContent = t;
        svg.appendChild(el);
        document.body.appendChild(svg);
        const width = el.getBBox().width;
        svg.remove();
        return width;
      },
      [text, size, weight, spacing, FONT],
    );
  const out = (name, svg) => fs.writeFileSync(path.join(__dirname, name), svg);

  for (const size of [22, 27]) ADD_W[size] = await measure("Add Repo", size, 800, 0);
  for (const t of Object.values(APPS)) LV_W[`LV. ${t.count}`] = await measure(`LV. ${t.count}`, 20, 800, 2);
  out("status.svg", status(await measure("Manga · Manhwa · Manhua · Novels", 32, 800, 0)));

  for (const app of Object.keys(APPS)) {
    out(`tile-${app}.svg`, tile(app));
    out(`card-${app}.svg`, card(app));
    out(`coin-${app}.svg`, coin(app));
  }

  const links = [
    ["button-discord.svg", "Join the Support Discord", "Join the support Discord"],
    ["button-other-repos.svg", "Open the OTHER-REPOS Channel", "Open the OTHER-REPOS Discord channel"],
  ];
  const linkText = [];
  for (const l of links) linkText.push(await measure(l[1], 25, 800, 0));
  const linkW = Math.ceil(Math.max(...linkText) + 36 + 14 + 80);
  links.forEach(([file, label, aria], i) => out(file, guild({ label, aria, w: linkW, textWidth: linkText[i] })));

  await browser.close();
})();
