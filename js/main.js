// Google Analytics 4 공통 설정
// 모든 공개 페이지가 이 파일을 불러오므로 새 칼럼에도 같은 측정 설정이 적용된다.
(function initializeDearAnalytics() {
  "use strict";

  const measurementId = "G-E5M36LQ66P";

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };

  window.gtag("js", new Date());
  window.gtag("config", measurementId);

  const googleTag = document.createElement("script");
  googleTag.async = true;
  googleTag.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(googleTag);

  if (window.__dearCtaTrackingInitialized) return;
  window.__dearCtaTrackingInitialized = true;

  const destinations = [
    { match: "tel:", action: "phone" },
    { match: "m.booking.naver.com", action: "naver_booking" },
    { match: "talk.naver.com", action: "naver_talk" },
    { match: "blog.naver.com", action: "naver_blog" },
    { match: "dearmydiet.tistory.com", action: "diet_journal" },
    { match: "instagram.com", action: "instagram" },
    { match: "be-deer.html", action: "be_deer" },
  ];

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link) return;

    const href = link.getAttribute("href") || "";
    const matchedDestination = destinations.find(({ match }) => href.includes(match));
    const action = link.dataset.trackAction || matchedDestination?.action;
    if (!action) return;

    const payload = {
      cta_action: action,
      cta_label: (link.getAttribute("aria-label") || link.textContent || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 80),
      cta_location:
        link.dataset.trackLocation ||
        (link.closest(".quickmenu")
          ? "quickmenu"
          : link.closest("section")
            ? link.closest("section").className.split(" ")[0]
            : "navigation"),
      page_path: window.location.pathname,
      destination: href,
    };

    window.gtag("event", "dear_cta_click", payload);
  });
})();

// BE DEER는 상단 독립 메뉴가 아니라 DEAR SERVICES 안에서 안내한다.
// 과거 수동 제작 칼럼에 남은 메뉴 항목도 공통 스크립트에서 정리한다.
(function removeLegacyBeDeerNavigationItem() {
  "use strict";

  document.querySelectorAll('.nav__menu .nav__link[href*="be-deer.html"]').forEach((link) => {
    link.closest("li")?.remove();
  });
})();

// 전 페이지 공통 외국인 예약 퀵메뉴.
// 각 HTML에 중복된 퀵메뉴가 있어도 이곳에서 링크·아이콘·언어를 한 번에 맞춘다.
(function initializeInternationalAppointmentQuickmenu() {
  "use strict";

  const quickmenu = document.querySelector(".quickmenu");
  if (!quickmenu) return;

  const pageLanguage = document.documentElement.lang || "ko";
  const language = pageLanguage === "ja" ? "ja" : pageLanguage.startsWith("zh") ? "zh" : pageLanguage === "en" ? "en" : "ko";
  const copy = {
    ko: { label: "Intl. Booking", aria: "International appointment schedule and phone booking", query: "en" },
    en: { label: "International", aria: "International patient schedule and phone appointment", query: "en" },
    ja: { label: "海外予約", aria: "海外患者さまの診療日程と電話予約", query: "ja" },
    zh: { label: "国际预约", aria: "国际患者门诊时间和电话预约", query: "zh" },
  }[language];
  const icon = '<svg class="quickmenu__international-icon" width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true"><rect x="4.5" y="6.5" width="21" height="19" rx="4" stroke="currentColor" stroke-width="1.55"/><path d="M4.75 11.5h20.5M10 4.5v4M20 4.5v4" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/><circle cx="15" cy="18" r="4.25" fill="currentColor"/><path d="M15 15.6v2.65l1.85 1.15" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  let link = quickmenu.querySelector(".quickmenu__btn--international");
  if (!link) {
    link = document.createElement("a");
    link.className = "quickmenu__btn quickmenu__btn--international";
    const reference = quickmenu.querySelector('a[href*="blog.naver.com"]') || quickmenu.querySelector(".quickmenu__btn--top");
    quickmenu.insertBefore(link, reference || null);
  }

  link.href = `/international-appointment.html?lang=${copy.query}`;
  link.setAttribute("aria-label", copy.aria);
  link.dataset.trackAction = "international_appointment";
  link.dataset.trackLocation = "quickmenu";
  link.innerHTML = `${icon}<span class="quickmenu__label">${copy.label}</span>`;
})();

