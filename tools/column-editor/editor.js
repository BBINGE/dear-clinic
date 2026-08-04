const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = { blocks: [], faqs: [], sources: [], coverData: "", coverPath: "", blockImages: {} };
const labels = { section: "큰 소제목과 설명", checklist: "확인 항목 표", cards: "경우별 번호 카드", keypoint: "진한 핵심 문장", image: "본문 사진" };
const today = new Date().toISOString().slice(0, 10);
$("#publishedAt").value = today;

function esc(value = "") { return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function inline(value = "") { return esc(value).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\[([^\]]+)\]\((https:\/\/[^)]+)\)/g, '<a href="$2">$1</a>'); }
function slugify(value) { return value.trim().toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/[가-힣]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, ""); }
function id() { return `b-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function toast(message, error = false) { const el = $("#toast"); el.textContent = message; el.className = `toast is-visible${error ? " is-error" : ""}`; clearTimeout(toast.timer); toast.timer = setTimeout(() => el.className = "toast", 3200); }
function debounce(fn, delay = 180) { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); }; }

function bodyHtml(text) {
  return text.trim().split(/\n{2,}/).filter(Boolean).map((chunk, index) => {
    const value = chunk.trim();
    if (value.startsWith("## ")) return `<section id="body-${index}"><h2>${inline(value.slice(3))}</h2></section>`;
    if (value.startsWith("### ")) return `<h3>${inline(value.slice(4))}</h3>`;
    if (value.startsWith("> ")) return `<blockquote>${inline(value.slice(2))}</blockquote>`;
    if (value.split("\n").every((line) => /^[-*] /.test(line))) return `<ul>${value.split("\n").map((line) => `<li>${inline(line.slice(2))}</li>`).join("")}</ul>`;
    return `<p>${inline(value).replace(/\n/g, "<br>")}</p>`;
  }).join("");
}

function designHtml(block, index) {
  const heading = esc(block.heading || "여기에 소제목을 적어 주세요");
  const anchor = `design-${index}`;
  if (block.type === "section") return `<section id="${anchor}" class="column-designed-section">${block.eyebrow ? `<p class="column-section-label">${esc(block.eyebrow)}</p>` : ""}<h2>${heading}</h2><div class="column-designed-copy">${bodyHtml(block.text || "소제목을 설명하는 내용을 적어 주세요.")}</div></section>`;
  if (block.type === "checklist") return `<section id="${anchor}" class="column-designed-section"><p class="column-section-label">WHAT WE CHECK</p><h2>${heading}</h2><ul class="column-checklist">${(block.items || []).map((item) => `<li><strong>${esc(item.title || "확인 항목")}</strong><span>${esc(item.text || "확인하는 이유를 적어 주세요.")}</span></li>`).join("")}</ul></section>`;
  if (block.type === "cards") return `<section id="${anchor}" class="column-designed-section"><p class="column-section-label">POSSIBLE PATHS</p><h2>${heading}</h2><div class="column-cases">${(block.items || []).map((item, i) => `<div><span>${String(i + 1).padStart(2, "0")}</span><h3>${esc(item.title || "경우의 제목")}</h3><p>${esc(item.text || "이 경우에 살펴볼 방향을 적어 주세요.")}</p></div>`).join("")}</div></section>`;
  if (block.type === "keypoint") return `<aside class="column-keypoint"><p>KEY POINT</p><strong>${esc(block.text || "가장 기억시키고 싶은 문장을 적어 주세요.").replace(/\n/g, "<br>")}</strong></aside>`;
  if (block.type === "image") return `<figure class="column-article__body-image">${block.preview ? `<img src="${block.preview}" alt="${esc(block.alt)}">` : `<div style="aspect-ratio:4/3;background:#e8e4e2;display:grid;place-items:center;color:#777">사진을 선택해 주세요</div>`}${block.caption ? `<figcaption>${esc(block.caption)}</figcaption>` : ""}</figure>`;
  return "";
}

function preview() {
  const title = $("#title").value || "칼럼 제목을 입력해 주세요";
  const summary = $("#summary").value || "제목 아래 소개 문장이 이곳에 표시됩니다.";
  const body = $("#body").value || "왼쪽에서 글을 쓰기 시작하면 이곳에 실제 칼럼 모습으로 바로 나타납니다.";
  const headings = [...body.matchAll(/^## (.+)$/gm)].map((m, i) => ({ text: m[1], href: `body-${i}` }));
  state.blocks.forEach((block, i) => { if (block.heading) headings.push({ text: block.heading, href: `design-${i}` }); });
  if (state.faqs.length) headings.push({ text: "자주 묻는 질문", href: "faq" });
  const cover = state.coverData || (state.coverPath ? `/draft-media/${state.coverPath}` : "");
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><base href="/"><link rel="stylesheet" href="/css/style.css"><style>body{zoom:.78}.nav{position:relative}.column-preview-shell{min-height:100vh}.column-article{padding-top:40px}</style></head><body class="column-article-body"><div class="column-preview-shell"><nav class="nav"><a class="nav__logo">DEAR</a></nav><main class="column-article"><article><header class="column-article__header"><p class="column-meta">${esc($("#category").selectedOptions[0]?.textContent || "마음")}</p><h1>${esc(title)}</h1><p class="column-article__lead">${esc(summary)}</p><div class="column-byline"><span>${esc($("#editorName").value)}${$("#editorName").value === "김민지" ? " 대표원장" : ""}</span><time>${$("#publishedAt").value.replaceAll("-", ".")}</time></div></header>${cover ? `<figure class="column-article__hero"><img src="${cover}" alt=""></figure>` : ""}<div class="column-article__layout"><aside class="column-toc"><p>CONTENTS</p><ol>${headings.map((h) => `<li><a href="#${h.href}">${esc(h.text)}</a></li>`).join("")}</ol></aside><div class="column-article__content">${bodyHtml(body)}${state.blocks.map(designHtml).join("")}<section class="column-consult"><p class="column-section-label">CONSULTATION</p><h2>현재의 상태를<br>함께 살펴보고 싶다면</h2><p>불편함과 생활의 변화를 편하게 이야기해 주세요.<br>진찰을 통해 확인이 필요한 부분과 가능한 방향을 설명해 드립니다.</p><a>네이버 진료 예약 →</a></section>${state.faqs.length ? `<section id="faq" class="column-faq"><p class="column-section-label">FAQ</p><h2>자주 묻는 질문</h2>${state.faqs.map((f) => `<details open><summary>${esc(f.question || "질문을 적어 주세요")}</summary><p>${esc(f.answer || "답변을 적어 주세요")}</p></details>`).join("")}</section>` : ""}<section class="column-sources">${state.sources.length ? `<h2>참고한 의학 정보</h2><ul>${state.sources.map((s) => `<li>${esc(s.title || "자료 이름")}</li>`).join("")}</ul>` : ""}<p>이 글은 일반적인 건강 정보를 제공하기 위한 것으로 개인의 진단이나 치료를 대신하지 않습니다.</p></section><section class="column-nap"><p class="column-section-label">DEAR KOREAN MEDICINE CLINIC</p><h2>디어한의원</h2><address>서울 서초구 사임당로 143 3층 309호, 310호<br>02-3486-1777</address></section></div></div></article></main></div></body></html>`;
  $("#preview").srcdoc = html;
  localStorage.setItem("dear-column-editor", JSON.stringify(draft(false)));
}
const updatePreview = debounce(preview);

