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
// 한국어 상세 페이지에서는 현재 페이지와 관계없이 각 언어의 대표 페이지로 이동한다.
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
  const languageLinks = {
    ko: isLocalizedPage ? `../${currentPage}` : currentPage,
    en: isLocalizedPage ? `../en/${currentPage}` : `en/${currentPage}`,
    ja: isLocalizedPage ? `../ja/${currentPage}` : `ja/${currentPage}`,
    "zh-CN": isLocalizedPage ? `../zh-cn/${currentPage}` : `zh-cn/${currentPage}`,
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

function setMobileMenuState(isOpen) {
  navMenu?.classList.toggle("is-open", isOpen);
  navToggle?.classList.toggle("is-open", isOpen);
  navToggle?.setAttribute("aria-expanded", String(isOpen));
  navToggle?.setAttribute("aria-label", isOpen ? "메뉴 닫기" : "메뉴 열기");
  document.body.classList.toggle("nav-open", isOpen);
}

navToggle?.addEventListener("click", () => {
  setMobileMenuState(!navMenu.classList.contains("is-open"));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navMenu?.classList.contains("is-open")) {
    setMobileMenuState(false);
    navToggle?.focus();
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
