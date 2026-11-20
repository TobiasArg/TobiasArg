// Builds the static profile assets (Ember Shell): assets/hero.svg and assets/tile-*.svg.
//   node scripts/build.mjs
// The daily activity block lives in scripts/activity.mjs.

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { OUT, C, ADV, esc, n, chevron, arrowNE, windowChrome, terminalCss, toolCall, REDUCED_MOTION, render } from "./lib.mjs";

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

/* ------------------------------------------------------------------ torus */

// Seamless loop: both rotation angles advance by exactly one full turn per cycle,
// so the frame after the last one is the first one again.
export const TORUS = { frames: 60, seconds: 6, staticFrame: 45 }; // staticFrame: shown with reduced motion (hole visible)

export function torusFrames({ cols = 40, rows = 22, frames }) {
  const ramp = ".,-~:;=!*#$@";
  const out = [];
  for (let f = 0; f < frames; f++) {
    const A = 1 + (f * Math.PI * 2) / frames;
    const B = 0.6 + (f * Math.PI * 2) / frames;
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

/* ------------------------------------------------------------------ hero */

function hero() {
  const W = 846, H = 440, fs = 13;
  const { frames: FR, seconds: T, staticFrame } = TORUS;
  const { typeW, css: termCss } = terminalCss(HERO.command, { fs });
  const label = `Terminal running argta --whoami. Tobias Arangio: ${HERO.role}. ${HERO.bio.join(" ")} Stack: ${HERO.stack.split(/\s+/).join(", ")}. ${HERO.motto}.`;

  // Frame f is visible during [f/FR, (f+1)/FR) of each cycle. A negative delay of
  // (FR - f) slots starts its keyframes so that it lights up exactly in its slot.
  const css = `${termCss}
.draw{stroke-dasharray:1;animation:draw 1s cubic-bezier(.65,0,.35,1) 2.9s both}
@keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
.f{opacity:0;animation:fr ${T}s step-end infinite}.f0{opacity:1}
@keyframes fr{0%{opacity:1}${n(100 / FR)}%{opacity:0}100%{opacity:0}}
.lh{fill:${C.hot}}.lm{fill:${C.mid}}.ld{fill:${C.deep}}
${REDUCED_MOTION}`;

  const frames = torusFrames({ frames: FR });
  const ascii = frames.map((lines, f) =>
    frameText(lines, {
      x: 64, y: 196, size: 8.6, lineH: 8.6,
      cls: f === staticFrame ? "f f0" : "f",
      delay: -n((((FR - f) % FR) * T) / FR),
    })
  ).join("");

  const body = `${windowChrome(W, H, HERO.host)}
${chevron(30, 66)}
<text x="48" y="66" font-size="${fs}" class="t">${esc(HERO.command)}</text>
<rect class="cover" x="48" y="52" width="${n(typeW + 4)}" height="19" fill="${C.bg}"/>
${HERO.calls.map(([tool, result], i) => toolCall(tool, result, 98 + i * 22, n(1.45 + i * 0.4), fs)).join("")}
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
  return { W, H, label: t.alt, css: "", body };
}

/* ------------------------------------------------------------------ main */

if (import.meta.url === `file://${process.argv[1]}`) {
  await mkdir(OUT, { recursive: true });
  const jobs = [["hero", hero()], ...TILES.map((t) => [t.file, tile(t)])];
  for (const [name, spec] of jobs) {
    const svg = await render(spec);
    await writeFile(path.join(OUT, `${name}.svg`), svg);
    console.log(`${name}.svg  ${(svg.length / 1024).toFixed(1)} KB`);
  }
}
