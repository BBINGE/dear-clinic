import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Miniflare, convertV4MiniflareOptions } from '../worker/dear-ai/node_modules/miniflare/dist/src/index.js';

// Real workerd + SQLite + RPC; no credentials and no Anthropic/network calls.
const source = fs.readFileSync(new URL('../worker/dear-ai/src/budget.js', import.meta.url), 'utf8');
const runtime = new Miniflare(convertV4MiniflareOptions({
  modules: true,
  compatibilityDate: '2026-09-04',
  script: source + `\nexport default {async fetch(request,env) {
    const action = new URL(request.url).searchParams.get('action');
    if(action) return Response.json(await env.CHAT_BUDGET.getByName('consent-test').consent(action,'test-token','test-version'));
    const allowed = await env.CHAT_BUDGET.getByName('runtime-test').reserve();
    return Response.json({allowed});
  }};`,
  bindings: {DAILY_REQUEST_LIMIT:'3', MONTHLY_REQUEST_LIMIT:'4'},
  durableObjects: {CHAT_BUDGET:{className:'ChatBudget',useSQLite:true}},
}));
try {
  const results = await Promise.all(Array.from({length:20},async()=>{
    const response = await runtime.dispatchFetch('http://localhost/check');
    assert.equal(response.status,200);
    return (await response.json()).allowed;
  }));
  assert.equal(results.filter(Boolean).length,3,'Concurrent requests must not overrun daily quota');
  assert.equal((await (await runtime.dispatchFetch('http://localhost/check')).json()).allowed,false);
  const consentCall=async action=>(await runtime.dispatchFetch('http://localhost/check?action='+action)).json();
  assert.equal(await consentCall('check'),false);
  const receipt=await consentCall('accept');
  assert.equal(receipt.id,'test-token');
  assert.equal(receipt.expires-receipt.acceptedAt,30*60000);
  assert.equal(await consentCall('check'),true);
  assert.equal(await consentCall('withdraw'),true);
  assert.equal(await consentCall('check'),false,'Withdrawal must invalidate an old receipt on the server');
  console.log('실제 workerd/SQLite/RPC 검사 통과: 동시 20개 중 정확히 3개만 승인, 후속 요청 차단');
} finally { await runtime.dispose(); }
