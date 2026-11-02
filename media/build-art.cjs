// Builds the profile badges and buttons from the banner's design tokens, so every piece shares
// one gradient, rim, sparkle and emblem language. Text is measured in Chromium so nothing
// collides with the art.   NODE_PATH=$(npm root -g) node media/build-art.cjs
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const INK = "#33162a";
const FONT = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const SPARK =
  "M0,-12 C1.6,-3.6 3.6,-1.6 12,0 C3.6,1.6 1.6,3.6 0,12 C-1.6,3.6 -3.6,1.6 -12,0 C-3.6,-1.6 -1.6,-3.6 0,-12 Z";

// Each app keeps the banner's pink and peach start and ends in its own colour.
const APPS = {
  ios: { via: "#ffc9dd", end: "#ffb0cf", light: "#ffdbe9", stroke: "#ffb3cf", emblem: "pearlPink" },
  paperback: { via: "#ffc596", end: "#ffad6b", light: "#ffe2c6", stroke: "#ffbd85", emblem: "mango" },
  mana: { via: "#cfdcff", end: "#9db8ff", light: "#dde6ff", stroke: "#a9c0ff", emblem: "crystal" },
  aidoku: { via: "#e2efcb", end: "#bde2a2", light: "#e0f0cf", stroke: "#b3da96", emblem: "pearlMint" },
  support: { via: "#ffd2b0", end: "#ffc08c", light: "#ffe4cc", stroke: "#ffc49a", emblem: "chat" },
};

const defs = (id) => `
    <linearGradient id="${id}-mango" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc98a"/><stop offset="1" stop-color="#ffa45c"/></linearGradient>
    <linearGradient id="${id}-crystal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2f6ff"/><stop offset="0.5" stop-color="#86a6ff"/><stop offset="1" stop-color="#3a58d6"/></linearGradient>
    <radialGradient id="${id}-pink" cx="0.34" cy="0.3" r="0.75"><stop offset="0" stop-color="#fff1f7"/><stop offset="1" stop-color="#ff9fc3"/></radialGradient>
    <radialGradient id="${id}-mint" cx="0.34" cy="0.3" r="0.75"><stop offset="0" stop-color="#f1f9e8"/><stop offset="1" stop-color="#9fd07f"/></radialGradient>
    <radialGradient id="${id}-glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="0.85"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-bubble" cx="0.34" cy="0.3" r="0.75"><stop offset="0" stop-color="#ffffff" stop-opacity="0.92"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.32"/></radialGradient>`;

// Emblems are drawn around (0,0) at roughly a 20px radius.
const emblem = (kind, id) =>
  ({
    mango: `<g transform="rotate(-16)"><ellipse cy="3" rx="15" ry="19" fill="url(#${id}-mango)"/><ellipse cx="-5" cy="-3" rx="5" ry="8" fill="#ffffff" opacity="0.45"/><path d="M1,-15 C2,-20 4.5,-23 7.5,-24.5" fill="none" stroke="#a8d48c" stroke-width="3.2" stroke-linecap="round"/><ellipse cx="12" cy="-23.5" rx="6.5" ry="3.3" fill="#bde3a4" transform="rotate(24 12 -23.5)"/></g>`,
    crystal: `<path d="M0,-21 L13,-2 L0,22 L-13,-2 Z" fill="url(#${id}-crystal)"/><path d="M0,-21 L13,-2 L0,2 L-13,-2 Z" fill="#ffffff" opacity="0.45"/><path d="M-8,-5 L-3,-13" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity="0.9"/>`,
    pearlPink: `<circle r="16" fill="url(#${id}-pink)"/><circle cx="-6" cy="-6" r="4.5" fill="#ffffff"/>`,
    pearlMint: `<circle r="16" fill="url(#${id}-mint)"/><circle cx="-6" cy="-6" r="4.5" fill="#ffffff"/>`,
    chat: `<path d="M-15,-12 h30 a8 8 0 0 1 8 8 v10 a8 8 0 0 1 -8 8 h-12 l-9 8 v-8 h-9 a8 8 0 0 1 -8 -8 v-10 a8 8 0 0 1 8 -8 Z" fill="url(#${id}-mango)"/><circle cx="-7" cy="1" r="2.6" fill="${INK}"/><circle cx="0" cy="1" r="2.6" fill="${INK}"/><circle cx="7" cy="1" r="2.6" fill="${INK}"/>`,
  })[kind];

const spark = (x, y, s, opacity = 1) =>
  `<path d="${SPARK}" transform="translate(${x},${y}) scale(${s})" fill="#ffffff" opacity="${opacity}"/>`;

