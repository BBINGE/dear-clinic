// 스크롤 시 네비게이션 배경 전환 (히어로를 벗어나면 밝은 배경 + 어두운 텍스트)
const nav = document.querySelector(".nav");
const heroEl = document.querySelector(".hero");

function updateNavOnScroll() {
  const threshold = heroEl.offsetHeight - 80;
  nav.classList.toggle("is-scrolled", window.scrollY > threshold);
}

window.addEventListener("scroll", updateNavOnScroll);
updateNavOnScroll();

// 모바일 네비게이션 토글
const navToggle = document.getElementById("navToggle");
const navMenu = document.getElementById("navMenu");

navToggle.addEventListener("click", () => {
  const isOpen = navMenu.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

// 준비중인 메뉴 처리 (Care / Columns / DEAR SERVICES / Contact)
document.querySelectorAll('.nav__link[data-ready="false"]').forEach((link) => {
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
