// 한국어 페이지 곳곳의 "칼럼 이어 읽기" 카드를 칼럼 목록(columns.html)에서 계산해 채운다.
// 배포 때마다 돈다(.github/workflows/deploy-pages.yml, 30분마다·푸시마다). 새 칼럼을 발행하면 사람이 손대지 않아도 바뀐다.
//
//   자리 표시                                   무엇을 넣나
//   care.html        CARE_COLUMN:분류           그 분류(Focus·Calm·Restore·Relief·Shape)의 가장 최근 칼럼 1편
//   be-deer.html     AUTO_COLUMNS:be-deer       다이어트·비만 칼럼(Shape 중 소아성장 제외) 최근 6편
//   director.html    AUTO_COLUMNS:director      전체 칼럼 최근 4편
//   EXAM_SEASON:*    (공진단 페이지·칼럼 4편)    가장 최근 "수험생 공진단" 칼럼. 수능이 지나도 늘 둔다.
//   columns/*        CONTACT_DOCK               오시는 길 도크(주소·전화·예약을 HTML에 새긴다)
//   columns/*        RELATED_COLUMNS            같은 분류 최신 3편. 디어저널(티스토리) 카드가 있는 칼럼은 비운다
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

// 칼럼 CTA는 이 도크 하나로 통일한다(박성호, 2026-09-22). 모양은 css/column-contact.css, 위쪽 원장 카드는 js/column-contact.js.
// 진료시간·주소·전화는 CLAUDE.md의 확정값을 줄이지 않고 옮긴다.
const SVG = {
  talk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 1 3.3 6.4L4 20l1.2-3.6A7.9 7.9 0 0 1 4 12z"/><path d="M9 11.5h.01M12 11.5h.01M15 11.5h.01"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 4.5h-3a1 1 0 0 0-1 1c0 8.3 6.7 15 15 15a1 1 0 0 0 1-1v-3a1 1 0 0 0-.8-1l-3.3-.7a1 1 0 0 0-1 .3l-1.2 1.4a12.4 12.4 0 0 1-5.7-5.7l1.4-1.2a1 1 0 0 0 .3-1L9.5 5.3a1 1 0 0 0-1-.8z"/></svg>',
  booking: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 9.5h16M8 3.5v3M16 3.5v3M9 14l2 2 4-4"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.8"/><path d="M16.6 7.4h.01"/></svg>',
};
const HOURS = '<ul class="dc-hours" aria-label="진료시간"><li><b>월·화·수·금</b>10:00–20:00</li><li><b>점심</b>13:00–14:00</li><li><b>목</b>14:00–20:00</li><li><b>토</b>10:00–15:00</li><li><b>일</b>정기휴무</li></ul>';
const EXT = 'target="_blank" rel="noopener"';
export const CONTACT_DOCK = `<section class="dc-dock" aria-labelledby="dc-dock-title"><div class="dc-dock__head"><strong id="dc-dock-title">디어한의원 오시는 길</strong><p>DEAR KOREAN MEDICINE CLINIC</p></div><div class="dc-dock__grid"><div class="dc-dock__map"><iframe src="https://maps.google.com/maps?q=37.4918829,127.0252346&amp;z=16&amp;output=embed" title="디어한의원 위치 지도 (서울 서초구 사임당로 143)" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div><div class="dc-dock__side"><div class="dc-dock__info"><strong>디어한의원</strong><address>서울 서초구 사임당로 143 3층 309호, 310호<br><a href="tel:02-3486-1777" data-track-action="phone" data-track-location="column_dock">02-3486-1777</a> · <a href="https://map.naver.com/p/entry/place/1989406480" ${EXT} data-track-action="naver_map" data-track-location="column_dock">네이버 지도</a></address>${HOURS}</div><ul class="dc-tiles"><li><a class="dc-tile dc-tile--naver" href="https://m.booking.naver.com/booking/13/bizes/729883" ${EXT} data-track-action="naver_booking" data-track-location="column_dock"><i>${SVG.booking}</i>네이버 예약</a></li><li><a class="dc-tile dc-tile--talk" href="https://talk.naver.com/ct/w5zr5u" ${EXT} data-track-action="naver_talk" data-track-location="column_dock"><i>${SVG.talk}</i>톡톡 상담</a></li><li><a class="dc-tile dc-tile--phone" href="tel:02-3486-1777" data-track-action="phone" data-track-location="column_dock"><i>${SVG.phone}</i>전화</a></li><li><a class="dc-tile dc-tile--insta" href="https://www.instagram.com/dearhani__/" ${EXT} data-track-action="instagram" data-track-location="column_dock"><i>${SVG.instagram}</i>인스타그램</a></li></ul></div></div></section>`;
const CSAT_SLUG = "csat-gift-student-condition";
const CONTACT_DOCK_CSAT = `<section class="dc-dock" data-csat-contact aria-labelledby="dc-dock-title"><div class="csat-contact__lead"><small>BEFORE THE EXAM</small><strong id="dc-dock-title">수능 전, 지금 필요한 처방을 대표원장과 상의하세요.</strong><p>코막힘처럼 공부를 끊는 증상인지, 누적된 피로와 컨디션 저하인지 진료에서 먼저 구분합니다.</p><div class="csat-contact__actions"><a href="https://m.booking.naver.com/booking/13/bizes/729883" ${EXT} data-track-action="naver_booking" data-track-location="column_dock">네이버 예약 <span aria-hidden="true">→</span></a><a href="tel:02-3486-1777" data-track-action="phone" data-track-location="column_dock">전화 상담 <span aria-hidden="true">→</span></a></div></div><div class="csat-contact__details"><small>DEAR KOREAN MEDICINE CLINIC</small><strong>디어한의원</strong><address>서울 서초구 사임당로 143 3층 309호, 310호<br><a href="tel:02-3486-1777" data-track-action="phone" data-track-location="column_dock">02-3486-1777</a></address>${HOURS}<div class="csat-contact__minor"><a href="https://map.naver.com/p/entry/place/1989406480" ${EXT} data-track-action="naver_map" data-track-location="column_dock">네이버 지도</a><a href="https://talk.naver.com/ct/w5zr5u" ${EXT} data-track-action="naver_talk" data-track-location="column_dock">톡톡 상담</a></div></div></section>`;

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
  // 칼럼 하단 오시는 길 도크. 주소·전화·예약이 검색엔진이 읽는 HTML에 남도록 스크립트가 아니라 여기서 새긴다.
  for (const [file, html] of Object.entries(out)) {
    if (!file.startsWith("columns/") || !html.includes("<!-- CONTACT_DOCK:START -->")) continue;
    const slug = path.basename(file, ".html");
    out[file] = fillMarker(html, "CONTACT_DOCK", slug === CSAT_SLUG ? CONTACT_DOCK_CSAT : CONTACT_DOCK, file);
  }
  // 칼럼 하단 "함께 읽으면 좋은 글": 같은 분류의 최신 3편(읽고 있는 글 제외).
  for (const [file, html] of Object.entries(out)) {
    if (!file.startsWith("columns/") || !html.includes("<!-- RELATED_COLUMNS:START -->")) continue;
    // 디어저널(티스토리) 이어 읽기 카드가 있는 칼럼은 그것 하나만 둔다. 읽을거리 상자가 둘이면 화면만 길어진다(박성호, 2026-09-22).
    if (html.includes('class="column-journal')) {
      out[file] = fillMarker(html, "RELATED_COLUMNS", "", file);
      continue;
    }
    const slug = path.basename(file, ".html");
    const self = cards.find((c) => c.slug === slug);
    const pool = cards.filter((c) => c.slug !== slug && (!self || c.category === self.category));
    const csatRelatedSlugs = ["student-herbal-medicine", "gongjindan", "cheongdam-gongjindan"];
    const focusedPicks = csatRelatedSlugs.map((candidate) => cards.find((c) => c.slug === candidate)).filter(Boolean);
    const picks = slug === CSAT_SLUG
      ? focusedPicks
      : (pool.length >= 3 ? pool : cards.filter((c) => c.slug !== slug)).slice(0, 3);
    const csatClass = slug === CSAT_SLUG ? " dear-reads--csat" : "";
    const heading = slug === CSAT_SLUG ? "수능 전 함께 읽으면 좋은 글" : "함께 읽으면 좋은 글";
    const content = `<section class="dear-reads dear-reads--in-column dear-reads--related${csatClass}" aria-labelledby="related-columns-title"><div class="dear-reads__head"><div><p>CONTINUE READING</p><h2 id="related-columns-title">${heading}</h2></div></div><ul class="dear-reads__grid">${picks.map((c, i) => li(c, { badge: String(i + 1).padStart(2, "0"), inColumn: true })).join("")}</ul><div class="dear-reads__foot"><a class="dear-reads__all" href="../columns.html">칼럼 전체 보기 <span aria-hidden="true">→</span></a></div></section>`;
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