// A small pill: light app tint, the banner's white rim, emblem with a sparkle, spaced capitals.
const badge = (app, label, aria, textWidth) => {
  const a = APPS[app];
  const id = `b${app}`;
  const w = Math.ceil(70 + textWidth + 30);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="60" viewBox="0 0 ${w} 60" role="img" aria-label="${aria}">
  <defs>${defs(id)}
    <linearGradient id="${id}-fill" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff4f9"/><stop offset="1" stop-color="${a.light}"/></linearGradient>
  </defs>
  <rect x="1.5" y="1.5" width="${w - 3}" height="57" rx="28.5" fill="url(#${id}-fill)" stroke="${a.stroke}" stroke-width="3"/>
  <rect x="5" y="5" width="${w - 10}" height="50" rx="25" fill="none" stroke="#ffffff" stroke-opacity="0.75" stroke-width="1.5"/>
  <g transform="translate(37,30) scale(0.78)">${emblem(a.emblem, id)}</g>
  ${spark(55, 15, 0.42)}
  <text x="70" y="38.5" font-family="${FONT}" font-size="22" font-weight="800" letter-spacing="2.5" fill="${INK}">${label}</text>
</svg>
`;
};

// The install buttons: the banner's gradient into the app's colour, the ink plus disc, and the
// app's emblem glowing at the right with the banner's sparkles and one bubble.
let BUTTON_W = 820;
const button = (app, label) => {
  const a = APPS[app];
  const id = `k${app}`;
  const w = BUTTON_W;
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
    <rect x="6" y="6" width="${w - 12}" height="44" rx="22" fill="#ffffff" opacity="0.32"/>
    <circle cx="${ex}" cy="52" r="48" fill="url(#${id}-glow)"/>
    <circle cx="${ex}" cy="52" r="36" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="1.5" stroke-dasharray="2.5 6"/>
    <circle cx="${w - 34}" cy="80" r="14" fill="url(#${id}-bubble)"/>
    <circle cx="${w - 38}" cy="76" r="3.5" fill="#ffffff" opacity="0.9"/>
    ${spark(w - 40, 26, 0.75)}
    ${spark(ex - 50, 80, 0.4, 0.9)}
  </g>
  <rect x="1" y="1" width="${w - 2}" height="102" rx="51" fill="none" stroke="#ffffff" stroke-opacity="0.75" stroke-width="2"/>
  <g transform="translate(${ex},52) scale(1.45)">${emblem(a.emblem, id)}</g>
  <circle cx="60" cy="52" r="28" fill="${INK}"/>
  <path d="M60 38 v28 M46 52 h28" stroke="#fff6fa" stroke-width="7" stroke-linecap="round"/>
  <text x="112" y="64" font-family="${FONT}" font-size="34" font-weight="800" fill="${INK}">${label}</text>
</svg>
`;
};

// The smaller support links: a badge-style pill with the chat emblem.
const link = (label, aria, textWidth) => {
  const a = APPS.support;
  const id = "lsupport";
  const w = Math.ceil(84 + textWidth + 34);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="72" viewBox="0 0 ${w} 72" role="img" aria-label="${aria}">
  <defs>${defs(id)}
    <linearGradient id="${id}-fill" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff4f9"/><stop offset="1" stop-color="${a.light}"/></linearGradient>
  </defs>
  <rect x="1.5" y="1.5" width="${w - 3}" height="69" rx="34.5" fill="url(#${id}-fill)" stroke="${a.stroke}" stroke-width="3"/>
  <rect x="5" y="5" width="${w - 10}" height="62" rx="31" fill="none" stroke="#ffffff" stroke-opacity="0.75" stroke-width="1.5"/>
  <g transform="translate(44,35)">${emblem("chat", id)}</g>
  ${spark(68, 17, 0.45)}
  <text x="84" y="45" font-family="${FONT}" font-size="25" font-weight="700" fill="${INK}">${label}</text>
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
        Object.entries({ "font-family": font, "font-size": s, "font-weight": wgt, "letter-spacing": sp }).forEach(([k, v]) =>
          el.setAttribute(k, String(v)),
        );
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
  const badges = [
    ["badge-ios.svg", "ios", "IOS / IPADOS", "iOS and iPadOS"],
    ["badge-paperback.svg", "paperback", "PAPERBACK · 28", "28 Paperback sources"],
    ["badge-mana.svg", "mana", "MANA · 11", "11 Mana sources"],
    ["badge-aidoku.svg", "aidoku", "AIDOKU · 20", "20 Aidoku sources"],
  ];
  for (const [file, app, label, aria] of badges) out(file, badge(app, label, aria, await measure(label, 22, 800, 2.5)));
  const buttons = [
    ["button-paperback.svg", "paperback", "Add PoppingMango to Paperback"],
    ["button-mana.svg", "mana", "Add PoppingMango to Mana"],
    ["button-aidoku.svg", "aidoku", "Add PoppingMango to Aidoku"],
  ];
  // All three share the width the longest label needs, plus room for the emblem.
  const widths = [];
  for (const [, , label] of buttons) widths.push(await measure(label, 34, 800, 0));
  BUTTON_W = Math.ceil(112 + Math.max(...widths) + 170);
  for (const [file, app, label] of buttons) out(file, button(app, label));
  for (const [file, label, aria] of [
    ["button-discord.svg", "Join the Support Discord", "Join the support Discord"],
    ["button-other-repos.svg", "Open the OTHER-REPOS Channel", "Open the OTHER-REPOS Discord channel"],
  ])
    out(file, link(label, aria, await measure(label, 25, 700, 0)));
  await browser.close();
})();
