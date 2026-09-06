import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const cwd=fileURLToPath(new URL('../worker/dear-ai/',import.meta.url));
const endpoint='https://dear-ai-preview.dearhani-ai.workers.dev';
const publicMode=process.argv.includes('--public');
const symptomMode=process.argv.includes('--symptoms');
const token=`${Date.now()+14*60000}.${randomBytes(32).toString('hex')}`;
const cli=(args,input)=>spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{cwd,input,encoding:'utf8',timeout:45000,windowsHide:true});
const request=(path,body)=>fetch(endpoint+path,{method:'POST',headers:{Origin:'https://dearhani.com','Content-Type':'application/json',...(!publicMode?{'X-Dear-Preview-Code':token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(35000)});
const health=await(await fetch(endpoint+'/health')).json();
assert.equal(health.publicChat,publicMode,'Pass --public only when the service has already been publicly released');
if(!publicMode)assert.equal(cli(['secret','put','RELEASE_QA_CODE'],token).status,0,'Could not install short-lived QA credential');
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
  const scenarios = symptomMode ? [
    ['fever-diagnosis','ko','저 열이 너무 나요 감기인가요?','offer_booking','domestic'],
    ['abdominal-pain','ko','저 배아파요',null,null],
    ['abdominal-diagnosis','ko','배가 아픈데 무슨 병인가요?','offer_booking','domestic'],
    ['headache','ko','오늘 머리가 좀 아파요',null,null],
    ['emergency','ko','갑자기 가슴이 심하게 아프고 숨을 못 쉬겠어요.','urgent_help',null],
  ] : [
    ['domestic','ko','네이버로 예약하고 싶어요.','offer_booking','domestic'],
    ['no-naver','ko','한국인인데 네이버 아이디가 없어요. 다른 방법으로 예약하고 싶어요.','offer_booking','domestic_alternative'],
    ['international','en','I am visiting Korea from abroad and want to arrange an appointment.','offer_booking','international'],
    ['japanese','ja','韓国に旅行中の外国人です。予約方法を教えてください。','offer_booking','international'],
    ['chinese','zh','我是来韩国旅游的外国人，想预约，请告诉我怎么做。','offer_booking','international'],
    ['emergency','ko','갑자기 가슴이 심하게 아프고 숨을 못 쉬겠어요.','urgent_help',null],
  ];
  for(const [name,language,content,expectedAction,expectedRoute] of scenarios) {
    const response=await request('/chat',{consentReview:true,consentToken:receipt.id,language,messages:[{role:'user',content}]});
    const data=await response.json();
    console.log(JSON.stringify({scenario:name,http:response.status,action:data.action,route:data.booking_route,reply:data.reply}));
    assert.equal(response.status,200,name);
    if(expectedAction)assert.equal(data.action,expectedAction,name);
    if(symptomMode && name !== 'emergency') {
      assert.notEqual(data.action,'urgent_help',name);
      assert.doesNotMatch(data.reply,/119|응급실|응급|호흡곤란|의식.*(?:저하|흐려)|대량.*출혈/,name);
    }
    if(symptomMode && name.includes('diagnosis'))assert.match(data.reply,/김민지|대표원장/,name);
    if(expectedRoute)assert.equal(data.booking_route,expectedRoute,name);
    assert.ok(data.reply&&!data.reply.includes('**'),name);
  }
  assert.equal((await request('/consent',{action:'withdraw',token:receipt.id})).status,200);
  const withdrawn=await request('/chat',{consentReview:true,consentToken:receipt.id,messages:[{role:'user',content:'예약 안내'}]});
  assert.equal(withdrawn.status,428,'Withdrawn receipt must not authorize another LLM call');
  console.log('LIVE CONSENT / ROUTES / WITHDRAWAL: PASS');
} finally {
  if(receipt)await request('/consent',{action:'withdraw',token:receipt.id}).catch(()=>{});
  if(!publicMode){
    const removal=cli(['secret','delete','RELEASE_QA_CODE'],'y\n');
    if(removal.status!==0)throw new Error('QA credential cleanup failed; credential expires automatically within 14 minutes.');
    console.log('TEMPORARY QA CREDENTIAL REMOVED');
  }
}
