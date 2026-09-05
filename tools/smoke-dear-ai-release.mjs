import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const cwd=fileURLToPath(new URL('../worker/dear-ai/',import.meta.url));
const endpoint='https://dear-ai-preview.dearhani-ai.workers.dev';
const token=`${Date.now()+14*60000}.${randomBytes(32).toString('hex')}`;
const cli=(args,input)=>spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{cwd,input,encoding:'utf8',timeout:45000,windowsHide:true});
const request=(path,body)=>fetch(endpoint+path,{method:'POST',headers:{Origin:'https://dearhani.com','Content-Type':'application/json','X-Dear-Preview-Code':token},body:JSON.stringify(body),signal:AbortSignal.timeout(35000)});
const health=await(await fetch(endpoint+'/health')).json();
assert.equal(health.publicChat,false,'This test must never enable public access');
assert.equal(cli(['secret','put','RELEASE_QA_CODE'],token).status,0,'Could not install short-lived QA credential');
let receipt;
try {
  let registration;
  for(let attempt=0;attempt<4;attempt++) {
    if(attempt)await new Promise(resolve=>setTimeout(resolve,2000));
    registration=await request('/consent',{consent:{version:health.consentVersion,age14:true,personal:true,health:true,overseas:true,acceptedAt:Date.now()}});
    if(registration.status!==401)break;
  }
  assert.equal(registration.status,200,'Consent registration failed');
  receipt=(await registration.json()).receipt;
  for(const [name,language,content,expectedAction,expectedRoute] of [
    ['domestic','ko','네이버로 예약하고 싶어요.','offer_booking','domestic'],
    ['no-naver','ko','한국인인데 네이버 아이디가 없어요. 다른 방법으로 예약하고 싶어요.','offer_booking','domestic_alternative'],
    ['international','en','I am visiting Korea from abroad and want to arrange an appointment.','offer_booking','international'],
    ['japanese','ja','韓国に旅行中の外国人です。予約方法を教えてください。','offer_booking','international'],
    ['chinese','zh','我是来韩国旅游的外国人，想预约，请告诉我怎么做。','offer_booking','international'],
    ['emergency','ko','갑자기 가슴이 심하게 아프고 숨을 못 쉬겠어요.','urgent_help',null],
  ]) {
    const response=await request('/chat',{consentReview:true,consentToken:receipt.id,language,messages:[{role:'user',content}]});
    const data=await response.json();
    console.log(JSON.stringify({scenario:name,http:response.status,action:data.action,route:data.booking_route,reply:data.reply}));
    assert.equal(response.status,200,name);assert.equal(data.action,expectedAction,name);
    if(expectedRoute)assert.equal(data.booking_route,expectedRoute,name);
    assert.ok(data.reply&&!data.reply.includes('**'),name);
  }
  assert.equal((await request('/consent',{action:'withdraw',token:receipt.id})).status,200);
  const withdrawn=await request('/chat',{consentReview:true,consentToken:receipt.id,messages:[{role:'user',content:'예약 안내'}]});
  assert.equal(withdrawn.status,428,'Withdrawn receipt must not authorize another LLM call');
  console.log('LIVE CONSENT / ROUTES / WITHDRAWAL: PASS');
} finally {
  if(receipt)await request('/consent',{action:'withdraw',token:receipt.id}).catch(()=>{});
  const removal=cli(['secret','delete','RELEASE_QA_CODE'],'y\n');
  if(removal.status!==0)throw new Error('QA credential cleanup failed; credential expires automatically within 14 minutes.');
  console.log('TEMPORARY QA CREDENTIAL REMOVED');
}
