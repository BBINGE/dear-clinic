(function initializeDearGongjindanPage() {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const film = document.querySelector("[data-gjd-film]");
  const frames = film ? [...film.querySelectorAll("[data-film-frame]")] : [];
  const filmCurrent = film?.querySelector("[data-film-current]");
  const filmToggle = film?.querySelector("[data-film-toggle]");
  // 페이지 언어에 맞춘 재생 버튼 문구(외국어판에서 한국어로 바뀌지 않게)
  const filmLabels = {
    ko: { pause: "일시정지", play: "자동재생" },
    en: { pause: "Pause", play: "Play" },
    ja: { pause: "一時停止", play: "自動再生" },
    zh: { pause: "暂停", play: "自动播放" }
  };
  const pageLang = (document.documentElement.lang || "ko").slice(0, 2).toLowerCase();
  const filmLabel = filmLabels[pageLang] || filmLabels.ko;
  const filmNext = film?.querySelector("[data-film-next]");
  const filmProgress = film?.querySelector("[data-film-progress]");
  let filmIndex = 0;
  let filmPlaying = !reduceMotion;
  let filmTimer = 0;

  function showFilmFrame(nextIndex) {
    if (!frames.length) return;
    filmIndex = (nextIndex + frames.length) % frames.length;
    frames.forEach((frame, index) => {
      const active = index === filmIndex;
      frame.classList.toggle("is-active", active);
      frame.setAttribute("aria-hidden", String(!active));
    });
    if (filmCurrent) filmCurrent.textContent = String(filmIndex + 1).padStart(2, "0");
    restartFilmProgress();
  }

  function restartFilmProgress() {
    if (!filmProgress) return;
    filmProgress.classList.remove("is-running", "is-paused");
    void filmProgress.offsetWidth;
    filmProgress.classList.add("is-running");
    filmProgress.classList.toggle("is-paused", !filmPlaying);
  }

  function stopFilmTimer() {
    window.clearInterval(filmTimer);
    filmTimer = 0;
  }

  function startFilmTimer() {
    stopFilmTimer();
    if (!filmPlaying || frames.length < 2) return;
    filmTimer = window.setInterval(() => showFilmFrame(filmIndex + 1), 4400);
  }

  function updateFilmToggle() {
    if (!filmToggle) return;
    filmToggle.setAttribute("aria-pressed", String(filmPlaying));
    filmToggle.textContent = filmPlaying ? filmLabel.pause : filmLabel.play;
    filmProgress?.classList.toggle("is-paused", !filmPlaying);
  }

  filmToggle?.addEventListener("click", () => {
    filmPlaying = !filmPlaying;
    updateFilmToggle();
    startFilmTimer();
  });

  filmNext?.addEventListener("click", () => {
    showFilmFrame(filmIndex + 1);
    startFilmTimer();
  });

  updateFilmToggle();
  showFilmFrame(0);
  startFilmTimer();

  const processData = [
    {
      image: "/assets/images/columns/gongjindan-handmade/musk-closeup.jpg",
      alt: { ko: "공진단 조제에 사용하는 약재 용기를 확인하는 장면", en: "Checking a container of herbs used for compounding Gongjindan", ja: "拱辰丹の調製に使う生薬の容器を確認する場面", zh: "确认用于调制拱辰丹的药材容器" },
      label: "SELECT",
    },
    {
      image: "/assets/images/columns/gongjindan-handmade/herbal-powders.jpg",
      alt: { ko: "공진단 조제를 위해 준비한 여러 약재 분말", en: "Herbal powders prepared for compounding Gongjindan", ja: "拱辰丹の調製のために用意した数種類の生薬の粉末", zh: "为调制拱辰丹准备的多种药材粉末" },
      label: "PREPARE",
    },
    {
      image: "/assets/images/columns/gongjindan-handmade/musk-opened.jpg",
      alt: { ko: "약재를 절구에 넣어 준비하는 원내 조제 장면", en: "Placing herbs in a mortar during in-house compounding", ja: "生薬を乳鉢に入れて準備する院内調製の様子", zh: "将药材放入研钵、在院内调制的场景" },
      label: "COMPOUND",
    },
    {
      image: "/assets/images/gongjindan-1.jpg",
      alt: { ko: "완성한 공진단을 개별 용기에 담는 장면", en: "Packing finished Gongjindan into individual containers", ja: "完成した拱辰丹を個別の容器に詰める様子", zh: "将制成的拱辰丹装入独立容器" },
      label: "GUIDE",
    },
  ];
  const processTabs = [...document.querySelectorAll("[data-process-tab]")];
  const processPanels = [...document.querySelectorAll("[data-process-panel]")];
  const processImage = document.querySelector("[data-process-image]");
  const processNumber = document.querySelector("[data-process-number]");
  const processLabel = document.querySelector("[data-process-label]");

  function selectProcess(index, moveFocus = false) {
    const data = processData[index];
    if (!data) return;

    processTabs.forEach((tab, tabIndex) => {
      const active = tabIndex === index;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && moveFocus) tab.focus();
    });
    processPanels.forEach((panel, panelIndex) => {
      panel.hidden = panelIndex !== index;
    });

    if (processImage) {
      processImage.classList.add("is-changing");
      window.setTimeout(() => {
        processImage.src = data.image;
        processImage.alt = data.alt[pageLang] || data.alt.ko;
        processImage.classList.remove("is-changing");
      }, reduceMotion ? 0 : 180);
    }
    if (processNumber) processNumber.textContent = String(index + 1).padStart(2, "0");
    if (processLabel) processLabel.textContent = data.label;
  }

  processTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectProcess(index));
    tab.addEventListener("keydown", (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + processTabs.length) % processTabs.length;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % processTabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = processTabs.length - 1;
      selectProcess(nextIndex, true);
    });
  });

  const revealElements = [...document.querySelectorAll(".gjd-reveal")];
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -9%", threshold: 0.08 });
    revealElements.forEach((element) => revealObserver.observe(element));
  }

  const progress = document.querySelector(".gjd-scroll-progress span");
  const chapterLinks = [...document.querySelectorAll(".gjd-chapters a[href^='#']")];
  const chapterSections = chapterLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  let scrollTicking = false;

  function updateScrollState() {
    const scrollRange = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollRange > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollRange)) : 0;
    if (progress) progress.style.width = `${ratio * 100}%`;

    const marker = window.scrollY + Math.min(window.innerHeight * 0.38, 320);
    let currentId = chapterSections[0]?.id || "";
    chapterSections.forEach((section) => {
      if (section.offsetTop <= marker) currentId = section.id;
    });
    chapterLinks.forEach((link) => {
      const current = link.getAttribute("href") === `#${currentId}`;
      link.classList.toggle("is-current", current);
      if (current) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    scrollTicking = false;
  }

  window.addEventListener("scroll", () => {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(updateScrollState);
  }, { passive: true });
  window.addEventListener("resize", updateScrollState);
  updateScrollState();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopFilmTimer();
    else startFilmTimer();
  });
})();
