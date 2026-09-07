import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const worker = read('worker/dear-ai/src/index.js');
const client = read('js/dear-ai.js');
for (const fact of ['10,000원~', '20,000원~', '6,000원~', '3,000원~', '50,000원~']) {
  assert(read('non-covered.html').includes(fact));
  assert(worker.includes(fact));
}
for (const fact of ['KPEI 심리상담사 1급', '운동처방사']) {
  assert(read('career.html').includes(fact));
  assert(worker.includes(fact));
}
assert(worker.includes('저희 디어한의원'));
assert(worker.includes('저희 대표원장님'));
assert(worker.includes('이 기준은 아래의 일반적인 진단 질문 예약 안내보다 우선한다'));
assert(worker.includes('비급여 상담료가 있으므로 무료 상담'));
assert(!client.includes('state.history.pop()'));
assert(!client.includes('급한 예약은'));
assert(client.includes('if (!retry)'));
assert(client.includes('if (savedTurns.at(-1)?.pending) showFailure()'));
console.log('디숭이 응대 계약 검사 통과: 승인 사실, 소속 표현, 예약 거절 우선, 오류 문맥 보존');

// Incomplete structured output is reported without exposing model text or user messages.
const handler = (await import('data:text/javascript;base64,' + Buffer.from(worker.replace("export { ChatBudget } from './budget.js';", '')).toString('base64'))).default;
const originalFetch = globalThis.fetch;
try {
  for (const [stopReason, reason] of [['max_tokens', 'output_limit'], ['end_turn', 'invalid_output']]) {
    globalThis.fetch = async () => new Response(JSON.stringify({ stop_reason: stopReason, content: [{ type: 'text', text: 'private-output' }] }));
    const response = await handler.fetch(new Request('https://example.com/chat', {
      method: 'POST', headers: { Origin: 'https://dearhani.com', 'Content-Type': 'application/json', 'X-Dear-Preview-Code': 'test' },
      body: JSON.stringify({ messages: [{ role: 'user', content: '장점 설명' }] }),
    }), { PREVIEW_ACCESS_CODE: 'test', ANTHROPIC_API_KEY: 'test' });
    assert.equal(response.status, 502);
    const data = await response.json();
    assert.equal(data.diagnostic.reason, reason);
    assert(!JSON.stringify(data).includes('private-output'));
  }
} finally { globalThis.fetch = originalFetch; }
console.log('응답 잘림/형식 오류 분류와 원문 비노출 검사 통과');
