// Care 다섯 패널의 칼럼 카드를 분류별 가장 최근 칼럼으로 채운다.
// 배포 때마다 돈다(.github/workflows/deploy-pages.yml). 새 칼럼을 발행하면 손대지 않아도 카드가 바뀐다.
// 칼럼 정보는 columns.html의 칼럼 카드(대표 이미지·분류 표시·제목·요약·발행일)를 그대로 쓴다.
//   node tools/refresh-care-columns.mjs          care.html을 갱신한다
//   node tools/refresh-care-columns.mjs --check  갱신이 필요하면 실패한다(파일은 바꾸지 않는다)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATEGORIES = ["Focus", "Calm", "Restore", "Relief", "Shape"];

export function readColumnCards(columnsHtml) {
  const cards = [];
  for (const m of columnsHtml.matchAll(/<a class="column-card[^"]*" href="columns\/([^"]+)\.html"[^>]*data-category="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const [, slug, category, inner] = m;
    const img = inner.match(/<img\b[^>]*>/)?.[0] || "";
    cards.push({
      slug,
      category,
      src: img.match(/src="([^"]+)"/)?.[1] || "",
      alt: img.match(/alt="([^"]*)"/)?.[1] || "",
      contain: /column-card__contain/.test(img),
      meta: inner.match(/<p class="column-meta">([^<]*)<\/p>/)?.[1] || category.toUpperCase(),
      title: inner.match(/<h2>([\s\S]*?)<\/h2>/)?.[1].trim() || slug,
      excerpt: inner.match(/<\/h2>\s*<p>([\s\S]*?)<\/p>/)?.[1].trim() || "",
      date: inner.match(/<time datetime="([^"]+)"/)?.[1] || "",
      number: Number(m[0].match(/data-journal-number="(\d+)"/)?.[1] || 0),
    });
  }
  return cards;
}

export function latestByCategory(cards, category) {
  return cards
    .filter((card) => card.category === category)
    .sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number)[0];
}

function cardMarkup(card, category) {
  return `<li><a href="columns/${card.slug}.html"><figure><img${card.contain ? ' class="is-contain"' : ""} src="${card.src}" alt="${card.alt}" loading="lazy"><b>${category.toUpperCase()}</b></figure><div><small>${card.meta}</small><strong>${card.title}</strong>${card.excerpt ? `<span>${card.excerpt}</span>` : ""}<em>칼럼 읽기 <i aria-hidden="true">→</i></em></div></a></li>`;
}

export function refreshCareHtml(careHtml, cards) {
  let html = careHtml;
  for (const category of CATEGORIES) {
    const pattern = new RegExp(`(<!-- CARE_COLUMN:${category}:START -->)[\\s\\S]*?(<!-- CARE_COLUMN:${category}:END -->)`);
    if (!pattern.test(html)) throw new Error(`care.html에 ${category} 칼럼 자리 표시가 없습니다.`);
    const latest = latestByCategory(cards, category);
    if (!latest) throw new Error(`${category} 분류 칼럼이 columns.html에 없습니다.`);
    html = html.replace(pattern, (all, start, end) => `${start}${cardMarkup(latest, category)}${end}`);
  }
  return html;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const carePath = path.join(siteRoot, "care.html");
  const before = fs.readFileSync(carePath, "utf8");
  const cards = readColumnCards(fs.readFileSync(path.join(siteRoot, "columns.html"), "utf8"));
  const after = refreshCareHtml(before, cards);
  if (process.argv.includes("--check")) {
    if (after !== before) {
      console.error("Care 칼럼 카드가 최신 칼럼과 다릅니다. node tools/refresh-care-columns.mjs 를 실행하세요.");
      process.exit(1);
    }
    console.log("Care 칼럼 카드 최신 상태 확인");
  } else {
    if (after !== before) fs.writeFileSync(carePath, after);
    console.log(after === before ? "Care 칼럼 카드 변경 없음" : "Care 칼럼 카드 갱신");
  }
}
