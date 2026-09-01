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
  for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/gi)) {
    const reference = match[1].replaceAll("&amp;", "&");
    if (!reference || reference.startsWith("#") || reference.startsWith("//") || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(reference)) continue;
    const cleanReference = decodeURIComponent(reference.split("#")[0].split("?")[0]);
    if (!cleanReference) continue;
    let targetPath = cleanReference.startsWith("/")
      ? path.join(siteRoot, cleanReference.replace(/^\/+/, ""))
      : path.resolve(path.dirname(absolutePath), cleanReference);
    if (cleanReference.endsWith("/") || (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory())) {
      targetPath = path.join(targetPath, "index.html");
    }
    assert.ok(fs.existsSync(targetPath), `내부 파일 참조가 끊겼습니다: ${relativePath} -> ${reference}`);
  }
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
  const schemaMatches = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  if (relativePath.startsWith("columns/")) {
    assert.ok(schemaMatches.length > 0, `칼럼 구조화 데이터가 없습니다: ${relativePath}`);
    assert.match(html, /\.\.\/css\/style\.css\?v=20260901-5/, `칼럼 공통 CSS 버전이 다릅니다: ${relativePath}`);
  }
  for (const [index, match] of schemaMatches.entries()) {
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
const rssItemLinks = [...rss.matchAll(/<item>[\s\S]*?<link>(https:\/\/dearhani\.com\/columns\/[^<]+)<\/link>[\s\S]*?<\/item>/g)].map((match) => match[1]);
assert.equal(new Set(rssItemLinks).size, rssItemLinks.length, "RSS에 중복 칼럼이 있습니다.");
assert.equal(rssItemLinks.length, directCardLinks.length, "RSS 칼럼 수와 공개 칼럼 카드 수가 다릅니다.");
for (const href of directCardLinks) {
  assert.ok(fs.existsSync(path.join(siteRoot, href)), `칼럼 카드 파일이 없습니다: ${href}`);
  const absoluteUrl = `${baseUrl}/${href}`;
  assert.ok(sitemap.includes(`<loc>${absoluteUrl}</loc>`), `칼럼 카드가 사이트맵에 없습니다: ${href}`);
  assert.ok(rss.includes(`<link>${absoluteUrl}</link>`), `칼럼 카드가 RSS에 없습니다: ${href}`);
}

const depressionNoHope = read("columns/depression-no-hope.html");
assert.doesNotMatch(depressionNoHope, /depression-no-hope\/(?:cover-v2|thumbnail-deer-v2)\.png/, "최신 우울증 칼럼이 대용량 PNG를 참조합니다.");
for (const filename of ["cover-v2.webp", "thumbnail-deer-v2.webp"]) {
  const imagePath = path.join(siteRoot, "assets", "images", "columns", "depression-no-hope", filename);
  assert.ok(fs.existsSync(imagePath), `최신 우울증 칼럼 이미지가 없습니다: ${filename}`);
  assert.ok(fs.statSync(imagePath).size < 1_000_000, `최신 우울증 칼럼 이미지가 1MB 이상입니다: ${filename}`);
}

const dietPrice = read("columns/diet-herbal-medicine-price.html");
assert.match(dietPrice, /class="column-table-scroll"[^>]*tabindex="0"[\s\S]*?<table>/, "다이어트 한약 가격표의 모바일 스크롤 래퍼가 없습니다.");

const home = read("index.html");
const sharedCss = read("css/style.css");
assert.match(home, /css\/style\.css\?v=20260901-5/, "홈의 공통 CSS 캐시 버전이 다릅니다.");
assert.match(sharedCss, /\.weather-card__icon::before\s*\{[\s\S]*?white-space:\s*nowrap;/, "날씨 아이콘 줄바꿈 방지 규칙이 없습니다.");
assert.doesNotMatch(sharedCss, /"(?:🌧️🌧️|🌨️❄️)"/, "강수량 강조용 복수 이모지가 아이콘 슬롯을 넘을 수 있습니다.");

const localizedPages = ["index", "about", "director", "career", "philosophy", "care", "services", "columns", "privacy", "non-covered", "patient-rights"];
const localizedDirectories = ["en", "ja", "zh-cn"];
for (const directory of localizedDirectories) {
  for (const page of localizedPages) {
    const relativePath = `${directory}/${page}.html`;
    const html = read(relativePath);
    assert.match(html, /\.\.\/css\/style\.css\?v=20260901-5/, `다국어 CSS 버전이 다릅니다: ${relativePath}`);
    const expectedMainVersion = ["privacy", "non-covered", "patient-rights"].includes(page) ? "20260901-6" : "20260901-5";
    assert.match(html, new RegExp(`\\.\\.\\/js\\/main\\.js\\?v=${expectedMainVersion}`), `다국어 JS 버전이 다릅니다: ${relativePath}`);
    assert.equal((html.match(/<h1\b/gi) || []).length, 1, `다국어 H1은 정확히 하나여야 합니다: ${relativePath}`);
    if (["privacy", "non-covered", "patient-rights"].includes(page)) {
      assert.match(html, new RegExp(`<link rel="canonical" href="https://dearhani\\.com/${directory}/${page}\\.html">`), `다국어 법률 canonical이 다릅니다: ${relativePath}`);
      assert.doesNotMatch(html, /data-ready="false"\s+href="#"|href="#"\s+data-ready="false"/, `다국어 법률 링크가 비활성 상태입니다: ${relativePath}`);
    }
  }
}

for (const directory of localizedDirectories) {
  for (const page of localizedPages) {
    const html = read(`${directory}/${page}.html`);
    assert.doesNotMatch(html, /data-ready="false"\s+href="#"|href="#"\s+data-ready="false"/, `외국어 페이지에 비활성 법률 링크가 있습니다: ${directory}/${page}.html`);
    assert.match(html, /href="privacy\.html"/, `외국어 개인정보 링크가 언어 폴더를 벗어납니다: ${directory}/${page}.html`);
    assert.match(html, /href="non-covered\.html"/, `외국어 비급여 링크가 언어 폴더를 벗어납니다: ${directory}/${page}.html`);
    assert.match(html, /href="patient-rights\.html"/, `외국어 환자 권리 링크가 언어 폴더를 벗어납니다: ${directory}/${page}.html`);
  }
}

const sharedMain = read("js/main.js");
assert.match(sharedMain, /function getDearPageLocale\(\)/, "브라우저 번역과 분리된 URL 기반 언어 판별이 없습니다.");
assert.match(sharedMain, /if \(nav && navMenu\) \{/, "다국어 메가메뉴 초기화가 없습니다.");
assert.match(sharedMain, /function alignLocalizedPageUi\(\)/, "다국어 최신 UI 정렬 계층이 없습니다.");
for (const requiredClass of ["services-hero-card", "services-principle", "care-moment", "director__articles", "columns-search-stage", "home-be-deer", "home-care-bridge"]) {
  assert.ok(sharedMain.includes(requiredClass), `다국어 UI 보강 클래스가 없습니다: ${requiredClass}`);
}
assert.match(sharedCss, /\.dear-locale-ja[\s\S]*?overflow-wrap:\s*anywhere;/, "일본어 모바일 줄바꿈 보호 규칙이 없습니다.");
assert.match(sharedCss, /\.columns-search-stage\s*\{[^}]*grid-template-columns:minmax\(0,1fr\)/, "다국어 칼럼 검색 헤더의 모바일 폭 보호가 없습니다.");

const cheongdamGongjindan = read("columns/cheongdam-gongjindan.html");
const cheongdamGongjindanCopy = cheongdamGongjindan
  .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
  .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
  .replace(/<[^>]+>/g, " ");
assert.match(cheongdamGongjindan, /href="https:\/\/m\.booking\.naver\.com\/booking\/13\/bizes\/729883"/, "청담 공진단 칼럼에 네이버 예약 CTA가 없습니다.");
assert.match(cheongdamGongjindan, /href="tel:02-3486-1777"/, "청담 공진단 칼럼에 전화 CTA가 없습니다.");
assert.match(cheongdamGongjindan, /class="cg-offer"[\s\S]*class="cg-offer__spec"[\s\S]*이 구성 상담하기/, "청담 공진단 칼럼의 상담형 상품 모듈이 없습니다.");
assert.doesNotMatch(cheongdamGongjindanCopy, /(?:₩|\d[\d,]*\s*원(?:\s|$)|\d+\s*퍼센트|할인|특가)/, "청담 공진단 칼럼에 가격 또는 할인 표현이 노출됩니다.");

const mapTerritory = read("columns/map-is-not-the-territory.html");
const mapContentStart = mapTerritory.indexOf('<div class="column-article__content">');
const mapArticleEnd = mapTerritory.indexOf("</article>", mapContentStart);
assert.ok(mapContentStart >= 0 && mapArticleEnd > mapContentStart, "지도와 영토 칼럼의 본문 구조를 찾지 못했습니다.");
const mapContent = mapTerritory.slice(mapContentStart, mapArticleEnd);
assert.match(mapContent, /class="column-consult"/, "지도와 영토 칼럼의 하단 상담 CTA가 본문 안에 없습니다.");
assert.match(mapContent, /class="column-nap"/, "지도와 영토 칼럼의 NAP이 본문 안에 없습니다.");
assert.match(mapContent, /href="https:\/\/m\.booking\.naver\.com\/booking\/13\/bizes\/729883"/, "지도와 영토 칼럼의 네이버 예약 링크가 없습니다.");
assert.match(mapContent, /href="tel:02-3486-1777"/, "지도와 영토 칼럼의 전화 링크가 없습니다.");
assert.match(mapContent, /href="https:\/\/map\.naver\.com\/p\/search\//, "지도와 영토 칼럼의 위치 보기 링크가 없습니다.");

const koreanHtml = [
  ...fs.readdirSync(siteRoot).filter((name) => name.endsWith(".html")).map((name) => path.join(siteRoot, name)),
  ...fs.readdirSync(path.join(siteRoot, "columns")).filter((name) => name.endsWith(".html")).map((name) => path.join(siteRoot, "columns", name)),
];
for (const absolutePath of koreanHtml) {
  const html = fs.readFileSync(absolutePath, "utf8");
  assert.doesNotMatch(html, /href="(?:\.\.\/)?index\.html(?:#info)?"/, `홈 링크가 index.html을 가리킵니다: ${path.relative(siteRoot, absolutePath)}`);
}

process.stdout.write(`SEO 표면 검증 통과: 사이트맵 ${sitemapUrls.length}개, 칼럼 ${directCardLinks.length}개\n`);