function blockTemplate(block, index) {
  const controls = `<div class="block-card__head"><strong>${labels[block.type]}</strong><div class="block-card__actions"><button data-action="up" title="위로">↑</button><button data-action="down" title="아래로">↓</button><button data-action="remove" title="삭제">×</button></div></div>`;
  if (block.type === "section") return `${controls}<div class="block-card__grid"><select data-key="eyebrow"><option value="">작은 분류 문구 없음</option>${["MEDICAL BASIS","WHAT WE CHECK","POSSIBLE PATHS","DEAR NOTE"].map(v=>`<option${block.eyebrow===v?" selected":""}>${v}</option>`).join("")}</select><input data-key="heading" value="${esc(block.heading)}" placeholder="큰 소제목"><textarea class="wide" data-key="text" placeholder="설명 문단">${esc(block.text)}</textarea></div>`;
  if (["checklist","cards"].includes(block.type)) return `${controls}<input data-key="heading" value="${esc(block.heading)}" placeholder="묶음의 큰 제목"><div class="items">${(block.items || []).map((item, i) => `<div class="item-row"><input data-item="${i}" data-key="title" value="${esc(item.title)}" placeholder="짧은 제목"><textarea data-item="${i}" data-key="text" placeholder="설명">${esc(item.text)}</textarea><button data-remove-item="${i}">×</button></div>`).join("")}</div><button class="add-item" data-add-item>+ 항목 추가</button>`;
  if (block.type === "keypoint") return `${controls}<textarea data-key="text" placeholder="가장 기억시키고 싶은 문장">${esc(block.text)}</textarea>`;
  return `${controls}<div class="block-card__grid"><input class="wide" type="file" data-image accept="image/jpeg,image/png,image/webp"><input class="wide" data-key="alt" value="${esc(block.alt)}" placeholder="사진 설명"><input class="wide" data-key="caption" value="${esc(block.caption)}" placeholder="사진 아래 설명 (선택)"></div>`;
}

