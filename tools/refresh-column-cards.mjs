// 한국어 페이지 곳곳의 "칼럼 이어 읽기" 카드를 칼럼 목록(columns.html)에서 계산해 채운다.
// 배포 때마다 돈다(.github/workflows/deploy-pages.yml, 30분마다·푸시마다). 새 칼럼을 발행하면 사람이 손대지 않아도 바뀐다.
//
//   자리 표시                                   무엇을 넣나
//   care.html        CARE_COLUMN:분류           그 분류(Focus·Calm·Restore·Relief·Shape)의 가장 최근 칼럼 1편
//   be-deer.html     AUTO_COLUMNS:be-deer       다이어트·비만 칼럼(Shape 중 소아성장 제외) 최근 6편
//   director.html    AUTO_COLUMNS:director      전체 칼럼 최근 4편
//   EXAM_SEASON:*    (공진단 페이지·칼럼 4편)    가장 최근 "수험생 공진단" 칼럼. 수능이 지나도 늘 둔다.
//
//   node tools/refresh-column-cards.mjs          파일을 갱신한다
//   node tools/refresh-column-cards.mjs --check  갱신이 필요하면 실패한다(파일은 바꾸지 않는다)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CARE_CATEGORIES = ["Focus", "Calm", "Restore", "Relief", "Shape"];

export function readColumnCards(columnsHtml) {
  const cards = [];
  for (const m of columnsHtml.matchAll(/<a class="column-card[^"]*" href="columns\/([^"]+)\.html"([^>]*)>([\s\S]*?)<\/a>/g)) {
    const [, slug, attrs, inner] = m;
    const img = inner.match(/<img\b[^>]*>/)?.[0] || "";
    cards.push({
      slug,
      category: attrs.match(/data-category="([^"]+)"/)?.[1] || "",
      search: attrs.match(/data-search="([^"]*)"/)?.[1] || "",
      number: Number(attrs.match(/data-journal-number="(\d+)"/)?.[1] || 0),
      src: img.match(/src="([^"]+)"/)?.[1] || "",
      alt: img.match(/alt="([^"]*)"/)?.[1] || "",
      contain: /column-card__contain/.test(img),
      meta: inner.match(/<p class="column-meta">([^<]*)<\/p>/)?.[1] || "",
      title: inner.match(/<h2>([\s\S]*?)<\/h2>/)?.[1].trim() || slug,
      excerpt: inner.match(/<\/h2>\s*<p>([\s\S]*?)<\/p>/)?.[1].trim() || "",
      date: inner.match(/<time datetime="([^"]+)"/)?.[1] || "",
    });
  }
  return cards.sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number);
}

const isDiet = (c) => c.category === "Shape" && /다이어트|비만/.test(c.search) && !/성장/.test(c.search);
const isExamGongjindan = (c) => /수험생/.test(`${c.title} ${c.search}`) && /공진단/.test(`${c.title} ${c.search}`);

// inColumn: 칼럼 폴더(columns/) 안의 페이지에 넣을 때. 링크는 같은 폴더, 그림은 한 단계 위를 가리킨다.
function li(card, { badge, inColumn = false }) {
  return `<li><a href="${inColumn ? "" : "columns/"}${card.slug}.html"><figure><img${card.contain ? ' class="is-contain"' : ""} src="${inColumn ? "../" : ""}${card.src}" alt="${card.alt}" loading="lazy">${badge ? `<b>${badge}</b>` : ""}</figure><div><small>${card.meta}</small><strong>${card.title}</strong>${card.excerpt ? `<span>${card.excerpt}</span>` : ""}<em>칼럼 읽기 <i aria-hidden="true">→</i></em></div></a></li>`;
}

function fillMarker(html, name, content, file) {
  const pattern = new RegExp(`(<!-- ${name}:START -->)[\\s\\S]*?(<!-- ${name}:END -->)`, "g");
  if (!pattern.test(html)) throw new Error(`${file}에 ${name} 자리 표시가 없습니다.`);
  return html.replace(pattern, (all, start, end) => `${start}${content}${end}`);
}

// 수험생 상자는 관련 자산이라 수능이 지나도 숨기지 않는다(박성호, 2026-09-22). 칼럼이 하나도 없을 때만 비운다.
export function examSeason(cards) {
  const column = cards.find(isExamGongjindan);
  return column ? { column, open: true } : null;
}

