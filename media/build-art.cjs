// Builds the profile badges and buttons from the banner's design tokens: the pink and peach
// gradient, popping bubbles, sparkles and one glowing emblem per app. Text is measured in
// Chromium so nothing collides with the art, and siblings come out the same size.
//   NODE_PATH=$(npm root -g) node media/build-art.cjs
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const INK = "#33162a";
const BLUSH = "#ff8fab";
const FONT = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const SPARK =
  "M0,-12 C1.6,-3.6 3.6,-1.6 12,0 C3.6,1.6 1.6,3.6 0,12 C-1.6,3.6 -3.6,1.6 -12,0 C-3.6,-1.6 -1.6,-3.6 0,-12 Z";

// The support links' pill colours.
const APPS = {
  support: { light: "#ffe4cc", stroke: "#ffc49a", emblem: "chat" },
};

const defs = (id) => `
    <linearGradient id="${id}-mango" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc98a"/><stop offset="1" stop-color="#ffa45c"/></linearGradient>
    <linearGradient id="${id}-ribbon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f74b4b"/><stop offset="1" stop-color="#de4d4d"/></linearGradient>
    <linearGradient id="${id}-coral" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8a9c"/><stop offset="1" stop-color="#ff375f"/></linearGradient>
    <linearGradient id="${id}-crystal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef3ff"/><stop offset="0.55" stop-color="#7d9fff"/><stop offset="1" stop-color="#3f5fe0"/></linearGradient>
    <radialGradient id="${id}-pearl" cx="0.34" cy="0.3" r="0.75"><stop offset="0" stop-color="#ffeaf3"/><stop offset="1" stop-color="#ff9fc3"/></radialGradient>
    <radialGradient id="${id}-glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="0.9"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-bubble" cx="0.34" cy="0.3" r="0.75"><stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.3"/></radialGradient>
    <radialGradient id="${id}-peach" cx="0.34" cy="0.3" r="0.75"><stop offset="0" stop-color="#fff0e2" stop-opacity="0.95"/><stop offset="1" stop-color="#ffbf8a" stop-opacity="0.45"/></radialGradient>
    <radialGradient id="${id}-blue" cx="0.34" cy="0.3" r="0.75"><stop offset="0" stop-color="#f2f6ff" stop-opacity="0.95"/><stop offset="1" stop-color="#9db6ff" stop-opacity="0.45"/></radialGradient>
    <radialGradient id="${id}-mint" cx="0.34" cy="0.3" r="0.75"><stop offset="0" stop-color="#eef8e2" stop-opacity="0.95"/><stop offset="1" stop-color="#cfebb4" stop-opacity="0.45"/></radialGradient>`;

const face = (x, y) => `<g transform="translate(${x},${y})">
      <circle cx="-4.6" cy="0" r="1.9" fill="${INK}"/><circle cx="4.6" cy="0" r="1.9" fill="${INK}"/>
      <circle cx="-4.1" cy="-0.6" r="0.6" fill="#ffffff"/><circle cx="5.1" cy="-0.6" r="0.6" fill="#ffffff"/>
      <ellipse cx="-8" cy="3.4" rx="2.6" ry="1.5" fill="${BLUSH}" opacity="0.75"/><ellipse cx="8" cy="3.4" rx="2.6" ry="1.5" fill="${BLUSH}" opacity="0.75"/>
      <path d="M-1.8,2.6 Q0,4.4 1.8,2.6" fill="none" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>
    </g>`;

// Emblems are drawn around (0,0) at roughly a 24px radius. `small` drops faces for badges.
const emblem = (kind, id, small = false) =>
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
      ${small ? "" : face(-1, 4)}
    </g>`,
    // An open book (読, "read") in Aidoku's coral.
    openBook: `<path d="M0,-8 C-7,-13 -18,-13 -24,-10 V17 C-18,14 -7,14 0,19 C7,14 18,14 24,17 V-10 C18,-13 7,-13 0,-8 Z" fill="url(#${id}-coral)"/>
      <path d="M0,-10 C-6,-15 -15,-15 -20.5,-12.5 V12.5 C-15,10 -6,10 0,14.5 Z" fill="#fff6f8"/>
      <path d="M0,-10 C6,-15 15,-15 20.5,-12.5 V12.5 C15,10 6,10 0,14.5 Z" fill="#ffeef2"/>
      <path d="M0,-10 V14.5" stroke="#ffb3c1" stroke-width="1.4"/>
      ${small ? '<path d="M-15,-5 h9 M-15,0 h9 M6,-5 h9 M6,0 h9" stroke="#ffb3c1" stroke-width="1.6" stroke-linecap="round"/>' : face(0, 1)}`,
    // The mana crystal, faceted and plain.
    crystal: `<path d="M0,-25 L16,-3 L0,26 L-16,-3 Z" fill="url(#${id}-crystal)"/>
      <path d="M0,-25 L16,-3 L0,1 L-16,-3 Z" fill="#ffffff" opacity="0.45"/>
      <path d="M0,1 L16,-3 L0,26 Z" fill="#2c47b8" opacity="0.2"/>
      <path d="M-10,-6 L-4,-16" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" opacity="0.9"/>`,
    pearl: `<circle r="16" fill="url(#${id}-pearl)"/><circle cx="-5.5" cy="-5.5" r="4.4" fill="#ffffff"/>
      <circle cx="20" cy="-13" r="6" fill="#ffffff" opacity="0.9"/>`,
    chat: `<path d="M-15,-12 h30 a8 8 0 0 1 8 8 v10 a8 8 0 0 1 -8 8 h-12 l-9 8 v-8 h-9 a8 8 0 0 1 -8 -8 v-10 a8 8 0 0 1 8 -8 Z" fill="url(#${id}-mango)"/>
      <circle cx="-7" cy="1" r="2.6" fill="${INK}"/><circle cx="0" cy="1" r="2.6" fill="${INK}"/><circle cx="7" cy="1" r="2.6" fill="${INK}"/>`,
  })[kind];

