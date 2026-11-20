// Builds assets/activity.svg from live GitHub data. Runs daily in .github/workflows/activity.yml.
//   node scripts/activity.mjs
// Token: GITHUB_TOKEN or GH_TOKEN, falling back to `gh auth token` locally.

import { writeFile, mkdir } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import { OUT, C, ADV, esc, n, chevron, windowChrome, terminalCss, toolCall, REDUCED_MOTION, render } from "./lib.mjs";

const LOGIN = "TobiasArg";
const COMMAND = "argta --activity";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
const LEVEL_FILL = [C.off, C.deep, "#b9500f", C.accent, C.hot];

/* ------------------------------------------------------------------ data */

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  return execSync("gh auth token", { encoding: "utf8" }).trim();
}

async function fetchData() {
  const query = `query($login:String!){ user(login:$login){
    contributionsCollection{ contributionCalendar{ totalContributions
      weeks{ contributionDays{ date contributionCount contributionLevel } } } }
    repositories(first:10, privacy:PUBLIC, ownerAffiliations:[OWNER], orderBy:{field:PUSHED_AT, direction:DESC}){
      nodes{ name isFork defaultBranchRef{ target{ ... on Commit{ messageHeadline committedDate } } } } } } }`;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token()}`, "Content-Type": "application/json", "User-Agent": "profile-activity" },
    body: JSON.stringify({ query, variables: { login: LOGIN } }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(`GitHub API error: ${JSON.stringify(json.errors ?? json)}`);
  return json.data.user;
}

function summarize(user) {
  const cal = user.contributionsCollection.contributionCalendar;
  const days = cal.weeks.flatMap((w) => w.contributionDays);

  let best = 0, run = 0;
  for (const d of days) { run = d.contributionCount > 0 ? run + 1 : 0; best = Math.max(best, run); }
  let i = days.length - 1, current = 0;
  if (i >= 0 && days[i].contributionCount === 0) i--; // today may not have activity yet
  for (; i >= 0 && days[i].contributionCount > 0; i--) current++;

  const latest = user.repositories.nodes.find((r) => !r.isFork && r.name !== LOGIN && r.defaultBranchRef?.target?.committedDate);
  return {
    total: cal.totalContributions,
    weeks: cal.weeks,
    best, current,
    latest: latest && {
      repo: latest.name,
      message: latest.defaultBranchRef.target.messageHeadline,
      date: new Date(latest.defaultBranchRef.target.committedDate),
    },
  };
}

/* ------------------------------------------------------------------ svg */

const fmtDay = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
const plural = (k, word) => `${k} ${word}${k === 1 ? "" : "s"}`;

function fit(text, max) { return text.length <= max ? text : text.slice(0, max - 1).trimEnd() + "…"; }

function activity(s) {
  const W = 846, H = 350, fs = 13;
  const { typeW, css: termCss } = terminalCss(COMMAND, { fs, blinkDelay: 4.6 });
  const maxResult = Math.floor((W - 304 - 24) / (fs * ADV));

  let latestLine = "no public pushes yet";
  if (s.latest) {
    const tail = ` · ${fmtDay(s.latest.date)}`;
    const head = `${s.latest.repo} · `;
    latestLine = head + fit(s.latest.message, maxResult - head.length - tail.length) + tail;
  }
  const calls = [
    ["Read(calendar.json)", `${s.total.toLocaleString("en-US")} contributions · last 12 months`],
    ["Bash(git log -1)", latestLine],
    ["Bash(streak --best)", `current ${plural(s.current, "day")} · best ${plural(s.best, "day")}`],
  ];

  // Calendar: one column per week, one glyph per day, colored by GitHub's own quartiles.
  const x0 = 44, colW = 14.3, y0 = 212, rowH = 13, SCAN = 8;
  const scanCss = [1, 2, 3, 4].map((l) =>
    `.s${l}{fill:${LEVEL_FILL[l]};animation:s${l} ${SCAN}s linear infinite}@keyframes s${l}{0%,9%,100%{fill:${LEVEL_FILL[l]}}3%{fill:${C.spark}}}`
  ).join("");
  let months = "", cols = "", lastMonth = -1, lastLabelX = -99;
  s.weeks.forEach((w, wi) => {
    const x = n(x0 + wi * colW);
    const first = new Date(w.contributionDays[0].date + "T00:00:00Z");
    if (first.getUTCMonth() !== lastMonth) {
      lastMonth = first.getUTCMonth();
      if (x - lastLabelX > 30 && wi < s.weeks.length - 1) { months += `<text x="${x}" y="190" font-size="10" class="m">${MONTHS[lastMonth]}</text>`; lastLabelX = x; }
    }
    const cells = w.contributionDays.map((d) => {
      const lvl = LEVEL[d.contributionLevel] ?? 0;
      const row = new Date(d.date + "T00:00:00Z").getUTCDay();
      const y = y0 + row * rowH;
      return lvl === 0
        ? `<text x="${x}" y="${y}" fill="${LEVEL_FILL[0]}">·</text>`
        : `<text x="${x}" y="${y}" class="s${lvl}" style="animation-delay:${n(5 + wi * 0.06)}s">■</text>`;
    }).join("");
    cols += `<g class="in" style="animation-delay:${n(3.2 + wi * 0.025)}s">${cells}</g>`;
  });

  const legendX = W - 40 - 5 * 14 - 4 * 11 * ADV;
  const legend = `<text x="${n(legendX - 34)}" y="336" font-size="10.5" class="m">less</text>` +
    LEVEL_FILL.map((f, l) => `<text x="${n(legendX + l * 14)}" y="336" font-size="11" fill="${f}">${l ? "■" : "·"}</text>`).join("") +
    `<text x="${n(legendX + 5 * 14 + 4)}" y="336" font-size="10.5" class="m">more</text>`;

  const today = new Date();
  const css = `${termCss}
