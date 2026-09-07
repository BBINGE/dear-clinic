import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const corpus = JSON.parse(read('assets/data/dear-ai-columns.json'));
const paths = [...read('sitemap.xml').matchAll(/<loc>https:\/\/dearhani\.com(\/columns\/[a-z0-9-]+\.html)<\/loc>/g)].map(m => m[1]);
assert.deepEqual(corpus.articles.map(a => a.url), paths);
for (const a of corpus.articles) {
  assert(a.title && a.description && a.text.length > 100 && a.text.length <= 30000);
  assert(!/<(?:script|style|svg)\b/i.test(a.text));
}
const source = read('worker/dear-ai/src/index.js');
const handler = (await import('data:text/javascript;base64,' + Buffer.from(source.replace("export { ChatBudget } from './budget.js';", '')).toString('base64'))).default;
const originalFetch = globalThis.fetch;
const article = corpus.articles[0];
let prompt, fetched = [], unavailable = false;
try {
  globalThis.fetch = async (url, options) => {
    fetched.push(url);
    if (url === 'https://dearhani.com/assets/data/dear-ai-columns.json') return new Response(JSON.stringify(corpus), {status: unavailable ? 503 : 200});
    assert.equal(url, 'https://api.anthropic.com/v1/messages');
    prompt = JSON.parse(options.body);
    return new Response(JSON.stringify({content: [{type: 'tool_use', name: 'answer_visitor', input: {reply: '이 글을 같이 읽어요.', action: 'continue', booking_route: 'domestic', recommended_columns: [{id: 'invented', reason: 'invalid'}, {id: article.id, reason: '질문에 맞는 글'}, {id: article.id, reason: 'duplicate'}]}}]}));
  };
  const chat = pagePath => handler.fetch(new Request('https://worker.test/chat', {method: 'POST', headers: {Origin: 'https://dearhani.com', 'X-Dear-Preview-Code': 'test'}, body: JSON.stringify({pagePath, language: 'ko', messages: [{role: 'user', content: '이 글의 핵심과 관련 칼럼 알려줘'}]})}), {PREVIEW_ACCESS_CODE: 'test', ANTHROPIC_API_KEY: 'test'});
  let response = await chat(article.url);
  assert.equal(response.status, 200);
  let data = await response.json();
  assert.equal(data.recommended_columns.length, 1);
  assert.equal(data.recommended_columns[0].url, article.url);
  assert(prompt.system[1].text.includes(JSON.stringify(article.text)));
  assert(prompt.system[0].text.includes('타 병원명은 답변에 넣지 않는다'));
  assert(!prompt.system[0].text.includes('前 대한병원'));
  assert.equal(prompt.model, 'claude-sonnet-4-6');
  fetched = [];
  await chat('https://attacker.test/private');
  assert(!fetched.some(url => url.includes('attacker')));
  assert(prompt.system[1].text.includes('"current":null'));
  unavailable = true;
  data = await (await chat(article.url)).json();
  assert(!data.recommended_columns);
  assert(prompt.system[1].text.includes('자료를 가져오지 못했다'));
  fetched = [];
  await chat(undefined);
  assert.deepEqual(fetched, ['https://api.anthropic.com/v1/messages']);
} finally { globalThis.fetch = originalFetch; }
console.log(`칼럼 ${paths.length}편: 원문 전달 / 실제 링크 제한 / 중복 제거 / 고정 출처 / 자료 실패 / 구버전 호환 통과`);