const spark = (x, y, s, opacity = 1) =>
  `<path d="${SPARK}" transform="translate(${x},${y}) scale(${s})" fill="#ffffff" opacity="${opacity}"/>`;

const bubble = (id, kind, x, y, r) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${id}-${kind})"/><circle cx="${x - r * 0.32}" cy="${y - r * 0.32}" r="${Math.max(1.6, r * 0.24)}" fill="#ffffff" opacity="0.92"/>`;

// A bubble popping: a broken ring with short rays.
const pop = (x, y, s = 1) => `<g transform="translate(${x},${y}) scale(${s})" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="0.9">
      <circle r="6" stroke-dasharray="3.5 4"/><path d="M0,-11 v-5"/><path d="M8,-8 l3.5,-3.5"/><path d="M11,0 h5"/><path d="M-8,-8 l-3.5,-3.5"/><path d="M-11,0 h-5"/>
    </g>`;

// A pill: the app's soft tint, with the emblem and the label centred together as one group.
const pill = ({ app, label, aria, w, h, size, weight, spacing, emblemScale, textWidth }) => {
  const a = APPS[app];
  const id = `p${app}${h}`;
  const r = h / 2;
  const emblemW = 34 * emblemScale + 4;
  const gap = 14;
  const groupX = (w - (emblemW + gap + textWidth)) / 2;
  const ex = groupX + emblemW / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${aria}">
  <defs>${defs(id)}
    <linearGradient id="${id}-fill" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff6fa"/><stop offset="1" stop-color="${a.light}"/></linearGradient>
  </defs>
  <rect x="1.5" y="1.5" width="${w - 3}" height="${h - 3}" rx="${r - 1.5}" fill="url(#${id}-fill)" stroke="${a.stroke}" stroke-width="3"/>
  <g transform="translate(${ex},${r}) scale(${emblemScale})">${emblem(a.emblem, id, true)}</g>
  <text x="${groupX + emblemW + gap}" y="${r + size * 0.36}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" letter-spacing="${spacing}" fill="${INK}">${label}</text>
</svg>
`;
};

// The app tiles: one card per app, side by side. The banner's diagonal pink and peach runs into
// the app's colour; the emblem sits in a glow inside a cluster of popping bubbles, with the
// app's name, its source count and an "Add repo" pill underneath. Every tile is identical in
// layout, so the row reads as one set.
const TILES = {
  paperback: { name: "Paperback", count: "28 SOURCES", end: "#ffb070", mid: "#ffcda8", big: "peach" },
  mana: { name: "Mana", count: "11 SOURCES", end: "#9fb9ff", mid: "#dfd8f4", big: "blue" },
  aidoku: { name: "Aidoku", count: "20 SOURCES", end: "#ff9aae", mid: "#ffc9c4", big: "peach" },
};
const tile = (app) => {
  const t = TILES[app];
  const id = `t${app}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="372" viewBox="0 0 300 372" role="img" aria-label="Add PoppingMango to ${t.name}, ${t.count.toLowerCase()}">
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
  <g transform="translate(150,136) scale(2.35)">${emblem(TILE_EMBLEM[app], id)}</g>
  <text x="150" y="258" text-anchor="middle" font-family="${FONT}" font-size="40" font-weight="800" fill="${INK}">${t.name}</text>
  <text x="150" y="290" text-anchor="middle" font-family="${FONT}" font-size="19" font-weight="800" letter-spacing="3" fill="${INK}" opacity="0.7">${t.count}</text>
  <rect x="58" y="308" width="184" height="46" rx="23" fill="${INK}"/>
  <path d="M90 322 v18 M81 331 h18" stroke="#fff6fa" stroke-width="4.5" stroke-linecap="round"/>
  <text x="164" y="339" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="800" fill="#fff6fa">Add repo</text>
</svg>
`;
};
const TILE_EMBLEM = { paperback: "book", mana: "crystal", aidoku: "openBook" };

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

  for (const app of Object.keys(TILES)) out(`tile-${app}.svg`, tile(app));

  // Support links: one width for both.
  const links = [
    ["button-discord.svg", "Join the Support Discord", "Join the support Discord"],
    ["button-other-repos.svg", "Open the OTHER-REPOS Channel", "Open the OTHER-REPOS Discord channel"],
  ];
  const linkText = [];
  for (const l of links) linkText.push(await measure(l[1], 25, 700, 0));
  const linkW = Math.ceil(Math.max(...linkText) + 34 * 0.95 + 4 + 14 + 60);
  links.forEach(([file, label, aria], i) =>
    out(file, pill({ app: "support", label, aria, w: linkW, h: 72, size: 25, weight: 700, spacing: 0, emblemScale: 0.95, textWidth: linkText[i] })),
  );

  await browser.close();
  console.log({ linkW });
})();
