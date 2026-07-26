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

navToggle.addEventListener("click", () => {
  const isOpen = navMenu.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
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
    navMenu.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
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
