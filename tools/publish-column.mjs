import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const BASE_URL = "https://dearhani.com";
const PUBLISHER_MARKER = "<!-- GENERATED_BY_DEAR_COLUMN_PUBLISHER -->";
const CATEGORY_MAP = {
  Focus: { label: "집중", display: "FOCUS" },
  Calm: { label: "마음", display: "CALM" },
  Restore: { label: "채움", display: "RESTORE" },
  Relief: { label: "불편", display: "RELIEF" },
  Shape: { label: "변화", display: "SHAPE" },
};

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) {
      throw new Error(`알 수 없는 인수입니다: ${key}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${key} 뒤에 값이 필요합니다.`);
    }
    args[key.slice(2)] = value;
    index += 1;
  }
  return args;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeId(value, fallback) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || fallback;
}

function textWithBreaks(value = "") {
  return escapeHtml(value).replace(/\r?\n/g, "<br> ");
}

function inlineMarkdown(value = "") {
  let output = escapeHtml(value);
  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  output = output.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  output = output.replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return output.replace(/\r?\n/g, "<br>");
}

const HTML_BODY_TAGS = new Set([
  "p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "blockquote",
  "ul", "ol", "li", "a", "hr", "section", "aside", "div", "span", "figure", "figcaption",
  "img", "table", "thead", "tbody", "tfoot", "tr", "th", "td", "colgroup", "col",
]);