function renderBlocks() {
  $("#blocks").innerHTML = state.blocks.map((block, index) => `<article class="block-card" data-index="${index}">${blockTemplate(block, index)}</article>`).join("");
}
function addBlock(type) {
  const base = { type, editorId: id() };
  if (type === "section") Object.assign(base, { eyebrow: "MEDICAL BASIS", heading: "", text: "" });
  if (type === "checklist" || type === "cards") Object.assign(base, { heading: "", items: [{ title: "", text: "" }, { title: "", text: "" }] });
  if (type === "keypoint") base.text = "";
  if (type === "image") Object.assign(base, { image: "", alt: "", caption: "", preview: "" });
  state.blocks.push(base); renderBlocks(); preview();
}

$("#blocks").addEventListener("input", (event) => {
  const card = event.target.closest(".block-card"); if (!card) return;
  const block = state.blocks[Number(card.dataset.index)];
  if (event.target.dataset.item !== undefined) block.items[Number(event.target.dataset.item)][event.target.dataset.key] = event.target.value;
  else if (event.target.dataset.key) block[event.target.dataset.key] = event.target.value;
  updatePreview();
});
$("#blocks").addEventListener("change", async (event) => {
  if (!event.target.matches("[data-image]")) return;
  const block = state.blocks[Number(event.target.closest(".block-card").dataset.index)];
  const file = event.target.files[0]; if (!file) return;
  block.preview = await fileData(file); state.blockImages[block.editorId] = block.preview; preview();
});
$("#blocks").addEventListener("click", (event) => {
  const card = event.target.closest(".block-card"); if (!card) return;
  const index = Number(card.dataset.index); const action = event.target.dataset.action;
  if (action === "remove") state.blocks.splice(index, 1);
  if (action === "up" && index) [state.blocks[index - 1], state.blocks[index]] = [state.blocks[index], state.blocks[index - 1]];
  if (action === "down" && index < state.blocks.length - 1) [state.blocks[index + 1], state.blocks[index]] = [state.blocks[index], state.blocks[index + 1]];
  if (event.target.hasAttribute("data-add-item")) state.blocks[index].items.push({ title: "", text: "" });
  if (event.target.dataset.removeItem !== undefined) state.blocks[index].items.splice(Number(event.target.dataset.removeItem), 1);
  renderBlocks(); preview();
});

function renderLists() {
  $("#faqs").innerHTML = state.faqs.map((f, i) => `<div class="list-row" data-list="faqs" data-index="${i}"><input data-key="question" value="${esc(f.question)}" placeholder="환자가 묻는 말"><textarea data-key="answer" placeholder="쉬운 답변">${esc(f.answer)}</textarea><button>×</button></div>`).join("");
  $("#sources").innerHTML = state.sources.map((s, i) => `<div class="list-row" data-list="sources" data-index="${i}"><input data-key="title" value="${esc(s.title)}" placeholder="자료 이름"><input data-key="url" value="${esc(s.url)}" placeholder="https://"><button>×</button></div>`).join("");
}
["faqs","sources"].forEach((name) => {
  $(`#${name}`).addEventListener("input", (e) => { const row=e.target.closest(".list-row"); state[name][Number(row.dataset.index)][e.target.dataset.key]=e.target.value; updatePreview(); });
  $(`#${name}`).addEventListener("click", (e) => { if(e.target.tagName!=="BUTTON")return; state[name].splice(Number(e.target.closest(".list-row").dataset.index),1);renderLists();preview(); });
});
$("#addFaq").onclick=()=>{state.faqs.push({question:"",answer:""});renderLists();};
$("#addSource").onclick=()=>{state.sources.push({title:"",url:""});renderLists();};
$("#blockPicker").onchange=(e)=>{if(e.target.value)addBlock(e.target.value);e.target.value="";};