// 전 페이지 공통 디어 다이어트 저널 CTA.
// 퀵메뉴와 푸터 채널 영역에 같은 공식 콘텐츠 링크를 언어별로 추가한다.
(function initializeDietJournalLinks() {
  "use strict";

  const pageLanguage = document.documentElement.lang || "ko";
  const language = pageLanguage === "ja" ? "ja" : pageLanguage.startsWith("zh") ? "zh" : pageLanguage === "en" ? "en" : "ko";
  const copy = {
    ko: { label: "다이어트 저널", aria: "디어한의원 다이어트 저널" },
    en: { label: "Diet Journal", aria: "DEAR Diet Journal" },
    ja: { label: "ダイエット誌", aria: "ディア韓医院ダイエットジャーナル" },
    zh: { label: "减重专刊", aria: "DEAR韩医院减重专刊" },
  }[language];
  const href = "https://dearmydiet.tistory.com/";
  const logo = '<svg class="dear-diet-journal__logo" viewBox="0 0 100 100" aria-hidden="true"><circle cx="15" cy="16" r="13"/><circle cx="50" cy="16" r="13"/><circle cx="85" cy="16" r="13"/><circle cx="50" cy="50" r="13"/><circle cx="50" cy="84" r="13"/></svg>';

  const quickmenu = document.querySelector(".quickmenu");
  if (quickmenu && !quickmenu.querySelector(".quickmenu__btn--diet-journal")) {
    const link = document.createElement("a");
    link.className = "quickmenu__btn quickmenu__btn--diet-journal";
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener";
    link.setAttribute("aria-label", copy.aria);
    link.dataset.trackAction = "diet_journal";
    link.dataset.trackLocation = "quickmenu";
    link.innerHTML = `${logo}<span class="quickmenu__label">${copy.label}</span>`;
    const reference = quickmenu.querySelector(".quickmenu__btn--top");
    quickmenu.insertBefore(link, reference || null);
  }

  const footerChannels = document.querySelector(".footer__sns");
  if (footerChannels && !footerChannels.querySelector(".footer__diet-journal")) {
    const link = document.createElement("a");
    link.className = "footer__diet-journal";
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener";
    link.setAttribute("aria-label", copy.label);
    link.title = copy.aria;
    link.dataset.trackAction = "diet_journal";
    link.dataset.trackLocation = "footer";
    link.innerHTML = logo;
    footerChannels.appendChild(link);
  }
})();

// 스크롤 시 네비게이션 배경 전환 (히어로를 벗어나면 밝은 배경 + 어두운 텍스트)
// 히어로가 없는 서브 페이지에서는 처음부터 밝은 배경 상태로 고정한다.
const nav = document.querySelector(".nav");
const heroEl = document.querySelector(".hero");

if (heroEl) {
  function updateNavOnScroll() {
    const threshold = heroEl.offsetHeight - 80;
    nav.classList.toggle("is-scrolled", window.scrollY > threshold);
  }

  window.addEventListener("scroll", updateNavOnScroll);
  updateNavOnScroll();
} else {
  nav.classList.add("is-scrolled");
}

// 모바일 네비게이션 토글
const navToggle = document.getElementById("navToggle");
const navMenu = document.getElementById("navMenu");

