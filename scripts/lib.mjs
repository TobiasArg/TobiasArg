// Shared pieces for the Ember Shell assets: palette, SVG helpers and font embedding.
// GitHub serves README images through a proxy that blocks external fonts and
// scripts, so every SVG embeds its own font subset and animates with plain CSS.

import { fileURLToPath } from "node:url";
import path from "node:path";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const OUT = path.join(ROOT, "assets");

export const C = {
  bg: "#0d0a08", bar: "#16110d", line: "#2a201a", off: "#3a2c22",
  text: "#f3e6da", muted: "#9a8577", accent: "#ff7a1a",
  hot: "#ffb070", mid: "#ff7a1a", deep: "#7a3810", spark: "#ffe2c4",
};
export const ADV = 0.6; // JetBrains Mono advance width, in em

export const TEXT_CSS =
  'text{font-family:JM,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre;font-variant-ligatures:none;font-feature-settings:"liga" 0,"calt" 0}.b{font-weight:700}';

export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const n = (v) => +v.toFixed(3);

export const elbow = (x, y) => `<path d="M${x} ${y - 11}v6h7" fill="none" stroke="${C.off}" stroke-width="1.2"/>`;
export const chevron = (x, y) => `<path d="M${x} ${y - 9}l5 4.5-5 4.5" fill="none" stroke="${C.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
export const arrowNE = (x, y) => `<path d="M${x} ${y + 8}l8-8M${x + 2} ${y}h6v6" fill="none" stroke="${C.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;

/** Terminal window chrome: background, title bar and traffic lights. */
export function windowChrome(W, H, title) {
  return `<defs><clipPath id="win"><rect width="${W}" height="${H}" rx="12"/></clipPath></defs>
<g clip-path="url(#win)">
<rect width="${W}" height="${H}" fill="${C.bg}"/>
<rect width="${W}" height="34" fill="${C.bar}"/>
<line x1="0" x2="${W}" y1="34" y2="34" stroke="${C.line}"/>
<circle cx="20" cy="17" r="4.5" fill="${C.off}"/><circle cx="36" cy="17" r="4.5" fill="${C.off}"/><circle cx="52" cy="17" r="4.5" fill="${C.off}"/>
<text x="${W / 2}" y="21" font-size="11" fill="${C.muted}" text-anchor="middle">${esc(title)}</text>`;
}

/** CSS shared by animated terminals: fade-in, typing cover, tool-call dots, blinking cursor. */
export function terminalCss(command, { fs = 13, typeDelay = 0.35, blinkDelay = 4.4 } = {}) {
  const typeW = n(command.length * fs * ADV);
  return {
    typeW,
    css: `.t{fill:${C.text}}.m{fill:${C.muted}}.a{fill:${C.accent}}
.in{animation:in .45s cubic-bezier(.2,.7,.2,1) both}
@keyframes in{from{opacity:0;transform:translateY(5px)}}
.cover{animation:type ${n(command.length * 0.065)}s steps(${command.length}) ${typeDelay}s both}
@keyframes type{to{transform:translateX(${typeW}px)}}
.dot{animation:dot .4s step-end both}
@keyframes dot{from{fill:${C.off}}}
.bl{animation:bl 1.05s steps(1) ${blinkDelay}s infinite}
@keyframes bl{50%{opacity:0}}`,
  };
}

export const REDUCED_MOTION = "@media (prefers-reduced-motion:reduce){*{animation:none!important}.cover{display:none}}";

/** One "● Tool(args)  ⎿ result" row, like a coding agent's tool call. */
export function toolCall(tool, result, y, delay, fs = 13) {
  return `<g class="in" style="animation-delay:${delay}s"><circle cx="34" cy="${y - 4.5}" r="3.6" class="a dot" style="animation-delay:${delay}s"/><text x="48" y="${y}" font-size="${fs}" class="t b">${esc(tool)}</text>${elbow(290, y)}<text x="304" y="${y}" font-size="${fs}" class="m">${esc(result)}</text></g>`;
}

/* ------------------------------------------------------------------ fonts */

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function glyphsOf(svgBody) {
  const chars = new Set(" ");
  for (const m of svgBody.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)) {
    const txt = m[1].replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    for (const ch of txt) chars.add(ch);
  }
  return [...chars].sort().join("");
}

async function fontFace(weight, text) {
  const url = `https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url, { headers: { "User-Agent": UA } })).text();
  const src = css.match(/url\((https:[^)]+)\)\s*format\('(woff2?)'\)/);
  if (!src) throw new Error(`No web font for weight ${weight}:\n${css}`);
  const buf = Buffer.from(await (await fetch(src[1], { headers: { "User-Agent": UA } })).arrayBuffer());
  return `@font-face{font-family:JM;font-weight:${weight};src:url(data:font/${src[2]};base64,${buf.toString("base64")}) format('${src[2]}')}`;
}

/** Wraps a body into a standalone, accessible SVG with the font subset embedded. */
export async function render({ W, H, label, css, body }) {
  const glyphs = glyphsOf(body);
  const faces = await Promise.all([400, 700].map((w) => fontFace(w, glyphs)));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title><style>${faces.join("")}${TEXT_CSS}${css.replace(/\n/g, "")}</style>${body.replace(/\n/g, "")}</svg>\n`;
}
