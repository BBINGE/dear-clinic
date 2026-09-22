// 칼럼 상단 원장 카드와 하단 안내 도크를 넣는다. 모양은 css/column-contact.css.
// 상단: 원장님 한마디 + 톡톡·전화 + 진료시간. 하단: 지도·주소·진료시간 + 예약·톡톡·전화·인스타.
// 원장님 문장은 director.html에 있는 확정 문구다. 진료시간은 CLAUDE.md의 확정값을 줄이지 않고 옮긴다.
(function initializeColumnContact() {
  "use strict";

  if (document.querySelector(".dc-hello, .dc-dock")) return;
  const article = document.querySelector("main article, main");
  if (!article) return;

  const BOOKING = "https://m.booking.naver.com/booking/13/bizes/729883";
  const TALK = "https://talk.naver.com/ct/w5zr5u";
  const INSTAGRAM = "https://www.instagram.com/dearhani__/";
  const MAP = "https://map.naver.com/p/entry/place/1989406480";
  const icon = {
    talk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 1 3.3 6.4L4 20l1.2-3.6A7.9 7.9 0 0 1 4 12z"/><path d="M9 11.5h.01M12 11.5h.01M15 11.5h.01"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 4.5h-3a1 1 0 0 0-1 1c0 8.3 6.7 15 15 15a1 1 0 0 0 1-1v-3a1 1 0 0 0-.8-1l-3.3-.7a1 1 0 0 0-1 .3l-1.2 1.4a12.4 12.4 0 0 1-5.7-5.7l1.4-1.2a1 1 0 0 0 .3-1L9.5 5.3a1 1 0 0 0-1-.8z"/></svg>',
    booking: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 9.5h16M8 3.5v3M16 3.5v3M9 14l2 2 4-4"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.8"/><path d="M16.6 7.4h.01"/></svg>',
  };
  const hours = `<ul class="dc-hours" aria-label="진료시간">
      <li><b>월·화·수·금</b>10:00–20:00</li>
      <li><b>점심</b>13:00–14:00</li>
      <li><b>목</b>14:00–20:00</li>
      <li><b>토</b>10:00–15:00</li>
      <li><b>일</b>정기휴무</li>
    </ul>`;
  const external = 'target="_blank" rel="noopener"';

  // ---------- 상단 원장 카드 ----------
  const hello = document.createElement("aside");
  hello.className = "dc-hello";
  hello.setAttribute("aria-label", "김민지 대표원장 상담 안내");
  hello.innerHTML = `
    <a class="dc-hello__face" href="../director.html" aria-label="김민지 대표원장 소개"><img src="../assets/images/director.jpg" alt="" width="46" height="46" loading="lazy"></a>
    <div class="dc-hello__body">
      <p class="dc-hello__who"><a href="../director.html">김민지 대표원장</a><span>직접 집필</span></p>
      <p class="dc-hello__quote">저에게 만큼은 조금 편하게 이야기하고, 조금 덜 걱정하실 수 있었으면 좋겠습니다.</p>
      <p class="dc-hello__ask">이 글에 앞서 상담이 필요하신 분들은 네이버 톡톡이나 전화를 주세요 🙂</p>
      <div class="dc-hello__actions">
        <a class="dc-chip dc-chip--solid" href="${TALK}" ${external} data-track-action="naver_talk" data-track-location="column_top">${icon.talk}톡톡 상담</a>
        <a class="dc-chip" href="tel:02-3486-1777" data-track-action="phone" data-track-location="column_top">${icon.phone}02-3486-1777</a>
      </div>
      ${hours}
    </div>`;
  // 대표 그림이 커서 그 아래에 두면 한참 내려야 보인다. 제목(과 집필 안내) 바로 아래, 그림 위에 둔다.
  const anchor = article.querySelector(".column-editorial-note") || article.querySelector("header");
  if (anchor) anchor.insertAdjacentElement("afterend", hello);

  // ---------- 하단 안내 도크 ----------
  const dock = document.createElement("section");
  dock.className = "dc-dock";
  dock.setAttribute("aria-labelledby", "dc-dock-title");
  dock.innerHTML = `
    <div class="dc-dock__head"><strong id="dc-dock-title">디어한의원 오시는 길</strong><p>DEAR KOREAN MEDICINE CLINIC</p></div>
    <div class="dc-dock__grid">
      <div class="dc-dock__map"><iframe src="https://maps.google.com/maps?q=37.4918829,127.0252346&amp;z=16&amp;output=embed" title="디어한의원 위치 지도 (서울 서초구 사임당로 143)" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
      <div class="dc-dock__side">
        <div class="dc-dock__info">
          <strong>디어한의원</strong>
          <address>서울 서초구 사임당로 143 3층 309호, 310호<br><a href="tel:02-3486-1777" data-track-action="phone" data-track-location="column_dock">02-3486-1777</a> · <a href="${MAP}" ${external} data-track-action="naver_map" data-track-location="column_dock">네이버 지도</a></address>
          ${hours}
        </div>
        <ul class="dc-tiles">
          <li><a class="dc-tile dc-tile--main" href="${BOOKING}" ${external} data-track-action="naver_booking" data-track-location="column_dock"><i>${icon.booking}</i>네이버 예약</a></li>
          <li><a class="dc-tile" href="${TALK}" ${external} data-track-action="naver_talk" data-track-location="column_dock"><i>${icon.talk}</i>톡톡 상담</a></li>
          <li><a class="dc-tile" href="tel:02-3486-1777" data-track-action="phone" data-track-location="column_dock"><i>${icon.phone}</i>전화</a></li>
          <li><a class="dc-tile" href="${INSTAGRAM}" ${external} data-track-action="instagram" data-track-location="column_dock"><i>${icon.instagram}</i>인스타그램</a></li>
        </ul>
      </div>
    </div>`;
  // 칼럼마다 있던 병원 정보 상자(주소·전화·지도)는 이 도크가 대신한다. 칼럼별 상담 문구(column-consult)는 그대로 둔다.
  const oldNap = article.querySelector(".column-nap");
  if (oldNap) oldNap.replaceWith(dock);
  else (article.querySelector(".column-article__content") || article).append(dock);
})();
