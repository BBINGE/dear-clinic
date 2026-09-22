(function initializeDearWeatherCard() {
  "use strict";

  const section = document.getElementById("about");
  const icon = document.getElementById("weatherCardIcon");
  const date = document.getElementById("weatherCardDate");
  const label = document.getElementById("weatherCardLabel");
  const message = document.getElementById("weatherCardMessage");
  const source = document.getElementById("weatherCardSource");
  if (!section || !icon || !date || !label || !message) return;

  const WEATHER_REFRESH_INTERVAL = 10 * 60 * 1000;
  const MAX_KMA_AGE = 2 * 60 * 60 * 1000;
  const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast?latitude=37.4918829&longitude=127.0252346&current=temperature_2m,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m&temperature_unit=celsius&wind_speed_unit=ms&timezone=Asia%2FSeoul";
  const previewParams = new URLSearchParams(window.location.search);
  const previewState = previewParams.get("weather-preview");
  const previewDaylight = previewParams.get("weather-time");
  const previewTemperature = Number.parseFloat(previewParams.get("weather-temp"));
  const WEATHER = {
    sunny: {
      label: "맑음",
      message: ["서초동에 기분 좋은 햇살이 비치고 있어요.", "디어한의원에 오시는 길도 가볍고 산뜻하시길 바라요."],
      nightLabel: "맑은 밤",
      nightMessage: ["서초동의 밤하늘이 맑아요.", "디어한의원에 오실 때 주변을 천천히 살펴 안전하게 오세요."],
      icon: `
        <svg viewBox="0 0 64 64" role="presentation">
          <g class="weather-icon__sun" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.4">
            <circle cx="32" cy="32" r="10" fill="#f2c66d" stroke="#d9a84b" />
            <path d="M32 9v7M32 48v7M9 32h7M48 32h7M15.7 15.7l5 5M43.3 43.3l5 5M48.3 15.7l-5 5M20.7 43.3l-5 5" />
          </g>
        </svg>`,
    },
    "mostly-cloudy": {
      label: "구름 많음",
      message: ["서초동 하늘에 구름이 많이 지나고 있어요.", "비 소식이 없다면 평소처럼 편안히 오셔도 좋아요."],
      icon: `
        <svg viewBox="0 0 64 64" role="presentation">
          <g class="weather-icon__cloud" fill="#edf1ee" stroke="currentColor" stroke-linejoin="round" stroke-width="2.2">
            <path d="M17 45h30a9 9 0 0 0 .6-18A15.5 15.5 0 0 0 18.2 24 10.5 10.5 0 0 0 17 45Z" />
          </g>
        </svg>`,
    },
    cloudy: {
      label: "흐림",
      message: ["서초동 하늘이 흐리지만 지금 확인된 비는 없어요.", "디어한의원에 오시는 길은 평소처럼 천천히 살펴주세요."],
      icon: `
        <svg viewBox="0 0 64 64" role="presentation">
          <g class="weather-icon__cloud" fill="#e7ece8" stroke="currentColor" stroke-linejoin="round" stroke-width="2.2">
            <path d="M17 45h30a9 9 0 0 0 .6-18A15.5 15.5 0 0 0 18.2 24 10.5 10.5 0 0 0 17 45Z" />
          </g>
        </svg>`,
    },
    rain: {
      label: "비",
      message: ["서초동에 비가 내리고 있어요.", "디어한의원에 오실 때 우산을 챙기고 빗길은 천천히 걸어오세요."],
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
      message: ["서초동에 비가 제법 세차게 내리고 있어요.", "디어한의원에 오실 때 빗길과 지나가는 차량을 조심해 주세요."],
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
      message: ["서초동에 눈이 소복소복 내리고 있어요.", "디어한의원에 오시는 길이 미끄러울 수 있으니 천천히 걸어오세요."],
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
      message: ["서초동에 눈이 많이 쌓이고 있어요.", "디어한의원에 오실 때 미끄럽지 않은 신발로 조금 여유 있게 출발해 주세요."],
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
      message: ["서초동에 바람이 세차게 불고 있어요.", "디어한의원에 오시는 길에는 주변을 살피고 겉옷을 단단히 여며주세요."],
      icon: `
        <svg viewBox="0 0 64 64" role="presentation" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.4">
          <path d="M12 25h29c8 0 8-10 1-10-4 0-6 2-7 5M12 34h37c8 0 8 11 0 11-4 0-6-2-7-5M12 43h20" />
        </svg>`,
    },
    storm: {
      label: "천둥·번개",
      message: ["서초동에 천둥과 번개가 나타나고 있어요.", "디어한의원에 오시기 전 날씨와 이동 상황을 한 번 더 살펴봐 주세요."],
      icon: `
        <svg viewBox="0 0 64 64" role="presentation">
          <g class="weather-icon__cloud" fill="#dfe7e3" stroke="currentColor" stroke-linejoin="round" stroke-width="2.2">
            <path d="M17 38h30a8.5 8.5 0 0 0 .5-17A15 15 0 0 0 19 19a10 10 0 0 0-2 19Z" />
          </g>
          <path class="weather-icon__bolt" d="M34 41l-6 10h6l-2 9 9-13h-6l3-6Z" fill="#d7aa45" />
        </svg>`,
    },
  };

  // 외국어 홈도 같은 날씨 카드를 쓴다. 한국어 문구는 위 WEATHER가 원본이고, 외국어는 그 뜻을 옮긴 것이다.
  const pageLang = (document.documentElement.lang || "ko").toLowerCase();
  const LOCALE = pageLang.startsWith("ja") ? "ja" : pageLang.startsWith("zh") ? "zh" : pageLang.startsWith("en") ? "en" : "ko";
  const LOCALIZED = {
    en: {
      states: {
        sunny: ["Sunny", ["Warm sunlight is falling on Seocho-dong.", "We hope your way to DEAR feels light and easy."], "Clear night", ["The night sky over Seocho-dong is clear.", "Take your time and come to DEAR safely."]],
        "mostly-cloudy": ["Mostly cloudy", ["Plenty of clouds are drifting over Seocho-dong.", "If no rain is on the way, come as you usually would."]],
        cloudy: ["Cloudy", ["The sky over Seocho-dong is grey, but no rain has been reported.", "Take your usual care on the way to DEAR."]],
        rain: ["Rain", ["It is raining in Seocho-dong.", "Bring an umbrella and walk slowly on wet streets."]],
        "heavy-rain": ["Heavy rain", ["It is raining quite hard in Seocho-dong.", "Please watch for slippery roads and passing cars."]],
        snow: ["Snow", ["Snow is softly falling in Seocho-dong.", "The way may be slippery, so please walk slowly."]],
        "heavy-snow": ["Heavy snow", ["Snow is piling up in Seocho-dong.", "Wear non-slip shoes and give yourself a little extra time."]],
        "strong-wind": ["Strong wind", ["Strong winds are blowing in Seocho-dong.", "Watch your surroundings and button up your coat."]],
        storm: ["Thunderstorm", ["There is thunder and lightning in Seocho-dong.", "Please check the weather and traffic once more before you set out."]],
      },
      hotNight: ["Hot night", (t) => [`Even at night, it is ${t}°C in Seocho-dong.`, "Take it slow. A cool breeze is waiting at DEAR."]],
      veryHot: ["Very hot", (t) => [`It is ${t}°C in Seocho-dong today, with strong midday heat.`, "Bring some water and take it slow. Cool down first when you arrive."]],
      hot: (t) => [`It is ${t}°C in Seocho-dong today, a hot day.`, "Bring some water. A cool room is waiting at DEAR."],
      veryCold: (t) => [`It is ${t}°C in Seocho-dong today, very cold.`, "Dress warmly and come warm up inside DEAR."],
      cold: (t) => [`It is ${t}°C in Seocho-dong today, a cold day.`, "Wrap up well. We will welcome you warmly at DEAR."],
      source: (src, time) => `Seocho-dong · ${src}${time ? ` · as of ${time}` : ""}`,
      sources: { kma: "Korea Meteorological Administration", openMeteo: "Open-Meteo current weather", current: "Current weather", updating: "Updating weather" },
    },
    ja: {
      states: {
        sunny: ["晴れ", ["瑞草洞に心地よい日差しが差しています。", "DEAR韓医院までの道のりも、軽やかでありますように。"], "晴れた夜", ["瑞草洞の夜空は澄んでいます。", "周りに気をつけて、ゆっくりお越しください。"]],
        "mostly-cloudy": ["曇りがち", ["瑞草洞の空を雲がたくさん流れています。", "雨の予報がなければ、いつも通り気軽にお越しください。"]],
        cloudy: ["くもり", ["瑞草洞の空は曇っていますが、今のところ雨は確認されていません。", "いつも通り、足元に気をつけてお越しください。"]],
        rain: ["雨", ["瑞草洞では雨が降っています。", "傘をお持ちになり、濡れた道はゆっくり歩いてお越しください。"]],
        "heavy-rain": ["強い雨", ["瑞草洞ではかなり強い雨が降っています。", "滑りやすい道と通行する車にご注意ください。"]],
        snow: ["雪", ["瑞草洞に雪がしんしんと降っています。", "道が滑りやすいので、ゆっくり歩いてお越しください。"]],
        "heavy-snow": ["大雪", ["瑞草洞では雪がたくさん積もっています。", "滑りにくい靴で、少し余裕をもってお出かけください。"]],
        "strong-wind": ["強風", ["瑞草洞では強い風が吹いています。", "周りに気をつけ、上着をしっかり閉じてお越しください。"]],
        storm: ["雷", ["瑞草洞で雷が発生しています。", "お出かけ前に、天気と交通状況をもう一度ご確認ください。"]],
      },
      hotNight: ["暑い夜", (t) => [`夜になっても瑞草洞は${t}°Cと高めです。`, "ゆっくりお越しください。DEARの涼しい風がお待ちしています。"]],
      veryHot: ["猛暑", (t) => [`今日の瑞草洞は${t}°C、日中の暑さがとても厳しいです。`, "お水を持ってゆっくりお越しください。到着されたら、まず涼んでください。"]],
      hot: (t) => [`今日の瑞草洞は${t}°Cの暑い日です。`, "お水をお持ちください。DEARの涼しい室内がお待ちしています。"],
      veryCold: (t) => [`今日の瑞草洞は${t}°Cと、とても寒いです。`, "暖かくしてお越しください。DEARの室内で体を温めてください。"],
      cold: (t) => [`今日の瑞草洞は${t}°Cの寒い日です。`, "襟元をしっかり閉じてお越しください。DEARで温かくお迎えします。"],
      source: (src, time) => `瑞草洞 · ${src}${time ? ` · ${time}時点` : ""}`,
      sources: { kma: "韓国気象庁", openMeteo: "Open-Meteo 現在の天気", current: "現在の天気", updating: "天気を更新中" },
    },
    zh: {
      states: {
        sunny: ["晴", ["瑞草洞阳光正好。", "愿您来DEAR韩医院的路上也一身轻快。"], "晴朗的夜晚", ["瑞草洞夜空晴朗。", "来院路上请留意四周，慢慢走，平安到达。"]],
        "mostly-cloudy": ["多云", ["瑞草洞上空云层较多。", "若没有降雨，像平常一样放心前来就好。"]],
        cloudy: ["阴", ["瑞草洞天色阴沉，目前还没有下雨。", "来院路上，像平常一样慢慢走就好。"]],
        rain: ["雨", ["瑞草洞正在下雨。", "记得带伞，雨天路滑，请慢慢走。"]],
        "heavy-rain": ["大雨", ["瑞草洞雨势较大。", "来院路上请当心湿滑路面和过往车辆。"]],
        snow: ["雪", ["瑞草洞正飘着雪。", "路面可能湿滑，请慢慢走。"]],
        "heavy-snow": ["大雪", ["瑞草洞积雪较深。", "请穿防滑的鞋，稍早一些出发。"]],
        "strong-wind": ["大风", ["瑞草洞风很大。", "来院路上请留意四周，把外套裹紧。"]],
        storm: ["雷电", ["瑞草洞正有雷电。", "出发前请再确认一下天气与交通情况。"]],
      },
      hotNight: ["闷热的夜晚", (t) => [`入夜后，瑞草洞仍有${t}°C。`, "请慢慢来，DEAR的凉风在等您。"]],
      veryHot: ["酷热", (t) => [`今天瑞草洞${t}°C，午间热浪逼人。`, "记得带瓶水，慢慢来，到了先在院里消消暑。"]],
      hot: (t) => [`今天瑞草洞${t}°C，是个大热天。`, "记得带水，DEAR清凉的室内在等您。"],
      veryCold: (t) => [`今天瑞草洞${t}°C，格外寒冷。`, "请穿暖和些，慢慢来，到DEAR的室内暖暖身子。"],
      cold: (t) => [`今天瑞草洞${t}°C，天气寒冷。`, "出门请多穿一点，DEAR会暖暖地迎接您。"],
      source: (src, time) => `瑞草洞 · ${src}${time ? ` · ${time}观测` : ""}`,
      sources: { kma: "韩国气象厅", openMeteo: "Open-Meteo 实时天气", current: "实时天气", updating: "天气更新中" },
    },
  }[LOCALE];

  if (LOCALIZED) {
    Object.entries(LOCALIZED.states).forEach(([state, [stateLabel, stateMessage, nightLabel, nightMessage]]) => {
      Object.assign(WEATHER[state], { label: stateLabel, message: stateMessage });
      if (nightLabel) Object.assign(WEATHER[state], { nightLabel, nightMessage });
    });
  }

  function localizedSource(value) {
    if (!LOCALIZED) return value;
    if (!value || value === "현재 날씨") return LOCALIZED.sources.current;
    if (value.startsWith("기상청")) return LOCALIZED.sources.kma;
    if (value.startsWith("Open-Meteo")) return LOCALIZED.sources.openMeteo;
    if (value === "날씨 갱신 중") return LOCALIZED.sources.updating;
    return value;
  }

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

  function compactKoreaTime(value) {
    const match = String(value || "").match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/);
    if (!match) return null;
    const [, year, month, day, hour, minute] = match;
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:00+09:00`);
  }

  function classifyOpenMeteo(current) {
    const code = Number(current.weather_code);
    const precipitation = Number(current.precipitation) || 0;
    const windSpeed = Number(current.wind_speed_10m) || 0;
    if ([95, 96, 99].includes(code)) return "storm";
    if (windSpeed >= 14) return "strong-wind";
    if ([71, 73, 75, 77, 85, 86].includes(code)) {
      return [75, 77, 86].includes(code) ? "heavy-snow" : "snow";
    }
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
      return [55, 57, 65, 67, 82].includes(code) || precipitation >= 5 ? "heavy-rain" : "rain";
    }
    if (code <= 1) return "sunny";
    if (code === 2) return "mostly-cloudy";
    return "cloudy";
  }

  function normalizeOpenMeteo(payload) {
    const current = payload?.current;
    if (!current || !Number.isFinite(Number(current.temperature_2m))) {
      throw new Error("Open-Meteo response contained no current temperature");
    }
    return {
      state: classifyOpenMeteo(current),
      isDay: Number(current.is_day) === 1,
      temperature: Number(current.temperature_2m),
      hourlyRain: Number(current.precipitation) || 0,
      windSpeed: Number(current.wind_speed_10m) || 0,
      observedAt: String(current.time || "").replace(/\D/g, ""),
      source: "Open-Meteo 현재 날씨",
    };
  }

  function isRecentKmaData(data) {
    const observed = compactKoreaTime(data?.observedAt);
    return observed && Date.now() - observed.getTime() <= MAX_KMA_AGE;
  }

  function isPrecipitationState(state) {
    return ["rain", "heavy-rain", "snow", "heavy-snow", "storm"].includes(state);
  }

  function loadWeatherScene(state, daylight) {
    let selector = ".weather-lens__scene--day";
    if (["snow", "heavy-snow"].includes(state)) selector = ".weather-lens__scene--snow";
    else if (daylight === "night" && ["rain", "heavy-rain", "storm"].includes(state)) selector = ".weather-lens__scene--rain-night";
    else if (daylight === "night") selector = ".weather-lens__scene--night";

    const scene = section.querySelector(selector);
    if (scene?.dataset.src && !scene.getAttribute("src")) scene.src = scene.dataset.src;
  }

  async function fetchOpenMeteo() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 7000);
    try {
      const liveResponse = await fetch(`${OPEN_METEO_URL}&cache_bust=${Date.now()}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!liveResponse.ok) throw new Error(`Live weather request failed: ${liveResponse.status}`);
      return normalizeOpenMeteo(await liveResponse.json());
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function applyWeather(data) {
    const state = WEATHER[previewState] ? previewState : (WEATHER[data?.state] ? data.state : "cloudy");
    const content = WEATHER[state];
    const daylight = previewDaylight === "night" || (previewDaylight !== "day" && data?.isDay === false) ? "night" : "day";
    const temperature = Number.isFinite(previewTemperature) ? previewTemperature : Number.parseFloat(data?.temperature);
    const defaultLabel = daylight === "night" && content.nightLabel ? content.nightLabel : content.label;
    let displayLabel = defaultLabel;
    let weatherMessage = daylight === "night" && content.nightMessage ? content.nightMessage : content.message;
    const displayTemperature = Number.isFinite(temperature) ? temperature.toFixed(1) : null;

    if (!["rain", "heavy-rain", "snow", "heavy-snow", "storm", "strong-wind"].includes(state) && Number.isFinite(temperature)) {
      if (daylight === "night" && temperature >= 28) {
        displayLabel = "더운 밤";
        weatherMessage = [`밤에도 서초동의 기온이 ${displayTemperature}°C로 높아요.`, "천천히 오세요. 디어한의원의 시원한 바람이 기다리고 있어요."];
      } else if (daylight === "day" && temperature >= 33) {
        displayLabel = "매우 더움";
        weatherMessage = [`오늘 서초동은 ${displayTemperature}°C, 한낮의 열기가 아주 강해요.`, "물 한 잔 챙겨 천천히 오세요. 디어한의원에 도착하시면 더위부터 식혀가세요."];
      } else if (daylight === "day" && temperature >= 30) {
        weatherMessage = [`오늘 서초동은 ${displayTemperature}°C로 더운 날이에요.`, "물을 챙겨 오시면 디어한의원의 시원한 실내가 기다리고 있어요."];
      } else if (temperature <= -10) {
        weatherMessage = [`오늘 서초동은 ${displayTemperature}°C로 무척 추워요.`, "따뜻하게 입고 천천히 오시면 디어의 포근한 실내에서 몸을 녹여가세요."];
      } else if (temperature <= 0) {
        weatherMessage = [`오늘 서초동은 ${displayTemperature}°C로 추운 날이에요.`, "옷깃을 단단히 여미고 오시면 디어에서 따뜻하게 맞이할게요."];
      }
      if (LOCALIZED) {
        const t = displayTemperature;
        if (daylight === "night" && temperature >= 28) [displayLabel, weatherMessage] = [LOCALIZED.hotNight[0], LOCALIZED.hotNight[1](t)];
        else if (daylight === "day" && temperature >= 33) [displayLabel, weatherMessage] = [LOCALIZED.veryHot[0], LOCALIZED.veryHot[1](t)];
        else if (daylight === "day" && temperature >= 30) weatherMessage = LOCALIZED.hot(t);
        else if (temperature <= -10) weatherMessage = LOCALIZED.veryCold(t);
        else if (temperature <= 0) weatherMessage = LOCALIZED.cold(t);
      }
    }

    loadWeatherScene(state, daylight);
    section.dataset.weather = state;
    section.dataset.daylight = daylight;
    section.dataset.weatherStatus = WEATHER[previewState] ? "preview" : "ready";
    date.textContent = todayInKorea();
    label.textContent = displayTemperature === null ? displayLabel : `${displayLabel} · ${displayTemperature}°C`;
    const observed = compactKoreaTime(data?.observedAt);
    const observedLabel = observed
      ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }).format(observed)
      : null;
    if (source) {
      source.textContent = LOCALIZED
        ? LOCALIZED.source(localizedSource(data?.source), observedLabel)
        : `서초동 기준 · ${data?.source || "현재 날씨"}${observedLabel ? ` · ${observedLabel} 기준` : ""}`;
    }
    const messageLines = Array.isArray(weatherMessage) ? weatherMessage : [weatherMessage];
    message.replaceChildren(...messageLines.map((line) => {
      const span = document.createElement("span");
      span.textContent = line;
      return span;
    }));
    icon.innerHTML = content.icon;
  }

  async function refreshWeather() {
    try {
      // 외국어 홈은 /en/ 같은 하위 폴더라 사이트 루트 기준으로 부른다.
      const kmaResponse = await fetch(`/weather-data.json?t=${Date.now()}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!kmaResponse.ok) throw new Error(`KMA weather request failed: ${kmaResponse.status}`);
      const kmaData = await kmaResponse.json();
      if (!isRecentKmaData(kmaData)) throw new Error("KMA weather data is stale");
      try {
        const liveData = await fetchOpenMeteo();
        if (!isPrecipitationState(kmaData.state) && isPrecipitationState(liveData.state) && liveData.hourlyRain > 0) {
          applyWeather(liveData);
          return;
        }
      } catch {
        // 기상청 최신값은 유지하고 좌표 기반 보조 관측 실패만 무시한다.
      }
      applyWeather(kmaData);
    } catch {
      try {
        applyWeather(await fetchOpenMeteo());
      } catch {
        section.dataset.weatherStatus = "fallback";
        if (source) source.textContent = LOCALIZED ? LOCALIZED.source(LOCALIZED.sources.updating) : "서초동 기준 · 날씨 갱신 중";
      }
    }
  }

  // 첫 호출은 아직 실제 날씨를 모른다. 낮으로 가정하면 밤에 들어온 방문자가
  // 낮 배경까지 내려받아 배경 사진 한 장이 통째로 헛되이 전송된다.
  // 한국 시각으로 낮/밤을 먼저 어림잡아 한 장만 받게 한다.
  const initialKoreaHour = new Date(Date.now() + 9 * 3600000).getUTCHours();
  applyWeather({ state: "cloudy", source: "날씨 갱신 중", isDay: initialKoreaHour >= 6 && initialKoreaHour < 18 });
  refreshWeather();
  window.setInterval(refreshWeather, WEATHER_REFRESH_INTERVAL);
})();
