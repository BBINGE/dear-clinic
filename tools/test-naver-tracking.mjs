import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const mainSource = fs.readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
const trackerSource = mainSource.slice(0, mainSource.indexOf("// Google Analytics 4 공통 설정"));

function createHarness(hostname, pathname = "/") {
  const calls = [];
  const scripts = [];
  const listeners = new Map();

  const document = {
    querySelector(selector) {
      const host = selector.match(/src\*="([^"]+)\/wcslog\.js"/)?.[1];
      return scripts.find((script) => script.src.includes(`${host}/wcslog.js`)) || null;
    },
    createElement(tagName) {
      assert.equal(tagName, "script");
      const scriptListeners = new Map();
      return {
        async: false,
        src: "",
        addEventListener(type, callback) {
          scriptListeners.set(type, callback);
        },
        dispatch(type) {
          scriptListeners.get(type)?.();
        },
      };
    },
    head: {
      appendChild(script) {
        // This harness models NAVER only; the public AI loader is tested separately.
        if (!/^https:\/\/wcs\.(naver\.net|pstatic\.net)\/wcslog\.js$/.test(script.src)) return;
        scripts.push(script);
        queueMicrotask(() => {
          context.window.wcs = {
            inflow: () => calls.push(["inflow", context.window.wcs_add.wa]),
            trans: ({ type }) => calls.push(["conversion", type, context.window.wcs_add.wa]),
          };
          context.window.wcs_do = () => calls.push(["pageview", context.window.wcs_add.wa]);
          script.dispatch("load");
        });
      },
    },
    addEventListener(type, callback) {
      listeners.set(type, callback);
    },
  };

  const context = vm.createContext({
    console,
    document,
    location: { hostname, pathname },
    URL,
    Promise,
    queueMicrotask,
    setTimeout,
  });
  context.window = context;
  context.window.location = context.location;

  vm.runInContext(trackerSource, context, { filename: "js/main.js" });
  return { calls, context, listeners, scripts };
}

const production = createHarness("dearhani.com");
await new Promise((resolve) => setTimeout(resolve, 0));
assert.deepEqual(
  production.scripts.map(({ src }) => src),
  ["https://wcs.naver.net/wcslog.js", "https://wcs.pstatic.net/wcslog.js"],
  "광고와 NAVER Analytics 스크립트가 순서대로 한 번씩 로드되어야 합니다.",
);
assert.deepEqual(production.calls.slice(0, 3), [
  ["inflow", "s_3fd3c8db3a1b"],
  ["pageview", "s_3fd3c8db3a1b"],
  ["pageview", "1ac7bf67a05a6c0"],
]);

const dispatchClick = (href) =>
  production.listeners.get("click")({
    target: { closest: () => ({ getAttribute: () => href }) },
  });
dispatchClick("https://m.booking.naver.com/booking/13/bizes/729883");
dispatchClick("tel:02-3486-1777");
assert.deepEqual(production.calls.slice(3), [
  ["conversion", "custom001", "s_3fd3c8db3a1b"],
  ["conversion", "custom002", "s_3fd3c8db3a1b"],
]);
assert.equal(production.context.window.wcs_add.wa, "1ac7bf67a05a6c0", "전환 후 NAVER Analytics ID를 복원해야 합니다.");

for (const [hostname, pathname] of [["127.0.0.1", "/"], ["dearhani.com", "/preview/example.html"]]) {
  const excluded = createHarness(hostname, pathname);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(excluded.scripts.length, 0, `${hostname}${pathname}에서는 네이버 추적 스크립트를 로드하면 안 됩니다.`);
  assert.equal(excluded.listeners.has("click"), false, `${hostname}${pathname}에서는 전환 클릭을 수집하면 안 됩니다.`);
}

console.log("네이버 분석·광고 전환 추적 테스트 통과");
