const {chromium}=require(process.env.DEAR_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const base=process.env.DEAR_TEST_URL || 'http://127.0.0.1:8000';
const key='dear-ai-consent';
const version='20260907-persistent-1';
(async()=>{
 const browser=await chromium.launch();
 try {
  for(const width of [1440,768,390]) {
   let accepts=0,withdraws=0,chats=0,rejectChat=false;
   const mock=async route=>{
    const url=route.request().url(),body=route.request().postDataJSON();
    if(url.endsWith('/health'))return route.fulfill({json:{publicChat:true}});
    if(url.endsWith('/chat')){chats++;return route.fulfill({status:rejectChat?428:200,json:rejectChat?{}:{reply:'안내 답변',action:'continue'}});}
    if(body.action==='withdraw'){withdraws++;return route.fulfill({json:{withdrawn:true}});}
    accepts++;return route.fulfill({json:{receipt:{id:`2026-09:00000000-0000-4000-8000-${String(accepts).padStart(12,'0')}`,version:body.consent.version,acceptedAt:Date.now(),expires:null}}});
   };
   let context=await browser.newContext({viewport:{width,height:900}});
   await context.route('https://dear-ai-preview.dearhani-ai.workers.dev/**',mock);
   let page=await context.newPage();
   const open=async p=>{await p.goto(base+'/preview/dear-ai.html?embedded=1&public=1');await p.locator('.dear-consent').waitFor({state:'attached'});};
   const agree=async p=>{await p.locator('input[name=all]').check();await p.locator('.dear-consent button[type=submit]').click();await p.locator('.dear-consent').waitFor({state:'hidden'});};
   await open(page);await agree(page);assert.equal(accepts,1);
   await page.reload();await page.waitForTimeout(250);assert.equal(await page.locator('.dear-consent').isVisible(),false);
   await page.clock.install();await page.clock.fastForward(31*60000);assert.equal(await page.locator('.dear-consent').isVisible(),false);
   await page.locator('[data-chat-reset]').click();await page.waitForTimeout(250);assert.equal(await page.locator('.dear-consent').isVisible(),false);
   const state=await context.storageState();await context.close();
   context=await browser.newContext({viewport:{width,height:900},storageState:state});await context.route('https://dear-ai-preview.dearhani-ai.workers.dev/**',mock);
   page=await context.newPage();await open(page);assert.equal(await page.locator('.dear-consent').isVisible(),false);
   const second=await context.newPage();await open(second);assert.equal(await second.locator('.dear-consent').isVisible(),false);assert.equal(accepts,1);
   await page.getByRole('button',{name:'대화 종료·동의 철회',exact:true}).first().click();
   await second.locator('.dear-consent').waitFor({state:'visible'});assert.equal(await second.evaluate(k=>localStorage.getItem(k),key),null);
   await page.waitForTimeout(200);assert.equal(withdraws,1);
   await agree(page);await second.locator('.dear-consent').waitFor({state:'hidden'});
   rejectChat=true;await page.locator('[data-chat-input]').fill('검수');await page.locator('[data-chat-send]').click();await page.locator('.dear-consent').waitFor({state:'visible'});assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),null);
   rejectChat=false;await agree(page);
   await page.evaluate(k=>localStorage.removeItem(k),key);await page.reload();await page.locator('.dear-consent').waitFor({state:'visible'});
   await page.evaluate(k=>localStorage.setItem(k,JSON.stringify({id:'2026-09:00000000-0000-4000-8000-000000000001',version:'outdated',acceptedAt:Date.now(),expires:null})),key);
   await page.reload();await page.locator('.dear-consent').waitFor({state:'visible'});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
   assert.equal(chats,1,'Restore and withdrawal must not call AI');
   console.log(width+': reload / 31 minutes / new chat / browser restart / tabs / withdrawal / 428 / data deletion / version change passed');
   await context.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