// 전 페이지 공통 언어 선택기.
// 번역판이 있는 공통 페이지는 같은 페이지로, 번역판이 없는 페이지는 각 언어 홈으로 이동한다.
if (nav && navMenu && !document.body.classList.contains("error-page")) {
  const pageLanguage = document.documentElement.lang || "ko";
  const isLocalizedPage = ["en", "ja", "zh-CN"].includes(pageLanguage);
  const currentPage = window.location.pathname.endsWith("/")
    ? "index.html"
    : window.location.pathname.split("/").pop() || "index.html";
  const languageLabels = {
    ko: "KO",
    en: "EN",
    ja: "日本語",
    "zh-CN": "中文",
  };
  const localizedPages = new Set([
    "index.html", "about.html", "director.html", "career.html",
    "philosophy.html", "care.html", "services.html", "columns.html",
  ]);
  const hasLocalizedEquivalent = localizedPages.has(currentPage);
  const pagePath = currentPage === "index.html" ? "" : currentPage;
  const languageLinks = hasLocalizedEquivalent
    ? {
        ko: `/${pagePath}`,
        en: `/en/${pagePath}`,
        ja: `/ja/${pagePath}`,
        "zh-CN": `/zh-cn/${pagePath}`,
      }
    : {
        ko: isLocalizedPage ? "/" : window.location.pathname,
        en: "/en/",
        ja: "/ja/",
        "zh-CN": "/zh-cn/",
      };
  const languageItem = document.createElement("li");
  languageItem.className = "nav__language";
  languageItem.setAttribute("aria-label", "Language");
  languageItem.innerHTML = Object.entries(languageLinks)
    .map(([language, href]) => {
      const current = language === pageLanguage ? ' aria-current="true"' : "";
      return `<a href="${href}" lang="${language}"${current}>${languageLabels[language]}</a>`;
    })
    .join('<span aria-hidden="true">·</span>');
  navMenu.appendChild(languageItem);
}

// 한국어 상단 메뉴: 모든 주요 항목에 같은 규칙의 메가 메뉴를 제공한다.
const navSubmenuDefinitions = {
  "About DEAR": {
    label: "디어를 소개합니다",
    image: "/assets/images/director.jpg",
    imagePosition: "72% 28%",
    links: [
      ["DEAR 소개", "/about.html", "디어한의원의 공간과 기준"],
      ["진료 철학", "/philosophy.html", "함께 묻고 함께 답하는 진료"],
      ["김민지 대표원장", "/director.html", "의료진과 진료 방향"],
      ["경력과 이력", "/career.html", "학력·경력·연구 활동"],
    ],
  },
  Columns: {
    label: "디어 건강 칼럼",
    image: "/assets/images/columns/autumn-dry-skin-exosome-booster/cover.png",
    imagePosition: "50% 42%",
    links: [
      ["전체 칼럼", "/columns.html", "모든 임상 칼럼"],
      ["Focus", "/columns.html?category=Focus", "인지·집중"],
      ["Calm", "/columns.html?category=Calm", "긴장·수면"],
      ["Restore", "/columns.html?category=Restore", "피로·회복"],
      ["Relief", "/columns.html?category=Relief", "통증·불편"],
      ["Shape", "/columns.html?category=Shape", "체중·리듬"],
    ],
  },
  Care: {
    label: "현재의 상태부터 살핍니다",
    image: "/assets/images/care-main-space.jpg",
    imagePosition: "50% 48%",
    links: [
      ["Focus", "/care.html?care=Focus", "인지 기능과 집중 저하"],
      ["Calm", "/care.html?care=Calm", "긴장 반응과 수면 불균형"],
      ["Restore", "/care.html?care=Restore", "피로와 회복력 저하"],
      ["Relief", "/care.html?care=Relief", "통증과 신체 불편"],
      ["Shape", "/care.html?care=Shape", "체중과 생활 리듬"],
    ],
  },
  "DEAR SERVICES": {
    label: "디어의 진료와 처방",
    image: "/assets/images/services-01-be-deer.jpg",
    imagePosition: "50% 46%",
    links: [
      ["BE DEER", "/be-deer.html", "체중과 생활 리듬"],
      ["DEAR GONGJINDAN", "/services.html#dear-gongjindan", "기력과 회복"],
      ["HERBAL DECOCTION", "/services.html#herbal-decoction", "체질 맞춤 한약"],
      ["DEER BALANCE", "/services.html#deer-balance", "수면과 마음"],
      ["서비스 전체 보기", "/services.html", "DEAR SERVICES"],
    ],
  },
  Contact: {
    label: "디어한의원과 연결됩니다",
    image: "/assets/images/treatment-room.jpg",
    imagePosition: "50% 52%",
    links: [
      ["전화 문의", "tel:02-3486-1777", "02-3486-1777"],
      ["네이버 예약", "https://m.booking.naver.com/booking/13/bizes/729883", "진료 예약"],
      ["네이버 톡톡", "https://talk.naver.com/ct/w5zr5u", "상담 문의"],
      ["국제진료 예약", "/international-appointment.html", "International Booking"],
      ["오시는 길", "/index.html#info", "서울 서초구 사임당로 143"],
    ],
  },
};

