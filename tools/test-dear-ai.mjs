import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const html = read("preview/dear-ai.html");
const client = read("js/dear-ai.js");
const worker = read("worker/dear-ai/src/index.js");
const config = read("worker/dear-ai/wrangler.jsonc");

assert.match(html, /noindex, nofollow, noarchive/);
assert.match(html, /disoongi-profile\.png/);
assert.match(html, /아무 말이나 적어도 돼요\. 예약도 도와드려요/);
assert.match(html, /이름·전화번호 같은 개인정보는 적지 말아주세요/);
assert.doesNotMatch(html, /googletagmanager|wcslog|click-tracking/);

assert.match(client, /X-Dear-Preview-Code/);
assert.match(client, /state\.history\.slice\(-14\)/);
assert.doesNotMatch(client, /localStorage/);
assert.match(client, /offer_booking/);

assert.match(worker, /claude-sonnet-4-6/);
assert.match(worker, /tool_choice: \{ type: "tool", name: "answer_visitor" \}/);
assert.match(worker, /진단, 확정적 치료 판단, 처방, 효과 보장/);
assert.match(worker, /예약을 반복 권유하지 않는다/);
assert.match(worker, /욕설이 포함돼도/);
assert.doesNotMatch(worker, /console\.(log|error|warn)/);
assert.match(config, /"compatibility_date": "2026-09-04"/);
assert.match(config, /"RATE_LIMITER"/);

for (const secretName of ["ANTHROPIC_API_KEY", "PREVIEW_ACCESS_CODE"]) {
  assert.equal(worker.includes(`sk-ant-`), false, `${secretName}처럼 보이는 키가 소스에 없어야 합니다.`);
  assert.match(worker, new RegExp(`env\\.${secretName}`));
}

const workerModule = await import(`../worker/dear-ai/src/index.js?test=${Date.now()}`);
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  assert.equal(url, "https://api.anthropic.com/v1/messages");
  assert.equal(options.headers["X-API-Key"], "test-api-key");
  const body = JSON.parse(options.body);
  assert.equal(body.model, "claude-sonnet-4-6");
  assert.equal(body.messages.at(-1).content, "예약 어캐해");
  return new Response(JSON.stringify({
    content: [{
      type: "tool_use",
      name: "answer_visitor",
      input: { reply: "당연히 도와드릴게요 :) 편한 방법을 골라주세요!", action: "offer_booking" },
    }],
  }), { status: 200, headers: { "Content-Type": "application/json" } });
};

const env = {
  ANTHROPIC_API_KEY: "test-api-key",
  ANTHROPIC_MODEL: "claude-sonnet-4-6",
  PREVIEW_ACCESS_CODE: "test-code",
  RATE_LIMITER: { limit: async () => ({ success: true }) },
};
const makeRequest = (code = "test-code") => new Request("https://worker.example/chat", {
  method: "POST",
  headers: {
    Origin: "https://dearhani.com",
    "Content-Type": "application/json",
    "X-Dear-Preview-Code": code,
    "X-Dear-Session": "test-session",
  },
  body: JSON.stringify({ messages: [{ role: "user", content: "예약 어캐해" }] }),
});

const unauthorized = await workerModule.default.fetch(makeRequest("wrong-code"), env);
assert.equal(unauthorized.status, 401);

const success = await workerModule.default.fetch(makeRequest(), env);
assert.equal(success.status, 200);
assert.equal(success.headers.get("Access-Control-Allow-Origin"), "https://dearhani.com");
assert.deepEqual(await success.json(), {
  reply: "당연히 도와드릴게요 :) 편한 방법을 골라주세요!",
  action: "offer_booking",
});
globalThis.fetch = async () => new Response(JSON.stringify({
  error: { type: "forbidden", message: "Request not allowed" },
}), { status: 403 });
const forbidden = await workerModule.default.fetch(makeRequest(), env);
assert.equal(forbidden.status, 502);
assert.deepEqual((await forbidden.json()).diagnostic, {
  status: 403, type: "forbidden", reason: "request_not_allowed", edge: "unknown", upstreamEdge: "unknown",
});
globalThis.fetch = async () => new Response(JSON.stringify({
  error: { type: "unexpected-private-type", message: "private text test-api-key" },
}), { status: 400 });
const privateFailure = await workerModule.default.fetch(makeRequest(), env);
const privateBody = await privateFailure.text();
assert.doesNotMatch(privateBody, /private text|test-api-key|unexpected-private-type/);
globalThis.fetch = originalFetch;

console.log("디어 AI 정적·보안 계약 검사 통과");
