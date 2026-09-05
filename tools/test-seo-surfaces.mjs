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
const sharedCssVersion = "20260904-1";
const sharedMainVersion = "20260904-1";
const footerPattern = /<footer class="footer" id="contact">[\s\S]*?<\/footer>/;
const homeFooter = read("index.html").match(footerPattern)?.[0];
assert.ok(homeFooter, "메인 공통 푸터가 없습니다.");
const expectedColumnFooter = homeFooter
  .replace('src="assets/', 'src="../assets/')
  .replace('href="privacy.html"', 'href="../privacy.html"')
  .replace('href="terms.html"', 'href="../terms.html"')
  .replace('href="non-covered.html"', 'href="../non-covered.html"')
  .replace('href="patient-rights.html"', 'href="../patient-rights.html"');
const normalizeLineEndings = (value) => value.replaceAll("\r\n", "\n");
for (const pageUrl of sitemapUrls) {
  const relativePath = localPathFromUrl(pageUrl);
  const absolutePath = path.join(siteRoot, relativePath);
  assert.ok(fs.existsSync(absolutePath), `사이트맵 페이지 파일이 없습니다: ${relativePath}`);
  const html = fs.readFileSync(absolutePath, "utf8");
  if (relativePath === "international-appointment.html") {
    assert.match(html, /js\/international-appointment\.js\?v=20260903-2/, "외국인 예약 페이지 JS 캐시 버전이 다릅니다.");
  } else {
    assert.match(html, new RegExp(`(?:\\.\\.\\/|)js\\/main\\.js\\?v=${sharedMainVersion}`), `공통 JS 캐시 버전이 다릅니다: ${relativePath}`);
  }
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
    assert.match(html, new RegExp(`\\.\\.\\/css\\/style\\.css\\?v=${sharedCssVersion}`), `칼럼 공통 CSS 버전이 다릅니다: ${relativePath}`);
    assert.match(html, /<footer class="footer" id="contact">/, `칼럼 공통 푸터가 없습니다: ${relativePath}`);
    assert.equal(normalizeLineEndings(html.match(footerPattern)?.[0] || ""), normalizeLineEndings(expectedColumnFooter), `메인과 칼럼 푸터가 다릅니다: ${relativePath}`);
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

const insomnia = read("columns/insomnia-without-sleeping-pills.html");
assert.match(insomnia, /class="column-nap"/, "불면증 칼럼의 NAP 카드가 없습니다.");
assert.match(insomnia, /href="https:\/\/m\.booking\.naver\.com\/booking\/13\/bizes\/729883"/, "불면증 칼럼의 네이버 예약 링크가 없습니다.");
assert.match(insomnia, /href="https:\/\/map\.naver\.com\/p\/search\//, "불면증 칼럼의 위치 보기 링크가 없습니다.");
assert.doesNotMatch(insomnia, /<footer class="footer-card"/, "불면증 칼럼에 간이 푸터가 남아 있습니다.");
assert.match(insomnia, /\.faq\{margin-top:clamp\(2\.4rem,4vw,3\.5rem\);padding:0\}/, "불면증 칼럼 FAQ에 사이트 전역 section 패딩이 다시 적용될 수 있습니다.");
assert.match(insomnia, /\.sources\{margin-top:clamp\(2\.4rem,4vw,3\.5rem\);padding:2rem 0 0\}/, "불면증 칼럼 참고자료의 하단 패딩이 다른 칼럼 기준과 다릅니다.");

const home = read("index.html");
const sharedCss = read("css/style.css");
assert.match(home, new RegExp(`css\\/style\\.css\\?v=${sharedCssVersion}`), "홈의 공통 CSS 캐시 버전이 다릅니다.");
assert.match(home, /js\/weather-scene\.js\?v=20260904-1/, "날씨 장면 지연 로더의 캐시 버전이 다릅니다.");
const deferredWeatherScenes = [...home.matchAll(/<img\b[^>]*class="[^"]*weather-lens__scene[^"]*"[^>]*data-src="([^"]+)"[^>]*>/g)];
assert.equal(deferredWeatherScenes.length, 4, "날씨 배경 네 장이 필요할 때만 로드되도록 설정되지 않았습니다.");
for (const match of deferredWeatherScenes) {
  assert.doesNotMatch(match[0], /\ssrc="/, "날씨 배경이 초기 화면에서 모두 다운로드됩니다.");
  assert.ok(fs.existsSync(path.join(siteRoot, match[1])), `날씨 배경 파일이 없습니다: ${match[1]}`);
  assert.match(match[0], /\bwidth="1224"\s+height="941"/, "날씨 배경의 고정 크기 정보가 없습니다.");
}
assert.match(read("js/weather-scene.js"), /function loadWeatherScene\(state, daylight\)/, "현재 날씨 장면만 불러오는 로더가 없습니다.");
assert.match(sharedCss, /\.weather-card__icon::before\s*\{[\s\S]*?white-space:\s*nowrap;/, "날씨 아이콘 줄바꿈 방지 규칙이 없습니다.");
assert.doesNotMatch(sharedCss, /"(?:🌧️🌧️|🌨️❄️)"/, "강수량 강조용 복수 이모지가 아이콘 슬롯을 넘을 수 있습니다.");
assert.match(sharedCss, /@media \(max-width:1100px\)[\s\S]*?\.columns-page-body \.columns-journal-nav \{ overflow-x:auto;[\s\S]*?scrollbar-width:none;/, "태블릿 칼럼 필터가 겹치지 않도록 가로 탐색으로 전환되지 않습니다.");

const legalPages = ["privacy", "terms", "non-covered", "patient-rights"];
for (const page of legalPages) {
  const html = read(`${page}.html`);
  assert.match(html, new RegExp(`css\\/style\\.css\\?v=${sharedCssVersion}`), `한국어 법률 페이지 CSS 버전이 다릅니다: ${page}.html`);
}
assert.match(sharedCss, /\.legal-hero h1\s*\{[\s\S]*?font-size:\s*clamp\(2rem, 3\.6vw, 3\.25rem\);/, "법률 페이지 H1이 문서형 크기로 제한되지 않았습니다.");
assert.match(sharedCss, /\.legal-content p,\s*\.legal-content li\s*\{[\s\S]*?line-height:\s*1\.8;/, "법률 페이지 본문 행간이 문서형 기준과 다릅니다.");
assert.doesNotMatch(sharedCss, /\.legal-content br\s*\{[\s\S]*?display:\s*none;/, "모바일에서 법률 정보의 구조용 줄바꿈이 숨겨질 수 있습니다.");
assert.match(sharedCss, /\.non-covered-hero h1\s*\{[\s\S]*?font-size:\s*clamp\(2rem, 3\.6vw, 3\.25rem\);/, "비급여 안내 제목이 다른 법률 페이지보다 과도하게 큽니다.");
for (const directory of ["", "en/", "ja/", "zh-cn/"]) {
  const html = read(`${directory}non-covered.html`);
  const hero = html.match(/<header class="non-covered-hero">[\s\S]*?<\/header>/)?.[0] || "";
  assert.doesNotMatch(hero, /<h1>[\s\S]*?<br\s*\/?>(?:[\s\S]*?)<\/h1>|<div class="non-covered-hero__intro">[\s\S]*?<br\s*\/?>/i, `비급여 안내 히어로에 강제 줄바꿈이 남아 있습니다: ${directory}non-covered.html`);
}

const localizedPages = ["index", "about", "director", "career", "philosophy", "care", "services", "columns", "privacy", "terms", "non-covered", "patient-rights"];
const localizedDirectories = ["en", "ja", "zh-cn"];
for (const directory of localizedDirectories) {
  for (const page of localizedPages) {
    const relativePath = `${directory}/${page}.html`;
    const html = read(relativePath);
    assert.match(html, new RegExp(`\\.\\.\\/css\\/style\\.css\\?v=${sharedCssVersion}`), `다국어 CSS 버전이 다릅니다: ${relativePath}`);
    assert.match(html, new RegExp(`\\.\\.\\/js\\/main\\.js\\?v=${sharedMainVersion}`), `다국어 JS 버전이 다릅니다: ${relativePath}`);
    assert.equal((html.match(/<h1\b/gi) || []).length, 1, `다국어 H1은 정확히 하나여야 합니다: ${relativePath}`);
    if (legalPages.includes(page)) {
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
    assert.match(html, /href="terms\.html"/, `외국어 이용약관 링크가 언어 폴더를 벗어납니다: ${directory}/${page}.html`);
    assert.match(html, /href="non-covered\.html"/, `외국어 비급여 링크가 언어 폴더를 벗어납니다: ${directory}/${page}.html`);
    assert.match(html, /href="patient-rights\.html"/, `외국어 환자 권리 링크가 언어 폴더를 벗어납니다: ${directory}/${page}.html`);
  }
}

const sharedMain = read("js/main.js");
assert.match(sharedMain, /const analyticsId = "1ac7bf67a05a6c0";/, "네이버 애널리틱스 발급 ID가 공통 스크립트에 없습니다.");
assert.match(sharedMain, /https:\/\/wcs\.pstatic\.net\/wcslog\.js/, "네이버 애널리틱스 수집 스크립트가 없습니다.");
assert.match(sharedMain, /productionHosts\.has\(window\.location\.hostname\)/, "네이버 애널리틱스의 운영 도메인 제한이 없습니다.");
assert.match(sharedMain, /window\.location\.pathname\.startsWith\("\/preview\/"\)/, "네이버 애널리틱스에서 미리보기 경로를 제외하지 않습니다.");
assert.match(sharedMain, /const advertisingId = "s_3fd3c8db3a1b";/, "네이버 검색광고 공통 인증키가 없습니다.");
assert.match(sharedMain, /https:\/\/wcs\.naver\.net\/wcslog\.js/, "네이버 검색광고 공통 스크립트가 없습니다.");
assert.match(sharedMain, /script\[src\*="\$\{host\}\/wcslog\.js"\]/, "네이버 공통 스크립트 중복 로드 방지가 없습니다.");
assert.match(sharedMain, /window\.wcs\.inflow\(\)/, "네이버 검색광고 유입 호출이 없습니다.");
assert.match(sharedMain, /sendAdvertisingConversion\("custom001"\)/, "네이버 예약 클릭 전환이 없습니다.");
assert.match(sharedMain, /sendAdvertisingConversion\("custom002"\)/, "전화 클릭 전환이 없습니다.");
assert.match(sharedMain, /m\.booking\.naver\.com\/booking\/13\/bizes\/729883/, "예약 전환 대상이 공식 네이버 예약 주소와 일치하지 않습니다.");
const koreanPrivacy = read("privacy.html");
assert.match(koreanPrivacy, /네이버 주식회사[\s\S]*NAVER Analytics를 통한 홈페이지 방문·유입·페이지 이용 통계 분석[\s\S]*네이버 검색광고\(파워링크\) 전환추적을 통한 홈페이지 유입 및 예약·전화 버튼 클릭 성과 분석/, "개인정보처리방침에 NAVER Analytics와 파워링크 전환추적 위탁 범위가 구분되어 있지 않습니다.");
assert.match(koreanPrivacy, /Google Analytics 4\(GA4\), NAVER Analytics 및 네이버 검색광고\(파워링크\) 전환추적/, "개인정보처리방침에 실제 분석·전환 서비스가 모두 없습니다.");
assert.match(koreanPrivacy, /NaPm[\s\S]*실제 예약 완료 여부, 통화 성립 여부, 상담 내용/, "개인정보처리방침에 광고 유입정보와 클릭 전환의 한계가 없습니다.");
assert.match(koreanPrivacy, /시행일자:? 2026년 9월 5일/, "개인정보처리방침 시행일이 갱신되지 않았습니다.");
const internationalAppointmentScript = read("js/international-appointment.js");
assert.match(internationalAppointmentScript, /naverAnalyticsId="1ac7bf67a05a6c0"/, "외국인 예약 페이지에 네이버 애널리틱스 발급 ID가 없습니다.");
assert.match(internationalAppointmentScript, /https:\/\/wcs\.pstatic\.net\/wcslog\.js/, "외국인 예약 페이지에 네이버 수집 스크립트가 없습니다.");
assert.match(internationalAppointmentScript, /naverAdvertisingId="s_3fd3c8db3a1b"/, "외국인 예약 페이지에 네이버 검색광고 공통 인증키가 없습니다.");
assert.match(internationalAppointmentScript, /https:\/\/wcs\.naver\.net\/wcslog\.js/, "외국인 예약 페이지에 네이버 검색광고 공통 스크립트가 없습니다.");
assert.match(internationalAppointmentScript, /wcs\.trans\(\{type:"custom002"\}\)/, "외국인 예약 페이지의 전화 클릭 전환이 없습니다.");
for (const localizedPrivacyPath of ["en/privacy.html", "ja/privacy.html", "zh-cn/privacy.html"]) {
  const localizedPrivacy = read(localizedPrivacyPath);
  assert.match(localizedPrivacy, /NaPm/, `다국어 개인정보처리방침에 네이버 광고 유입 식별정보가 없습니다: ${localizedPrivacyPath}`);
  assert.match(localizedPrivacy, /Powerlink|パワーリンク/, `다국어 개인정보처리방침에 파워링크 전환추적 범위가 없습니다: ${localizedPrivacyPath}`);
}
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
  assert.doesNotMatch(html, /href="(?:\.\.\/)?be-deer\.html\?v=/, `BE DEER 내부 링크에 캐시용 쿼리가 남아 있습니다: ${path.relative(siteRoot, absolutePath)}`);
}

process.stdout.write(`SEO 표면 검증 통과: 사이트맵 ${sitemapUrls.length}개, 칼럼 ${directCardLinks.length}개\n`);
