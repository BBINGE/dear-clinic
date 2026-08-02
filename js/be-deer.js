// BE DEER reveal motion
(() => {
  const targets = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    targets.forEach((target) => target.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: "0px 0px -6% 0px"
  });

  targets.forEach((target, index) => {
    target.style.transitionDelay = `${Math.min((index % 4) * 70, 210)}ms`;
    observer.observe(target);
  });
})();

// Receipt review selector
(() => {
  const showcase = document.querySelector("[data-review-showcase]");
  if (!showcase) return;

  const image = showcase.querySelector("[data-review-image]");
  const items = Array.from(showcase.querySelectorAll(".review-selector__item"));
  if (!image || !items.length) return;
  let imageChangeTimer;

  items.forEach((item) => {
    item.addEventListener("click", () => {
      if (item.classList.contains("is-active")) return;

      items.forEach((candidate) => {
        const active = candidate === item;
        candidate.classList.toggle("is-active", active);
        candidate.setAttribute("aria-pressed", String(active));
      });

      window.clearTimeout(imageChangeTimer);
      image.classList.add("is-changing");
      imageChangeTimer = window.setTimeout(() => {
        image.src = item.dataset.reviewImageSrc;
        image.alt = item.dataset.reviewImageAlt;
        image.classList.remove("is-changing");
      }, 140);
    });
  });
})();

// BE DEER clinical flow activation
(() => {
  const process = document.querySelector(".process");
  const steps = Array.from(document.querySelectorAll("[data-flow-step]"));

  if (!process || !steps.length || !("IntersectionObserver" in window)) return;

  const setActiveStep = (activeIndex) => {
    steps.forEach((step, index) => {
      step.classList.toggle("is-past", index < activeIndex);
      step.classList.toggle("is-active", index === activeIndex);
    });

    const progress = ((activeIndex + 1) / steps.length) * 100;
    process.style.setProperty("--flow-progress", `${progress}%`);
  };

  const findClosestStep = () => {
    const viewportCenter = window.innerHeight / 2;
    return steps.reduce((closestIndex, step, index) => {
      const rect = step.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const closestRect = steps[closestIndex].getBoundingClientRect();
      const closestCenter = closestRect.top + closestRect.height / 2;
      return Math.abs(center - viewportCenter) < Math.abs(closestCenter - viewportCenter)
        ? index
        : closestIndex;
    }, 0);
  };

  process.classList.add("is-flow-ready");
  const processRect = process.getBoundingClientRect();
  if (processRect.top < window.innerHeight && processRect.bottom > 0) {
    setActiveStep(findClosestStep());
  }

  const flowObserver = new IntersectionObserver((entries) => {
    const centeredEntry = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => Math.abs(a.boundingClientRect.top + a.boundingClientRect.height / 2 - window.innerHeight / 2)
        - Math.abs(b.boundingClientRect.top + b.boundingClientRect.height / 2 - window.innerHeight / 2))[0];

    if (!centeredEntry) return;
    setActiveStep(steps.indexOf(centeredEntry.target));
  }, {
    threshold: 0,
    rootMargin: "-42% 0px -42% 0px"
  });

  steps.forEach((step) => flowObserver.observe(step));
})();