export function refreshAll(files, cards) {
  const out = { ...files };
  const need = (file) => { if (out[file] === undefined) throw new Error(`${file} 파일이 없습니다.`); };

  need("care.html");
  for (const category of CARE_CATEGORIES) {
    const latest = cards.find((c) => c.category === category);
    if (!latest) throw new Error(`${category} 분류 칼럼이 없습니다.`);
    out["care.html"] = fillMarker(out["care.html"], `CARE_COLUMN:${category}`, li(latest, { badge: category.toUpperCase() }), "care.html");
  }

  need("be-deer.html");
  const diet = cards.filter(isDiet).slice(0, 6);
  out["be-deer.html"] = fillMarker(out["be-deer.html"], "AUTO_COLUMNS:be-deer", `\n${diet.map((c, i) => `          ${li(c, { badge: String(i + 1).padStart(2, "0") })}`).join("\n")}\n        `, "be-deer.html");
  // 구조화 데이터에는 화면에 보이는 칼럼만 적는다. 카드가 바뀌면 hasPart도 같이 바꾼다.
  const hasPart = /("hasPart": \[)[\s\S]*?(\n\s*\])/;
  if (!hasPart.test(out["be-deer.html"])) throw new Error("be-deer.html 구조화 데이터에 hasPart가 없습니다.");
  const plain = (s) => s.replace(/<[^>]+>/g, "").replaceAll('"', '\\"');
  out["be-deer.html"] = out["be-deer.html"].replace(hasPart, (all, start, end) => `${start}\n${diet.map((c) => `          { "@type": "MedicalWebPage", "url": "https://dearhani.com/columns/${c.slug}.html", "name": "${plain(c.title)}" }`).join(",\n")}${end}`);

  need("director.html");
  const recent = cards.slice(0, 4);
  out["director.html"] = fillMarker(out["director.html"], "AUTO_COLUMNS:director", `\n${recent.map((c, i) => `          ${li(c, { badge: String(i + 1).padStart(2, "0") })}`).join("\n")}\n        `, "director.html");

  const season = examSeason(cards);
  for (const [file, html] of Object.entries(out)) {
    if (!html.includes("<!-- EXAM_SEASON:")) continue;
    let next = html;
    for (const kind of ["dear-reads", "column-related", "link"]) {
      const name = `EXAM_SEASON:${kind}`;
      if (!next.includes(`<!-- ${name}:START -->`)) continue;
      let content = "";
      if (season?.open) {
        const c = season.column;
        if (kind === "dear-reads") {
          content = `\n    <section class="dear-reads dear-reads--1 dear-reads--standalone" aria-labelledby="exam-season-title">
      <div class="dear-reads__head"><div><p>FOR EXAM SEASON</p><h2 id="exam-season-title">수능을 앞둔 아이가 있다면</h2></div></div>
      <ul class="dear-reads__grid">
        ${li(c, {})}
      </ul>
    </section>\n    `;
        } else if (kind === "column-related") {
          // 칼럼 본문 스타일을 받지 않도록 공진단 페이지와 같은 디어저널 카드로 넣는다.
          content = `<section class="dear-reads dear-reads--1 dear-reads--in-column" aria-labelledby="exam-season-title"><div class="dear-reads__head"><div><p>FOR EXAM SEASON</p><h2 id="exam-season-title">수능을 앞둔 아이가 있다면</h2></div></div><ul class="dear-reads__grid">${li(c, { inColumn: true })}</ul></section>`;
        } else {
          content = `<a href="${c.slug}.html">수험생 공진단 고르는 법 →</a>`;
        }
      }
      next = fillMarker(next, name, content, file);
    }
    out[file] = next;
  }
  // 칼럼 하단 "함께 읽으면 좋은 글": 같은 분류의 최신 3편(읽고 있는 글 제외).
  for (const [file, html] of Object.entries(out)) {
    if (!file.startsWith("columns/") || !html.includes("<!-- RELATED_COLUMNS:START -->")) continue;
    const slug = path.basename(file, ".html");
    const self = cards.find((c) => c.slug === slug);
    const pool = cards.filter((c) => c.slug !== slug && (!self || c.category === self.category));
    const picks = (pool.length >= 3 ? pool : cards.filter((c) => c.slug !== slug)).slice(0, 3);
    const content = `<section class="dear-reads dear-reads--in-column dear-reads--related" aria-labelledby="related-columns-title"><div class="dear-reads__head"><div><p>CONTINUE READING</p><h2 id="related-columns-title">함께 읽으면 좋은 글</h2></div></div><ul class="dear-reads__grid">${picks.map((c, i) => li(c, { badge: String(i + 1).padStart(2, "0"), inColumn: true })).join("")}</ul><div class="dear-reads__foot"><a class="dear-reads__all" href="../columns.html">칼럼 전체 보기 <span aria-hidden="true">→</span></a></div></section>`;
    out[file] = fillMarker(html, "RELATED_COLUMNS", content, file);
  }
  return { out, season };
}

export const AUTO_FILES = [
  "care.html",
  "be-deer.html",
  "director.html",
  "dear-gongjindan.html",
  "columns/gongjindan-effect.html",
  "columns/gongjindan.html",
  "columns/student-herbal-medicine.html",
  "columns/cheongdam-gongjindan.html",
];

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const read = (file) => fs.readFileSync(path.join(siteRoot, file), "utf8");
  // 칼럼 하단 자리 표시가 있는 칼럼은 목록을 따로 적지 않고 폴더에서 찾는다.
  const relatedFiles = fs.readdirSync(path.join(siteRoot, "columns"))
    .filter((name) => name.endsWith(".html"))
    .map((name) => `columns/${name}`)
    .filter((file) => !AUTO_FILES.includes(file) && read(file).includes("<!-- RELATED_COLUMNS:START -->"));
  const targets = [...AUTO_FILES, ...relatedFiles];
  const files = Object.fromEntries(targets.map((file) => [file, read(file)]));
  const cards = readColumnCards(read("columns.html"));
  const { out, season } = refreshAll(files, cards);
  const changed = targets.filter((file) => out[file] !== files[file]);
  const seasonNote = season ? `수험생 칼럼 ${season.column.slug}` : "수험생 칼럼 없음";
  if (process.argv.includes("--check")) {
    if (changed.length) {
      console.error(`칼럼 카드가 최신이 아닙니다: ${changed.join(", ")} — node tools/refresh-column-cards.mjs 를 실행하세요.`);
      process.exit(1);
    }
    console.log(`칼럼 카드 최신 상태 확인 (${seasonNote})`);
  } else {
    changed.forEach((file) => fs.writeFileSync(path.join(siteRoot, file), out[file]));
    console.log(`칼럼 카드 ${changed.length ? `갱신: ${changed.join(", ")}` : "변경 없음"} (${seasonNote})`);
  }
}