const navSubmenuItems = [];

if (nav && navMenu && (document.documentElement.lang || "ko").toLowerCase().startsWith("ko")) {
  [...navMenu.children].forEach((item) => {
    const link = item.querySelector(":scope > .nav__link");
    if (!link) return;
    const definition = navSubmenuDefinitions[link.textContent.trim()];
    if (!definition) return;

    const toggle = document.createElement("button");
    const submenu = document.createElement("div");
    const submenuId = `nav-submenu-${navSubmenuItems.length + 1}`;
    item.classList.add("nav-has-submenu");
    toggle.className = "nav-submenu-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", submenuId);
    toggle.setAttribute("aria-label", `${link.textContent.trim()} 하위 메뉴 열기`);
    toggle.innerHTML = '<span aria-hidden="true"></span>';
    submenu.className = "nav-submenu";
    submenu.id = submenuId;
    submenu.innerHTML = `<div class="nav-submenu__inner"><p class="nav-submenu__visual" style="--nav-submenu-image:url('${definition.image}');--nav-submenu-position:${definition.imagePosition}"><span>${definition.label}</span></p><div class="nav-submenu__links">${definition.links
      .map(([title, href, description]) => `<a href="${href}"><strong>${title}</strong><span>${description}</span><b aria-hidden="true">→</b></a>`)
      .join("")}</div></div>`;
    item.append(toggle, submenu);
    navSubmenuItems.push({ item, toggle, submenu });
  });
}

function closeAllNavSubmenus(exceptItem = null) {
  navSubmenuItems.forEach(({ item, toggle }) => {
    if (item === exceptItem) return;
    item.classList.remove("is-submenu-open");
    toggle.setAttribute("aria-expanded", "false");
  });
}

navSubmenuItems.forEach(({ item, toggle, submenu }) => {
  toggle.addEventListener("click", () => {
    const willOpen = !item.classList.contains("is-submenu-open");
    closeAllNavSubmenus(item);
    item.classList.toggle("is-submenu-open", willOpen);
    toggle.setAttribute("aria-expanded", String(willOpen));
  });
  submenu.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMobileMenuState(false);
  });
});

function setMobileMenuState(isOpen) {
  navMenu?.classList.toggle("is-open", isOpen);
  navToggle?.classList.toggle("is-open", isOpen);
  navToggle?.setAttribute("aria-expanded", String(isOpen));
  navToggle?.setAttribute("aria-label", isOpen ? "메뉴 닫기" : "메뉴 열기");
  document.body.classList.toggle("nav-open", isOpen);
  if (!isOpen) closeAllNavSubmenus();
}

navToggle?.addEventListener("click", () => {
  setMobileMenuState(!navMenu.classList.contains("is-open"));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAllNavSubmenus();
    if (navMenu?.classList.contains("is-open")) {
      setMobileMenuState(false);
      navToggle?.focus();
    }
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 768 && navMenu?.classList.contains("is-open")) {
    setMobileMenuState(false);
  }
});

// 준비중인 링크 처리 (nav 메뉴 + 푸터 법적 링크 공통)
document.querySelectorAll('[data-ready="false"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    alert("준비중입니다. 곧 만나보실 수 있어요.");
  });
});

// 메뉴 클릭 시 모바일 메뉴 닫기
document.querySelectorAll(".nav__link").forEach((link) => {
  link.addEventListener("click", () => {
    setMobileMenuState(false);
  });
});

// 공진단 사진: 스크롤 진입 시 페이드업
// 기본 상태는 항상 노출이며, IntersectionObserver를 쓸 수 있고 모션 감소 설정이 아닐 때만
// reveal-pending을 붙여 애니메이션을 준비한다. (스크립트 실패 시에도 사진이 사라지지 않도록)
const revealTargets = document.querySelectorAll(".js-reveal");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!prefersReducedMotion && "IntersectionObserver" in window && revealTargets.length) {
  revealTargets.forEach((el) => el.classList.add("reveal-pending"));

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  revealTargets.forEach((el) => revealObserver.observe(el));
}

// 공진단 사진 프레임의 자동 슬라이드쇼는 순수 CSS 키프레임(style.css의 gj-slideshow-2/3)으로 동작한다.
// JS 실행 여부·타이밍에 영향받지 않도록 의도적으로 JS 의존 없이 구현했다.

