// Builds the profile badges and buttons from the banner's design tokens, so every piece shares
// one gradient, sparkle and emblem language. Text is measured in Chromium so nothing collides
// with the art, and every badge and every button comes out the same size as its siblings.
//   NODE_PATH=$(npm root -g) node media/build-art.cjs
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const INK = "#33162a";
const BLUSH = "#ff8fab";
const FONT = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const SPARK =
  "M0,-12 C1.6,-3.6 3.6,-1.6 12,0 C3.6,1.6 1.6,3.6 0,12 C-1.6,3.6 -3.6,1.6 -12,0 C-3.6,-1.6 -1.6,-3.6 0,-12 Z";

// Each app keeps the banner's pink and peach start and ends in its own colour: mango for
// Paperback, mana blue, Aidoku's coral. iOS is the platform, so its badge stays neutral.
const APPS = {
  ios: { light: "#f4ecf1", stroke: "#dccad4", emblem: "phone" },
  paperback: { via: "#ffc596", end: "#ffab68", light: "#ffe2c6", stroke: "#ffbd85", emblem: "book" },
  mana: { via: "#cfdcff", end: "#9db8ff", light: "#dde6ff", stroke: "#a9c0ff", emblem: "crystal" },
  aidoku: { via: "#ffc4cc", end: "#ff95a8", light: "#ffdde3", stroke: "#ffa3b4", emblem: "openBook" },
  support: { light: "#ffe4cc", stroke: "#ffc49a", emblem: "chat" },
};

const defs = (id) => `
    <linearGradient id="${id}-mango" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc98a"/><stop offset="1" stop-color="#ffa45c"/></linearGradient>
    <linearGradient id="${id}-ribbon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f74b4b"/><stop offset="1" stop-color="#de4d4d"/></linearGradient>
    <linearGradient id="${id}-coral" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8a9c"/><stop offset="1" stop-color="#ff375f"/></linearGradient>
    <linearGradient id="${id}-crystal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2f6ff"/><stop offset="0.5" stop-color="#86a6ff"/><stop offset="1" stop-color="#3a58d6"/></linearGradient>
    <radialGradient id="${id}-glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="0.85"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-bubble" cx="0.34" cy="0.3" r="0.75"><stop offset="0" stop-color="#ffffff" stop-opacity="0.92"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.32"/></radialGradient>`;

// A kawaii face: two eyes, blush and a small smile, centred on (x, y).
const face = (x, y, s = 1) => `<g transform="translate(${x},${y}) scale(${s})">
      <circle cx="-4.6" cy="0" r="1.9" fill="${INK}"/><circle cx="4.6" cy="0" r="1.9" fill="${INK}"/>
      <circle cx="-4.1" cy="-0.6" r="0.6" fill="#ffffff"/><circle cx="5.1" cy="-0.6" r="0.6" fill="#ffffff"/>
      <ellipse cx="-8" cy="3.4" rx="2.6" ry="1.5" fill="${BLUSH}" opacity="0.75"/><ellipse cx="8" cy="3.4" rx="2.6" ry="1.5" fill="${BLUSH}" opacity="0.75"/>
      <path d="M-1.8,2.6 Q0,4.4 1.8,2.6" fill="none" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>
    </g>`;

// Emblems are drawn around (0,0) at roughly a 22px radius. `small` drops the face for badges.
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
    crystal: `<path d="M0,-23 L14,-2 L0,24 L-14,-2 Z" fill="url(#${id}-crystal)"/>
      <path d="M0,-23 L14,-2 L0,2 L-14,-2 Z" fill="#ffffff" opacity="0.45"/>
      <path d="M-8.5,-5 L-3.5,-14" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity="0.9"/>
      ${small ? "" : face(0, 4, 0.82)}`,
    phone: `<rect x="-10" y="-16" width="20" height="32" rx="5" fill="${INK}"/>
      <rect x="-7.5" y="-12" width="15" height="23" rx="2.5" fill="url(#${id}-mango)"/>
      <rect x="-3" y="-14.4" width="6" height="1.4" rx="0.7" fill="#ffffff" opacity="0.6"/>
      <ellipse cx="-3" cy="-6" rx="1.8" ry="3.5" fill="#ffffff" opacity="0.45"/>`,
    chat: `<path d="M-15,-12 h30 a8 8 0 0 1 8 8 v10 a8 8 0 0 1 -8 8 h-12 l-9 8 v-8 h-9 a8 8 0 0 1 -8 -8 v-10 a8 8 0 0 1 8 -8 Z" fill="url(#${id}-mango)"/>
      <circle cx="-7" cy="1" r="2.6" fill="${INK}"/><circle cx="0" cy="1" r="2.6" fill="${INK}"/><circle cx="7" cy="1" r="2.6" fill="${INK}"/>`,
  })[kind];

const spark = (x, y, s, opacity = 1) =>
  `<path d="${SPARK}" transform="translate(${x},${y}) scale(${s})" fill="#ffffff" opacity="${opacity}"/>`;

