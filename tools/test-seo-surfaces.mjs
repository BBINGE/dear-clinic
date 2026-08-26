import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(toolsDir, "..");
const baseUrl = "https://dearhani.com";

function read(relativePath) {
  return fs.readFileSync(path.join(siteRoot, relativePath), "utf8");
}

function localPathFromUrl(value) {
  const url = new URL(value);
  assert.equal(url.origin, baseUrl, `사이트맵에 외부 URL이 있습니다: ${value}`);
  const pathname = decodeURIComponent(url.pathname).replace(/^\//, "");
  return !pathname || pathname.endsWith("/") ? `${pathname}index.html` : pathname;
}

const sitemap = read("sitemap.xml");
const sitemapUrls = [...sitemap.matchAll(/<loc>(https:\/\/dearhani\.com[^<]*)<\/loc>/g)].map((match) => match[1]);
assert.ok(sitemapUrls.length > 0, "사이트맵 URL을 찾지 못했습니다.");
assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, "사이트맵에 중복 URL이 있습니다.");

const canonicalOwners = new Map();
for (const pageUrl of sitemapUrls) {
  const relativePath = localPathFromUrl(pageUrl);
  const absolutePath = path.join(siteRoot, relativePath);
  assert.ok(fs.existsSync(absolutePath), `사이트맵 페이지 파일이 없습니다: ${relativePath}`);
  const html = fs.readFileSync(absolutePath, "utf8");
  assert.doesNotMatch(html, /assets\/images\/favicon\.svg/, `이전 파비콘을 참조합니다: ${relativePath}`);
  assert.match(html, /assets\/images\/dear-favicon\.png/, `디어 파비콘이 없습니다: ${relativePath}`);
  assert.match(html, /<title>[^<]+<\/title>/i, `title이 없습니다: ${relativePath}`);
  const descriptionTag = [...html.matchAll(/<meta\b[^>]*>/gi)].find((match) => /\bname="description"/i.test(match[0]));
  assert.match(descriptionTag?.[0] || "", /\bcontent="[^"]+"/i, `description이 없습니다: ${relativePath}`);
  const canonicalTag = [...html.matchAll(/<link\b[^>]*>/gi)].find((match) => /\brel="canonical"/i.test(match[0]));
  const canonical = canonicalTag?.[0].match(/\bhref="([^"]+)"/i)?.[1];
  assert.ok(canonical, `canonical이 없습니다: ${relativePath}`);
  assert.equal(canonical, pageUrl, `canonical과 사이트맵 URL이 다릅니다: ${relativePath}`);
  assert.equal(canonicalOwners.has(canonical), false, `canonical이 중복됩니다: ${canonical}`);
  canonicalOwners.set(canonical, relativePath);
  assert.equal((html.match(/<h1\b/gi) || []).length, 1, `H1은 정확히 하나여야 합니다: ${relativePath}`);
  for (const [index, match] of [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].entries()) {
    assert.doesNotThrow(() => JSON.parse(match[1]), `JSON-LD ${index + 1}을 해석할 수 없습니다: ${relativePath}`);
  }
}

const latest = JSON.parse(read("assets/data/latest-column.json"));
assert.ok(latest.alt?.trim(), "최신 칼럼 메뉴 이미지의 대체 텍스트가 비어 있습니다.");
assert.ok(fs.existsSync(path.join(siteRoot, localPathFromUrl(`${baseUrl}${latest.href}`))), "최신 칼럼 링크 파일이 없습니다.");
assert.ok(fs.existsSync(path.join(siteRoot, latest.image.replace(/^\//, ""))), "최신 칼럼 이미지 파일이 없습니다.");

const columns = read("columns.html");
const directCardLinks = [...columns.matchAll(/<a\s+class="column-card[^>]+href="([^"]+)"/g)].map((match) => match[1]);
assert.ok(directCardLinks.length > 0, "칼럼 카드 링크를 찾지 못했습니다.");
const rss = read("rss.xml");
for (const href of directCardLinks) {
  assert.ok(fs.existsSync(path.join(siteRoot, href)), `칼럼 카드 파일이 없습니다: ${href}`);
  const absoluteUrl = `${baseUrl}/${href}`;
  assert.ok(sitemap.includes(`<loc>${absoluteUrl}</loc>`), `칼럼 카드가 사이트맵에 없습니다: ${href}`);
  assert.ok(rss.includes(`<link>${absoluteUrl}</link>`), `칼럼 카드가 RSS에 없습니다: ${href}`);
}

const cheongdamGongjindan = read("columns/cheongdam-gongjindan.html");
const cheongdamGongjindanCopy = cheongdamGongjindan
  .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
  .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
  .replace(/<[^>]+>/g, " ");
assert.match(cheongdamGongjindan, /href="https:\/\/m\.booking\.naver\.com\/booking\/13\/bizes\/729883"/, "청담 공진단 칼럼에 네이버 예약 CTA가 없습니다.");
assert.match(cheongdamGongjindan, /href="tel:02-3486-1777"/, "청담 공진단 칼럼에 전화 CTA가 없습니다.");
assert.doesNotMatch(cheongdamGongjindanCopy, /(?:₩|\d[\d,]*\s*원(?:\s|$)|\d+\s*퍼센트|할인|특가)/, "청담 공진단 칼럼에 가격 또는 할인 표현이 노출됩니다.");

const koreanHtml = [
  ...fs.readdirSync(siteRoot).filter((name) => name.endsWith(".html")).map((name) => path.join(siteRoot, name)),
  ...fs.readdirSync(path.join(siteRoot, "columns")).filter((name) => name.endsWith(".html")).map((name) => path.join(siteRoot, "columns", name)),
];
for (const absolutePath of koreanHtml) {
  const html = fs.readFileSync(absolutePath, "utf8");
  assert.doesNotMatch(html, /href="(?:\.\.\/)?index\.html(?:#info)?"/, `홈 링크가 index.html을 가리킵니다: ${path.relative(siteRoot, absolutePath)}`);
}

process.stdout.write(`SEO 표면 검증 통과: 사이트맵 ${sitemapUrls.length}개, 칼럼 ${directCardLinks.length}개\n`);
