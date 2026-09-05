// Public AI guide; the server requires a valid consent receipt before chat.
(function () {
  const PUBLIC_WIDGET_ENABLED = true; // User-approved public release.
  let enabled = PUBLIC_WIDGET_ENABLED || /[?&]dear-ai-test=/.test(window.location.search || '');
  try { enabled = enabled || sessionStorage.getItem('dear-ai-test') === '1'; } catch {}
  if (!enabled) return;
  const load = () => {
    const script = document.createElement('script');
    script.src = '/js/dear-ai-widget.js?v=20260905-5';
    document.head.appendChild(script);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, { once: true });
  else load();
})();

// NAVER Analytics + 네이버 검색광고 전환추적 공통 설정
// 실제 운영 도메인에서만 수집하며 preview와 로컬 확인 데이터는 제외한다.
(function initializeDearNaverTracking() {
  "use strict";

  const analyticsId = "1ac7bf67a05a6c0";
  const advertisingId = "s_3fd3c8db3a1b";
  const advertisingScriptUrl = "https://wcs.naver.net/wcslog.js";
  const analyticsScriptUrl = "https://wcs.pstatic.net/wcslog.js";
  const productionHosts = new Set(["dearhani.com", "www.dearhani.com"]);
  if (!productionHosts.has(window.location.hostname) || window.location.pathname.startsWith("/preview/")) return;
  if (window.__dearNaverTrackingInitialized) return;
  window.__dearNaverTrackingInitialized = true;

  const loadScriptOnce = (src) =>
    new Promise((resolve, reject) => {
      const host = new URL(src).hostname;
      const existingScript = document.querySelector(`script[src*="${host}/wcslog.js"]`);
      if (existingScript) {
        if (window.wcs) {
          resolve();
          return;
        }
        existingScript.addEventListener("load", resolve, { once: true });
        existingScript.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.async = true;
      script.src = src;
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.appendChild(script);
    });

  const selectAccount = (accountId) => {
    window.wcs_add = window.wcs_add || {};
    window.wcs_add.wa = accountId;
  };

  const sendAdvertisingPageView = () => {
    selectAccount(advertisingId);
    window._nasa = window._nasa || {};
    if (window.wcs && typeof window.wcs.inflow === "function") window.wcs.inflow();
    if (typeof window.wcs_do === "function") window.wcs_do();
  };

  const sendAnalyticsPageView = () => {
    selectAccount(analyticsId);
    if (typeof window.wcs_do === "function") window.wcs_do();
  };

  const advertisingReady = loadScriptOnce(advertisingScriptUrl).then(() => {
    sendAdvertisingPageView();
  });

  window.__dearNaverAdvertisingReady = advertisingReady;
  advertisingReady
    .then(() => loadScriptOnce(analyticsScriptUrl))
    .then(sendAnalyticsPageView)
    .catch(() => {
      // 추적 스크립트 차단이 홈페이지 이용을 방해하지 않게 한다.
    });

  const sendAdvertisingConversion = (type) => {
    const transmit = () => {
      if (!window.wcs || typeof window.wcs.trans !== "function") return;
      selectAccount(advertisingId);
      window.wcs.trans({ type });
      selectAccount(analyticsId);
    };

    if (window.wcs && typeof window.wcs.trans === "function") transmit();
    else advertisingReady.then(transmit).catch(() => {});
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link) return;

    const href = link.getAttribute("href") || "";
    if (href.startsWith("tel:")) {
      sendAdvertisingConversion("custom002");
      return;
    }
    if (href.includes("m.booking.naver.com/booking/13/bizes/729883")) {
      sendAdvertisingConversion("custom001");
    }
  });
})();

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

// 브라우저 번역 확장 기능은 <html lang>을 실행 중 바꿀 수 있다.
// 사이트 언어와 링크는 URL 경로를 우선해 판별해야 번역 UI의 개입에도 흔들리지 않는다.
function getDearPageLocale() {
  "use strict";

  const pathname = window.location.pathname.toLowerCase();
  if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
  if (pathname === "/ja" || pathname.startsWith("/ja/")) return "ja";
  if (pathname === "/zh-cn" || pathname.startsWith("/zh-cn/")) return "zh-CN";
  const declaredLanguage = (document.documentElement.getAttribute("lang") || "ko").toLowerCase();
  if (declaredLanguage === "en") return "en";
  if (declaredLanguage === "ja") return "ja";
  if (declaredLanguage.startsWith("zh")) return "zh-CN";
  return "ko";
}

const dearPageLocale = getDearPageLocale();
document.documentElement.classList.add(`dear-locale-${dearPageLocale === "zh-CN" ? "zh-cn" : dearPageLocale}`);

// BE DEER는 상단 독립 메뉴가 아니라 DEAR SERVICES 안에서 안내한다.
// 과거 수동 제작 칼럼에 남은 메뉴 항목도 공통 스크립트에서 정리한다.
(function removeLegacyBeDeerNavigationItem() {
  "use strict";

  document.querySelectorAll('.nav__menu .nav__link[href*="be-deer.html"]').forEach((link) => {
    link.closest("li")?.remove();
  });
})();