.draw{stroke-dasharray:1;animation:draw 1s cubic-bezier(.65,0,.35,1) 2.9s both}
@keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
${scanCss}
${REDUCED_MOTION}`;

  const body = `${windowChrome(W, H, "tobias@argta — ~/activity")}
${chevron(30, 66)}
<text x="48" y="66" font-size="${fs}" class="t">${esc(COMMAND)}</text>
<rect class="cover" x="48" y="52" width="${n(typeW + 4)}" height="19" fill="${C.bg}"/>
${calls.map(([tool, result], i) => toolCall(tool, result, 98 + i * 22, n(1.6 + i * 0.4), fs)).join("")}
<rect x="22" y="164" width="802" height="148" rx="10" fill="none" stroke="${C.accent}" stroke-opacity=".6" pathLength="1" class="draw"/>
<g class="in" style="animation-delay:3.1s">${months}</g>
<g font-size="11">${cols}</g>
<g class="in" style="animation-delay:4.6s">${chevron(30, 340)}<text x="48" y="336" font-size="10.5" class="m">updated ${fmtDay(today)}, ${today.getUTCFullYear()} · regenerated daily</text>${legend}</g>
</g>`;

  const label = `GitHub activity of Tobias Arangio: ${s.total} contributions in the last 12 months. ` +
    (s.latest ? `Latest push: ${s.latest.repo}, "${s.latest.message}", on ${fmtDay(s.latest.date)}. ` : "") +
    `Current streak ${plural(s.current, "day")}, best ${plural(s.best, "day")}. Contribution calendar drawn in orange ASCII.`;

  return { W, H, label, css, body };
}

/* ------------------------------------------------------------------ main */

const data = summarize(await fetchData());
await mkdir(OUT, { recursive: true });
const svg = await render(activity(data));
await writeFile(path.join(OUT, "activity.svg"), svg);
console.log(`activity.svg  ${(svg.length / 1024).toFixed(1)} KB · ${data.total} contributions · streak ${data.current}/${data.best} · latest ${data.latest?.repo ?? "-"}`);
