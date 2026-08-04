import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const serviceKey = process.env.KMA_SERVICE_KEY?.trim();
const outputPath = resolve(process.argv[2] || "weather-data.json");
const KST_OFFSET = 9 * 60 * 60 * 1000;
const CLINIC = { latitude: 37.4918829, longitude: 127.0252346 };

if (!serviceKey) throw new Error("KMA_SERVICE_KEY is required");

function toGrid(latitude, longitude) {
  const radius = 6371.00877;
  const grid = 5;
  const standardLat1 = 30;
  const standardLat2 = 60;
  const originLongitude = 126;
  const originLatitude = 38;
  const originX = 43;
  const originY = 136;
  const radians = Math.PI / 180;
  const re = radius / grid;
  const slat1 = standardLat1 * radians;
  const slat2 = standardLat2 * radians;
  const olon = originLongitude * radians;
  const olat = originLatitude * radians;
  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);
  let ra = Math.tan(Math.PI * 0.25 + latitude * radians * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = longitude * radians - olon;
  if (theta > Math.PI) theta -= 2 * Math.PI;
  if (theta < -Math.PI) theta += 2 * Math.PI;
  theta *= sn;
  return {
    nx: Math.floor(ra * Math.sin(theta) + originX + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + originY + 0.5),
  };
}

function kstParts(date = new Date()) {
  const shifted = new Date(date.getTime() + KST_OFFSET);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

function forecastBase(now = new Date()) {
  const adjusted = new Date(now.getTime());
  const parts = kstParts(adjusted);
  if (parts.minute < 45) adjusted.setTime(adjusted.getTime() - 60 * 60 * 1000);
  const base = kstParts(adjusted);
  const pad = (value) => String(value).padStart(2, "0");
  return {
    date: `${base.year}${pad(base.month)}${pad(base.day)}`,
    time: `${pad(base.hour)}30`,
  };
}

function daylightAt(date = new Date()) {
  const parts = kstParts(date);
  const dayStart = Date.UTC(parts.year, parts.month - 1, parts.day);
  const dayOfYear = Math.floor((dayStart - Date.UTC(parts.year, 0, 0)) / 86400000);
  const seasonal = Math.cos(((dayOfYear - 172) / 365) * Math.PI * 2);
  const sunrise = 6.55 - seasonal * 1.35;
  const sunset = 18.45 + seasonal * 1.35;
  const currentHour = parts.hour + parts.minute / 60;
  return currentHour >= sunrise && currentHour < sunset;
}

function classify(values) {
  const precipitation = Number(values.PTY || 0);
  const lightning = Number(values.LGT || 0);
  const sky = Number(values.SKY || 4);
  if (lightning > 0) return "storm";
  if ([3, 6, 7].includes(precipitation)) return "snow";
  if ([1, 2, 4, 5].includes(precipitation)) return "rain";
  return sky === 1 ? "sunny" : "cloudy";
}

const { nx, ny } = toGrid(CLINIC.latitude, CLINIC.longitude);
const base = forecastBase();
const query = new URLSearchParams({
  pageNo: "1",
  numOfRows: "1000",
  dataType: "JSON",
  base_date: base.date,
  base_time: base.time,
  nx: String(nx),
  ny: String(ny),
});
const encodedServiceKey = serviceKey.includes("%") ? serviceKey : encodeURIComponent(serviceKey);
const endpoint = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst?serviceKey=${encodedServiceKey}&${query}`;
let payload;
let lastError;
for (let attempt = 1; attempt <= 3; attempt += 1) {
  try {
    const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`KMA request failed: ${response.status}`);
    payload = await response.json();
    break;
  } catch (error) {
    lastError = error;
    if (attempt < 3) await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 4000));
  }
}
if (!payload) throw lastError;
const resultCode = payload?.response?.header?.resultCode;
if (resultCode !== "00") {
  throw new Error(`KMA response failed: ${resultCode || "unknown"} ${payload?.response?.header?.resultMsg || ""}`);
}

const items = payload?.response?.body?.items?.item || [];
const grouped = new Map();
for (const item of items) {
  const key = `${item.fcstDate}${item.fcstTime}`;
  if (!grouped.has(key)) grouped.set(key, {});
  grouped.get(key)[item.category] = item.fcstValue;
}
const nowKst = kstParts();
const pad = (value) => String(value).padStart(2, "0");
const currentKey = `${nowKst.year}${pad(nowKst.month)}${pad(nowKst.day)}${pad(nowKst.hour)}${pad(nowKst.minute)}`;
const selectedKey = [...grouped.keys()].sort().find((key) => key >= currentKey.slice(0, 10) + "00") || [...grouped.keys()].sort()[0];
const values = grouped.get(selectedKey);
if (!values) throw new Error("KMA response contained no forecast items");

const weather = {
  state: classify(values),
  isDay: daylightAt(),
  observedAt: selectedKey,
  updatedAt: new Date().toISOString(),
  source: "기상청",
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(weather, null, 2)}\n`, "utf8");
console.log(JSON.stringify(weather));