// 전 페이지 공통 퀵메뉴.
// 초기 다국어 칼럼처럼 퀵메뉴 마크업이 없는 페이지에도 같은 UI를 먼저 만든다.
(function ensureSharedQuickmenu() {
  "use strict";

  if (document.querySelector(".quickmenu") || document.body.classList.contains("error-page")) return;

  const pageLanguage = dearPageLocale.toLowerCase();
  const language = pageLanguage === "ja" ? "ja" : pageLanguage.startsWith("zh") ? "zh" : pageLanguage === "en" ? "en" : "ko";
  const copy = {
    ko: { nav: "빠른 메뉴", phone: "전화 문의", phoneAria: "전화 문의", booking: "네이버 예약", bookingAria: "네이버 예약", talk: "톡톡 문의", talkAria: "톡톡 문의", blog: "블로그", instagram: "인스타그램", top: "맨 위로", topAria: "맨 위로" },
    en: { nav: "Quick menu", phone: "Call Us", phoneAria: "Call Us", booking: "Naver Reservation", bookingAria: "Naver Reservation", talk: "Naver Talk", talkAria: "Naver Talk", blog: "Blog", instagram: "Instagram", top: "Top", topAria: "Top" },
    ja: { nav: "クイックメニュー", phone: "電話相談", phoneAria: "電話相談", booking: "Naver予約", bookingAria: "Naver予約", talk: "Naver Talk", talkAria: "Naver Talk", blog: "ブログ", instagram: "Instagram", top: "トップ", topAria: "トップ" },
    zh: { nav: "快捷菜单", phone: "电话咨询", phoneAria: "电话咨询", booking: "Naver预约", bookingAria: "Naver预约", talk: "Naver咨询", talkAria: "Naver咨询", blog: "博客", instagram: "Instagram", top: "顶部", topAria: "顶部" },
  }[language];
  const icons = {
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M8.5 4.5h-3a1 1 0 0 0-1 1c0 8.3 6.7 15 15 15a1 1 0 0 0 1-1v-3a1 1 0 0 0-.8-1l-3.3-.7a1 1 0 0 0-1 .3l-1.2 1.4a12.4 12.4 0 0 1-5.7-5.7l1.4-1.2a1 1 0 0 0 .3-1L9.5 5.3a1 1 0 0 0-1-.8z"/></svg>',
    booking: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M4 9.5h16M8 3.5v3M16 3.5v3"/></svg>',
    talk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M4 12a8 8 0 1 1 3.3 6.4L4 20l1.2-3.6A7.9 7.9 0 0 1 4 12z"/></svg>',
    blog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M8.5 8h7M8.5 11.5h7M8.5 15h4.5"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="4"/></svg>',
    top: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M12 19V6M6.5 11.5L12 6l5.5 5.5"/></svg>',
  };
  const quickmenu = document.createElement("nav");
  quickmenu.className = "quickmenu";
  quickmenu.setAttribute("aria-label", copy.nav);
  quickmenu.innerHTML = `
    <a class="quickmenu__btn" href="tel:02-3486-1777" aria-label="${copy.phoneAria}">${icons.phone}<span class="quickmenu__label">${copy.phone}</span></a>
    <a class="quickmenu__btn" href="https://m.booking.naver.com/booking/13/bizes/729883" target="_blank" rel="noopener" aria-label="${copy.bookingAria}">${icons.booking}<span class="quickmenu__label">${copy.booking}</span></a>
    <a class="quickmenu__btn" href="https://talk.naver.com/ct/w5zr5u" target="_blank" rel="noopener" aria-label="${copy.talkAria}">${icons.talk}<span class="quickmenu__label">${copy.talk}</span></a>
    <a class="quickmenu__btn" href="https://blog.naver.com/thisisdear" target="_blank" rel="noopener" aria-label="${copy.blog}">${icons.blog}<span class="quickmenu__label">${copy.blog}</span></a>
    <a class="quickmenu__btn" href="https://www.instagram.com/dearhani__/" target="_blank" rel="noopener" aria-label="${copy.instagram}">${icons.instagram}<span class="quickmenu__label">${copy.instagram}</span></a>
    <a class="quickmenu__btn quickmenu__btn--top" href="#top" aria-label="${copy.topAria}">${icons.top}<span class="quickmenu__label">${copy.top}</span></a>`;
  document.body.append(quickmenu);
})();