function validateHtmlBody(value) {
  assertString(value, "HTML 본문", 20, 100000);
  const forbidden = /<(script|style|iframe|object|embed|form|input|button|textarea|select|option|link|meta|base|svg|math)\b|\son[a-z]+\s*=|javascript\s*:|data\s*:\s*text|expression\s*\(|url\s*\(/i;
  if (forbidden.test(value)) throw new Error("HTML 본문에 스크립트나 실행 가능한 코드는 넣을 수 없습니다.");
  for (const match of value.matchAll(/<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi)) {
    if (!HTML_BODY_TAGS.has(match[1].toLowerCase())) {
      throw new Error(`HTML 본문에서 사용할 수 없는 태그입니다: <${match[1]}>`);
    }
  }
  return value.trim();
}

function stripHtml(value = "") {
  return String(value).replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ").trim();
}

function renderHtmlBody(content, mediaRoot, siteRoot, assetSlug = content.slug) {
  let html = validateHtmlBody(content.bodyHtml);
  const toc = [];
  const usedIds = new Set();
  let headingIndex = 0;
  let imageIndex = 0;
  html = html.replace(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi, (whole, attributes, inner) => {
    headingIndex += 1;
    const title = stripHtml(inner);
    let id = attributes.match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1];
    id = String(id || title).trim().toLowerCase()
      .replace(/[^\p{L}\p{N}-]+/gu, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
      || `section-${headingIndex}`;
    let unique = id;
    let suffix = 2;
    while (usedIds.has(unique)) unique = `${id}-${suffix++}`;
    usedIds.add(unique);
    toc.push({ id: unique, title });
    const cleanAttributes = attributes.replace(/\s+id\s*=\s*(["'])[^"']*\1/i, "");
    return `<h2${cleanAttributes} id="${unique}">${inner}</h2>`;
  });
  html = html.replace(/<img\b([^>]*)>/gi, (whole, attributes) => {
    const src = attributes.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!src) throw new Error("본문 사진의 src가 비어 있습니다.");
    if (/^https?:\/\//i.test(src) || /^data:/i.test(src)) throw new Error("본문 사진은 에디터에서 직접 업로드해 주세요.");
    imageIndex += 1;
    const copiedPath = copyMedia(mediaRoot, siteRoot, assetSlug, normalizeMediaReference(src), `body-html-${imageIndex}`);
    const rest = attributes.replace(/\s+src\s*=\s*(["'])[^"']*\1/i, "").replace(/\s+data-editor-image\s*=\s*(["'])[^"']*\1/i, "");
    return `<img src="../${copiedPath}"${rest} loading="lazy">`;
  });
  return { html, toc };
}

function assertString(value, label, min = 1, max = 10000) {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) {
    throw new Error(`${label}은(는) ${min}~${max}자로 입력해 주세요.`);
  }
}

function normalizeTags(value) {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw new Error("검색 주제 태그 형식이 올바르지 않습니다.");
  }
  const tags = [...new Set(value
    .map((tag) => String(tag || "").trim().replace(/^#+\s*/, ""))
    .filter(Boolean))];
  if (tags.length > 5) {
    throw new Error("검색 주제 태그는 최대 5개까지 입력해 주세요.");
  }
  tags.forEach((tag, index) => assertString(tag, `${index + 1}번째 검색 주제 태그`, 2, 30));
  return tags;
}

function applyOptionalFieldDefaults(content) {
  const summary = typeof content.summary === "string" ? content.summary.trim() : "";
  const description = typeof content.description === "string" ? content.description.trim() : "";
  const lead = typeof content.lead === "string" ? content.lead.trim() : "";

  return {
    ...content,
    summary,
    description: description || summary,
    lead: lead || summary,
    modifiedAt: content.modifiedAt || content.publishedAt,
    tags: normalizeTags(content.tags),
  };
}

function validateContent(content, { requireReady = true } = {}) {
  assertString(content.title, "제목", 5, 100);
  assertString(content.slug, "영문 URL", 3, 80);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(content.slug)) {
    throw new Error("영문 URL은 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.");
  }
  if (!CATEGORY_MAP[content.category]) {
    throw new Error("분류 값이 올바르지 않습니다.");
  }
  if (requireReady && content.status !== "ready") {
    throw new Error("작성 상태를 ‘발행 준비 완료’로 바꾼 뒤 발행해 주세요.");
  }
  assertString(content.summary, "목록에 보일 한 줄 소개", 20, 220);
  assertString(content.description, "검색 결과용 글 설명", 20, 180);
  assertString(content.lead, "제목 아래 소개 문장", 20, 300);
  assertString(content.coverImage, "대표 이미지 경로", 3, 500);
  assertString(content.coverAlt, "대표 이미지 설명", 5, 160);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(content.publishedAt || "")) {
    throw new Error("게시일은 YYYY-MM-DD 형식이어야 합니다.");
  }
  if (content.modifiedAt && !/^\d{4}-\d{2}-\d{2}$/.test(content.modifiedAt)) {
    throw new Error("최종 수정일은 YYYY-MM-DD 형식이어야 합니다.");
  }
  if (content.modifiedAt && content.modifiedAt < content.publishedAt) {
    throw new Error("최종 수정일은 최초 게시일보다 빠를 수 없습니다.");
  }
  const hasHtmlBody = typeof content.bodyHtml === "string" && content.bodyHtml.trim().length > 0;
  const hasRichBody = typeof content.body === "string" && content.body.trim().length > 0;
  const hasBlocks = Array.isArray(content.blocks) && content.blocks.length > 0;
  if (!hasHtmlBody && !hasRichBody && !hasBlocks) {
    throw new Error("본문을 입력해 주세요.");
  }
  if (hasHtmlBody) {
    validateHtmlBody(content.bodyHtml);
  } else if (hasRichBody) {
    assertString(content.body, "본문", 20, 50000);
  } else {
    const allowedBlocks = new Set(["paragraph", "heading", "list", "quote", "image"]);
    content.blocks.forEach((block, index) => {
      if (!block || !allowedBlocks.has(block.type)) {
        throw new Error(`${index + 1}번째 본문 블록의 종류가 올바르지 않습니다.`);
      }
    });
  }
  if (content.faqs && !Array.isArray(content.faqs)) {
    throw new Error("FAQ 형식이 올바르지 않습니다.");
  }
  if (content.sources && !Array.isArray(content.sources)) {
    throw new Error("참고자료 형식이 올바르지 않습니다.");
  }
  const publicCopy = JSON.stringify({
    title: content.title,
    summary: content.summary,
    description: content.description,
    lead: content.lead,
    tags: content.tags,
    body: content.body,
    bodyHtml: content.bodyHtml,
    blocks: content.blocks,
    designBlocks: content.designBlocks,
    faqs: content.faqs,
  });
  const blockedClaims = ["완치", "100% 효과", "부작용 없음", "무조건 낫", "치료를 보장", "효과를 보장"];
  const foundClaim = blockedClaims.find((claim) => publicCopy.includes(claim));
  if (foundClaim) {
    throw new Error(`의료광고상 위험할 수 있는 표현이 포함되어 있습니다: ${foundClaim}`);
  }
}

function resolveMediaFile(mediaRoot, relativePath) {
  const root = path.resolve(mediaRoot);
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`허용되지 않은 이미지 경로입니다: ${relativePath}`);
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new Error(`이미지 파일을 찾을 수 없습니다: ${relativePath}`);
  }
  const extension = path.extname(resolved).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(extension)) {
    throw new Error(`JPG, PNG, WebP 이미지만 사용할 수 있습니다: ${relativePath}`);
  }
  if (fs.statSync(resolved).size > 5 * 1024 * 1024) {
    throw new Error(`이미지 파일이 5MB를 초과합니다: ${relativePath}`);
  }
  return { resolved, extension };
}

function copyMedia(mediaRoot, siteRoot, slug, relativePath, suffix = "") {
  const { resolved, extension } = resolveMediaFile(mediaRoot, relativePath);
  const baseName = suffix || path.basename(resolved, path.extname(resolved));
  const safeName = safeId(baseName, "image");
  const outputDir = path.join(siteRoot, "assets", "images", "columns", slug);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputName = `${safeName}${extension === ".jpeg" ? ".jpg" : extension}`;
  fs.copyFileSync(resolved, path.join(outputDir, outputName));
  return `assets/images/columns/${slug}/${outputName}`;
}

function renderBlocks(content, mediaRoot, siteRoot, assetSlug = content.slug) {
  const toc = [];
  const html = content.blocks.map((block, index) => {
    if (block.type === "paragraph") {
      assertString(block.text, `${index + 1}번째 문단`, 1, 5000);
      return `<p>${inlineMarkdown(block.text)}</p>`;
    }
    if (block.type === "heading") {
      assertString(block.title, `${index + 1}번째 소제목`, 2, 160);
      const id = safeId(block.id || block.title, `section-${index + 1}`);
      toc.push({ id, title: block.title });
      const label = block.label ? `<p class="column-section-label">${escapeHtml(block.label)}</p>` : "";
      return `<section id="${id}">${label}<h2>${textWithBreaks(block.title)}</h2></section>`;
    }
    if (block.type === "list") {
      if (!Array.isArray(block.items) || block.items.length === 0) {
        throw new Error(`${index + 1}번째 목록에 항목이 없습니다.`);
      }
      const items = block.items.map((item) => {
        const title = item.title ? `<strong>${escapeHtml(item.title)}</strong>` : "";
        const text = item.text ? `<span>${inlineMarkdown(item.text)}</span>` : "";
        if (!title && !text) {
          throw new Error(`${index + 1}번째 목록에 빈 항목이 있습니다.`);
        }
        return `<li>${title}${text}</li>`;
      }).join("");
      return `<ul class="column-checklist">${items}</ul>`;
    }
    if (block.type === "quote") {
      assertString(block.text, `${index + 1}번째 강조문`, 2, 500);
      const label = block.label ? `<p>${escapeHtml(block.label)}</p>` : "";
      return `<aside class="column-keypoint">${label}<strong>${textWithBreaks(block.text)}</strong></aside>`;
    }
    assertString(block.image, `${index + 1}번째 본문 이미지`, 3, 500);
    assertString(block.alt, `${index + 1}번째 이미지 설명`, 3, 160);
    const imagePath = copyMedia(mediaRoot, siteRoot, assetSlug, block.image, `body-${index + 1}`);
    const caption = block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : "";
    return `<figure class="column-article__body-image"><img src="../${imagePath}" alt="${escapeHtml(block.alt)}" loading="lazy">${caption}</figure>`;
  }).join("\n");
  return { html, toc };
}

function normalizeMediaReference(value) {
  let normalized = String(value || "").trim().replace(/^<|>$/g, "");
  if (/^https?:\/\//i.test(normalized)) {
    throw new Error("본문 이미지는 외부 주소가 아니라 관리자에서 직접 업로드해 주세요.");
  }
  normalized = normalized.split(/[?#]/, 1)[0];
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    throw new Error(`본문 이미지 경로를 해석할 수 없습니다: ${value}`);
  }
  return normalized.replace(/^\.?\//, "");
}

function renderRichBody(content, mediaRoot, siteRoot, assetSlug = content.slug) {
  const lines = content.body.replace(/\r\n?/g, "\n").split("\n");
  const html = [];
  const toc = [];
  const usedIds = new Set();
  let paragraph = [];
  let listType = "";
  let listItems = [];
  let imageIndex = 0;

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join("\n"))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!listItems.length) return;
    const tag = listType === "ol" ? "ol" : "ul";
    const className = tag === "ul" ? ' class="column-checklist"' : "";
    html.push(`<${tag}${className}>${listItems.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</${tag}>`);
    listType = "";
    listItems = [];
  }

  function uniqueHeadingId(title, index) {
    const base = String(title || "")
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}-]+/gu, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || `section-${index + 1}`;
    let candidate = base;
    let suffix = 2;
    while (usedIds.has(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(candidate);
    return candidate;
  }

  function normalizeHeadingTitle(value) {
    let title = String(value || "").trim();
    if (
      (title.startsWith("**") && title.endsWith("**"))
      || (title.startsWith("__") && title.endsWith("__"))
    ) {
      title = title.slice(2, -2).trim();
    } else if (title.startsWith("*") && title.endsWith("*")) {
      title = title.slice(1, -1).trim();
    }
    return title;
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    const image = trimmed.match(/^!\[([^\]]*)\]\((\S+?)(?:\s+["']([^"']*)["'])?\)$/);
    if (image) {
      flushParagraph();
      flushList();
      imageIndex += 1;
      const mediaPath = normalizeMediaReference(image[2]);
      const copiedPath = copyMedia(mediaRoot, siteRoot, assetSlug, mediaPath, `body-${imageIndex}`);
      const alt = image[1].trim() || "칼럼 본문 이미지";
      const caption = image[3]?.trim() ? `<figcaption>${escapeHtml(image[3].trim())}</figcaption>` : "";
      html.push(`<figure class="column-article__body-image"><img src="../${copiedPath}" alt="${escapeHtml(alt)}" loading="lazy">${caption}</figure>`);
      return;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const title = normalizeHeadingTitle(heading[2]);
      const id = uniqueHeadingId(title, index);
      toc.push({ id, title });
      html.push(`<section id="${id}" class="column-rich-section"><h2>${inlineMarkdown(title)}</h2></section>`);
      return;
    }

    const unorderedItem = trimmed.match(/^[-*]\s+(.+)$/);
    const orderedItem = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (unorderedItem || orderedItem) {
      flushParagraph();
      const nextType = orderedItem ? "ol" : "ul";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push((orderedItem || unorderedItem)[1]);
      return;
    }

    const quote = trimmed.match(/^>\s?(.+)$/);
    if (quote) {
      flushParagraph();
      flushList();
      html.push(`<aside class="column-keypoint"><strong>${inlineMarkdown(quote[1])}</strong></aside>`);
      return;
    }

    flushList();
    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();
  return { html: html.join("\n"), toc };
}

function renderBlockMarkdown(value, label) {
  assertString(value, label, 2, 8000);
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  const html = [];
  let paragraph = [];
  let listType = "";
  let listItems = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join("\n"))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!listItems.length) return;
    const tag = listType === "ol" ? "ol" : "ul";
    html.push(`<${tag}>${listItems.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</${tag}>`);
    listType = "";
    listItems = [];
  }

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      html.push(`<h3>${inlineMarkdown(heading[1])}</h3>`);
      return;
    }

    const unorderedItem = trimmed.match(/^[-*]\s+(.+)$/);
    const orderedItem = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (unorderedItem || orderedItem) {
      flushParagraph();
      const nextType = orderedItem ? "ol" : "ul";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push((orderedItem || unorderedItem)[1]);
      return;
    }

    flushList();
    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();
  return html.join("");
}

