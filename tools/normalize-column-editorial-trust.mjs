import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PERSON_ID = "https://dearhani.com/director.html#kim-minji";
const CLINIC_ID = "https://dearhani.com/#clinic";
const POLICY_URL = "https://dearhani.com/medical-information-policy.html";
const EDITORIAL_NOTE = `<aside class="column-editorial-note" aria-label="의료정보 집필 및 검토">
  <div class="column-editorial-note__copy"><span>MEDICAL EDITORIAL</span><strong>김민지 대표원장 직접 집필·의학적 검토·최종 승인</strong></div>
  <a href="../medical-information-policy.html">편집·정정 원칙 보기 <span aria-hidden="true">→</span></a>
</aside>`;

const excludedSourceHosts = new Set([
  "cdn.jsdelivr.net",
  "fonts.googleapis.com",
  "dearhani.com",
  "www.dearhani.com",
  "m.booking.naver.com",
  "map.naver.com",
  "talk.naver.com",
  "blog.naver.com",
  "www.instagram.com",
  "dearmydiet.tistory.com",
]);

function typesOf(node) {
  return Array.isArray(node?.["@type"]) ? node["@type"] : [node?.["@type"]].filter(Boolean);
}

function sourceLinksFrom(html) {
  const links = [];
  for (const match of html.matchAll(/href="(https:\/\/[^"#]+(?:#[^"]*)?)"/gi)) {
    const value = match[1].replaceAll("&amp;", "&");
    try {
      const url = new URL(value);
      if (!excludedSourceHosts.has(url.hostname)) links.push(url.href);
    } catch {
      // Invalid URLs remain visible in the article and are caught by other site checks.
    }
  }
  return [...new Set(links)];
}

function normalizeNode(node, sourceLinks, fallbackDates) {
  if (!node || typeof node !== "object") return 0;
  const types = typesOf(node);
  const isArticle = types.includes("Article") || types.includes("BlogPosting");
  const isMedicalPage = types.includes("MedicalWebPage");
  if (!isArticle && !isMedicalPage) return 0;

  if (!node.datePublished && fallbackDates.published) node.datePublished = fallbackDates.published;
  if (!node.dateModified && (fallbackDates.modified || node.datePublished)) node.dateModified = fallbackDates.modified || node.datePublished;
  const reviewedAt = node.dateModified || node.datePublished;
  node.author = { "@id": PERSON_ID };
  if (isArticle) node.editor = { "@id": PERSON_ID };
  if (isMedicalPage) {
    node.reviewedBy = { "@id": PERSON_ID };
    if (reviewedAt) node.lastReviewed = reviewedAt;
  } else {
    delete node.reviewedBy;
    delete node.lastReviewed;
  }
  if (!node.publisher) node.publisher = { "@id": CLINIC_ID };
  node.publishingPrinciples = POLICY_URL;
  if ((isArticle || isMedicalPage) && sourceLinks.length) {
    node.citation = [...new Set([...(Array.isArray(node.citation) ? node.citation : node.citation ? [node.citation] : []), ...sourceLinks])];
  }
  return 1;
}

function normalizeSchema(html, relativePath) {
  const sources = sourceLinksFrom(html);
  let normalizedNodes = 0;
  const next = html.replace(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi, (full, raw) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch (error) {
      throw new Error(`${relativePath}: JSON-LD를 해석할 수 없습니다 (${error.message})`);
    }
    let nodes = Array.isArray(data?.["@graph"]) ? data["@graph"] : [data];
    const fallbackDates = {
      published: nodes.find((node) => node?.datePublished)?.datePublished
        || html.match(/property="article:published_time"\s+content="([^"]+)"/i)?.[1],
      modified: nodes.find((node) => node?.dateModified)?.dateModified
        || html.match(/property="article:modified_time"\s+content="([^"]+)"/i)?.[1],
    };

    const articleNode = nodes.find((node) => {
      const types = typesOf(node);
      return types.includes("Article") || types.includes("BlogPosting");
    });
    const hasMedicalPage = nodes.some((node) => typesOf(node).includes("MedicalWebPage"));
    if (articleNode && !hasMedicalPage) {
      const canonicalUrl = articleNode.url
        || (typeof articleNode.mainEntityOfPage === "string" ? articleNode.mainEntityOfPage : articleNode.mainEntityOfPage?.["@id"])
        || `https://dearhani.com/${relativePath.replaceAll("\\", "/")}`;
      const medicalPage = {
        "@type": "MedicalWebPage",
        "@id": `${canonicalUrl}#medical-webpage`,
        url: canonicalUrl,
        name: articleNode.headline,
        description: articleNode.description,
        inLanguage: articleNode.inLanguage || "ko-KR",
        datePublished: articleNode.datePublished || fallbackDates.published,
        dateModified: articleNode.dateModified || fallbackDates.modified || articleNode.datePublished || fallbackDates.published,
        publisher: articleNode.publisher || { "@id": CLINIC_ID },
        citation: articleNode.citation,
      };
      if (Array.isArray(data?.["@graph"])) {
        data["@graph"].push(medicalPage);
      } else {
        data = { "@context": data["@context"] || "https://schema.org", "@graph": [data, medicalPage] };
      }
      nodes = Array.isArray(data["@graph"]) ? data["@graph"] : [data];
    }
    for (const node of nodes) normalizedNodes += normalizeNode(node, sources, fallbackDates);
    const serialized = JSON.stringify(data, null, 2)
      .replaceAll("<", "\\u003c")
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n");
    return `<script type="application/ld+json">\n${serialized}\n  </script>`;
  });
  if (!normalizedNodes) throw new Error(`${relativePath}: Article 또는 MedicalWebPage 구조화 데이터가 없습니다.`);
  return { html: next, normalizedNodes, sourceCount: sources.length };
}

function normalizeArticle(html, relativePath) {
  let next = html;
  if (next.includes('class="column-editorial-note"')) {
    next = next.replace(/<aside class="column-editorial-note"[\s\S]*?<\/aside>/i, EDITORIAL_NOTE);
  } else {
    const headerEnd = next.search(/<\/header>/i);
    if (headerEnd < 0) throw new Error(`${relativePath}: 대표 헤더의 닫는 태그가 없습니다.`);
    const insertionPoint = headerEnd + next.slice(headerEnd).match(/<\/header>/i)[0].length;
    next = `${next.slice(0, insertionPoint)}\n${EDITORIAL_NOTE}${next.slice(insertionPoint)}`;
  }
  next = next.replace(
    /<meta\s+property="article:author"\s+content="[^"]*">/i,
    '<meta property="article:author" content="김민지 대표원장">',
  );
  next = next.replace(/<a(?![^>]*\brel=)([^>]*href="\.\.\/director\.html"[^>]*)>/gi, '<a$1 rel="author">');
  return normalizeSchema(next, relativePath);
}

function main() {
  const write = process.argv.includes("--write");
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const columnDir = path.join(root, "columns");
  const files = fs.readdirSync(columnDir).filter((name) => name.endsWith(".html")).sort();
  const results = [];

  for (const name of files) {
    const filePath = path.join(columnDir, name);
    const original = fs.readFileSync(filePath, "utf8");
    const normalized = normalizeArticle(original, `columns/${name}`);
    if (write && normalized.html !== original) fs.writeFileSync(filePath, normalized.html, "utf8");
    results.push({ file: name, changed: normalized.html !== original, schemaNodes: normalized.normalizedNodes, citations: normalized.sourceCount });
  }

  process.stdout.write(`${JSON.stringify({ mode: write ? "write" : "check", columns: results.length, results }, null, 2)}\n`);
}

main();
