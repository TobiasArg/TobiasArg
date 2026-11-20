// Builds the animated profile assets (Ember Shell).
//   node scripts/build.mjs
// Writes assets/hero.svg and assets/tile-*.svg. Each SVG is self-contained:
// GitHub serves README images through a proxy that blocks external fonts and
// scripts, so the font is embedded (subset to the glyphs used) and every
// animation is plain CSS.

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "assets");

/* ------------------------------------------------------------------ content */

const HERO = {
  host: "tobias@argta — ~/",
  command: "argta --whoami",
  calls: [
    ["Read(profile.md)", "FullStack Dev · Generative AI"],
    ["mcp(hw-info, files-organizer)", "2 open-source MCP servers"],
    ["Read(education.md)", "Systems Engineering · Argentina"],
  ],
  name: "Tobias Arangio",
  role: "FullStack Dev · Generative AI · Systems Eng.",
  bio: [
    "I build web products end to end, and tools",
    "for AI agents: MCP servers, architecture",
    "editors and local-first automation.",
  ],
  stack: "TypeScript  Python  React  MCP  LLMs",
  motto: "learning > knowledge",
};

const TILES = [
  {
    file: "tile-swa", size: "lg", name: "SWA", kicker: "~/repos/swa",
    desc: ["Visual editor for AI-agent", "architectures. Local-first."],
    foot: "TypeScript · React · Vite",
    art: ["┌────┐   ┌────┐", "│ UI ├──▶│ LLM│", "└────┘   └─┬──┘", "         ┌─┴──┐", "         │MCP │", "         └────┘"],
    alt: "SWA: local-first visual editor for documenting AI-agent architectures.",
  },
  {
    file: "tile-epubert", size: "lg", name: "EPUBERT", kicker: "~/repos/epubert",
    desc: ["Text PDFs in, clean EPUB 3", "out. Local and reproducible."],
    foot: "Python · CLI",
    art: [" ┌──────┐", " │ .pdf │", " └──┬───┘", "    ▼", " ┌──────┐", " │.epub │", " └──────┘"],
    alt: "EPUBERT: converts text-based PDFs into clean, reflowable EPUB 3 books, locally.",
  },
  {
    file: "tile-hwinfo", size: "sm", name: "hw-info", kicker: "mcp server",
    desc: ["CPU, memory, ports and", "processes for agents."],
    foot: "TypeScript",
    alt: "hw-info MCP: system monitoring and process management for AI agents.",
  },
  {
    file: "tile-files", size: "sm", name: "files-organizer", kicker: "mcp server · ★ 1",
    desc: ["Lets agents tidy your", "local files."],
    foot: "TypeScript",
    alt: "LocalFilesOrganizer MCP: tools that let agents organize your local files.",
  },
  {
    file: "tile-keppler", size: "sm", name: "keppler", kicker: "data challenge",
    desc: ["Cost of living per H3", "cell, from public data."],
    foot: "Python",
    alt: "Keppler Challenge: estimates cost of living in H3 cells from geography, mobility and public data.",
  },
  {
    file: "tile-template", size: "sm", name: "ai-dev-template", kicker: "github template",
    desc: ["Guardrails for AI-driven", "software projects."],
    foot: "Template",
    alt: "Operational template for AI-driven software development projects.",
  },
];

/* ------------------------------------------------------------------ palette */

const C = {
  bg: "#0d0a08", bar: "#16110d", line: "#2a201a", off: "#3a2c22",
  text: "#f3e6da", muted: "#9a8577", accent: "#ff7a1a",
  hot: "#ffb070", mid: "#ff7a1a", deep: "#7a3810",
};
const ADV = 0.6; // JetBrains Mono advance width, in em

/* ------------------------------------------------------------------ helpers */

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (v) => +v.toFixed(2);

function torusFrames({ cols = 40, rows = 22, frames = 40 } = {}) {
  const ramp = ".,-~:;=!*#$@";
  const out = [];
  for (let f = 0; f < frames; f++) {
    const A = 1 + (f * Math.PI * 2) / frames;
    const B = 0.6 + (f * Math.PI) / frames;
    const buf = new Array(cols * rows).fill(" ");
    const z = new Array(cols * rows).fill(0);
    const cA = Math.cos(A), sA = Math.sin(A), cB = Math.cos(B), sB = Math.sin(B);
    for (let j = 0; j < 6.28; j += 0.07) {
      const ct = Math.cos(j), st = Math.sin(j);
      for (let i = 0; i < 6.28; i += 0.02) {
        const sp = Math.sin(i), cp = Math.cos(i), h = ct + 2;
        const D = 1 / (sp * h * sA + st * cA + 5), t = sp * h * cA - st * sA;
        const x = Math.floor(cols / 2 + cols * 0.5 * D * (cp * h * cB - t * sB));
        const y = Math.floor(rows / 2 + rows * 0.62 * D * (cp * h * sB + t * cB));
        const o = x + cols * y;
        const L = Math.floor(8 * ((st * sA - sp * ct * cA) * cB - sp * ct * sA - st * cA - cp * ct * sB));
        if (y >= 0 && y < rows && x >= 0 && x < cols && D > z[o]) { z[o] = D; buf[o] = ramp[L > 0 ? L : 0]; }
      }
    }
    const lines = [];
    for (let r = 0; r < rows; r++) lines.push(buf.slice(r * cols, (r + 1) * cols).join(""));
    out.push(lines);
  }
  return out;
}

