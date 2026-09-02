import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(toolsDir, "..");
const columnsDir = path.join(siteRoot, "columns");
const footerPattern = /<footer class="footer" id="contact">[\s\S]*?<\/footer>/;

function read(relativePath) {
  return fs.readFileSync(path.join(siteRoot, relativePath), "utf8");
}

function columnFooterFromHome() {
  const home = read("index.html");
  const footer = home.match(footerPattern)?.[0];
  if (!footer) throw new Error("index.html에서 메인 푸터를 찾지 못했습니다.");
  return footer
    .replace('src="assets/', 'src="../assets/')
    .replace('href="privacy.html"', 'href="../privacy.html"')
    .replace('href="non-covered.html"', 'href="../non-covered.html"')
    .replace('href="patient-rights.html"', 'href="../patient-rights.html"');
}

const expectedFooter = columnFooterFromHome();
const checkOnly = process.argv.includes("--check");
const changed = [];
const columnFiles = fs.readdirSync(columnsDir).filter((name) => name.endsWith(".html")).sort();

for (const filename of columnFiles) {
  const absolutePath = path.join(columnsDir, filename);
  const html = fs.readFileSync(absolutePath, "utf8");
  const currentFooter = html.match(footerPattern)?.[0];
  if (!currentFooter) throw new Error(`공통 푸터가 없습니다: columns/${filename}`);
  if (currentFooter === expectedFooter) continue;
  changed.push(filename);
  if (!checkOnly) fs.writeFileSync(absolutePath, html.replace(footerPattern, expectedFooter), "utf8");
}

for (const relativePath of ["tools/publish-column.mjs", "tools/column-editor.ps1"]) {
  const absolutePath = path.join(siteRoot, relativePath);
  const content = fs.readFileSync(absolutePath, "utf8");
  const currentFooter = content.match(footerPattern)?.[0];
  if (!currentFooter) throw new Error(`공통 푸터 템플릿이 없습니다: ${relativePath}`);
  if (currentFooter === expectedFooter) continue;
  changed.push(relativePath);
  if (!checkOnly) fs.writeFileSync(absolutePath, content.replace(footerPattern, expectedFooter), "utf8");
}

if (checkOnly && changed.length) {
  throw new Error(`메인 푸터와 다른 대상: ${changed.join(", ")}`);
}

process.stdout.write(checkOnly
  ? `칼럼 푸터 동기화 확인 통과: ${columnFiles.length}개와 발행 템플릿 2개\n`
  : `메인 푸터로 동기화: ${changed.length}개 대상\n`);