// 메인 안내 팝업: 각 안내를 닫거나 오늘 하루 동안 숨길 수 있다.
const noticePopups = document.getElementById("noticePopups");

if (noticePopups) {
  const weatherPreviewActive = new URLSearchParams(window.location.search).has("weather-preview");
  const popupCards = [...noticePopups.querySelectorAll("[data-popup-id]")];
  const todayKey = new Date().toLocaleDateString("sv-SE");

  const refreshPopupVisibility = () => {
    const visibleCards = popupCards.filter((card) => !card.hidden);
    const shouldShow = visibleCards.length > 0;
    noticePopups.hidden = !shouldShow;
  };

  popupCards.forEach((card) => {
    const popupId = card.dataset.popupId;
    const storageKey = `dear-popup-${popupId}`;
    card.hidden = localStorage.getItem(storageKey) === todayKey;

    card.querySelector("[data-popup-close]")?.addEventListener("click", () => {
      if (card.querySelector("[data-popup-today]")?.checked) {
        localStorage.setItem(storageKey, todayKey);
      }
      card.hidden = true;
      refreshPopupVisibility();
    });
  });

  if (weatherPreviewActive) {
    noticePopups.hidden = true;
  } else {
    refreshPopupVisibility();
  }
}

// 메인 DEAR HEALTH SYSTEM: 진료 체계의 세 축을 탭으로 전환한다.
const healthSystemTabs = [...document.querySelectorAll("[data-health-tab]")];
const healthSystemPanels = [...document.querySelectorAll("[data-health-panel]")];

if (healthSystemTabs.length === 3 && healthSystemPanels.length === 3) {
  const activateHealthSystem = (selectedKey) => {
    healthSystemTabs.forEach((tab) => {
      const isActive = tab.dataset.healthTab === selectedKey;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    healthSystemPanels.forEach((panel) => {
      panel.hidden = panel.dataset.healthPanel !== selectedKey;
    });
  };

  healthSystemTabs.forEach((tab) => {
    tab.addEventListener("click", () => activateHealthSystem(tab.dataset.healthTab));
  });
}

// 진료 철학 페이지: 화면 중앙에 가장 가까운 ME / YOU / US 챕터에 맞춰 sticky 사진을 교체한다.
const philosophyChapters = [...document.querySelectorAll("[data-philosophy-chapter]")];
const philosophyImages = [...document.querySelectorAll(".philosophy-story__image")];
const philosophyDesktop = window.matchMedia("(min-width: 769px)");

if (philosophyChapters.length && philosophyImages.length) {
  let philosophyFramePending = false;

  const updatePhilosophyStory = () => {
    philosophyFramePending = false;
    if (!philosophyDesktop.matches) return;

    const viewportCenter = window.innerHeight * 0.5;
    let activeIndex = 0;
    let closestDistance = Infinity;

    philosophyChapters.forEach((chapter, index) => {
      const rect = chapter.getBoundingClientRect();
      const chapterCenter = rect.top + rect.height / 2;
      const distance = Math.abs(chapterCenter - viewportCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        activeIndex = index;
      }
    });

    philosophyChapters.forEach((chapter, index) => {
      chapter.classList.toggle("is-active", index === activeIndex);
    });
    philosophyImages.forEach((image, index) => {
      image.classList.toggle("is-active", index === activeIndex);
    });
  };

  const requestPhilosophyUpdate = () => {
    if (philosophyFramePending) return;
    philosophyFramePending = true;
    window.requestAnimationFrame(updatePhilosophyStory);
  };

  updatePhilosophyStory();
  window.addEventListener("scroll", requestPhilosophyUpdate, { passive: true });
  window.addEventListener("resize", requestPhilosophyUpdate);
  philosophyDesktop.addEventListener("change", requestPhilosophyUpdate);
}

// Care 페이지: 고정 이미지 옆의 다섯 상태 설명만 전환한다.
const careTabs = [...document.querySelectorAll('[role="tab"][data-care-index]')];
const carePanels = [...document.querySelectorAll("[data-care-panel]")];

if (careTabs.length === 5 && carePanels.length === 5) {
  let activeCareIndex = 0;
  let careTransitionToken = 0;
  const requestedCare = new URLSearchParams(window.location.search).get("care");
  const requestedCareIndex = ["Focus", "Calm", "Restore", "Relief", "Shape"].indexOf(requestedCare);

  if (requestedCareIndex > 0) {
    activeCareIndex = requestedCareIndex;
    careTabs.forEach((tab, index) => {
      const isActive = index === requestedCareIndex;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });
    carePanels.forEach((panel, index) => {
      panel.hidden = index !== requestedCareIndex;
      panel.classList.toggle("is-active", index === requestedCareIndex);
    });
  }

  const activateCare = (nextIndex, moveFocus = false) => {
    if (nextIndex < 0 || nextIndex >= careTabs.length) return;
    const token = ++careTransitionToken;
    const currentPanel = carePanels[activeCareIndex];
    const nextPanel = carePanels[nextIndex];
    const delay = prefersReducedMotion ? 0 : 180;

    careTabs.forEach((tab, index) => {
      const isActive = index === nextIndex;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });

    if (moveFocus) careTabs[nextIndex].focus();

    if (nextIndex === activeCareIndex) {
      if (window.innerWidth <= 768) {
        careTabs[nextIndex].scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest", inline: "center" });
      }
      return;
    }

    currentPanel.classList.add("is-leaving");

    window.setTimeout(() => {
      if (token !== careTransitionToken) return;
      carePanels.forEach((panel, index) => {
        panel.hidden = index !== nextIndex;
        panel.classList.remove("is-active", "is-leaving");
      });
      nextPanel.classList.add("is-entering");
      window.requestAnimationFrame(() => {
        if (token !== careTransitionToken) return;
        nextPanel.classList.remove("is-entering");
        nextPanel.classList.add("is-active");
      });
      activeCareIndex = nextIndex;
    }, delay);

    if (window.innerWidth <= 768) {
      careTabs[nextIndex].scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest", inline: "center" });
    }
  };

  careTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateCare(index));
    tab.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activateCare(index);
        return;
      }
      let nextIndex = index;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % careTabs.length;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + careTabs.length) % careTabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = careTabs.length - 1;
      if (nextIndex !== index) {
        event.preventDefault();
        activateCare(nextIndex, true);
      }
    });
  });
}