const tier = (ch) => ("*#$@".includes(ch) ? "lh" : ".,-".includes(ch) ? "ld" : "lm");

function frameText(lines, { x, y, size, lineH, cls, delay }) {
  const cw = size * ADV;
  let rows = "";
  lines.forEach((line, r) => {
    const lead = line.length - line.trimStart().length;
    const body = line.trim();
    if (!body) return;
    let spans = "", run = "", cur = null;
    for (const ch of body) {
      const k = ch === " " ? cur : tier(ch);
      if (k !== cur && run) { spans += `<tspan class="${cur}">${esc(run)}</tspan>`; run = ""; }
      cur = k ?? cur; run += ch;
    }
    if (run) spans += `<tspan class="${cur}">${esc(run)}</tspan>`;
    rows += `<tspan x="${n(x + lead * cw)}" y="${n(y + r * lineH)}">${spans}</tspan>`;
  });
  return `<text class="${cls}" font-size="${size}" style="animation-delay:${delay}s">${rows}</text>`;
}

function elbow(x, y) { return `<path d="M${x} ${y - 11}v6h7" fill="none" stroke="${C.off}" stroke-width="1.2"/>`; }
function chevron(x, y, extra = "") { return `<path d="M${x} ${y - 9}l5 4.5-5 4.5" fill="none" stroke="${C.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${extra}/>`; }
function arrowNE(x, y) { return `<path d="M${x} ${y + 8}l8-8M${x + 2} ${y}h6v6" fill="none" stroke="${C.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`; }

/* ------------------------------------------------------------------ hero */

function hero() {
  const W = 846, H = 440, fs = 13, cw = fs * ADV;
  const typeW = n(HERO.command.length * cw);
  const FR = 40, T = 4, STATIC_FRAME = 34; // frame shown with reduced motion: hole clearly visible
  const frames = torusFrames({ frames: FR });
  const label = `Terminal running argta --whoami. Tobias Arangio: ${HERO.role}. ${HERO.bio.join(" ")} Stack: ${HERO.stack.split(/\s+/).join(", ")}. ${HERO.motto}.`;

  const css = `
text{font-family:JM,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre;font-variant-ligatures:none;font-feature-settings:"liga" 0,"calt" 0}
.b{font-weight:700}.t{fill:${C.text}}.m{fill:${C.muted}}.a{fill:${C.accent}}
.in{animation:in .45s cubic-bezier(.2,.7,.2,1) both}
@keyframes in{from{opacity:0;transform:translateY(5px)}}
.cover{animation:type .9s steps(${HERO.command.length}) .35s both}
@keyframes type{to{transform:translateX(${typeW}px)}}
.dot{animation:dot .4s step-end both}
@keyframes dot{from{fill:${C.off}}}
.draw{stroke-dasharray:1;animation:draw 1s cubic-bezier(.65,0,.35,1) 2.9s both}
@keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
.f{opacity:0;animation:fr ${T}s step-end infinite}.f0{opacity:1}
@keyframes fr{0%{opacity:1}${n(100 / FR)}%{opacity:0}100%{opacity:0}}
.lh{fill:${C.hot}}.lm{fill:${C.mid}}.ld{fill:${C.deep}}
.bl{animation:bl 1.05s steps(1) 4.4s infinite}
@keyframes bl{50%{opacity:0}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.cover{display:none}}`;

  const calls = HERO.calls.map(([tool, result], i) => {
    const y = 98 + i * 22, d = n(1.45 + i * 0.4);
    return `<g class="in" style="animation-delay:${d}s"><circle cx="34" cy="${y - 4.5}" r="3.6" class="a dot" style="animation-delay:${d}s"/><text x="48" y="${y}" font-size="${fs}" class="t b">${esc(tool)}</text>${elbow(290, y)}<text x="304" y="${y}" font-size="${fs}" class="m">${esc(result)}</text></g>`;
  }).join("");

  const ascii = frames.map((lines, f) =>
    frameText(lines, { x: 64, y: 196, size: 8.6, lineH: 8.6, cls: f === STATIC_FRAME ? "f f0" : "f", delay: -n((f * T) / FR) })
  ).join("");

  const body = `
<defs><clipPath id="win"><rect width="${W}" height="${H}" rx="12"/></clipPath></defs>
<g clip-path="url(#win)">
<rect width="${W}" height="${H}" fill="${C.bg}"/>
<rect width="${W}" height="34" fill="${C.bar}"/>
<line x1="0" x2="${W}" y1="34" y2="34" stroke="${C.line}"/>
<circle cx="20" cy="17" r="4.5" fill="${C.off}"/><circle cx="36" cy="17" r="4.5" fill="${C.off}"/><circle cx="52" cy="17" r="4.5" fill="${C.off}"/>
<text x="${W / 2}" y="21" font-size="11" class="m" text-anchor="middle">${esc(HERO.host)}</text>
${chevron(30, 66)}
<text x="48" y="66" font-size="${fs}" class="t">${esc(HERO.command)}</text>
<rect class="cover" x="48" y="52" width="${n(typeW + 4)}" height="19" fill="${C.bg}"/>
${calls}
<rect x="22" y="164" width="802" height="236" rx="10" fill="none" stroke="${C.accent}" stroke-opacity=".6" pathLength="1" class="draw"/>
<line x1="320" x2="320" y1="186" y2="378" stroke="${C.line}" class="in" style="animation-delay:3.3s"/>
<g class="in" style="animation-delay:3.2s">${ascii}</g>
<g class="in" style="animation-delay:3.4s"><text x="350" y="214" font-size="26" class="t b">${esc(HERO.name)}</text><text x="350" y="242" font-size="13" class="a">${esc(HERO.role)}</text></g>
<g class="in" style="animation-delay:3.7s">${HERO.bio.map((l, i) => `<text x="350" y="${278 + i * 18}" font-size="12.5" class="m">${esc(l)}</text>`).join("")}</g>
<g class="in" style="animation-delay:4s"><text x="350" y="352" font-size="12" class="t">${esc(HERO.stack)}</text><text x="350" y="374" font-size="12" class="a">${esc(HERO.motto)}</text></g>
<g class="in" style="animation-delay:4.3s">${chevron(30, 428)}</g>
<rect x="48" y="417" width="8" height="15" fill="${C.accent}" class="in bl" style="animation-delay:4.3s"/>
</g>`;

  return { W, H, label, css, body };
}

