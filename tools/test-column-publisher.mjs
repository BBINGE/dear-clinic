import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(toolsDir, "..");
const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dear-column-publisher-test-"));
const contentPath = path.join(toolsDir, "fixtures", "column-publisher-test.json");

function publish(content = contentPath, mode = "publish") {
  return spawnSync(process.execPath, [
    path.join(toolsDir, "publish-column.mjs"),
    "--content", content,
    "--media-root", siteRoot,
    "--site-root", testRoot,
    "--mode", mode,
  ], { encoding: "utf8" });
}

try {
  fs.mkdirSync(path.join(testRoot, "columns"), { recursive: true });
  fs.copyFileSync(path.join(siteRoot, "columns.html"), path.join(testRoot, "columns.html"));
  fs.copyFileSync(path.join(siteRoot, "sitemap.xml"), path.join(testRoot, "sitemap.xml"));
  fs.copyFileSync(path.join(siteRoot, "rss.xml"), path.join(testRoot, "rss.xml"));

  const draft = JSON.parse(fs.readFileSync(contentPath, "utf8"));
  draft.status = "draft";
  const draftPath = path.join(testRoot, "draft.json");
  fs.writeFileSync(draftPath, JSON.stringify(draft), "utf8");
  const indexBeforePreview = fs.readFileSync(path.join(testRoot, "columns.html"), "utf8");
  const sitemapBeforePreview = fs.readFileSync(path.join(testRoot, "sitemap.xml"), "utf8");
  const preview = publish(draftPath, "preview");
  assert.equal(preview.status, 0, preview.stderr);
  const previewArticle = fs.readFileSync(path.join(testRoot, "preview", "publisher-test-column.html"), "utf8");
  assert.match(previewArticle, /name="robots" content="noindex,nofollow,noarchive"/);
  assert.match(previewArticle, /홈페이지 미리보기/);
  assert.match(previewArticle, /#생활 리듬/);
  assert.equal(fs.readFileSync(path.join(testRoot, "columns.html"), "utf8"), indexBeforePreview);
  assert.equal(fs.readFileSync(path.join(testRoot, "sitemap.xml"), "utf8"), sitemapBeforePreview);
  assert.equal(fs.existsSync(path.join(testRoot, "assets", "data", "latest-column.json")), false);
  assert.equal(
    fs.existsSync(path.join(testRoot, "assets", "images", "columns", "preview-publisher-test-column", "cover.webp")),
    true,
  );

  const hostileDraft = {
    ...draft,
    slug: "security-escaping-check",
    title: "보안 검사 <script>alert('xss')</script>",
    summary: "사용자 입력의 HTML 코드가 화면에서 실행되지 않는지 확인하는 보안 검사 문장입니다.",
    description: "사용자 입력의 HTML 코드가 검색 설명에서 실행되지 않는지 확인하는 보안 검사 문장입니다.",
    lead: "사용자 입력의 HTML 코드가 제목과 본문에서 안전하게 표시되는지 확인하는 보안 검사 문장입니다.",
    body: "본문에 <img src=x onerror=alert('xss')> 코드를 입력합니다.\n\n[위험한 링크](javascript:alert('xss'))도 실행되면 안 됩니다.",
  };
  const hostilePath = path.join(testRoot, "hostile.json");
  fs.writeFileSync(hostilePath, JSON.stringify(hostileDraft), "utf8");
  const hostilePreview = publish(hostilePath, "preview");
  assert.equal(hostilePreview.status, 0, hostilePreview.stderr);
  const hostileArticle = fs.readFileSync(path.join(testRoot, "preview", "security-escaping-check.html"), "utf8");
  assert.doesNotMatch(hostileArticle, /<script>alert\('xss'\)<\/script>/);
  assert.doesNotMatch(hostileArticle, /<img src=x onerror=/);
  assert.doesNotMatch(hostileArticle, /href="javascript:/);
  assert.match(hostileArticle, /&lt;script&gt;alert/);
  assert.match(hostileArticle, /&lt;img src=x onerror=/);

  const htmlDraft = {
    ...draft,
    slug: "html-editor-roundtrip-check",
    body: "",
    designBlocks: [],
    bodyHtml: '<h2>HTML 모드 소제목</h2><p style="color:#247860">기본 모드에서 다시 확인할 본문입니다.</p><table><thead><tr><th>항목</th><th>내용</th></tr></thead><tbody><tr><td>생활</td><td>리듬</td></tr></tbody></table>',
  };
  const htmlPath = path.join(testRoot, "html-editor.json");
  fs.writeFileSync(htmlPath, JSON.stringify(htmlDraft), "utf8");
  const htmlPreview = publish(htmlPath, "preview");
  assert.equal(htmlPreview.status, 0, htmlPreview.stderr);
  const htmlArticle = fs.readFileSync(path.join(testRoot, "preview", "html-editor-roundtrip-check.html"), "utf8");
  assert.match(htmlArticle, /href="#html-모드-소제목"/);
  assert.match(htmlArticle, /<table><thead>/);
  assert.match(htmlArticle, /style="color:#247860"/);

  const unsafeHtmlPath = path.join(testRoot, "unsafe-html.json");
  fs.writeFileSync(unsafeHtmlPath, JSON.stringify({ ...htmlDraft, slug: "unsafe-html-check", bodyHtml: '<h2>안전 확인 제목</h2><script>alert(1)</script><p>본문입니다.</p>' }), "utf8");
  const unsafeHtml = publish(unsafeHtmlPath, "preview");
  assert.notEqual(unsafeHtml.status, 0);
  assert.match(unsafeHtml.stderr, /실행 가능한 코드/);

  const first = publish();
  assert.equal(first.status, 0, first.stderr);
  const second = publish();
  assert.equal(second.status, 0, second.stderr);

  const articlePath = path.join(testRoot, "columns", "publisher-test-column.html");
  const article = fs.readFileSync(articlePath, "utf8");
  const index = fs.readFileSync(path.join(testRoot, "columns.html"), "utf8");
  const sitemap = fs.readFileSync(path.join(testRoot, "sitemap.xml"), "utf8");
  const rss = fs.readFileSync(path.join(testRoot, "rss.xml"), "utf8");

  assert.match(article, /GENERATED_BY_DEAR_COLUMN_PUBLISHER/);
  assert.match(article, /rel="canonical" href="https:\/\/dearhani\.com\/columns\/publisher-test-column\.html"/);
  assert.match(article, /style\.css\?v=20260901-5/);
  assert.doesNotMatch(article, /href="\.\.\/index\.html/);
  assert.match(article, /class="footer__sns"/);
  assert.match(article, /href="https:\/\/www\.instagram\.com\/dearhani__\/"/);
  assert.match(article, /href="https:\/\/blog\.naver\.com\/thisisdear"/);
  assert.match(article, /href="https:\/\/talk\.naver\.com\/ct\/w5zr5u"/);
  assert.match(article, /href="\.\.\/privacy\.html"/);
  assert.match(article, /href="\.\.\/non-covered\.html"/);
  assert.match(article, /href="\.\.\/patient-rights\.html"/);
  assert.match(article, /"@type":"FAQPage"/);
  assert.match(article, /"author":\{"@id":"https:\/\/dearhani\.com\/director\.html#kim-minji"\}/);
  assert.match(article, /class="column-author-link" href="\.\.\/director\.html" rel="author">김민지 대표원장<\/a>/);
  assert.match(article, /href="#생활-리듬에서-확인하는-것"/);
  assert.match(article, /href="#제목-3도-칼럼-소제목으로-표시됩니다"/);
  assert.doesNotMatch(article, /의료진/);
  const napCard = article.match(/<section class="column-nap"[\s\S]*?<\/section>/)?.[0];
  assert.ok(napCard, "컬럼 NAP 카드를 찾지 못했습니다.");
  assert.doesNotMatch(napCard, /사업자등록번호/);
  assert.match(napCard, /서울 서초구 사임당로 143/);
  assert.match(article, /class="column-rich-section"><h2>제목 3도 칼럼 소제목으로 표시됩니다<\/h2>/);
  assert.doesNotMatch(article, /<h3><strong>제목 3도/);
  assert.match(article, /href="#design-section-1"/);
  assert.match(article, /class="column-designed-section"><p class="column-section-label">MEDICAL BASIS<\/p>/);
  assert.match(article, /class="column-checklist">/);
  assert.match(article, /class="column-cases">/);
  assert.match(article, /<p>KEY POINT<\/p>/);
  assert.match(article, /design-5\.webp/);
  assert.match(article, /칼럼 본문 테스트 이미지/);
  assert.match(article, /#수면/);
  assert.match(article, /#생활 리듬/);
  assert.doesNotMatch(article, /name="robots" content="noindex/);
  assert.match(article, /<meta name="description" content="수면과 생활 리듬을 함께 살펴보는 디어한의원의 칼럼 발행 테스트입니다.">/);
  assert.match(article, /<p class="column-article__lead">수면과 생활 리듬을 함께 살펴보는 디어한의원의 칼럼 발행 테스트입니다.<\/p>/);
  const schemaText = article.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(schemaText, "구조화 데이터를 찾지 못했습니다.");
  const articleSchema = JSON.parse(schemaText);
  assert.equal(articleSchema["@context"], "https://schema.org");
  assert.equal(articleSchema["@graph"].find((item) => item["@type"] === "Article").relatedLink, "https://dearhani.com/services.html#deer-balance");
  assert.equal((index.match(/data-column-slug="publisher-test-column"/g) || []).length, 1);
  assert.match(index, /data-column-slug="publisher-test-column"[^>]*data-category="Calm"[^>]*data-search="[^"]*수면[^"]*생활 리듬/);
  assert.match(index, /class="column-featured js-reveal" href="columns\/insomnia-without-sleeping-pills\.html" data-journal-number="24"/);
  assert.match(index, /data-column-slug="publisher-test-column"[\s\S]*?data-journal-number="03"/);
  const collectionSchemaText = [...index.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]))
    .find((entry) => entry["@type"] === "CollectionPage");
  assert.equal(collectionSchemaText.mainEntity.numberOfItems, 24);
  assert.equal(collectionSchemaText.mainEntity.itemListElement[0].url, "https://dearhani.com/columns/insomnia-without-sleeping-pills.html");
  assert.equal((sitemap.match(/\/columns\/publisher-test-column\.html/g) || []).length, 1);
  assert.equal((rss.match(/\/columns\/publisher-test-column\.html/g) || []).length, 2);
  assert.match(rss, /<lastBuildDate>Wed, 02 Sep 2026 00:00:00 GMT<\/lastBuildDate>/);
  assert.equal(
    fs.existsSync(path.join(testRoot, "assets", "images", "columns", "publisher-test-column", "cover.webp")),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(testRoot, "assets", "images", "columns", "publisher-test-column", "body-1.webp")),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(testRoot, "assets", "images", "columns", "publisher-test-column", "design-5.webp")),
    true,
  );
  const latestColumnMenu = JSON.parse(fs.readFileSync(path.join(testRoot, "assets", "data", "latest-column.json"), "utf8"));
  assert.equal(latestColumnMenu.slug, "insomnia-without-sleeping-pills");
  assert.equal(latestColumnMenu.href, "/columns/insomnia-without-sleeping-pills.html");
  assert.equal(latestColumnMenu.image, "/assets/images/columns/autumn-insomnia-herbal-medicine/cover.png");
  assert.equal(latestColumnMenu.imagePosition, "50% 30%");
  assert.ok(latestColumnMenu.alt.trim());

  const removed = publish(contentPath, "remove");
  assert.equal(removed.status, 0, removed.stderr);
  assert.equal(fs.existsSync(articlePath), false);
  assert.equal(fs.existsSync(path.join(testRoot, "assets", "images", "columns", "publisher-test-column")), false);
  assert.doesNotMatch(fs.readFileSync(path.join(testRoot, "columns.html"), "utf8"), /data-column-slug="publisher-test-column"/);
  assert.match(fs.readFileSync(path.join(testRoot, "columns.html"), "utf8"), /class="column-featured js-reveal" href="columns\/insomnia-without-sleeping-pills\.html" data-journal-number="23"/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(testRoot, "assets", "data", "latest-column.json"), "utf8")).slug, "insomnia-without-sleeping-pills");
  assert.doesNotMatch(fs.readFileSync(path.join(testRoot, "sitemap.xml"), "utf8"), /\/columns\/publisher-test-column\.html/);
  assert.doesNotMatch(fs.readFileSync(path.join(testRoot, "rss.xml"), "utf8"), /\/columns\/publisher-test-column\.html/);

  const blockedDraft = spawnSync(process.execPath, [
    path.join(toolsDir, "publish-column.mjs"),
    "--content", draftPath,
    "--media-root", siteRoot,
    "--site-root", testRoot,
  ], { encoding: "utf8" });
  assert.notEqual(blockedDraft.status, 0);
  assert.match(blockedDraft.stderr, /발행 준비 완료/);

  process.stdout.write("칼럼 발행기 테스트 통과\n");
} finally {
  fs.rmSync(testRoot, { recursive: true, force: true });
}
