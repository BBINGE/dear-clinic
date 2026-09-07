// Local or deployed UI QA. AI and consent calls are mocked; no model usage.
const {chromium} = require(process.env.DEAR_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const base = process.env.DEAR_TEST_URL || 'http://127.0.0.1:8000';
(async () => {
  const browser = await chromium.launch();
  try {
    for (const [width, route, lang] of [[1440, '/columns/insomnia-without-sleeping-pills.html', 'ko'], [768, '/ja/columns.html', 'ja'], [390, '/columns/insomnia-without-sleeping-pills.html', 'ko'], [390, '/en/columns.html', 'en'], [390, '/zh-cn/columns.html', 'zh']]) {
      const context = await browser.newContext({viewport: {width, height: 900}});
      const page = await context.newPage();
      const requests = [], corpusRequests = [];
      page.on('request', r => {if (r.url().includes('dear-ai-columns.json')) corpusRequests.push(r.url());});
      await page.route('https://dear-ai-preview.dearhani-ai.workers.dev/**', async r => {
        if (r.request().url().endsWith('/chat')) {
          requests.push(r.request().postDataJSON());
          return r.fulfill({json: {reply: '저희 대표원장님의 글을 같이 읽어볼게요.', action: 'continue', recommended_columns: [{url: '/columns/weight-inattentional-blindness.html', title: '체중만 보고 놓치기 쉬운 변화', reason: '질문하신 생활의 변화와 함께 읽을 수 있어요.'}, {url: 'javascript:alert(1)', title: 'invalid'}]}});
        }
        return r.fulfill({json: {publicChat: true, receipt: {id: 'qa', version: '20260906-public-1', acceptedAt: Date.now(), expires: Date.now()+1800000}}});
      });
      await page.goto(base + route);
      const widget = page.locator('#dear-ai-widget');
      const greeting = widget.locator('.greeting');
      await greeting.waitFor({state: 'visible'});
      assert.equal(await widget.locator('iframe').count(), 0);
      assert.equal(requests.length, 0);
      assert.equal(corpusRequests.length, 0);
      const bounds = await greeting.boundingBox();
      assert(bounds.x >= 0 && bounds.x+bounds.width <= width);
      await greeting.focus();
      await page.keyboard.press('Enter');
      const frame = page.frameLocator('#dear-ai-widget iframe');
      await frame.locator('input[name=all]').check();
      await frame.locator('.dear-consent button[type=submit]').click();
      await page.waitForTimeout(350);
      assert.equal(requests.length, 0);
      assert.equal(await frame.locator('[data-chat-suggestions] button').count(), 2);
      await frame.locator('[data-chat-suggestions] button').first().click();
      await frame.locator('.dear-chat__columns a').waitFor();
      assert.equal(requests.length, 1);
      assert.equal(requests[0].pagePath, route);
      assert.equal(requests[0].language, lang);
      assert.equal(await frame.locator('.dear-chat__columns a').count(), 1);
      assert.equal(await frame.locator('html').evaluate(e => e.scrollWidth-innerWidth), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth-innerWidth), 0);
      if (process.env.DEAR_QA_OUTPUT) await page.screenshot({path: process.env.DEAR_QA_OUTPUT + `/columns-${width}-${lang}.png`});
      await widget.locator('.close').click();
      await page.mouse.move(0, 0);
      await page.locator('body').click({position: {x: 4, y: 4}});
      await page.waitForTimeout(6500);
      await page.reload();
      await page.waitForTimeout(2200);
      assert.equal(await greeting.isVisible(), false, 'same-page automatic invite must stay suppressed');
      await widget.locator('.launcher').click();
      await frame.locator('.dear-chat__columns a').waitFor();
      assert.equal(requests.length, 1, 'restoring chat must not call AI');
      assert.equal(corpusRequests.length, 0);
      if (await frame.locator('input[name=all]').isVisible()) {
        await frame.locator('input[name=all]').check();
        await frame.locator('.dear-consent button[type=submit]').click();
      }
      await frame.locator('.dear-chat__columns a').click();
      await page.waitForURL('**/columns/weight-inattentional-blindness.html');
      await greeting.waitFor({state: 'visible'});
      console.log(`${width} ${lang}: invitation / no automatic AI or corpus / context / safe links / restore / navigation / overflow passed`);
      await context.close();
    }
  } finally {await browser.close();}
})().catch(e => {console.error(e); process.exit(1);});
