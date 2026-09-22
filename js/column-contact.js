// 칼럼 상단 원장 카드를 넣고, 칼럼 하단의 오시는 길 도크·함께 읽을 글 자리를 맞춘다. 모양은 css/column-contact.css.
// 도크(주소·전화·예약)는 검색엔진이 읽도록 배포 때 HTML에 새긴다(tools/refresh-column-cards.mjs). 이 스크립트는 그리지 않는다.
// 원장님 문장은 director.html에 있는 확정 문구다. 진료시간은 CLAUDE.md의 확정값을 줄이지 않고 옮긴다.
(function initializeColumnContact() {
  "use strict";

  if (document.querySelector(".dc-hello")) return;
  const article = document.querySelector("main article, main");
  if (!article) return;
  // 첫 화면부터 상담 버튼이 있는 상세페이지형 칼럼(청담 공진단)은 data-dc-hello="off"로 원장 카드를 넣지 않는다.
  const skipHello = Boolean(document.querySelector('[data-dc-hello="off"]'));

  const TALK = "https://talk.naver.com/ct/w5zr5u";
  const icon = {
    talk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 1 3.3 6.4L4 20l1.2-3.6A7.9 7.9 0 0 1 4 12z"/><path d="M9 11.5h.01M12 11.5h.01M15 11.5h.01"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 4.5h-3a1 1 0 0 0-1 1c0 8.3 6.7 15 15 15a1 1 0 0 0 1-1v-3a1 1 0 0 0-.8-1l-3.3-.7a1 1 0 0 0-1 .3l-1.2 1.4a12.4 12.4 0 0 1-5.7-5.7l1.4-1.2a1 1 0 0 0 .3-1L9.5 5.3a1 1 0 0 0-1-.8z"/></svg>',
  };

  // ---------- 상단 원장 카드 ----------
  const hello = document.createElement("aside");
  hello.className = "dc-hello";
  hello.setAttribute("aria-label", "김민지 대표원장 상담 안내");
  hello.innerHTML = `
    <a class="dc-hello__face" href="../director.html" aria-label="김민지 대표원장 소개"><img src="../assets/images/director-face.png?v=20260922-2" alt="" width="64" height="64" loading="lazy"></a>
    <div class="dc-hello__body">
      <p class="dc-hello__who"><a href="../director.html">김민지 대표원장</a><span>한의사 · 직접 집필</span></p>
      <p class="dc-hello__quote">저에게 만큼은 조금 편하게 이야기하고, 조금 덜 걱정하실 수 있었으면 좋겠습니다.</p>
      <p class="dc-hello__ask">이 글에 앞서 상담이 필요하신 분들은 네이버 톡톡이나 전화를 주세요 🙂</p>
    </div>
    <div class="dc-hello__side">
      <div class="dc-hello__actions">
        <a class="dc-chip dc-chip--naver" href="${TALK}" target="_blank" rel="noopener" data-track-action="naver_talk" data-track-location="column_top">${icon.talk}톡톡 상담</a>
        <a class="dc-chip dc-chip--phone" href="tel:02-3486-1777" data-track-action="phone" data-track-location="column_top">${icon.phone}02-3486-1777</a>
      </div>
      <ul class="dc-hours" aria-label="진료시간"><li><b>월·화·수·금</b>10:00–20:00</li><li><b>점심</b>13:00–14:00</li><li><b>목</b>14:00–20:00</li><li><b>토</b>10:00–15:00</li><li><b>일</b>정기휴무</li></ul>
    </div>`;

  // 대표 그림이 커서 그 아래에 두면 한참 내려야 보인다. 제목 영역 바로 아래, 그림 위에 둔다.
  // 집필 안내 줄이 제목 영역 바로 뒤에 있으면 그 아래, 글 끝에 있는 칼럼이면 제목 영역 아래에 둔다.
  const h1 = article.querySelector("h1") || document.querySelector("h1");
  const titleBlock = h1 && (h1.closest("header, section, [class*='hero'], [class*='header']") || h1);
  const note = article.querySelector(".column-editorial-note");
  const firstHeading = article.querySelector("h2");
  const noteNearTitle = note && (!firstHeading || (note.compareDocumentPosition(firstHeading) & Node.DOCUMENT_POSITION_FOLLOWING));
  const anchor = (noteNearTitle && note) || titleBlock || article.querySelector("header");
  if (anchor && !skipHello) anchor.insertAdjacentElement("afterend", hello);

  // PC에서는 아래 "목차 + 본문" 줄과 왼쪽·오른쪽 끝을 맞춘다. 넓으면 사진·글·버튼을 한 줄로 펼친다.
  const toc = article.querySelector(".column-toc, [class$='toc'], [class*='toc ']");
  const layout = toc && toc.parentElement;
  const align = () => {
    hello.style.removeProperty("width");
    hello.style.removeProperty("margin-left");
    hello.style.removeProperty("margin-right");
    const tocVisible = toc && toc.getBoundingClientRect().width > 0 && getComputedStyle(toc).display !== "none";
    if (tocVisible && layout && hello.parentElement) {
      // 틀(layout)이 실제 글보다 넓은 칼럼이 있어, 목차 왼쪽 끝과 그 옆 본문 칸의 오른쪽 끝을 직접 잰다.
      // 목차 옆에 본문 칸이 나란히 있을 때만 맞춘다(목차가 화면에 떠 있는 칼럼은 가운데 정렬로 둔다).
      const tb = toc.getBoundingClientRect();
      const beside = [...layout.children]
        .filter((child) => child !== toc)
        .map((child) => child.getBoundingClientRect())
        .filter((box) => box.width > 0 && box.left >= tb.right - 1 && box.top < tb.bottom && box.bottom > tb.top);
      const left = tb.left;
      const right = beside.length ? Math.max(...beside.map((box) => box.right)) : 0;
      if (beside.length && right - left >= 640 && left >= 8 && right <= document.documentElement.clientWidth - 8) {
        // 카드 여백은 CSS에서 !important로 고정돼 있어 여기서도 important로 준다.
        // 부모 틀이 가운데 정렬(grid·flex)이면 왼쪽 여백을 준 만큼의 절반만 움직인다.
        // 여백 0과 100일 때 자리를 재서 움직임 비율을 구한 뒤 정확히 맞춘다.
        hello.style.width = `${Math.round(right - left)}px`;
        hello.style.setProperty("margin-right", "0px", "important");
        hello.style.setProperty("margin-left", "0px", "important");
        const at0 = hello.getBoundingClientRect().left;
        hello.style.setProperty("margin-left", "100px", "important");
        const slope = (hello.getBoundingClientRect().left - at0) / 100 || 1;
        hello.style.setProperty("margin-left", `${Math.round((left - at0) / slope)}px`, "important");
      }
    }
    hello.classList.toggle("dc-hello--wide", hello.getBoundingClientRect().width >= 860);
  };
  if (hello.isConnected) {
    align();
    if ("ResizeObserver" in window) new ResizeObserver(align).observe(document.documentElement);
    else window.addEventListener("resize", align);
  }

  // ---------- 하단 도크 ----------
  // 도크와 함께 읽을 글은 HTML에 새겨져 있다. 칼럼 상담 영역에 지도가 남아 있으면 도크 지도는 뺀다.
  const dock = document.querySelector(".dc-dock");
  const related = document.querySelector(".dear-reads--related");
  const otherMap = [...document.querySelectorAll("iframe[src*='maps']")].some((frame) => !frame.closest(".dc-dock"));
  if (dock && otherMap) {
    dock.querySelector(".dc-dock__map")?.remove();
    dock.classList.add("dc-dock--no-map");
  }
  if (dock && related && (dock.compareDocumentPosition(related) & Node.DOCUMENT_POSITION_PRECEDING)) {
    dock.insertAdjacentElement("afterend", related);
  }
})();