function applyFormat(type) {
  const area=$("#body"), start=area.selectionStart, end=area.selectionEnd, selected=area.value.slice(start,end);
  const values={h2:`## ${selected||"소제목"}`,bold:`**${selected||"강조할 문장"}**`,list:`- ${selected||"첫 번째 항목"}\n- 두 번째 항목`,quote:`> ${selected||"기억할 문장"}`,link:`[${selected||"링크 이름"}](https://)`};
  area.setRangeText(values[type],start,end,"end");area.focus();preview();
}
$(".toolbar").onclick=(e)=>{const button=e.target.closest("button");if(button)applyFormat(button.dataset.format);};

async function fileData(file) { return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);}); }
$("#coverFile").onchange=async(e)=>{const file=e.target.files[0];if(file){state.coverData=await fileData(file);preview();}};
$("#title").addEventListener("blur",()=>{if(!$("#slug").value)$("#slug").value=slugify($("#title").value)||`column-${today.replaceAll("-","")}`;});

function draft(includeImages=true) {
  return { content:{title:$("#title").value.trim(),slug:$("#slug").value.trim(),status:"draft",editorName:$("#editorName").value,category:$("#category").value,summary:$("#summary").value.trim(),lead:$("#summary").value.trim(),description:$("#summary").value.trim(),tags:$("#tags").value.split(",").map(v=>v.trim()).filter(Boolean),coverImage:state.coverPath,coverAlt:$("#coverAlt").value.trim(),publishedAt:$("#publishedAt").value,modifiedAt:today,body:$("#body").value.trim(),designBlocks:state.blocks.map(({preview,...b})=>b),faqs:state.faqs,sources:state.sources},...(includeImages?{coverData:state.coverData,blockImages:state.blockImages}:{})};}
async function action(kind) {
  const button=$(`#${kind}Button`); if(kind==="publish"&&!confirm("원고 검토를 마친 이 글을 홈페이지에 공개할까요?"))return;
  $$(".topbar button").forEach(b=>b.disabled=true);
  try{const response=await fetch(`/api/${kind}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(draft())});const data=await response.json();if(!response.ok)throw new Error(data.message);state.coverPath=data.content?.coverImage||state.coverPath;state.coverData="";toast(data.message);if(data.localUrl)window.open(data.localUrl,"_blank");}
  catch(error){toast(error.message,true);}finally{$$(".topbar button").forEach(b=>b.disabled=false);}
}
$("#saveButton").onclick=()=>action("save");$("#previewButton").onclick=()=>action("preview");$("#publishButton").onclick=()=>action("publish");
$$("[data-width]").forEach(button=>button.onclick=()=>{$$("[data-width]").forEach(b=>b.classList.remove("is-active"));button.classList.add("is-active");$("#preview").classList.toggle("is-mobile",button.dataset.width==="mobile");});
$$("textarea,input,select").forEach(el=>el.addEventListener("input",updatePreview));

try{const saved=JSON.parse(localStorage.getItem("dear-column-editor"));if(saved?.content){const c=saved.content;["title","slug","summary","body","coverAlt","publishedAt"].forEach(k=>{if(c[k]&&$(`#${k}`))$(`#${k}`).value=c[k]});$("#category").value=c.category||"Calm";$("#editorName").value=c.editorName||"김민지";$("#tags").value=(c.tags||[]).join(", ");state.blocks=c.designBlocks||[];state.faqs=c.faqs||[];state.sources=c.sources||[];state.coverPath=c.coverImage||"";}}catch{}
if(!state.blocks.length){addBlock("section");addBlock("checklist");addBlock("cards");addBlock("keypoint");}
renderBlocks();renderLists();preview();
