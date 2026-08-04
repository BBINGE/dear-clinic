import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(toolsDir, "..");
const editorRoot = path.join(toolsDir, "column-editor");
const localRoot = path.join(siteRoot, ".column-editor");
const draftRoot = path.join(localRoot, "drafts");
const mediaRoot = path.join(localRoot, "media");
const host = "127.0.0.1";
const port = 4174;
const maxBody = 24 * 1024 * 1024;
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".json": "application/json; charset=utf-8",
};

function safeSlug(value) {
  const slug = String(value || "").trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("글 주소는 영문 소문자·숫자·하이픈만 사용해 주세요.");
  }
  return slug;
}

function within(root, requestPath) {
  const target = path.resolve(root, `.${requestPath}`);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error("허용되지 않은 경로입니다.");
  }
  return target;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBody) {
        reject(new Error("사진을 포함한 저장 용량이 너무 큽니다."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("저장할 글의 형식을 읽지 못했습니다."));
      }
    });
    request.on("error", reject);
  });
}

function saveDataImage(dataUrl, slug, name) {
  const match = /^data:image\/(png|jpeg|webp);base64,(.+)$/s.exec(dataUrl || "");
  if (!match) throw new Error("JPG, PNG 또는 WebP 사진을 선택해 주세요.");
  const extension = match[1] === "jpeg" ? "jpg" : match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 5 * 1024 * 1024) throw new Error("사진 한 장은 5MB 이하여야 합니다.");
  const folder = path.join(mediaRoot, slug);
  fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, `${name}.${extension}`);
  fs.writeFileSync(file, buffer);
  return path.relative(mediaRoot, file).replaceAll(path.sep, "/");
}

function materialize(payload, { requireCover = true } = {}) {
  const content = structuredClone(payload.content || {});
  const slug = safeSlug(content.slug);
  if (payload.coverData) content.coverImage = saveDataImage(payload.coverData, slug, "cover");
  if (requireCover && !content.coverImage) throw new Error("공개 전에 대표 사진을 선택해 주세요.");
  Object.entries(payload.bodyImages || {}).forEach(([editorId, dataUrl], index) => {
    const imagePath = saveDataImage(dataUrl, slug, `html-${index + 1}`);
    const escapedId = editorId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const marker = new RegExp(`(<img\\b[^>]*data-editor-image=["'])${escapedId}(["'][^>]*>)`, "i");
    if (!marker.test(content.bodyHtml || "")) return;
    content.bodyHtml = content.bodyHtml.replace(marker, (whole) => whole.replace(/src=["'][^"']*["']/i, `src="${imagePath}"`));
  });
  (content.designBlocks || []).forEach((block, index) => {
    if (block.type === "image" && payload.blockImages?.[block.editorId]) {
      block.image = saveDataImage(payload.blockImages[block.editorId], slug, `body-${index + 1}`);
    }
    delete block.editorId;
  });
  fs.mkdirSync(draftRoot, { recursive: true });
  const contentPath = path.join(draftRoot, `${slug}.json`);
  fs.writeFileSync(contentPath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
  return { content, contentPath };
}

function runPublisher(contentPath, mode) {
  const result = spawnSync(process.execPath, [
    path.join(toolsDir, "publish-column.mjs"),
    "--content", contentPath,
    "--site-root", siteRoot,
    "--media-root", mediaRoot,
    "--mode", mode,
  ], { cwd: siteRoot, encoding: "utf8" });
  if (result.status !== 0) throw new Error((result.stderr || result.stdout).trim());
  return JSON.parse(result.stdout);
}

function send(response, status, value, type = "application/json; charset=utf-8") {
  response.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  response.end(type.startsWith("application/json") ? JSON.stringify(value) : value);
}

async function api(request, response, pathname) {
  try {
    const payload = await readBody(request);
    const { content, contentPath } = materialize(payload, { requireCover: pathname !== "/api/save" });
    if (pathname === "/api/save") {
      send(response, 200, { ok: true, message: "초안을 이 컴퓨터에 저장했습니다.", content });
      return;
    }
    if (pathname === "/api/preview") {
      const result = runPublisher(contentPath, "preview");
      send(response, 200, { ok: true, message: "실제 홈페이지 미리보기를 만들었습니다.", localUrl: `/preview/${content.slug}.html`, result });
      return;
    }
    if (pathname === "/api/publish") {
      content.status = "ready";
      fs.writeFileSync(contentPath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
      const result = runPublisher(contentPath, "publish");
      const git = spawnSync("git", ["add", "--", "columns.html", "sitemap.xml", `columns/${content.slug}.html`, `assets/images/columns/${content.slug}`], { cwd: siteRoot, encoding: "utf8" });
      if (git.status !== 0) throw new Error(git.stderr.trim() || "Git 저장 준비에 실패했습니다.");
      const commit = spawnSync("git", ["commit", "-m", `칼럼 게시: ${content.title}`], { cwd: siteRoot, encoding: "utf8" });
      if (commit.status !== 0) throw new Error(commit.stderr.trim() || commit.stdout.trim() || "커밋하지 못했습니다.");
      const push = spawnSync("git", ["push", "origin", "master"], { cwd: siteRoot, encoding: "utf8" });
      if (push.status !== 0) throw new Error(push.stderr.trim() || "GitHub 전송에 실패했습니다.");
      send(response, 200, { ok: true, message: "홈페이지에 발행했습니다. 보통 1~3분 뒤 반영됩니다.", result });
      return;
    }
    send(response, 404, { ok: false, message: "알 수 없는 요청입니다." });
  } catch (error) {
    send(response, 400, { ok: false, message: error.message });
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${host}:${port}`);
  if (request.method === "POST" && url.pathname.startsWith("/api/")) {
    await api(request, response, url.pathname);
    return;
  }
  try {
    let file;
    if (url.pathname === "/" || url.pathname === "/editor") file = path.join(editorRoot, "index.html");
    else if (url.pathname.startsWith("/editor/")) file = within(editorRoot, url.pathname.slice("/editor".length));
    else if (url.pathname.startsWith("/draft-media/")) file = within(mediaRoot, url.pathname.slice("/draft-media".length));
    else file = within(siteRoot, url.pathname);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      send(response, 404, "찾을 수 없습니다.", "text/plain; charset=utf-8");
      return;
    }
    send(response, 200, fs.readFileSync(file), mime[path.extname(file).toLowerCase()] || "application/octet-stream");
  } catch (error) {
    send(response, 400, error.message, "text/plain; charset=utf-8");
  }
});

server.listen(port, host, () => {
  const url = `http://${host}:${port}/editor`;
  console.log(`디어 칼럼 에디터를 열었습니다: ${url}`);
  console.log("이 창을 닫으면 에디터도 종료됩니다.");
  spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore", windowsHide: true }).unref();
});
