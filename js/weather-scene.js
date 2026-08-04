(function initializeDearWeatherScene() {
  "use strict";

  const section = document.getElementById("about");
  const canvas = document.getElementById("aboutWeatherCanvas");
  if (!section || !canvas) return;

  const WEATHER_REFRESH_INTERVAL = 30 * 60 * 1000;
  const WEATHER_VALUES = { sunny: 0, rain: 1, snow: 2, storm: 3, cloudy: 4 };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let currentWeather = "cloudy";
  let isDaylight = true;
  let sceneIsVisible = true;
  let gl = null;
  let program = null;
  let animationFrame = 0;
  let renderStart = performance.now();
  let pointer = { x: 0.5, y: 0.5 };
  let pointerTarget = { x: 0.5, y: 0.5 };
  let uniforms = null;

  function applyWeather(weather) {
    currentWeather = WEATHER_VALUES[weather?.state] === undefined ? "cloudy" : weather.state;
    isDaylight = weather?.isDay !== false;
    section.dataset.weather = currentWeather;
    section.dataset.daylight = isDaylight ? "day" : "night";
    section.dataset.weatherStatus = "ready";
    renderOnce();
  }

  async function refreshWeather() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 7000);

    try {
      const response = await fetch(`weather-data.json?t=${Date.now()}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);
      const data = await response.json();
      if (!data?.state) throw new Error("Weather response did not include current conditions");
      applyWeather(data);
    } catch {
      section.dataset.weatherStatus = "fallback";
    } finally {
      window.clearTimeout(timeout);
    }
  }

  const vertexSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    precision highp float;
    uniform vec2 u_resolution;
    uniform vec2 u_pointer;
    uniform float u_time;
    uniform float u_weather;
    uniform float u_daylight;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    vec2 hash22(vec2 p) {
      float n = hash21(p);
      return vec2(n, hash21(p + n + 19.19));
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
        mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0)), f.x),
        f.y
      );
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.52;
      mat2 turn = mat2(0.82, -0.57, 0.57, 0.82);
      for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p = turn * p * 2.03 + 7.17;
        amplitude *= 0.48;
      }
      return value;
    }

    float cloudField(vec2 p, float scale, float speed, float layer) {
      vec2 q = p * scale;
      q.x += u_time * speed + layer * 8.4;
      q.y += sin(q.x * 0.17 + layer) * 0.18;
      float base = fbm(q);
      float detail = fbm(q * 2.35 - u_time * speed * 0.33);
      return smoothstep(0.47 + layer * 0.015, 0.78, base * 0.76 + detail * 0.36);
    }

    vec3 skyScene(vec2 uv, vec2 camera) {
      vec2 p = uv + camera * vec2(0.045, 0.028);
      float horizon = clamp(p.y * 0.5 + 0.54, 0.0, 1.0);
      bool sunny = u_weather < 0.5;
      bool rainy = u_weather > 0.5 && u_weather < 1.5;
      bool snowy = u_weather > 1.5 && u_weather < 2.5;
      bool stormy = u_weather > 2.5 && u_weather < 3.5;
      bool cloudy = u_weather > 3.5;

      vec3 top = sunny ? vec3(0.34, 0.57, 0.68) : rainy ? vec3(0.25, 0.36, 0.41) : snowy ? vec3(0.46, 0.61, 0.67) : stormy ? vec3(0.11, 0.17, 0.21) : vec3(0.34, 0.42, 0.44);
      vec3 bottom = sunny ? vec3(0.76, 0.84, 0.85) : rainy ? vec3(0.57, 0.65, 0.66) : snowy ? vec3(0.81, 0.86, 0.86) : stormy ? vec3(0.37, 0.44, 0.45) : vec3(0.68, 0.72, 0.71);
      vec3 color = mix(bottom, top, smoothstep(0.0, 1.0, horizon));

      vec2 sunPosition = vec2(-0.88, 0.72) + camera * 0.06;
      float sunDistance = length(p - sunPosition);
      float sunDisk = 1.0 - smoothstep(0.028, 0.075, sunDistance);
      float sunGlow = exp(-sunDistance * 4.8);
      if (sunny && u_daylight > 0.5) {
        color += vec3(0.94, 0.97, 0.98) * sunGlow * 0.08;
        color = mix(color, vec3(0.98, 0.98, 0.95), sunDisk * 0.18);
      }

      float farCloud = cloudField(p + vec2(0.0, 0.27), 1.45, 0.009, 0.0);
      float midCloud = cloudField(p + vec2(0.0, 0.08), 2.05, -0.014, 1.0);
      float nearCloud = cloudField(p - vec2(0.0, 0.18), 2.8, 0.022, 2.0);
      float cloudAmount = sunny ? 0.37 : cloudy ? 0.9 : snowy ? 0.86 : 1.0;
      vec3 lightCloud = sunny ? vec3(0.88, 0.91, 0.90) : snowy ? vec3(0.84, 0.88, 0.89) : vec3(0.58, 0.64, 0.65);
      vec3 darkCloud = stormy ? vec3(0.12, 0.16, 0.18) : rainy ? vec3(0.29, 0.34, 0.35) : cloudy ? vec3(0.38, 0.44, 0.45) : vec3(0.51, 0.57, 0.58);
      color = mix(color, lightCloud, farCloud * cloudAmount * 0.48);
      color = mix(color, mix(darkCloud, lightCloud, 0.52), midCloud * cloudAmount * 0.62);
      color = mix(color, darkCloud, nearCloud * cloudAmount * (sunny ? 0.15 : 0.55));

      float depthHaze = smoothstep(-0.55, 0.2, -p.y);
      color = mix(color, bottom, depthHaze * 0.22);
      if (stormy) {
        float pulse = smoothstep(0.985, 1.0, sin(u_time * 1.13 + 1.1)) * smoothstep(0.75, 1.0, noise(vec2(floor(u_time * 0.7))));
        color += vec3(0.82, 0.85, 0.86) * pulse * (0.09 + farCloud * 0.07);
      }

      if (u_daylight < 0.5) {
        vec3 nightTop = vec3(0.045, 0.075, 0.11);
        vec3 nightBottom = vec3(0.12, 0.17, 0.20);
        vec3 night = mix(nightBottom, nightTop, smoothstep(0.0, 1.0, horizon));
        color = mix(color, night, 0.68);
      }
      return color;
    }

    float rainLayer(vec2 uv, float depth) {
      vec2 p = uv;
      p.x += p.y * 0.18;
      p *= vec2(34.0 - depth * 15.0, 9.0 + depth * 4.0);
      p.y += u_time * (8.5 + depth * 5.0);
      vec2 id = floor(p);
      vec2 cell = fract(p) - 0.5;
      float randomValue = hash21(id + depth * 91.7);
      cell.x += (randomValue - 0.5) * 0.72;
      float streak = (1.0 - smoothstep(0.0, 0.035 + depth * 0.02, abs(cell.x))) * (1.0 - smoothstep(-0.22, 0.48, cell.y));
      return streak * step(0.72 - depth * 0.12, randomValue);
    }

    float snowLayer(vec2 uv, float depth) {
      vec2 p = uv * (7.0 + depth * 12.0);
      p.y += u_time * (0.32 + depth * 0.72);
      p.x += sin(p.y * 0.7 + u_time + depth * 8.0) * 0.16;
      vec2 id = floor(p);
      vec2 cell = fract(p) - 0.5;
      vec2 offset = hash22(id + depth * 17.0) - 0.5;
      float distanceToFlake = length(cell - offset * 0.65);
      return (1.0 - smoothstep(0.025, 0.11 + depth * 0.05, distanceToFlake)) * step(0.42, hash21(id + 4.7));
    }

    vec3 lensDroplets(vec2 uv, out vec2 distortion, out float highlight) {
      distortion = vec2(0.0);
      highlight = 0.0;
      float mask = 0.0;
      for (int layer = 0; layer < 2; layer++) {
        float scale = layer == 0 ? 5.5 : 9.5;
        vec2 grid = uv * scale + vec2(float(layer) * 8.2, float(layer) * 3.7);
        vec2 id = floor(grid);
        vec2 cell = fract(grid) - 0.5;
        vec2 seed = (hash22(id) - 0.5) * 0.68;
        vec2 q = cell - seed;
        q.y *= 0.76;
        float radius = 0.12 + hash21(id + 2.4) * 0.13;
        float dropDistance = length(q);
        float drop = (1.0 - smoothstep(radius - 0.035, radius, dropDistance)) * step(0.56, hash21(id + 8.1));
        vec2 normal = normalize(q + 0.0001) * sqrt(max(0.0, 1.0 - dropDistance / max(radius, 0.001)));
        distortion += normal * drop * (0.012 + float(layer) * 0.005);
        highlight += (1.0 - smoothstep(radius * 0.28, radius * 0.78, dropDistance)) * (1.0 - smoothstep(-0.3, 0.2, q.x + q.y)) * drop;
        mask = max(mask, drop);
      }
      return vec3(mask);
    }

    void main() {
      vec2 fragment = gl_FragCoord.xy;
      vec2 uv = (fragment * 2.0 - u_resolution.xy) / u_resolution.y;
      vec2 camera = (u_pointer - 0.5) * 2.0;
      bool wet = (u_weather > 0.5 && u_weather < 1.5) || (u_weather > 2.5 && u_weather < 3.5);
      vec2 distortion;
      float dropHighlight;
      vec3 dropMask = lensDroplets(uv + vec2(0.0, u_time * 0.006), distortion, dropHighlight);
      if (!wet) distortion = vec2(0.0);

      vec3 color = skyScene(uv + distortion, camera);
      if (wet) {
        float rain = rainLayer(uv, 0.15) * 0.28 + rainLayer(uv, 0.58) * 0.44 + rainLayer(uv, 0.92) * 0.68;
        color += vec3(0.72, 0.80, 0.82) * rain * 0.58;
        color = mix(color, vec3(0.72, 0.79, 0.80), dropMask.x * 0.025);
        color += vec3(0.9) * dropHighlight * 0.07;
      }
      if (u_weather > 1.5 && u_weather < 2.5) {
        float snow = snowLayer(uv, 0.12) * 0.42 + snowLayer(uv, 0.5) * 0.68 + snowLayer(uv, 0.92);
        color = mix(color, vec3(0.93, 0.95, 0.95), clamp(snow * 0.78, 0.0, 0.82));
      }

      float vignette = 1.0 - smoothstep(0.35, 1.65, length(uv * vec2(0.72, 1.0)));
      color *= mix(0.91, 1.0, vignette);
      color = pow(color, vec3(1.01));
      if (u_weather < 0.5) {
        float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
        color = mix(color, vec3(luminance), 0.08);
        color = mix(color, vec3(0.90, 0.96, 0.98), 0.045);
      }
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || "Weather shader compilation failed");
    }
    return shader;
  }

  function initializeWebGL() {
    if (reduceMotion) return false;
    gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
    });
    if (!gl) return false;

    try {
      program = gl.createProgram();
      gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentSource));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || "Weather shader linking failed");
      }

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      gl.useProgram(program);
      const position = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      uniforms = {
        resolution: gl.getUniformLocation(program, "u_resolution"),
        pointer: gl.getUniformLocation(program, "u_pointer"),
        time: gl.getUniformLocation(program, "u_time"),
        weather: gl.getUniformLocation(program, "u_weather"),
        daylight: gl.getUniformLocation(program, "u_daylight"),
      };
      section.classList.add("is-weather-ready");
      return true;
    } catch {
      gl = null;
      section.dataset.weatherStatus = "fallback";
      return false;
    }
  }

  function resizeCanvas() {
    if (!gl) return;
    const bounds = section.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, window.innerWidth <= 768 ? 1 : 1.35);
    const width = Math.max(1, Math.round(bounds.width * pixelRatio));
    const height = Math.max(1, Math.round(bounds.height * pixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  function drawFrame(now) {
    if (!gl || !uniforms) return;
    resizeCanvas();
    pointer.x += (pointerTarget.x - pointer.x) * 0.035;
    pointer.y += (pointerTarget.y - pointer.y) * 0.035;
    gl.useProgram(program);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform2f(uniforms.pointer, pointer.x, pointer.y);
    gl.uniform1f(uniforms.time, (now - renderStart) * 0.001);
    gl.uniform1f(uniforms.weather, WEATHER_VALUES[currentWeather] ?? WEATHER_VALUES.cloudy);
    gl.uniform1f(uniforms.daylight, isDaylight ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function shouldAnimate() {
    return Boolean(gl && sceneIsVisible && !document.hidden && !reduceMotion);
  }

  function animate(now) {
    animationFrame = 0;
    if (!shouldAnimate()) return;
    drawFrame(now);
    animationFrame = window.requestAnimationFrame(animate);
  }

  function startAnimation() {
    if (shouldAnimate() && !animationFrame) animationFrame = window.requestAnimationFrame(animate);
  }

  function stopAnimation() {
    if (!animationFrame) return;
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  function renderOnce() {
    if (!gl) return;
    drawFrame(performance.now());
    startAnimation();
  }

  section.addEventListener("pointermove", (event) => {
    const bounds = section.getBoundingClientRect();
    pointerTarget.x = (event.clientX - bounds.left) / bounds.width;
    pointerTarget.y = 1 - (event.clientY - bounds.top) / bounds.height;
  });
  section.addEventListener("pointerleave", () => {
    pointerTarget = { x: 0.5, y: 0.5 };
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAnimation();
    else startAnimation();
  });

  window.addEventListener("resize", renderOnce);
  window.addEventListener("pagehide", stopAnimation, { once: true });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    stopAnimation();
    section.classList.remove("is-weather-ready");
    section.dataset.weatherStatus = "fallback";
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      sceneIsVisible = entries[0]?.isIntersecting ?? true;
      if (sceneIsVisible) startAnimation();
      else stopAnimation();
    }, { rootMargin: "160px 0px", threshold: 0.01 });
    observer.observe(section);
  }

  section.dataset.weatherStatus = "fallback";

  if (initializeWebGL()) {
    renderStart = performance.now();
    resizeCanvas();
    renderOnce();
  }

  refreshWeather();
  window.setInterval(refreshWeather, WEATHER_REFRESH_INTERVAL);
})();