function renderDesignBlocks(content, mediaRoot, siteRoot, assetSlug = content.slug) {
  if (!content.designBlocks?.length) {
    return { html: "", toc: [] };
  }
  if (!Array.isArray(content.designBlocks) || content.designBlocks.length > 12) {
    throw new Error("화면 디자인 블록은 최대 12개까지 사용할 수 있습니다.");
  }

  const toc = [];
  const html = content.designBlocks.map((block, index) => {
    const position = `${index + 1}번째 화면 디자인 블록`;
    if (!block || !["section", "checklist", "cards", "keypoint", "image"].includes(block.type)) {
      throw new Error(`${position}의 종류가 올바르지 않습니다.`);
    }

    if (block.type === "section") {
      assertString(block.heading, `${position} 제목`, 2, 160);
      const id = `design-section-${index + 1}`;
      toc.push({ id, title: block.heading });
      const eyebrow = block.eyebrow
        ? `<p class="column-section-label">${escapeHtml(block.eyebrow)}</p>`
        : "";
      return `<section id="${id}" class="column-designed-section">${eyebrow}<h2>${textWithBreaks(block.heading)}</h2><div class="column-designed-copy">${renderBlockMarkdown(block.text, `${position} 설명`)}</div></section>`;
    }

    if (block.type === "checklist") {
      assertString(block.heading, `${position} 제목`, 2, 160);
      if (!Array.isArray(block.items) || block.items.length < 2 || block.items.length > 8) {
        throw new Error(`${position}의 확인 항목은 2~8개로 입력해 주세요.`);
      }
      const id = `design-checklist-${index + 1}`;
      toc.push({ id, title: block.heading });
      const items = block.items.map((item, itemIndex) => {
        assertString(item.title, `${position} ${itemIndex + 1}번 항목 제목`, 2, 80);
        assertString(item.text, `${position} ${itemIndex + 1}번 항목 설명`, 2, 500);
        return `<li><strong>${escapeHtml(item.title)}</strong><span>${inlineMarkdown(item.text)}</span></li>`;
      }).join("");
      return `<section id="${id}" class="column-designed-section"><p class="column-section-label">WHAT WE CHECK</p><h2>${textWithBreaks(block.heading)}</h2><ul class="column-checklist">${items}</ul></section>`;
    }

    if (block.type === "cards") {
      assertString(block.heading, `${position} 제목`, 2, 160);
      if (!Array.isArray(block.items) || block.items.length < 2 || block.items.length > 6) {
        throw new Error(`${position}의 경우 카드는 2~6개로 입력해 주세요.`);
      }
      const id = `design-cards-${index + 1}`;
      toc.push({ id, title: block.heading });
      const items = block.items.map((item, itemIndex) => {
        assertString(item.title, `${position} ${itemIndex + 1}번 카드 제목`, 2, 100);
        assertString(item.text, `${position} ${itemIndex + 1}번 카드 설명`, 2, 800);
        return `<div><span>${String(itemIndex + 1).padStart(2, "0")}</span><h3>${escapeHtml(item.title)}</h3><p>${inlineMarkdown(item.text)}</p></div>`;
      }).join("");
      return `<section id="${id}" class="column-designed-section"><p class="column-section-label">POSSIBLE PATHS</p><h2>${textWithBreaks(block.heading)}</h2><div class="column-cases">${items}</div></section>`;
    }

    if (block.type === "keypoint") {
      assertString(block.text, `${position} 핵심 문장`, 5, 500);
      return `<aside class="column-keypoint"><p>KEY POINT</p><strong>${textWithBreaks(block.text)}</strong></aside>`;
    }

    assertString(block.image, `${position} 이미지`, 3, 500);
    assertString(block.alt, `${position} 이미지 설명`, 3, 160);
    const imagePath = copyMedia(mediaRoot, siteRoot, assetSlug, block.image, `design-${index + 1}`);
    const caption = block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : "";
    return `<figure class="column-article__body-image"><img src="../${imagePath}" alt="${escapeHtml(block.alt)}" loading="lazy">${caption}</figure>`;
  }).join("\n");

  return { html, toc };
}