/* ------------------------------------------------------------------ tiles */

function tile(t) {
  const lg = t.size === "lg";
  const W = lg ? 423 : 211, H = 170, pad = lg ? 22 : 18;
  const css = `text{font-family:JM,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre;font-variant-ligatures:none;font-feature-settings:"liga" 0,"calt" 0}.b{font-weight:700}`;
  const art = lg && t.art
    ? `<g font-size="11" fill="${C.deep}">${t.art.map((l, i) => `<text x="${W - pad - 15 * 11 * ADV}" y="${46 + i * 14}">${esc(l)}</text>`).join("")}</g>`
    : "";
  const body = `
<rect x="3.5" y="3.5" width="${W - 7}" height="${H - 7}" rx="10" fill="${C.bg}" stroke="${C.line}"/>
<text x="${pad}" y="34" font-size="${lg ? 11 : 10.5}" fill="${C.muted}">${esc(t.kicker)}</text>
${lg ? "" : arrowNE(W - pad - 8, 25)}
${art}
<text x="${pad}" y="${lg ? 70 : 66}" font-size="${lg ? 24 : 17}" class="b" fill="${C.text}">${esc(t.name)}</text>
${t.desc.map((l, i) => `<text x="${pad}" y="${(lg ? 98 : 92) + i * (lg ? 18 : 16)}" font-size="${lg ? 12.5 : 11}" fill="${C.muted}">${esc(l)}</text>`).join("")}
<circle cx="${pad + 3.5}" cy="${H - 26}" r="3.5" fill="${C.accent}"/>
<text x="${pad + 14}" y="${H - 22}" font-size="${lg ? 11.5 : 10.5}" fill="${C.accent}">${esc(t.foot)}</text>`;
  return { W, H, label: t.alt, css, body };
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

async function render({ W, H, label, css, body }) {
  const glyphs = glyphsOf(body);
  const faces = await Promise.all([400, 700].map((w) => fontFace(w, glyphs)));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title><style>${faces.join("")}${css.replace(/\n/g, "")}</style>${body.replace(/\n/g, "")}</svg>\n`;
}

/* ------------------------------------------------------------------ main */

await mkdir(OUT, { recursive: true });
const jobs = [["hero", hero()], ...TILES.map((t) => [t.file, tile(t)])];
for (const [name, spec] of jobs) {
  const svg = await render(spec);
  await writeFile(path.join(OUT, `${name}.svg`), svg);
  console.log(`${name}.svg  ${(svg.length / 1024).toFixed(1)} KB`);
}