// A pill with the app's soft tint, emblem and sparkle, centred spaced capitals.
const pill = ({ app, label, aria, w, h, size, weight, spacing, emblemScale }) => {
  const a = APPS[app];
  const id = `p${app}${h}`;
  const r = h / 2;
  const ex = r + 6;
  const textX = (ex + r + w - 22) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${aria}">
  <defs>${defs(id)}
    <linearGradient id="${id}-fill" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff6fa"/><stop offset="1" stop-color="${a.light}"/></linearGradient>
  </defs>
  <rect x="1.5" y="1.5" width="${w - 3}" height="${h - 3}" rx="${r - 1.5}" fill="url(#${id}-fill)" stroke="${a.stroke}" stroke-width="3"/>
  <g transform="translate(${ex},${r}) scale(${emblemScale})">${emblem(a.emblem, id, true)}</g>
  ${spark(ex + r * 0.62, r * 0.48, h / 140)}
  <text x="${textX}" y="${r + size * 0.36}" text-anchor="middle" font-family="${FONT}" font-size="${size}" font-weight="${weight}" letter-spacing="${spacing}" fill="${INK}">${label}</text>
</svg>
`;
};

// The install buttons: the banner's gradient into the app's colour, the ink plus disc, and the
// app's kawaii emblem glowing at the right with the banner's ring, sparkles and one bubble.
const button = ({ app, label, w }) => {
  const a = APPS[app];
  const id = `k${app}`;
  const ex = w - 92;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="104" viewBox="0 0 ${w} 104" role="img" aria-label="${label}">
  <defs>${defs(id)}
    <linearGradient id="${id}-fill" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffdcea"/><stop offset="0.3" stop-color="#ffbbd5"/><stop offset="0.56" stop-color="#ffcda8"/>
      <stop offset="0.8" stop-color="${a.via}"/><stop offset="1" stop-color="${a.end}"/>
    </linearGradient>
    <clipPath id="${id}-clip"><rect width="${w}" height="104" rx="52"/></clipPath>
  </defs>
  <rect width="${w}" height="104" rx="52" fill="url(#${id}-fill)"/>
  <g clip-path="url(#${id}-clip)">
    <rect x="6" y="6" width="${w - 12}" height="44" rx="22" fill="#ffffff" opacity="0.3"/>
    <circle cx="${ex}" cy="52" r="48" fill="url(#${id}-glow)"/>
    <circle cx="${ex}" cy="52" r="40" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="1.5" stroke-dasharray="2.5 6"/>
    <circle cx="${w - 34}" cy="80" r="13" fill="url(#${id}-bubble)"/>
    <circle cx="${w - 38}" cy="76" r="3.4" fill="#ffffff" opacity="0.9"/>
    ${spark(w - 40, 25, 0.72)}
    ${spark(ex - 52, 78, 0.4, 0.9)}
  </g>
  <g transform="translate(${ex},52) scale(1.35)">${emblem(a.emblem, id)}</g>
  <circle cx="60" cy="52" r="28" fill="${INK}"/>
  <path d="M60 38 v28 M46 52 h28" stroke="#fff6fa" stroke-width="7" stroke-linecap="round"/>
  <text x="112" y="64" font-family="${FONT}" font-size="34" font-weight="800" fill="${INK}">${label}</text>
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
  const widest = async (labels, ...style) => {
    const widths = [];
    for (const label of labels) widths.push(await measure(label, ...style));
    return Math.max(...widths);
  };

  // Badges: one width for all four, the widest label's.
  const badges = [
    ["badge-ios.svg", "ios", "IOS / IPADOS", "iOS and iPadOS"],
    ["badge-paperback.svg", "paperback", "PAPERBACK · 28", "28 Paperback sources"],
    ["badge-mana.svg", "mana", "MANA · 11", "11 Mana sources"],
    ["badge-aidoku.svg", "aidoku", "AIDOKU · 20", "20 Aidoku sources"],
  ];
  const badgeW = Math.ceil(66 + (await widest(badges.map((b) => b[2]), 22, 800, 2.5)) + 30);
  for (const [file, app, label, aria] of badges)
    out(file, pill({ app, label, aria, w: badgeW, h: 60, size: 22, weight: 800, spacing: 2.5, emblemScale: 0.72 }));

  // Buttons: one width for all three, the widest label's plus room for the emblem.
  const buttons = [
    ["button-paperback.svg", "paperback", "Add PoppingMango to PB"],
    ["button-mana.svg", "mana", "Add PoppingMango to Mana"],
    ["button-aidoku.svg", "aidoku", "Add PoppingMango to Aidoku"],
  ];
  const buttonW = Math.ceil(112 + (await widest(buttons.map((b) => b[2]), 34, 800, 0)) + 175);
  for (const [file, app, label] of buttons) out(file, button({ app, label, w: buttonW }));

  // Support links: one width for both.
  const links = [
    ["button-discord.svg", "Join the Support Discord", "Join the support Discord"],
    ["button-other-repos.svg", "Open the OTHER-REPOS Channel", "Open the OTHER-REPOS Discord channel"],
  ];
  const linkW = Math.ceil(84 + (await widest(links.map((l) => l[1]), 25, 700, 0)) + 34);
  for (const [file, label, aria] of links)
    out(file, pill({ app: "support", label, aria, w: linkW, h: 72, size: 25, weight: 700, spacing: 0, emblemScale: 0.95 }));

  await browser.close();
  console.log({ badgeW, buttonW, linkW });
})();
