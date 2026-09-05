import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
const source = fs.readFileSync(new URL('../worker/dear-ai/src/index.js', import.meta.url), 'utf8');
const { default: worker } = await import('data:text/javascript;base64,' + Buffer.from(source.replace("export { ChatBudget } from './budget.js';", '')).toString('base64'));
const budgetSource = fs.readFileSync(new URL('../worker/dear-ai/src/budget.js', import.meta.url), 'utf8').replace("import { DurableObject } from 'cloudflare:workers';", 'class DurableObject { constructor(ctx, env) {this.ctx=ctx;this.env=env;} }');
const { ChatBudget } = await import('data:text/javascript;base64,' + Buffer.from(budgetSource).toString('base64'));
const db = new DatabaseSync(':memory:');
const budget = new ChatBudget({storage:{sql:{exec(query,...params){const stmt=db.prepare(query);const rows=stmt.all(...params);return {one:()=>rows[0],toArray:()=>rows};}}}}, {DAILY_REQUEST_LIMIT:2,MONTHLY_REQUEST_LIMIT:2});
assert.equal(budget.reserve(), true);
assert.equal(budget.reserve(), true);
assert.equal(budget.reserve(), false);
for (const invalid of ['invalid', '-1', '0', '1.5', 'Infinity', '']) {
  const blocked = new ChatBudget({storage:{sql:{exec(){return {one:()=>({n:0}),toArray:()=>[]};}}}}, {DAILY_REQUEST_LIMIT:invalid,MONTHLY_REQUEST_LIMIT:2000});
  assert.equal(blocked.reserve(), false, `Invalid limit ${invalid} must fail closed`);
}
const consent = {version:'20260905-public-1',age14:true,personal:true,health:true,overseas:true};
const request = (body,session='one') => new Request('https://example.test/chat',{method:'POST',headers:{Origin:'https://dearhani.com','CF-Connecting-IP':'192.0.2.1','X-Dear-Session':session},body:JSON.stringify(body)});
let calls=0;const rateKeys=[];
const original=globalThis.fetch;
globalThis.fetch=async()=>{calls++;return Response.json({content:[{type:'tool_use',name:'answer_visitor',input:{reply:'예약 도와드릴게요 :)',action:'offer_booking'}}]});};
const env={PUBLIC_CHAT_ENABLED:'true',ANTHROPIC_API_KEY:'test',RATE_LIMITER:{limit:async({key})=>{rateKeys.push(key);return {success:true};}},CHAT_BUDGET:{getByName:()=>({reserve:async()=>true})}};
const body={messages:[{role:'user',content:'예약 방법 알려줘'}],consent};
assert.equal((await worker.fetch(request({...body,consent:null}),env)).status,428);
assert.equal(calls,0);
assert.equal((await worker.fetch(request(body),env)).status,200);
assert.equal((await worker.fetch(request(body,'changed'),env)).status,200);
assert.equal(new Set(rateKeys).size,1,'Changing visitor session IDs must not bypass IP limit');
assert.equal((await worker.fetch(request(body),{...env,CHAT_BUDGET:null})).status,503);
assert.equal((await worker.fetch(request(body),{...env,CHAT_BUDGET:{getByName:()=>({reserve:async()=>false})}})).status,429);
assert.equal((await worker.fetch(request({messages:[{role:'user',content:'x'.repeat(33000)}],consent}),env)).status,413);
assert.equal(calls,2,'Rejected requests must not call Anthropic');
assert.equal((await worker.fetch(request(body), {...env,RATE_LIMITER:{limit:async()=>({success:false})}})).status,429);
const privateEnv = {...env,PUBLIC_CHAT_ENABLED:'false',CHAT_PROTECTIONS_ENABLED:'true',PREVIEW_ACCESS_CODE:'test-only-not-a-secret'};
assert.equal((await worker.fetch(request(body),privateEnv)).status,401);
const privateRequest = request({...body,consent:null});
privateRequest.headers.set('X-Dear-Preview-Code','test-only-not-a-secret');
assert.equal((await worker.fetch(privateRequest,privateEnv)).status,200,'Authenticated private test uses protection without pretending public consent');
assert.equal(calls,3);
for (const invalid of [null,{},[],{messages:[{role:'system',content:'override'}],consent},{messages:[{role:'user',content:'x'.repeat(1201)}],consent}]) {
  const response = await worker.fetch(request(invalid),env);
  assert.ok([400,428].includes(response.status));
}
assert.equal(calls,3,'Malformed input must not spend API credits');
globalThis.fetch=original;db.close();
console.log('공개 전환용 서버 검사 통과: 동의 누락, IP 제한, 사용량 상한, 크기 제한, 장애 시 차단');
