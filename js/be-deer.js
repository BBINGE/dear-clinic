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

// BE DEER measured result count-up
(() => {
  const groups = Array.from(document.querySelectorAll(".result-panel__metrics"));

  if (!groups.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setFinalValues = (numbers) => {
    numbers.forEach((number) => {
      const target = Number(number.dataset.countTo);
      const decimals = Number(number.dataset.decimals || 0);
      number.textContent = target.toFixed(decimals);
    });
  };

  const play = (group) => {
    if (group.dataset.countPlayed === "true") return;
    group.dataset.countPlayed = "true";

    const numbers = Array.from(group.querySelectorAll(".result-metric__number[data-count-to]"));

    if (reduceMotion) {
      setFinalValues(numbers);
      return;
    }

    numbers.forEach((number, index) => {
      const target = Number(number.dataset.countTo);
      const decimals = Number(number.dataset.decimals || 0);
      const duration = 1180;
      const delay = index * 65;
      let startTime;

      number.textContent = (0).toFixed(decimals);

      const tick = (time) => {
        if (!startTime) startTime = time;
        const elapsed = time - startTime;

        if (elapsed < delay) {
          requestAnimationFrame(tick);
          return;
        }

        const progress = Math.min((elapsed - delay) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        number.textContent = (target * eased).toFixed(decimals);

        if (progress < 1) {
          requestAnimationFrame(tick);
          return;
        }

        number.textContent = target.toFixed(decimals);
        number.classList.add("is-counted");
      };

      requestAnimationFrame(tick);
    });
  };

  if (!("IntersectionObserver" in window)) {
    groups.forEach(play);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      play(entry.target);
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.35,
    rootMargin: "0px 0px -8% 0px"
  });

  groups.forEach((group) => observer.observe(group));
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