// 컬럼 페이지: sticky 목차에서 현재 읽는 구간을 표시한다.
const columnTocLinks = [...document.querySelectorAll('.column-toc a[href^="#"]')];

if (columnTocLinks.length) {
  const columnTocItems = columnTocLinks.map((link) => {
    try {
      return { link, target: document.getElementById(decodeURIComponent(link.hash.slice(1))) };
    } catch {
      return { link, target: null };
    }
  }).filter((item) => item.target);

  if (columnTocItems.length) {
    let columnTocFramePending = false;

    const setActiveColumnToc = (activeLink) => {
      columnTocLinks.forEach((link) => {
        const isActive = link === activeLink;
        link.classList.toggle("is-active", isActive);
        if (isActive) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    };

    const updateColumnToc = () => {
      columnTocFramePending = false;
      const readingLine = Math.max(140, window.innerHeight * 0.28);
      let activeItem = columnTocItems[0];

      columnTocItems.forEach((item) => {
        if (item.target.getBoundingClientRect().top <= readingLine) activeItem = item;
      });

      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        activeItem = columnTocItems[columnTocItems.length - 1];
      }

      setActiveColumnToc(activeItem.link);
    };

    const requestColumnTocUpdate = () => {
      if (columnTocFramePending) return;
      columnTocFramePending = true;
      window.requestAnimationFrame(updateColumnToc);
    };

    columnTocItems.forEach(({ link }) => {
      link.addEventListener("click", () => setActiveColumnToc(link));
    });

    updateColumnToc();
    window.addEventListener("scroll", requestColumnTocUpdate, { passive: true });
    window.addEventListener("resize", requestColumnTocUpdate);
  }
}

// Column reading companion: estimate the article length and count only active,
// visible reading time after the reader begins to scroll.
const columnArticleBody = document.querySelector(".column-article-body");

if (columnArticleBody) {
  const articleRoot = document.querySelector(".column-article__content, .dear-journal__article, article");
  const tocRoot = document.querySelector(".column-toc, .dear-journal__toc, nav[aria-label*='목차'], aside[aria-label*='목차']");
  const forecastHost = document.querySelector(".column-article__header, .dear-journal__hero-grid > div:first-child, .dear-fd__hero-copy, main header");

  if (articleRoot && forecastHost) {
    const readableNodes = [...articleRoot.querySelectorAll("h2, h3, p, li, figcaption")]
      .filter((node) => !node.closest(".column-related, .column-nap, .column-consult, .dear-journal__clinic, footer"));
    const readableCharacters = readableNodes
      .map((node) => node.textContent.replace(/\s+/g, "").length)
      .reduce((total, length) => total + length, 0);
    const estimatedSeconds = Math.max(45, Math.round(readableCharacters / 8.2 / 5) * 5);

    const formatDuration = (seconds) => {
      const minutes = Math.floor(seconds / 60);
      const remainder = seconds % 60;
      if (!minutes) return `${remainder}초`;
      return remainder ? `${minutes}분 ${remainder}초` : `${minutes}분`;
    };

    const forecast = document.createElement("aside");
    forecast.className = "column-reading-forecast";
    forecast.setAttribute("aria-label", "예상 완독 시간");
    forecast.innerHTML = `
      <span class="column-reading-forecast__eye" aria-hidden="true"><i></i></span>
      <span><small>ESTIMATED READING</small><strong>이 글의 예상 완독 시간은 ${formatDuration(estimatedSeconds)}입니다.</strong><em>본문 분량을 일반적인 읽기 흐름으로 계산했어요.</em></span>
    `;
    forecastHost.append(forecast);

    const clockMarkup = `
      <small>YOUR READING TIME</small>
      <strong data-reading-time>00:00</strong>
      <p data-reading-message>스크롤을 내리면<br>독서 시간이 시작됩니다.</p>
      <span>— 디어한의원</span>
    `;

    let desktopClock = null;
    if (tocRoot) {
      desktopClock = document.createElement("div");
      desktopClock.className = "column-reading-clock";
      desktopClock.innerHTML = clockMarkup;
      tocRoot.append(desktopClock);
    }

    const mobileClock = document.createElement("div");
    mobileClock.className = "column-reading-dock";
    mobileClock.setAttribute("aria-label", "현재 독서 시간");
    mobileClock.innerHTML = `<span>READING</span><strong data-reading-time>00:00</strong><p data-reading-message>스크롤하면 시작됩니다</p>`;
    document.body.append(mobileClock);

    const clocks = [desktopClock, mobileClock].filter(Boolean);
    let readingSeconds = 0;
    let readingStarted = false;

    const updateReadingClocks = () => {
      const clockValue = `${String(Math.floor(readingSeconds / 60)).padStart(2, "0")}:${String(readingSeconds % 60).padStart(2, "0")}`;
      const duration = formatDuration(readingSeconds);
      clocks.forEach((clock) => {
        const time = clock.querySelector("[data-reading-time]");
        const message = clock.querySelector("[data-reading-message]");
        if (time) time.textContent = clockValue;
        if (!message) return;
        if (!readingStarted) {
          message.innerHTML = clock === mobileClock ? "스크롤하면 시작됩니다" : "스크롤을 내리면<br>독서 시간이 시작됩니다.";
        } else if (readingSeconds >= estimatedSeconds) {
          message.innerHTML = clock === mobileClock
            ? "한 편을 함께해 주셔서 감사합니다"
            : "한 편을 끝까지 함께해 주셔서<br>감사합니다.";
        } else {
          message.innerHTML = clock === mobileClock
            ? `지금 ${duration} 동안 읽고 계십니다`
            : `지금 ${duration} 동안<br>이 글을 읽고 계십니다. 감사합니다.`;
        }
      });
    };

    const beginReading = () => {
      if (readingStarted || window.scrollY < 80) return;
      readingStarted = true;
      columnArticleBody.classList.add("is-reading");
      updateReadingClocks();
    };

    updateReadingClocks();
    window.addEventListener("scroll", beginReading, { passive: true });
    window.setInterval(() => {
      if (!readingStarted || document.hidden || !document.hasFocus()) return;
      readingSeconds += 1;
      updateReadingClocks();
    }, 1000);
  }
}
