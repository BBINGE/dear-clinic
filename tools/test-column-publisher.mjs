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

function publish() {
  return spawnSync(process.execPath, [
    path.join(toolsDir, "publish-column.mjs"),
    "--content", contentPath,
    "--media-root", siteRoot,
    "--site-root", testRoot,
  ], { encoding: "utf8" });
}

try {
  fs.mkdirSync(path.join(testRoot, "columns"), { recursive: true });
  fs.copyFileSync(path.join(siteRoot, "columns.html"), path.join(testRoot, "columns.html"));
  fs.copyFileSync(path.join(siteRoot, "sitemap.xml"), path.join(testRoot, "sitemap.xml"));

  const first = publish();
  assert.equal(first.status, 0, first.stderr);
  const second = publish();
  assert.equal(second.status, 0, second.stderr);

  const articlePath = path.join(testRoot, "columns", "publisher-test-column.html");
  const article = fs.readFileSync(articlePath, "utf8");
  const index = fs.readFileSync(path.join(testRoot, "columns.html"), "utf8");
  const sitemap = fs.readFileSync(path.join(testRoot, "sitemap.xml"), "utf8");

  assert.match(article, /GENERATED_BY_DEAR_COLUMN_PUBLISHER/);
  assert.match(article, /rel="canonical" href="https:\/\/bbinge\.github\.io\/dear-clinic\/columns\/publisher-test-column\.html"/);
  assert.match(article, /"@type":"FAQPage"/);
  assert.match(article, /href="#생활-리듬에서-확인하는-것"/);
  assert.match(article, /칼럼 본문 테스트 이미지/);
  assert.match(article, /<meta name="description" content="수면과 생활 리듬을 함께 살펴보는 디어한의원의 칼럼 발행 테스트입니다.">/);
  assert.match(article, /<p class="column-article__lead">수면과 생활 리듬을 함께 살펴보는 디어한의원의 칼럼 발행 테스트입니다.<\/p>/);
  const schemaText = article.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(schemaText, "구조화 데이터를 찾지 못했습니다.");
  assert.equal(JSON.parse(schemaText)["@context"], "https://schema.org");
  assert.equal((index.match(/data-column-slug="publisher-test-column"/g) || []).length, 1);
  assert.equal((sitemap.match(/\/columns\/publisher-test-column\.html/g) || []).length, 1);
  assert.equal(
    fs.existsSync(path.join(testRoot, "assets", "images", "columns", "publisher-test-column", "cover.webp")),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(testRoot, "assets", "images", "columns", "publisher-test-column", "body-1.webp")),
    true,
  );

  const draft = JSON.parse(fs.readFileSync(contentPath, "utf8"));
  draft.status = "draft";
  const draftPath = path.join(testRoot, "draft.json");
  fs.writeFileSync(draftPath, JSON.stringify(draft), "utf8");
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