function renderFaq(content) {
  if (!content.faqs?.length) {
    return { html: "", schema: null };
  }
  const items = content.faqs.map((item, index) => {
    assertString(item.question, `${index + 1}번째 FAQ 질문`, 3, 200);
    assertString(item.answer, `${index + 1}번째 FAQ 답변`, 5, 1200);
    return {
      question: item.question,
      answer: item.answer,
      html: `<details><summary>${escapeHtml(item.question)}</summary><div class="column-faq__answer">${renderBlockMarkdown(item.answer, `${index + 1}번째 FAQ 답변`)}</div></details>`,
    };
  });
  return {
    html: `<section id="faq" class="column-faq"><p class="column-section-label">FAQ</p><h2>자주 묻는 질문</h2>${items.map((item) => item.html).join("")}</section>`,
    schema: {
      "@type": "FAQPage",
      mainEntity: items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  };
}

function renderSources(content) {
  if (!content.sources?.length) {
    return `<section class="column-sources"><p>이 글은 일반적인 건강 정보를 제공하기 위한 것으로 개인의 진단이나 치료를 대신하지 않습니다. 증상과 건강 상태에 따라 진찰이 필요할 수 있습니다.</p></section>`;
  }
  const items = content.sources.map((item, index) => {
    assertString(item.title, `${index + 1}번째 참고자료 제목`, 2, 240);
    if (!/^https:\/\//.test(item.url || "")) {
      throw new Error(`${index + 1}번째 참고자료 URL은 https://로 시작해야 합니다.`);
    }
    return `<li><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a></li>`;
  }).join("");
  return `<section class="column-sources"><h2>참고한 의학 정보</h2><ul>${items}</ul><p>이 글은 일반적인 건강 정보를 제공하기 위한 것으로 개인의 진단이나 치료를 대신하지 않습니다. 증상과 건강 상태에 따라 진찰이 필요할 수 있습니다.</p></section>`;
}

function buildArticle(content, coverPath, body, toc, faq, sources, { preview = false } = {}) {
  const category = CATEGORY_MAP[content.category];
  const publishedDisplay = content.publishedAt.replaceAll("-", ".");
  const modifiedAt = content.modifiedAt && /^\d{4}-\d{2}-\d{2}$/.test(content.modifiedAt)
    ? content.modifiedAt
    : content.publishedAt;
  const articleUrl = `${BASE_URL}/columns/${content.slug}.html`;
  const imageUrl = `${BASE_URL}/${coverPath}`;
  const graph = [
    {
      "@type": "Article",
      headline: content.title,
      description: content.description,
      keywords: content.tags,
      image: imageUrl,
      datePublished: content.publishedAt,
      dateModified: modifiedAt,
      author: { "@id": `${BASE_URL}/director.html#kim-minji` },
      publisher: {
        "@type": "MedicalClinic",
        "@id": `${BASE_URL}/#clinic`,
        name: "디어한의원",
        telephone: "02-3486-1777",
        address: {
          "@type": "PostalAddress",
          streetAddress: "사임당로 143 3층 309호, 310호",
          addressLocality: "서초구",
          addressRegion: "서울",
          addressCountry: "KR",
        },
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "홈", item: `${BASE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Columns", item: `${BASE_URL}/columns.html` },
        { "@type": "ListItem", position: 3, name: content.title },
      ],
    },
  ];
  if (faq.schema) graph.push(faq.schema);
  const schema = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replaceAll("<", "\\u003c");
  const tocItems = toc.map((item) => `<li><a href="#${item.id}">${escapeHtml(item.title)}</a></li>`);
  if (faq.html) tocItems.push('<li><a href="#faq">자주 묻는 질문</a></li>');
  const tocHtml = tocItems.length
    ? `<aside class="column-toc" aria-label="목차"><p>CONTENTS</p><ol>${tocItems.join("")}</ol></aside>`
    : '<aside class="column-toc"><p>DEAR COLUMN</p><a href="../columns.html">다른 칼럼 보기 →</a></aside>';
  const tagsHtml = content.tags.length
    ? `<ul class="column-tags" aria-label="검색 주제">${content.tags.map((tag) => `<li>#${escapeHtml(tag)}</li>`).join("")}</ul>`
    : "";
  const previewMeta = preview
    ? '  <meta name="robots" content="noindex,nofollow,noarchive">\n  <meta name="googlebot" content="noindex,nofollow,noarchive">\n'
    : "";
  const previewNotice = preview
    ? '<div class="column-preview-notice" role="status"><strong>홈페이지 미리보기</strong><span>검색엔진과 칼럼 목록에는 공개되지 않습니다.</span></div>'
    : "";

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="../assets/images/favicon.svg" type="image/svg+xml">
  <meta name="theme-color" content="#F8F8F6">
${previewMeta}  <title>${escapeHtml(content.title)}</title>
  <meta name="description" content="${escapeHtml(content.description)}">
  <link rel="canonical" href="${articleUrl}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(content.title)}">
  <meta property="og:description" content="${escapeHtml(content.description)}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:url" content="${articleUrl}">
  <link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css">
  <link rel="stylesheet" href="../css/style.css?v=20260811-7">
  <script type="application/ld+json">${schema}</script>
</head>
<body class="column-article-body${preview ? " is-preview" : ""}">
${PUBLISHER_MARKER}
${previewNotice}
<nav class="nav" id="top">
  <a href="../index.html" class="nav__logo">DEAR</a>
  <button class="nav__toggle" id="navToggle" aria-label="메뉴 열기" aria-expanded="false"><span></span><span></span><span></span></button>
  <ul class="nav__menu" id="navMenu"><li><a href="../about.html" class="nav__link" data-ready="true">About DEAR</a></li><li><a href="../columns.html" class="nav__link is-active" data-ready="true">Columns</a></li><li><a href="../care.html" class="nav__link" data-ready="true">Care</a></li><li><a href="../services.html" class="nav__link" data-ready="true">DEAR SERVICES</a></li><li><a href="#contact" class="nav__link" data-ready="true">Contact</a></li></ul>
</nav>
<main class="column-article"><article>
  <header class="column-article__header">
    <nav class="column-breadcrumb" aria-label="현재 위치"><a href="../index.html">홈</a><span>›</span><a href="../columns.html">Columns</a><span>›</span><span>${category.label}</span></nav>
    <p class="column-meta">${category.display} · ${category.label}</p>
    <h1>${textWithBreaks(content.title)}</h1>
    <p class="column-article__lead">${textWithBreaks(content.lead)}</p>
    <div class="column-byline"><a class="column-author-link" href="../director.html" rel="author">김민지 대표원장</a><time datetime="${content.publishedAt}">${publishedDisplay}</time></div>
    ${tagsHtml}
  </header>
  <figure class="column-article__hero"><img src="../${coverPath}" alt="${escapeHtml(content.coverAlt)}"></figure>
  <div class="column-article__layout">
    ${tocHtml}
    <div class="column-article__content">
      ${body}
      <section class="column-consult"><p class="column-section-label">CONSULTATION</p><h2>현재의 상태를<br>함께 살펴보고 싶다면</h2><p>불편함과 생활의 변화를 편하게 이야기해 주세요.<br>진찰을 통해 확인이 필요한 부분과 가능한 방향을 설명해 드립니다.</p><a href="https://m.booking.naver.com/booking/13/bizes/729883" target="_blank" rel="noopener">네이버 진료 예약 <span aria-hidden="true">→</span></a></section>
      ${faq.html}
      ${sources}
      <section class="column-nap" aria-labelledby="clinic-info"><p class="column-section-label">DEAR KOREAN MEDICINE CLINIC</p><h2 id="clinic-info">디어한의원</h2><address>서울 서초구 사임당로 143 3층 309호, 310호<br><a href="tel:02-3486-1777">02-3486-1777</a></address><div><a href="https://m.booking.naver.com/booking/13/bizes/729883" target="_blank" rel="noopener">네이버 예약</a><a href="https://map.naver.com/p/search/%EB%94%94%EC%96%B4%ED%95%9C%EC%9D%98%EC%9B%90" target="_blank" rel="noopener">위치 보기</a></div></section>
    </div>
  </div>
</article></main>
<footer class="footer" id="contact"><div class="footer__inner"><div class="footer__top"><div class="footer__brand"><img class="footer__logo-img" src="../assets/images/logo-full-white.png" alt="디어한의원 로고" width="84" height="140" loading="lazy"><p class="footer__slogan">ALWAYS "DEAR" YOU</p></div></div><div class="footer__nap-row"><address class="footer__nap">디어한의원 · 대표자 김민지 · 사업자등록번호 828-09-02466<br>서울 서초구 사임당로 143 3층 309호, 310호<br><a href="tel:02-3486-1777">02-3486-1777</a></address><div class="footer__legal-links"><a href="../privacy.html">개인정보처리방침</a><a href="../non-covered.html">비급여항목 안내</a><a href="../patient-rights.html">환자의 권리와 의무</a></div></div><p class="footer__copyright">COPYRIGHT &copy; 2022 DEAR CLINIC. ALL RIGHTS RESERVED.</p></div></footer>
<script src="../js/main.js?v=20260811-2"></script>
</body>
</html>
`;
}

function updateColumnsIndex(siteRoot, content, coverPath) {
  const filePath = path.join(siteRoot, "columns.html");
  let source = fs.readFileSync(filePath, "utf8");
  const category = CATEGORY_MAP[content.category];
  const start = `        <!-- COLUMN_CARD:${content.slug}:START -->`;
  const end = `        <!-- COLUMN_CARD:${content.slug}:END -->`;
  const searchText = escapeHtml(`${content.title} ${content.summary} ${content.tags.join(" ")} ${category.label} ${content.category}`);
  const card = `${start}
        <a class="column-card js-reveal" href="columns/${content.slug}.html" data-column-slug="${content.slug}" data-category="${content.category}" data-search="${searchText}">
          <div class="column-card__image"><img src="${coverPath}" alt="" loading="lazy"></div>
          <p class="column-meta">${category.display} · ${category.label}</p>
          <h2>${escapeHtml(content.title)}</h2>
          <p>${escapeHtml(content.summary)}</p>
          <time datetime="${content.publishedAt}">${content.publishedAt.replaceAll("-", ".")}</time>
        </a>
${end}`;
  const existingPattern = new RegExp(`${start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  if (existingPattern.test(source)) {
    source = source.replace(existingPattern, card);
  } else {
    const marker = "        <!-- COLUMN_CARDS_START -->";
    if (!source.includes(marker)) throw new Error("columns.html에서 카드 삽입 위치를 찾지 못했습니다.");
    source = source.replace(marker, `${marker}\n${card}`);
  }
  fs.writeFileSync(filePath, source, "utf8");
}

function updateSitemap(siteRoot, content) {
  const filePath = path.join(siteRoot, "sitemap.xml");
  let source = fs.readFileSync(filePath, "utf8");
  const start = `  <!-- COLUMN_SITEMAP:${content.slug}:START -->`;
  const end = `  <!-- COLUMN_SITEMAP:${content.slug}:END -->`;
  const entry = `${start}
  <url><loc>${BASE_URL}/columns/${content.slug}.html</loc><lastmod>${content.modifiedAt || content.publishedAt}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>
${end}`;
  const existingPattern = new RegExp(`${start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  if (existingPattern.test(source)) {
    source = source.replace(existingPattern, entry);
  } else {
    const marker = "  <!-- COLUMN_SITEMAP_END -->";
    if (!source.includes(marker)) throw new Error("sitemap.xml에서 URL 삽입 위치를 찾지 못했습니다.");
    source = source.replace(marker, `${entry}\n${marker}`);
  }
  fs.writeFileSync(filePath, source, "utf8");
}

function updateRss(siteRoot, content) {
  const filePath = path.join(siteRoot, "rss.xml");
  let source = fs.readFileSync(filePath, "utf8");
  const xml = (value) => escapeHtml(String(value)).replaceAll("&#39;", "&apos;");
  const start = `    <!-- COLUMN_RSS:${content.slug}:START -->`;
  const end = `    <!-- COLUMN_RSS:${content.slug}:END -->`;
  const url = `${BASE_URL}/columns/${content.slug}.html`;
  const pubDate = new Date(`${content.publishedAt}T00:00:00+09:00`).toUTCString();
  const entry = `${start}\n    <item><title>${xml(content.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${pubDate}</pubDate><description>${xml(content.description)}</description></item>\n${end}`;
  const existingPattern = new RegExp(`${start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  source = existingPattern.test(source)
    ? source.replace(existingPattern, entry)
    : source.replace("  </channel>", `${entry}\n  </channel>`);
  fs.writeFileSync(filePath, source, "utf8");
}

function removeGeneratedColumn(siteRoot, slug) {
  const articlePath = path.join(siteRoot, "columns", `${slug}.html`);
  if (fs.existsSync(articlePath)) {
    const existing = fs.readFileSync(articlePath, "utf8");
    if (!existing.includes(PUBLISHER_MARKER)) {
      throw new Error(`수동 제작 칼럼은 자동으로 내리거나 삭제할 수 없습니다: columns/${slug}.html`);
    }
    fs.rmSync(articlePath);
  }

  const indexPath = path.join(siteRoot, "columns.html");
  let index = fs.readFileSync(indexPath, "utf8");
  const cardStart = `        <!-- COLUMN_CARD:${slug}:START -->`;
  const cardEnd = `        <!-- COLUMN_CARD:${slug}:END -->`;
  const cardPattern = new RegExp(`${cardStart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${cardEnd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\r?\\n?`);
  index = index.replace(cardPattern, "");
  fs.writeFileSync(indexPath, index, "utf8");

  const sitemapPath = path.join(siteRoot, "sitemap.xml");
  let sitemap = fs.readFileSync(sitemapPath, "utf8");
  const mapStart = `  <!-- COLUMN_SITEMAP:${slug}:START -->`;
  const mapEnd = `  <!-- COLUMN_SITEMAP:${slug}:END -->`;
  const mapPattern = new RegExp(`${mapStart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${mapEnd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\r?\\n?`);
  sitemap = sitemap.replace(mapPattern, "");
  fs.writeFileSync(sitemapPath, sitemap, "utf8");

  const rssPath = path.join(siteRoot, "rss.xml");
  let rss = fs.readFileSync(rssPath, "utf8");
  const rssStart = `    <!-- COLUMN_RSS:${slug}:START -->`;
  const rssEnd = `    <!-- COLUMN_RSS:${slug}:END -->`;
  const rssPattern = new RegExp(`${rssStart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${rssEnd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\r?\\n?`);
  rss = rss.replace(rssPattern, "");
  fs.writeFileSync(rssPath, rss, "utf8");

  const assetsPath = path.join(siteRoot, "assets", "images", "columns", slug);
  if (fs.existsSync(assetsPath)) fs.rmSync(assetsPath, { recursive: true, force: true });
  return { articlePath, assetsPath };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.content) {
    throw new Error("--content에 칼럼 JSON 파일 경로를 지정해 주세요.");
  }
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const defaultSiteRoot = path.resolve(scriptDir, "..");
  const siteRoot = path.resolve(args["site-root"] || defaultSiteRoot);
  const mediaRoot = path.resolve(args["media-root"] || path.dirname(path.resolve(args.content)));
  const contentPath = path.resolve(args.content);
  const rawContent = JSON.parse(fs.readFileSync(contentPath, "utf8"));
  const content = applyOptionalFieldDefaults(rawContent);
  const mode = args.mode || "publish";
  if (!["publish", "preview", "remove"].includes(mode)) {
    throw new Error("--mode는 publish, preview 또는 remove만 사용할 수 있습니다.");
  }
  if (mode === "remove") {
    assertString(content.slug, "영문 URL", 3, 80);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(content.slug)) {
      throw new Error("영문 URL은 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.");
    }
    removeGeneratedColumn(siteRoot, content.slug);
    process.stdout.write(`${JSON.stringify({
      status: "removed",
      slug: content.slug,
      url: `${BASE_URL}/columns/${content.slug}.html`,
      files: ["columns.html", "sitemap.xml", "rss.xml", `columns/${content.slug}.html`, `assets/images/columns/${content.slug}`],
    }, null, 2)}\n`);
    return;
  }
  const isPreview = mode === "preview";
  validateContent(content, { requireReady: !isPreview });

  const articlePath = path.join(siteRoot, isPreview ? "preview" : "columns", `${content.slug}.html`);
  if (fs.existsSync(articlePath)) {
    const existing = fs.readFileSync(articlePath, "utf8");
    if (!existing.includes(PUBLISHER_MARKER)) {
      throw new Error(`수동 제작 칼럼은 자동으로 덮어쓸 수 없습니다: ${isPreview ? "preview" : "columns"}/${content.slug}.html`);
    }
  }

  const assetSlug = isPreview ? `preview-${content.slug}` : content.slug;
  const coverPath = copyMedia(mediaRoot, siteRoot, assetSlug, content.coverImage, "cover");
  const { html: basicBody, toc: basicToc } = content.bodyHtml
    ? renderHtmlBody(content, mediaRoot, siteRoot, assetSlug)
    : content.body
      ? renderRichBody(content, mediaRoot, siteRoot, assetSlug)
      : renderBlocks(content, mediaRoot, siteRoot, assetSlug);
  const design = renderDesignBlocks(content, mediaRoot, siteRoot, assetSlug);
  const body = [basicBody, design.html].filter(Boolean).join("\n");
  const toc = [...basicToc, ...design.toc];
  const faq = renderFaq(content);
  const sources = renderSources(content);
  const article = buildArticle(content, coverPath, body, toc, faq, sources, { preview: isPreview });

  fs.mkdirSync(path.dirname(articlePath), { recursive: true });
  fs.writeFileSync(articlePath, article, "utf8");
  if (!isPreview) {
    updateColumnsIndex(siteRoot, content, coverPath);
    updateSitemap(siteRoot, content);
    updateRss(siteRoot, content);
  }

  const result = {
    status: isPreview ? "previewed" : "published",
    slug: content.slug,
    url: `${BASE_URL}/${isPreview ? "preview" : "columns"}/${content.slug}.html`,
    files: [
      path.relative(siteRoot, articlePath).replaceAll(path.sep, "/"),
      ...(!isPreview ? ["columns.html", "sitemap.xml", "rss.xml"] : []),
      coverPath,
    ],
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`발행 중단: ${error.message}\n`);
  process.exitCode = 1;
}