// 전 페이지 공통 외국인 예약 퀵메뉴.
// 각 HTML에 중복된 퀵메뉴가 있어도 이곳에서 링크·아이콘·언어를 한 번에 맞춘다.
(function initializeInternationalAppointmentQuickmenu() {
  "use strict";

  const quickmenu = document.querySelector(".quickmenu");
  if (!quickmenu) return;

  const pageLanguage = dearPageLocale;
  const language = pageLanguage === "ja" ? "ja" : pageLanguage.startsWith("zh") ? "zh" : pageLanguage === "en" ? "en" : "ko";
  const copy = {
    ko: { label: "Intl. Booking", aria: "Intl. Booking", query: "en" },
    en: { label: "International", aria: "International", query: "en" },
    ja: { label: "海外予約", aria: "海外予約", query: "ja" },
    zh: { label: "国际预约", aria: "国际预约", query: "zh" },
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

  const pageLanguage = dearPageLocale;
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

// 다국어 모바일 퀵메뉴는 8개 항목이 한 줄에 들어가도록 짧은 공통 라벨을 사용한다.
(function normalizeLocalizedQuickmenuLabels() {
  "use strict";

  const locale = dearPageLocale === "zh-CN" ? "zh" : dearPageLocale;
  if (locale === "ko") return;
  const labels = {
    en: { phone: "Call", booking: "Naver Book", talk: "Naver Talk", international: "Intl. Book", blog: "Blog", instagram: "Instagram", journal: "Journal", top: "Top" },
    ja: { phone: "電話", booking: "Naver予約", talk: "Naver相談", international: "海外予約", blog: "ブログ", instagram: "Instagram", journal: "減量誌", top: "トップ" },
    zh: { phone: "电话", booking: "Naver预约", talk: "Naver咨询", international: "国际预约", blog: "博客", instagram: "Instagram", journal: "减重专刊", top: "顶部" },
  }[locale];
  if (!labels) return;
  const selectors = {
    phone: 'a[href^="tel:"]',
    booking: 'a[href*="m.booking.naver.com"]',
    talk: 'a[href*="talk.naver.com"]',
    international: ".quickmenu__btn--international",
    blog: 'a[href*="blog.naver.com"]',
    instagram: 'a[href*="instagram.com"]',
    journal: ".quickmenu__btn--diet-journal",
    top: ".quickmenu__btn--top",
  };
  const quickmenu = document.querySelector(".quickmenu");
  if (!quickmenu) return;
  Object.entries(selectors).forEach(([key, selector]) => {
    const label = quickmenu.querySelector(selector)?.querySelector(".quickmenu__label");
    if (label) {
      label.textContent = labels[key];
      label.closest("a")?.setAttribute("aria-label", labels[key]);
    }
  });
})();

// 스크롤 시 네비게이션 배경 전환 (히어로를 벗어나면 밝은 배경 + 어두운 텍스트)
// 히어로가 없는 서브 페이지에서는 처음부터 밝은 배경 상태로 고정한다.
const nav = document.querySelector(".nav");
const heroEl = document.querySelector(".hero");

if (heroEl) {
  let navScrollThreshold = Math.max(0, heroEl.getBoundingClientRect().height - 80);
  let navScrollQueued = false;

  function updateNavOnScroll() {
    nav.classList.toggle("is-scrolled", window.scrollY > navScrollThreshold);
    navScrollQueued = false;
  }

  function queueNavOnScroll() {
    if (navScrollQueued) return;
    navScrollQueued = true;
    window.requestAnimationFrame(updateNavOnScroll);
  }

  window.addEventListener("scroll", queueNavOnScroll, { passive: true });
  if ("ResizeObserver" in window) {
    new ResizeObserver(() => {
      navScrollThreshold = Math.max(0, heroEl.getBoundingClientRect().height - 80);
      queueNavOnScroll();
    }).observe(heroEl);
  }
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
  const pageLanguage = dearPageLocale;
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
    "privacy.html", "terms.html", "non-covered.html", "patient-rights.html",
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

// 모든 언어 상단 메뉴: 현재 페이지의 언어와 경로에 맞춘 같은 메가 메뉴를 제공한다.
const koreanNavSubmenuDefinitions = {
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
    image: "/assets/images/columns/gongjindan-handmade/thumbnail-deer-gongjindan-v2.png",
    imagePosition: "50% 30%",
    latestColumnData: "/assets/data/latest-column.json",
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
      ["KOREAN HERBAL MEDICINE", "/services.html#herbal-decoction", "체질 맞춤 한약"],
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

const navLocale = (() => {
  const language = dearPageLocale.toLowerCase();
  if (language === "en") return "en";
  if (language === "ja") return "ja";
  if (language.startsWith("zh")) return "zh";
  return "ko";
})();
const navPrefix = navLocale === "ko" ? "" : `/${navLocale === "zh" ? "zh-cn" : navLocale}`;
const navCopy = {
  ko: null,
  en: {
    labels: ["About DEAR", "Clinical journal", "Care begins with your current condition", "Care and prescriptions", "Connect with DEAR"],
    about: [["About DEAR", "about.html", "Our space and standards"], ["Care philosophy", "philosophy.html", "How we listen and decide together"], ["Director Kim Minji", "director.html", "Director and approach to care"], ["Career", "career.html", "Education, career, and research"]],
    columns: [["All columns", "columns.html", "Translated clinical columns"]],
    care: [["Focus", "care.html?care=Focus", "Cognition and concentration"], ["Calm", "care.html?care=Calm", "Tension and sleep"], ["Restore", "care.html?care=Restore", "Fatigue and recovery"], ["Relief", "care.html?care=Relief", "Pain and discomfort"], ["Shape", "care.html?care=Shape", "Weight and daily rhythm"]],
    services: [["BE DEER", "services.html#be-deer", "Weight and daily rhythm"], ["DEAR GONGJINDAN", "services.html#dear-gongjindan", "Energy and recovery"], ["KOREAN HERBAL MEDICINE", "services.html#herbal-decoction", "Personalized herbal medicine"], ["DEER BALANCE", "services.html#deer-balance", "Sleep and emotional balance"], ["View all services", "services.html", "DEAR SERVICES"]],
    contact: [["Call us", "tel:02-3486-1777", "02-3486-1777"], ["Naver reservation", "https://m.booking.naver.com/booking/13/bizes/729883", "Book an appointment"], ["Naver Talk", "https://talk.naver.com/ct/w5zr5u", "Send an inquiry"], ["International booking", "/international-appointment.html?lang=en", "Schedule and phone booking"], ["Directions", "index.html#info", "143 Saimdang-ro, Seocho-gu"]],
  },
  ja: {
    labels: ["DEARについて", "健康コラム", "現在の状態から診ます", "診療と処方", "DEARへのお問い合わせ"],
    about: [["DEARについて", "about.html", "空間と診療の基準"], ["診療哲学", "philosophy.html", "ともに考え、選ぶ診療"], ["代表院長 Kim Minji", "director.html", "院長と診療方針"], ["経歴", "career.html", "学歴・経歴・研究活動"]],
    columns: [["コラム一覧", "columns.html", "翻訳された健康コラム"]],
    care: [["Focus", "care.html?care=Focus", "認知機能と集中力"], ["Calm", "care.html?care=Calm", "緊張反応と睡眠"], ["Restore", "care.html?care=Restore", "疲労と回復力"], ["Relief", "care.html?care=Relief", "痛みと身体的不調"], ["Shape", "care.html?care=Shape", "体重と生活リズム"]],
    services: [["BE DEER", "services.html#be-deer", "体重と生活リズム"], ["DEAR GONGJINDAN", "services.html#dear-gongjindan", "気力と回復"], ["KOREAN HERBAL MEDICINE", "services.html#herbal-decoction", "体質に合わせた韓薬"], ["DEER BALANCE", "services.html#deer-balance", "睡眠と心のバランス"], ["診療一覧", "services.html", "DEAR SERVICES"]],
    contact: [["電話相談", "tel:02-3486-1777", "02-3486-1777"], ["Naver予約", "https://m.booking.naver.com/booking/13/bizes/729883", "診療予約"], ["Naver Talk", "https://talk.naver.com/ct/w5zr5u", "オンライン相談"], ["海外患者予約", "/international-appointment.html?lang=ja", "診療日程と電話予約"], ["アクセス", "index.html#info", "ソウル市瑞草区師任堂路143"]],
  },
  zh: {
    labels: ["关于DEAR", "健康专栏", "从当前状态开始", "诊疗与处方", "联系DEAR"],
    about: [["关于DEAR", "about.html", "诊疗空间与标准"], ["诊疗理念", "philosophy.html", "共同沟通、共同选择"], ["代表院长 Kim Minji", "director.html", "院长与诊疗方向"], ["履历", "career.html", "教育、职业与研究经历"]],
    columns: [["全部专栏", "columns.html", "已翻译的健康专栏"]],
    care: [["Focus", "care.html?care=Focus", "认知功能与注意力"], ["Calm", "care.html?care=Calm", "紧张反应与睡眠"], ["Restore", "care.html?care=Restore", "疲劳与恢复力"], ["Relief", "care.html?care=Relief", "疼痛与身体不适"], ["Shape", "care.html?care=Shape", "体重与生活节律"]],
    services: [["BE DEER", "services.html#be-deer", "体重与生活节律"], ["DEAR GONGJINDAN", "services.html#dear-gongjindan", "精力与恢复"], ["KOREAN HERBAL MEDICINE", "services.html#herbal-decoction", "个体化韩药"], ["DEER BALANCE", "services.html#deer-balance", "睡眠与情绪平衡"], ["查看全部诊疗", "services.html", "DEAR SERVICES"]],
    contact: [["电话咨询", "tel:02-3486-1777", "02-3486-1777"], ["Naver预约", "https://m.booking.naver.com/booking/13/bizes/729883", "预约诊疗"], ["Naver咨询", "https://talk.naver.com/ct/w5zr5u", "在线咨询"], ["国际患者预约", "/international-appointment.html?lang=zh", "门诊时间与电话预约"], ["来院路线", "index.html#info", "首尔市瑞草区师任堂路143"]],
  },
}[navLocale];

const localizeNavLinks = (links) => links.map(([title, href, description]) => [
  title,
  href.startsWith("http") || href.startsWith("tel:") || href.startsWith("/") ? href : `${navPrefix}/${href}`,
  description,
]);
const navSubmenuDefinitions = navLocale === "ko" ? koreanNavSubmenuDefinitions : {
  "About DEAR": { ...koreanNavSubmenuDefinitions["About DEAR"], label: navCopy.labels[0], links: localizeNavLinks(navCopy.about) },
  Columns: { ...koreanNavSubmenuDefinitions.Columns, label: navCopy.labels[1], latestColumnData: null, links: localizeNavLinks(navCopy.columns) },
  Care: { ...koreanNavSubmenuDefinitions.Care, label: navCopy.labels[2], links: localizeNavLinks(navCopy.care) },
  "DEAR SERVICES": { ...koreanNavSubmenuDefinitions["DEAR SERVICES"], label: navCopy.labels[3], links: localizeNavLinks(navCopy.services) },
  Contact: { ...koreanNavSubmenuDefinitions.Contact, label: navCopy.labels[4], links: localizeNavLinks(navCopy.contact) },
};

const navSubmenuItems = [];

if (nav && navMenu) {
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
    toggle.setAttribute("aria-label", navLocale === "ko" ? `${link.textContent.trim()} 하위 메뉴 열기` : `${link.textContent.trim()} submenu`);
    toggle.innerHTML = '<span aria-hidden="true"></span>';
    submenu.className = "nav-submenu";
    submenu.id = submenuId;
    submenu.innerHTML = `<div class="nav-submenu__inner"><p class="nav-submenu__visual" style="--nav-submenu-image:url('${definition.image}');--nav-submenu-position:${definition.imagePosition}"><span>${definition.label}</span></p><div class="nav-submenu__links">${definition.links
      .map(([title, href, description]) => `<a href="${href}"><strong>${title}</strong><span>${description}</span><b aria-hidden="true">→</b></a>`)
      .join("")}</div></div>`;
    item.append(toggle, submenu);
    navSubmenuItems.push({ item, toggle, submenu });

    if (definition.latestColumnData) {
      const visual = submenu.querySelector(".nav-submenu__visual");
      fetch(definition.latestColumnData, { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then((latest) => {
          if (!latest?.image || !latest.image.startsWith("/assets/images/columns/")) return;
          visual?.style.setProperty("--nav-submenu-image", `url('${latest.image}')`);
          visual?.style.setProperty("--nav-submenu-position", latest.imagePosition || "50% 30%");
        })
        .catch(() => {
          // 네트워크 오류 시에도 배포 시점의 최신 대표 이미지를 그대로 보여 준다.
        });
    }
  });
}

function closeAllNavSubmenus(exceptItem = null) {
  navSubmenuItems.forEach(({ item, toggle }) => {
    if (item === exceptItem) return;
    item.classList.remove("is-submenu-open");
    toggle.setAttribute("aria-expanded", "false");
  });
}

let desktopSubmenuCloseTimer = 0;
const isDesktopNavigation = () => window.matchMedia("(min-width: 769px)").matches;
const cancelDesktopSubmenuClose = () => {
  window.clearTimeout(desktopSubmenuCloseTimer);
  desktopSubmenuCloseTimer = 0;
};

navSubmenuItems.forEach(({ item, toggle, submenu }) => {
  item.addEventListener("pointerenter", () => {
    if (!isDesktopNavigation()) return;
    cancelDesktopSubmenuClose();
    closeAllNavSubmenus(item);
    item.classList.add("is-submenu-open");
    toggle.setAttribute("aria-expanded", "true");
  });
  item.addEventListener("pointerleave", () => {
    if (!isDesktopNavigation()) return;
    cancelDesktopSubmenuClose();
    desktopSubmenuCloseTimer = window.setTimeout(() => {
      item.classList.remove("is-submenu-open");
      toggle.setAttribute("aria-expanded", "false");
    }, 360);
  });
  submenu.addEventListener("pointerenter", cancelDesktopSubmenuClose);
  toggle.addEventListener("click", () => {
    cancelDesktopSubmenuClose();
    const willOpen = !item.classList.contains("is-submenu-open");
    closeAllNavSubmenus(item);
    item.classList.toggle("is-submenu-open", willOpen);
    toggle.setAttribute("aria-expanded", String(willOpen));
  });
  submenu.addEventListener("click", (event) => {
    if (!event.target.closest("a")) return;
    cancelDesktopSubmenuClose();
    if (!isDesktopNavigation()) setMobileMenuState(false);
  });
});

function setMobileMenuState(isOpen) {
  cancelDesktopSubmenuClose();
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

// 다국어 공통 페이지는 번역문을 유지하면서 한국어판의 최신 UI 골격을 공유한다.
// 과거 번역 HTML을 일일이 복제하지 않고 공통 스크립트에서 보강해 다음 UI 개편도 한곳에서 관리한다.
(function alignLocalizedPageUi() {
  "use strict";

  const languageCode = dearPageLocale.toLowerCase();
  const locale = languageCode === "en" ? "en" : languageCode === "ja" ? "ja" : languageCode.startsWith("zh") ? "zh" : null;
  if (!locale) return;

  const copy = {
    en: {
      sequence: ["Listen", "Assess", "Plan together"],
      flowEyebrow: "HOW WE BEGIN", flowTitle: "We review your history,\nthen assess your current condition.", flowBody: "The same symptom can arise from a different context. We connect the timeline, accompanying changes, and daily life before discussing care.",
      viewerTitle: "Five Care areas,\nfive clinical points of attention.", viewerBody: "These are not self-diagnosis categories. They show what we examine together during a consultation.", columnsLink: "Read related columns",
      principleTitle: "We do not choose\na treatment first.", principleBody: "We begin with the person: what changed, what continues, and what matters in daily life. Then we explain the options and decide together.", principleSteps: ["Listen", "Assess", "Explain", "Decide"],
      serviceCtas: ["Explore weight care", "Explore Gongjindan", "Explore herbal medicine", "Explore sleep & mind care"], serviceDetail: "View details",
      directorArticles: "Clinical columns written and reviewed by Director Kim Minji", directorCard: "A translated DEAR clinical column", directorAll: "View translated columns →",
      journalTitle: "DEAR CLINICAL JOURNAL", journalSub: "Health columns from DEAR Korean Medicine Clinic", search: "Search by symptom or daily-life change", prompts: ["sleep", "fatigue", "digestion", "weight"],
      beTitle: "Weight care shown through real patient experiences.", beBody: "BE DEER looks beyond weight to appetite, sleep, digestion, and daily rhythm.", beLink: "Explore BE DEER", bridgeTitle: "Different care starts with\nthe same person’s day.", bridgeBody: "Questions about weight, energy, and recovery all begin by listening closely to your body and daily life.", bridgePrinciple: "DEAR begins with the person, beyond the name of a condition.",
    },
    ja: {
      sequence: ["お話を伺う", "状態を評価", "一緒に計画"],
      flowEyebrow: "HOW WE BEGIN", flowTitle: "これまでの経過を確認し、\n現在の状態を評価します。", flowBody: "同じ症状でも背景は異なります。発症からの経過、伴う変化、日常生活をつなげて確認してから診療方針をご説明します。",
      viewerTitle: "5つのCareは、\n診療で確認する5つの視点です。", viewerBody: "自己診断の分類ではありません。診察で一緒に確認する内容を示しています。", columnsLink: "関連コラムを読む",
      principleTitle: "治療方法を\n先に決めることはありません。", principleBody: "何が変わり、何が続き、日常生活で何が重要かを確認することから始めます。そのうえで選択肢をご説明し、一緒に決めます。", principleSteps: ["伺う", "評価する", "説明する", "一緒に決める"],
      serviceCtas: ["体重管理を見る", "拱辰丹を見る", "体質韓薬を見る", "睡眠・心のケアを見る"], serviceDetail: "詳しく見る",
      directorArticles: "Kim Minji代表院長が執筆・監修したコラム", directorCard: "翻訳されたDEAR健康コラム", directorAll: "翻訳コラムを見る →",
      journalTitle: "DEAR CLINICAL JOURNAL", journalSub: "DEAR韓医院の健康コラム", search: "症状や生活の変化から検索", prompts: ["睡眠", "疲労", "消化", "体重"],
      beTitle: "言葉より、実際の体験で伝える体重管理。", beBody: "BE DEERは体重だけでなく、食欲・睡眠・消化と生活リズムまで一緒に確認します。", beLink: "BE DEERを見る", bridgeTitle: "異なる診療も、\n一人の今日から始まります。", bridgeBody: "体重、気力、回復の悩みも、体と生活を丁寧に伺うことから始まります。", bridgePrinciple: "DEARは病名を越えて、その人を先に考えます。",
    },
    zh: {
      sequence: ["倾听", "评估", "共同制定方案"],
      flowEyebrow: "HOW WE BEGIN", flowTitle: "确认既往经过，\n评估当前状态。", flowBody: "相同症状也可能有不同背景。我们会结合发病经过、伴随变化与日常生活，再说明诊疗方向。",
      viewerTitle: "五项Care，\n对应诊疗中的五个关注点。", viewerBody: "这不是自我诊断分类，而是就诊时与您共同确认的内容。", columnsLink: "阅读相关专栏",
      principleTitle: "我们不会\n预先决定治疗方法。", principleBody: "先了解发生了什么、哪些情况持续存在，以及日常生活中什么最重要；再说明可选方案，与您共同决定。", principleSteps: ["倾听", "评估", "说明", "共同决定"],
      serviceCtas: ["了解体重管理", "了解拱辰丹", "了解体质韩药", "了解睡眠与情绪管理"], serviceDetail: "查看详情",
      directorArticles: "Kim Minji代表院长撰写与审核的专栏", directorCard: "已翻译的DEAR健康专栏", directorAll: "查看翻译专栏 →",
      journalTitle: "DEAR CLINICAL JOURNAL", journalSub: "DEAR韩医院健康专栏", search: "按症状或生活变化搜索", prompts: ["睡眠", "疲劳", "消化", "体重"],
      beTitle: "以真实体验呈现的体重管理。", beBody: "BE DEER不只关注体重，也会结合食欲、睡眠、消化与生活节律。", beLink: "了解BE DEER", bridgeTitle: "不同的诊疗，\n都从同一个人的今天开始。", bridgeBody: "无论体重、精力还是恢复问题，都从认真倾听身体与生活开始。", bridgePrinciple: "DEAR越过疾病名称，先理解眼前的人。",
    },
  }[locale];

  const servicesHero = document.querySelector(".services-hero__images");
  if (servicesHero && !servicesHero.querySelector(".services-hero-card")) {
    const targets = ["#be-deer", "#dear-gongjindan", "#herbal-decoction", "#deer-balance"];
    [...servicesHero.querySelectorAll(":scope > img")].slice(0, 4).forEach((image, index) => {
      const card = document.createElement("a");
      card.className = "services-hero-card";
      card.href = targets[index];
      image.before(card);
      card.append(image);
      card.insertAdjacentHTML("beforeend", `<span class="services-hero-card__cta"><span><small>0${index + 1} · ${["BE DEER", "DEAR GONGJINDAN", "KOREAN HERBAL MEDICINE", "DEER BALANCE"][index]}</small>${copy.serviceCtas[index]}</span><b aria-hidden="true">→</b></span>`);
    });
    const hero = servicesHero.closest(".services-hero");
    hero?.insertAdjacentHTML("afterend", `<section class="services-principle" aria-labelledby="localized-services-principle"><div class="services-principle__inner"><div><p class="services-eyebrow">DEAR PRINCIPLE</p><h2 id="localized-services-principle">${copy.principleTitle.replace("\n", "<br>")}</h2></div><div><p>${copy.principleBody}</p><ol class="services-principle__flow">${copy.principleSteps.map((step, index) => `<li><span>0${index + 1}</span>${step}</li>`).join("")}</ol></div></div></section>`);
    document.querySelectorAll(".service-chapter").forEach((chapter) => {
      if (chapter.querySelector(".service-chapter__detail-link")) return;
      const body = chapter.querySelector(".service-chapter__body");
      if (!body) return;
      const link = document.createElement("a");
      link.className = "service-chapter__detail-link";
      link.href = "columns.html";
      link.innerHTML = `<span>${copy.serviceDetail}</span><b aria-hidden="true">→</b>`;
      body.append(link);
    });
  }

  const careHero = document.querySelector(".care-hero__inner");
  if (careHero && !careHero.querySelector(".care-hero__copy")) {
    const heroCopy = document.createElement("div");
    heroCopy.className = "care-hero__copy";
    [...careHero.children].filter((node) => !node.classList.contains("care-hero__motif")).forEach((node) => heroCopy.append(node));
    careHero.querySelector(".care-hero__motif")?.remove();
    heroCopy.insertAdjacentHTML("beforeend", `<p class="care-hero__sequence js-reveal" aria-label="Care sequence">${copy.sequence.map((item, index) => `<span><small>0${index + 1}</small>${item}</span>`).join("")}</p>`);
    careHero.append(heroCopy);
    careHero.insertAdjacentHTML("beforeend", `<figure class="care-hero__media js-reveal"><img src="../assets/images/care-main-space.jpg" alt="DEAR Korean Medicine Clinic consultation space" loading="eager"></figure>`);
    careHero.closest(".care-hero")?.insertAdjacentHTML("afterend", `<section class="care-visual-flow" aria-labelledby="localized-care-flow"><div class="care-visual-flow__inner"><header class="care-visual-flow__header js-reveal"><p class="care-eyebrow">${copy.flowEyebrow}</p><h2 id="localized-care-flow">${copy.flowTitle.replace("\n", "<br>")}</h2><p>${copy.flowBody}</p></header><div class="care-visual-flow__gallery"><figure class="care-moment care-moment--wide js-reveal"><img src="../assets/images/care/care-assessment-v1.webp" alt="Clinical assessment at DEAR" loading="lazy"></figure><figure class="care-moment js-reveal"><img src="../assets/images/care/care-preparation-v1.webp" alt="Preparing for care" loading="lazy"></figure><figure class="care-moment care-moment--space js-reveal"><img src="../assets/images/treatment-room.jpg" alt="DEAR treatment space" loading="lazy"></figure></div></div></section>`);
    const viewer = document.querySelector(".care-viewer");
    const viewerInner = viewer?.querySelector(".care-viewer__inner");
    if (viewer && viewerInner && !viewer.querySelector(".care-viewer__intro")) {
      viewerInner.insertAdjacentHTML("beforebegin", `<div class="care-viewer__intro js-reveal"><p class="care-eyebrow">FIVE CARE AREAS</p><h2>${copy.viewerTitle.replace("\n", "<br>")}</h2><p>${copy.viewerBody}</p></div>`);
    }
    document.querySelectorAll(".care-panel").forEach((panel) => {
      if (panel.querySelector(".care-panel__columns-link")) return;
      panel.insertAdjacentHTML("beforeend", `<a class="care-panel__columns-link" href="columns.html">${copy.columnsLink} <span aria-hidden="true">→</span></a>`);
    });
  }

  const director = document.querySelector("main.director");
  if (director && !director.querySelector(".director__articles")) {
    director.insertAdjacentHTML("beforeend", `<section class="director__section director__articles" aria-labelledby="localized-director-articles"><div class="director__inner"><p class="director__eyebrow js-reveal">DEAR CLINICAL JOURNAL</p><h2 class="director__heading js-reveal" id="localized-director-articles">${copy.directorArticles}</h2><div class="director__article-grid"><a class="director__article-card js-reveal" href="columns.html"><span>01</span><strong>${copy.directorCard}</strong><b aria-hidden="true">→</b></a></div><a class="director__articles-all js-reveal" href="columns.html">${copy.directorAll}</a></div></section>`);
  }

  const columnsHero = document.querySelector(".columns-hero__inner");
  if (columnsHero && !columnsHero.querySelector(".columns-search-stage")) {
    const oldHeading = columnsHero.querySelector("h1");
    const search = document.querySelector(".columns-search");
    const filters = document.querySelector(".columns-filters");
    const stage = document.createElement("div");
    stage.className = "columns-search-stage";
    stage.innerHTML = `<h1 class="columns-search-title"><span>${copy.journalTitle}</span>${copy.journalSub}</h1>`;
    if (search) {
      search.classList.add("columns-search--floating");
      search.querySelector("input")?.setAttribute("placeholder", copy.search);
      stage.append(search);
    }
    stage.insertAdjacentHTML("beforeend", `<div class="columns-search-prompts" aria-label="Suggested searches">${copy.prompts.map((prompt) => `<button type="button" data-columns-prompt="${prompt}">${prompt}</button>`).join("")}</div>`);
    if (filters) {
      const journalNav = document.createElement("div");
      journalNav.className = "columns-journal-nav";
      journalNav.append(filters);
      stage.append(journalNav);
    }
    oldHeading?.remove();
    columnsHero.querySelector(".columns-kicker")?.remove();
    columnsHero.prepend(stage);
    stage.querySelectorAll("[data-columns-prompt]").forEach((button) => button.addEventListener("click", () => {
      const input = stage.querySelector("input");
      if (!input) return;
      input.value = button.dataset.columnsPrompt;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }));
  }

  const homeAbout = document.querySelector("main > .about");
  if (homeAbout && !document.querySelector(".home-be-deer")) {
    homeAbout.insertAdjacentHTML("afterend", `<section class="home-be-deer" aria-labelledby="localized-home-be-deer"><div class="home-be-deer__inner"><div class="home-be-deer__copy"><p class="home-be-deer__eyebrow js-reveal">DEAR DIET PROGRAM</p><p class="home-be-deer__brand js-reveal">BE DEER</p><h2 class="js-reveal" id="localized-home-be-deer"><span class="home-be-deer__title-main">${copy.beTitle}</span></h2><p class="home-be-deer__body js-reveal">${copy.beBody}</p><ul class="home-be-deer__keywords js-reveal"><li>APPETITE</li><li>SLEEP</li><li>DIGESTION</li><li>DAILY RHYTHM</li></ul><a class="home-be-deer__link js-reveal" href="services.html#be-deer"><span>${copy.beLink}</span><b aria-hidden="true">→</b></a></div><div class="home-be-deer__visual js-reveal"><figure class="home-be-deer__photo home-be-deer__photo--main"><img src="../assets/images/be-deer/home-consultation-recreated.webp" alt="BE DEER consultation" loading="lazy"></figure><figure class="home-be-deer__photo home-be-deer__photo--sub"><img src="../assets/images/services-01-be-deer.jpg" alt="BE DEER program" loading="lazy"></figure><span class="home-be-deer__visual-label" aria-hidden="true">BEGIN WITH<br>YOUR STORY</span></div></div></section>`);
    const firstGongjindan = document.querySelector(".gongjindan");
    firstGongjindan?.insertAdjacentHTML("beforebegin", `<section class="home-care-bridge" aria-labelledby="localized-home-bridge"><div class="home-care-bridge__inner"><p class="home-care-bridge__eyebrow js-reveal">ONE PERSON, MANY NEEDS</p><h2 class="js-reveal" id="localized-home-bridge">${copy.bridgeTitle.replace("\n", "<br>")}</h2><p class="home-care-bridge__body js-reveal">${copy.bridgeBody}</p><div class="home-care-bridge__flow js-reveal"><a href="services.html#be-deer"><small>01</small><strong>BE DEER</strong><span aria-hidden="true">→</span></a><a href="services.html#dear-gongjindan"><small>02</small><strong>DEAR GONGJINDAN</strong><span aria-hidden="true">→</span></a></div><p class="home-care-bridge__principle js-reveal">${copy.bridgePrinciple}</p></div></section>`);
  }
})();

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

// 메인 안내 팝업: 한 번 닫은 안내는 브라우저의 사이트 데이터를 지우기 전까지 다시 표시하지 않는다.
const noticePopups = document.getElementById("noticePopups");

if (noticePopups) {
  const weatherPreviewActive = new URLSearchParams(window.location.search).has("weather-preview");
  const popupCards = [...noticePopups.querySelectorAll("[data-popup-id]")];

  const readPopupDismissal = (storageKey, legacyKey) => {
    try {
      const permanentlyDismissed = localStorage.getItem(storageKey) === "dismissed";
      const legacyDismissal = Boolean(localStorage.getItem(legacyKey));
      if (!permanentlyDismissed && legacyDismissal) {
        localStorage.setItem(storageKey, "dismissed");
      }
      return permanentlyDismissed || legacyDismissal;
    } catch {
      return false;
    }
  };

  const savePopupDismissal = (storageKey) => {
    try {
      localStorage.setItem(storageKey, "dismissed");
    } catch {
      // 저장소 사용이 차단된 환경에서는 현재 화면에서만 닫는다.
    }
  };

  const refreshPopupVisibility = () => {
    const visibleCards = popupCards.filter((card) => !card.hidden);
    const shouldShow = visibleCards.length > 0;
    noticePopups.hidden = !shouldShow;
  };

  popupCards.forEach((card) => {
    const popupId = card.dataset.popupId;
    const storageKey = `dear-popup-dismissed-${popupId}`;
    const legacyKey = `dear-popup-${popupId}`;
    card.hidden = readPopupDismissal(storageKey, legacyKey);

    card.querySelector("[data-popup-close]")?.addEventListener("click", () => {
      savePopupDismissal(storageKey);
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
