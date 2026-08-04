(function initializeDearWeatherCard() {
  "use strict";

  const section = document.getElementById("about");
  const icon = document.getElementById("weatherCardIcon");
  const date = document.getElementById("weatherCardDate");
  const label = document.getElementById("weatherCardLabel");
  const message = document.getElementById("weatherCardMessage");
  if (!section || !icon || !date || !label || !message) return;

  const WEATHER_REFRESH_INTERVAL = 30 * 60 * 1000;
  const previewParams = new URLSearchParams(window.location.search);
  const previewState = previewParams.get("weather-preview");
  const previewDaylight = previewParams.get("weather-time");
  const WEATHER = {
    sunny: {
      label: "맑음",
      message: "햇살이 좋은 날이에요. 디어한의원에 오시는 길도 가볍고 산뜻하길 바라요!",
      icon: `
        <svg viewBox="0 0 64 64" role="presentation">
          <g class="weather-icon__sun" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.4">
            <circle cx="32" cy="32" r="10" fill="#f2c66d" stroke="#d9a84b" />
            <path d="M32 9v7M32 48v7M9 32h7M48 32h7M15.7 15.7l5 5M43.3 43.3l5 5M48.3 15.7l-5 5M20.7 43.3l-5 5" />
          </g>
        </svg>`,
    },
    cloudy: {
      label: "흐림",
      message: "구름이 많은 날이에요. 디어한의원에 오실 때 작은 우산 하나 챙겨두면 든든해요!",
      icon: `
        <svg viewBox="0 0 64 64" role="presentation">
          <g class="weather-icon__cloud" fill="#e7ece8" stroke="currentColor" stroke-linejoin="round" stroke-width="2.2">
            <path d="M17 45h30a9 9 0 0 0 .6-18A15.5 15.5 0 0 0 18.2 24 10.5 10.5 0 0 0 17 45Z" />
          </g>
        </svg>`,
    },
    rain: {
      label: "비",
      message: "비가 내리고 있어요. 디어한의원에 오실 때 우산 꼭 챙기시고, 빗길은 천천히 걸어오세요!",
      icon: `
        <svg viewBox="0 0 64 64" role="presentation">
          <g class="weather-icon__cloud" fill="#e7ece8" stroke="currentColor" stroke-linejoin="round" stroke-width="2.2">
            <path d="M17 39h30a8.5 8.5 0 0 0 .5-17A15 15 0 0 0 19 20a10 10 0 0 0-2 19Z" />
          </g>
          <g class="weather-icon__rain" stroke="#5f95a7" stroke-linecap="round" stroke-width="2.4">
            <path d="M23 46l-2 6M34 46l-2 6M45 46l-2 6" />
          </g>
        </svg>`,
    },
    "heavy-rain": {
      label: "강한 비",
      message: "비가 강하게 내리고 있어요. 우산을 꼭 챙기시고, 이동하실 때 빗길과 차량을 평소보다 더 주의해 주세요!",
      icon: `
        <svg viewBox="0 0 64 64" role="presentation">
          <g class="weather-icon__cloud" fill="#dfe7e3" stroke="currentColor" stroke-linejoin="round" stroke-width="2.2">
            <path d="M17 38h30a8.5 8.5 0 0 0 .5-17A15 15 0 0 0 19 19a10 10 0 0 0-2 19Z" />
          </g>
          <g class="weather-icon__rain" stroke="#4f8496" stroke-linecap="round" stroke-width="3">
            <path d="M20 45l-3 9M31 45l-3 9M42 45l-3 9M51 44l-3 9" />
          </g>
        </svg>`,
    },
    snow: {
      label: "눈",
      message: "눈이 내리고 있어요. 디어한의원에 오시는 길이 미끄러울 수 있으니, 천천히 조심해서 오세요!",
      icon: `
        <svg viewBox="0 0 64 64" role="presentation">
          <g class="weather-icon__cloud" fill="#f3f5f2" stroke="currentColor" stroke-linejoin="round" stroke-width="2.2">
            <path d="M17 38h30a8.5 8.5 0 0 0 .5-17A15 15 0 0 0 19 19a10 10 0 0 0-2 19Z" />
          </g>
          <g class="weather-icon__snow" fill="#8eb5bf">
            <circle cx="22" cy="48" r="2" /><circle cx="34" cy="45" r="2" /><circle cx="45" cy="50" r="2" />
          </g>
        </svg>`,
    },
    "heavy-snow": {
      label: "많은 눈",
      message: "눈이 많이 내리고 있어요. 미끄럽지 않은 신발을 챙기시고, 평소보다 여유 있게 출발해 주세요!",
      icon: `
        <svg viewBox="0 0 64 64" role="presentation">
          <g class="weather-icon__cloud" fill="#f3f5f2" stroke="currentColor" stroke-linejoin="round" stroke-width="2.2">
            <path d="M17 37h30a8.5 8.5 0 0 0 .5-17A15 15 0 0 0 19 18a10 10 0 0 0-2 19Z" />
          </g>
          <g class="weather-icon__snow" fill="#8eb5bf">
            <circle cx="18" cy="47" r="2.2" /><circle cx="29" cy="44" r="2.2" /><circle cx="40" cy="49" r="2.2" /><circle cx="50" cy="44" r="2.2" /><circle cx="26" cy="55" r="2.2" /><circle cx="45" cy="56" r="2.2" />
          </g>
        </svg>`,
    },
    "strong-wind": {
      label: "강한 바람",
      message: "바람이 강하게 불고 있어요. 이동하실 때 간판과 낙하물에 주의하시고, 겉옷도 단단히 여며주세요!",
      icon: `
        <svg viewBox="0 0 64 64" role="presentation" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.4">
          <path d="M12 25h29c8 0 8-10 1-10-4 0-6 2-7 5M12 34h37c8 0 8 11 0 11-4 0-6-2-7-5M12 43h20" />
        </svg>`,
    },
    storm: {
      label: "천둥·번개",
      message: "천둥번개가 있는 날이에요. 디어한의원에 오시기 전 날씨를 한 번 더 살펴보고 출발해 주세요!",
      icon: `
        <svg viewBox="0 0 64 64" role="presentation">
          <g class="weather-icon__cloud" fill="#dfe7e3" stroke="currentColor" stroke-linejoin="round" stroke-width="2.2">
            <path d="M17 38h30a8.5 8.5 0 0 0 .5-17A15 15 0 0 0 19 19a10 10 0 0 0-2 19Z" />
          </g>
          <path class="weather-icon__bolt" d="M34 41l-6 10h6l-2 9 9-13h-6l3-6Z" fill="#d7aa45" />
        </svg>`,
    },
  };

  function todayInKorea() {
    const parts = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}.${values.month}.${values.day}`;
  }

  function applyWeather(data) {
    const state = WEATHER[previewState] ? previewState : (WEATHER[data?.state] ? data.state : "cloudy");
    const content = WEATHER[state];
    section.dataset.weather = state;
    section.dataset.daylight = previewDaylight === "night" || (previewDaylight !== "day" && data?.isDay === false) ? "night" : "day";
    section.dataset.weatherStatus = WEATHER[previewState] ? "preview" : "ready";
    date.textContent = todayInKorea();
    label.textContent = content.label;
    message.textContent = content.message;
    icon.innerHTML = content.icon;
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
      applyWeather(await response.json());
    } catch {
      section.dataset.weatherStatus = "fallback";
    } finally {
      window.clearTimeout(timeout);
    }
  }

  applyWeather({ state: "cloudy" });
  refreshWeather();
  window.setInterval(refreshWeather, WEATHER_REFRESH_INTERVAL);
})();
