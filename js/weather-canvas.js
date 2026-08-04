(function initializeDearWeatherCanvas() {
  "use strict";

  const section = document.getElementById("about");
  const visual = section?.querySelector(".weather-lens__visual");
  const canvas = visual?.querySelector(".weather-lens__canvas");
  if (!section || !visual || !canvas || !canvas.getContext) return;

  const context = canvas.getContext("2d", { alpha: true });
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rainStates = new Set(["rain", "heavy-rain", "storm"]);
  const snowStates = new Set(["snow", "heavy-snow"]);
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let state = section.dataset.weather || "cloudy";
  let isVisible = true;
  let frame = 0;
  let lastTime = 0;
  let rainStreaks = [];
  let lensDrops = [];
  let snowflakes = [];
  let sceneImage = null;

  const randomBetween = (minimum, maximum) => minimum + Math.random() * (maximum - minimum);

  function resize() {
    const bounds = visual.getBoundingClientRect();
    width = Math.max(1, Math.round(bounds.width));
    height = Math.max(1, Math.round(bounds.height));
    pixelRatio = Math.min(window.devicePixelRatio || 1, width < 600 ? 1.25 : 1.6);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    resetParticles();
  }

  function makeStreak(initial = false) {
    const heavy = state === "heavy-rain" || state === "storm";
    return {
      x: randomBetween(-width * .08, width * 1.02),
      y: initial ? randomBetween(-height, height) : randomBetween(-height * .35, -18),
      length: randomBetween(heavy ? 18 : 11, heavy ? 54 : 34),
      speed: randomBetween(heavy ? 620 : 430, heavy ? 1050 : 760),
      drift: randomBetween(65, 145),
      alpha: randomBetween(.18, heavy ? .58 : .42),
      width: randomBetween(.45, heavy ? 1.45 : 1.05)
    };
  }

  function makeLensDrop(initial = false) {
    const moving = Math.random() < .36;
    const radius = moving ? randomBetween(7, 17) : randomBetween(2.2, 7.2);
    return {
      x: randomBetween(radius, width - radius),
      y: initial ? randomBetween(radius, height - radius) : randomBetween(-radius * 3, height * .22),
      radius,
      stretch: moving ? randomBetween(1.45, 2.65) : randomBetween(.82, 1.22),
      tilt: randomBetween(-.2, .14),
      speed: moving ? randomBetween(48, 132) : randomBetween(1.5, 8),
      sway: randomBetween(-6, 6),
      alpha: randomBetween(moving ? .58 : .34, moving ? .86 : .66),
      age: randomBetween(0, 5),
      life: randomBetween(moving ? 3.8 : 7, moving ? 8 : 16)
    };
  }

  function makeSnowflake(initial = false) {
    const depth = Math.pow(Math.random(), .72);
    return {
      x: randomBetween(-20, width + 20),
      y: initial ? randomBetween(-30, height + 30) : randomBetween(-90, -10),
      depth,
      size: randomBetween(.65, 1.8) + depth * randomBetween(1.2, 4.6),
      aspect: randomBetween(.56, .9),
      speed: randomBetween(34, 72) + depth * randomBetween(58, 145),
      drift: randomBetween(-24, 30),
      phase: randomBetween(0, Math.PI * 2),
      wobble: randomBetween(10, 32),
      alpha: randomBetween(.28, .62) + depth * .28
    };
  }

  function resetParticles() {
    state = section.dataset.weather || "cloudy";
    const areaFactor = Math.min(1.2, Math.max(.55, width / 1280));
    if (rainStates.has(state)) {
      const heavy = state === "heavy-rain" || state === "storm";
      rainStreaks = Array.from({ length: Math.round((heavy ? 150 : 82) * areaFactor) }, () => makeStreak(true));
      lensDrops = Array.from({ length: Math.round((heavy ? 30 : 18) * areaFactor) }, () => makeLensDrop(true));
    } else {
      rainStreaks = [];
      lensDrops = [];
    }
    if (snowStates.has(state)) {
      const heavy = state === "heavy-snow";
      snowflakes = Array.from({ length: Math.round((heavy ? 135 : 74) * areaFactor) }, () => makeSnowflake(true));
    } else {
      snowflakes = [];
    }
    drawFrame(0, performance.now());
  }

  function activeScene() {
    return Array.from(visual.querySelectorAll(".weather-lens__scene")).find((image) => Number.parseFloat(getComputedStyle(image).opacity) > .5 && image.complete && image.naturalWidth);
  }

  function drawRefractedDrop(drop) {
    const image = sceneImage;
    const rx = drop.radius;
    const ry = drop.radius * drop.stretch;
    const left = drop.x - rx;
    const top = drop.y - ry;

    context.save();
    context.beginPath();
    context.ellipse(drop.x, drop.y, rx, ry, drop.tilt, 0, Math.PI * 2);
    context.clip();

    if (image) {
      const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      const sourceWidth = width / scale;
      const sourceHeight = height / scale;
      const sourceX = (image.naturalWidth - sourceWidth) * .5;
      const sourceY = (image.naturalHeight - sourceHeight) * .56;
      const magnification = 1.12;
      const sampleWidth = (rx * 2 / scale) / magnification;
      const sampleHeight = (ry * 2 / scale) / magnification;
      const sampleX = sourceX + drop.x / scale - sampleWidth * .5 + drop.sway / scale;
      const sampleY = sourceY + drop.y / scale - sampleHeight * .5;
      context.globalAlpha = drop.alpha * .62;
      context.drawImage(image, sampleX, sampleY, sampleWidth, sampleHeight, left, top, rx * 2, ry * 2);
    }

    const lens = context.createRadialGradient(drop.x - rx * .3, drop.y - ry * .35, 0, drop.x, drop.y, Math.max(rx, ry));
    lens.addColorStop(0, "rgba(255,255,255,.42)");
    lens.addColorStop(.38, "rgba(205,232,235,.08)");
    lens.addColorStop(.76, "rgba(35,69,72,.12)");
    lens.addColorStop(1, "rgba(8,30,34,.46)");
    context.globalAlpha = drop.alpha;
    context.fillStyle = lens;
    context.fillRect(left, top, rx * 2, ry * 2);
    context.restore();

    context.save();
    context.globalAlpha = drop.alpha;
    context.strokeStyle = "rgba(226,246,248,.34)";
    context.lineWidth = Math.max(.6, rx * .085);
    context.shadowColor = "rgba(0,18,23,.5)";
    context.shadowBlur = Math.max(1.5, rx * .32);
    context.beginPath();
    context.ellipse(drop.x, drop.y, rx, ry, drop.tilt, .18, Math.PI * 1.52);
    context.stroke();
    context.fillStyle = "rgba(255,255,255,.54)";
    context.beginPath();
    context.ellipse(drop.x - rx * .28, drop.y - ry * .38, Math.max(.7, rx * .13), Math.max(1, ry * .19), -.45, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawRain(delta) {
    sceneImage = activeScene();
    context.save();
    context.lineCap = "round";
    rainStreaks.forEach((streak, index) => {
      streak.y += streak.speed * delta;
      streak.x += streak.drift * delta;
      if (streak.y - streak.length > height || streak.x > width + 50) rainStreaks[index] = makeStreak(false);
      context.beginPath();
      context.moveTo(streak.x, streak.y);
      context.lineTo(streak.x - streak.length * .18, streak.y - streak.length);
      context.strokeStyle = `rgba(218,236,240,${streak.alpha})`;
      context.lineWidth = streak.width;
      context.stroke();
    });
    context.restore();

    lensDrops.forEach((drop, index) => {
      drop.age += delta;
      drop.y += drop.speed * delta;
      drop.x += Math.sin(drop.age * .9) * drop.sway * delta;
      if (drop.speed > 25) {
        const trail = context.createLinearGradient(drop.x, drop.y - drop.radius * 5, drop.x, drop.y);
        trail.addColorStop(0, "rgba(190,220,224,0)");
        trail.addColorStop(1, `rgba(210,235,238,${drop.alpha * .23})`);
        context.strokeStyle = trail;
        context.lineWidth = Math.max(1, drop.radius * .28);
        context.beginPath();
        context.moveTo(drop.x, drop.y - drop.radius * 5);
        context.lineTo(drop.x, drop.y - drop.radius * 1.1);
        context.stroke();
      }
      drawRefractedDrop(drop);
      if (drop.y - drop.radius > height || drop.age > drop.life) lensDrops[index] = makeLensDrop(false);
    });
  }

  function drawSnow(delta, time) {
    const breeze = Math.sin(time * .00032) * 22;
    snowflakes.forEach((flake, index) => {
      flake.y += flake.speed * delta;
      flake.phase += delta * (1.1 + flake.depth);
      flake.x += (flake.drift + breeze + Math.sin(flake.phase) * flake.wobble) * delta;
      if (flake.y - flake.size > height || flake.x < -60 || flake.x > width + 60) snowflakes[index] = makeSnowflake(false);
      context.save();
      context.globalAlpha = Math.min(.96, flake.alpha);
      context.fillStyle = flake.depth > .64 ? "rgba(255,255,255,.96)" : "rgba(232,241,243,.82)";
      context.shadowColor = flake.depth > .72 ? "rgba(255,255,255,.58)" : "rgba(215,231,234,.26)";
      context.shadowBlur = flake.depth * 5.5;
      context.translate(flake.x, flake.y);
      context.rotate(flake.phase * .35);
      context.beginPath();
      context.ellipse(0, 0, flake.size, flake.size * flake.aspect, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    });
  }

  function drawFrame(delta, time) {
    context.clearRect(0, 0, width, height);
    if (rainStates.has(state)) drawRain(delta);
    if (snowStates.has(state)) drawSnow(delta, time);
  }

  function animate(time) {
    const delta = Math.min(.034, Math.max(0, (time - lastTime) / 1000 || 0));
    lastTime = time;
    if (isVisible) drawFrame(delta, time);
    frame = requestAnimationFrame(animate);
  }

  const weatherObserver = new MutationObserver(() => {
    const nextState = section.dataset.weather || "cloudy";
    if (nextState !== state) resetParticles();
  });
  weatherObserver.observe(section, { attributes: true, attributeFilter: ["data-weather", "data-daylight"] });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => { isVisible = entry.isIntersecting; }, { rootMargin: "150px 0px" }).observe(visual);
  }
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(visual);
  else window.addEventListener("resize", resize, { passive: true });

  section.classList.add("weather-canvas-ready");
  resize();
  if (!reduceMotion) frame = requestAnimationFrame(animate);

  window.addEventListener("pagehide", () => {
    cancelAnimationFrame(frame);
    weatherObserver.disconnect();
  }, { once: true });
})();
