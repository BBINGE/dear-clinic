import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const personId = "https://dearhani.com/director.html#kim-minji";
const policyUrl = "https://dearhani.com/medical-information-policy.html";
const editorialStatement = "김민지 대표원장 직접 작성·의학적 검토·최종 발행";
const excludedSourceHosts = new Set([
  "cdn.jsdelivr.net", "fonts.googleapis.com", "dearhani.com", "www.dearhani.com",
  "m.booking.naver.com", "map.naver.com", "talk.naver.com", "blog.naver.com",
  "www.instagram.com", "dearmydiet.tistory.com",
]);

function typeList(node) {
  return Array.isArray(node?.["@type"]) ? node["@type"] : [node?.["@type"]].filter(Boolean);
}

function schemasFrom(html, relativePath) {
  return [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map((match, index) => {
    assert.doesNotThrow(() => JSON.parse(match[1]), `${relativePath}: JSON-LD ${index + 1}을 해석할 수 없습니다.`);
    return JSON.parse(match[1]);
  });
}

function sourceLinksFrom(html) {
  const links = [];
  for (const match of html.matchAll(/href="(https:\/\/[^"#]+(?:#[^"]*)?)"/gi)) {
    const value = match[1].replaceAll("&amp;", "&");
    try {
      const url = new URL(value);
      if (!excludedSourceHosts.has(url.hostname)) links.push(url.href);
    } catch {
      // Other tests inspect broken local references; malformed external links are ignored here.
    }
  }
  return [...new Set(links)];
}

const columnsIndex = read("columns.html");
const articlePaths = [...columnsIndex.matchAll(/<a\s+class="column-card[^>]+href="(columns\/[^"]+\.html)"/g)].map((match) => match[1]);
assert.ok(articlePaths.length > 0, "공개 칼럼 목록을 찾지 못했습니다.");
assert.equal(new Set(articlePaths).size, articlePaths.length, "칼럼 목록에 중복 링크가 있습니다.");

let citationPages = 0;
for (const relativePath of articlePaths) {
  const html = read(relativePath);
  assert.equal((html.match(/class="column-editorial-note"/g) || []).length, 1, `${relativePath}: 작성·검토 안내는 정확히 하나여야 합니다.`);
  assert.ok(html.includes(editorialStatement), `${relativePath}: 대표원장 직접 작성·검토·발행 문구가 없습니다.`);
  assert.match(html, /href="\.\.\/medical-information-policy\.html"/, `${relativePath}: 의료정보 작성 원칙 링크가 없습니다.`);

  const nodes = schemasFrom(html, relativePath).flatMap((schema) => Array.isArray(schema?.["@graph"]) ? schema["@graph"] : [schema]);
  const editorialNodes = nodes.filter((node) => {
    const types = typeList(node);
    return types.includes("Article") || types.includes("BlogPosting") || types.includes("MedicalWebPage");
  });
  assert.ok(editorialNodes.length > 0, `${relativePath}: Article 또는 MedicalWebPage가 없습니다.`);
  for (const node of editorialNodes) {
    const types = typeList(node);
    assert.equal(node.author?.["@id"], personId, `${relativePath}: 작성자 Person ID가 다릅니다.`);
    assert.equal(node.publishingPrinciples, policyUrl, `${relativePath}: 작성·검토 원칙 URL이 다릅니다.`);
    if (types.includes("Article") || types.includes("BlogPosting")) {
      assert.equal(node.editor?.["@id"], personId, `${relativePath}: Article 편집자 Person ID가 다릅니다.`);
    }
    if (types.includes("MedicalWebPage")) {
      assert.equal(node.reviewedBy?.["@id"], personId, `${relativePath}: 의료 페이지 검토자 Person ID가 다릅니다.`);
      assert.ok(/^\d{4}-\d{2}-\d{2}(?:T[^\s]+)?$/.test(node.lastReviewed || ""), `${relativePath}: 최종 검토일이 없습니다.`);
      assert.equal(node.lastReviewed, node.dateModified || node.datePublished, `${relativePath}: 실제 수정일과 최종 검토일이 다릅니다.`);
    } else {
      assert.equal("reviewedBy" in node, false, `${relativePath}: 순수 Article에 WebPage 전용 reviewedBy가 있습니다.`);
      assert.equal("lastReviewed" in node, false, `${relativePath}: 순수 Article에 WebPage 전용 lastReviewed가 있습니다.`);
    }
  }

  const sources = sourceLinksFrom(html);
  if (sources.length) {
    citationPages += 1;
    const articleCitations = editorialNodes.flatMap((node) => Array.isArray(node.citation) ? node.citation : node.citation ? [node.citation] : []);
    for (const source of sources) {
      assert.ok(articleCitations.includes(source), `${relativePath}: 보이는 참고자료가 citation에 없습니다: ${source}`);
    }
  }
}

const policy = read("medical-information-policy.html");
assert.ok(policy.includes("모든 의료정보 칼럼은 김민지 대표원장이 직접 주제를 선정하고 집필하며"), "작성·검토 원칙 페이지에 운영 사실이 없습니다.");
assert.match(policy, /href="director\.html"/, "작성·검토 원칙 페이지가 원장 소개와 연결되지 않았습니다.");
assert.ok(read("sitemap.xml").includes(`<loc>${policyUrl}</loc>`), "작성·검토 원칙 페이지가 사이트맵에 없습니다.");
assert.match(columnsIndex, /href="medical-information-policy\.html"/, "칼럼 목록이 작성·검토 원칙과 연결되지 않았습니다.");
assert.match(read("director.html"), /href="medical-information-policy\.html"/, "원장 소개가 작성·검토 원칙과 연결되지 않았습니다.");
assert.match(read("index.html"), new RegExp(`"publishingPrinciples": "${policyUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`), "병원 엔티티에 작성·검토 원칙이 없습니다.");

const beDeer = read("be-deer.html");
for (const slug of [
  "seocho-diet-herbal-medicine", "seocho-diet-6-reasons", "diet-without-hunger",
  "diet-herbal-medicine-price", "gyodae-diet-premenstrual-appetite", "gangnam-obesity-fatty-liver",
]) {
  assert.match(beDeer, new RegExp(`href="columns/${slug}\\.html"`), `BE DEER 허브에 핵심 칼럼이 없습니다: ${slug}`);
}

const publisher = read("tools/publish-column.mjs");
assert.ok(publisher.includes(editorialStatement), "향후 발행 템플릿에 작성·검토 안내가 없습니다.");
assert.ok(publisher.includes("medical-information-policy.html"), "향후 발행 템플릿에 작성 원칙 연결이 없습니다.");

process.stdout.write(`의료정보 신뢰 검증 통과: 칼럼 ${articlePaths.length}개, 근거 연결 ${citationPages}개\n`);
