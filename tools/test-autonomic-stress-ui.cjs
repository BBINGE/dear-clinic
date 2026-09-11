const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.DEAR_PLAYWRIGHT_MODULE || 'playwright');

const base = process.env.DEAR_TEST_URL || 'http://127.0.0.1:8000';
const screenshotDir = process.env.DEAR_SCREENSHOT_DIR || '';
const viewports = [
  { width: 1440, height: 900, name: 'desktop' },
  { width: 1024, height: 768, name: 'laptop' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 390, height: 844, name: 'mobile' },
];

if (screenshotDir) fs.mkdirSync(screenshotDir, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      await page.goto(`${base}/columns/autonomic-stress.html`, { waitUntil: 'networkidle' });
      await page.emulateMedia({ reducedMotion: 'reduce' });

      const metrics = await page.evaluate(() => {
        const nav = document.querySelector('nav.nav#top');
        const h1 = document.querySelector('h1');
        const references = document.querySelector('.references ol');
        const primaryCta = document.querySelector('.autonomic-primary-cta');
        const navRect = nav?.getBoundingClientRect();
        const h1Rect = h1?.getBoundingClientRect();
        const primaryCtaRect = primaryCta?.getBoundingClientRect();
        const duplicateIds = [...document.querySelectorAll('[id]')]
          .map((element) => element.id)
          .filter((id, index, ids) => ids.indexOf(id) !== index);
        return {
          viewportWidth: innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          bodyClass: document.body.className,
          navDisplay: nav ? getComputedStyle(nav).display : 'missing',
          navPosition: nav ? getComputedStyle(nav).position : 'missing',
          navTop: navRect?.top,
          navBottom: navRect?.bottom,
          h1Top: h1Rect?.top,
          h1Color: h1 ? getComputedStyle(h1).color : 'missing',
          navMenu: document.querySelectorAll('#navMenu .nav__link').length,
          navSubmenus: document.querySelectorAll('#navMenu .nav-submenu').length,
          hiddenNav: document.querySelectorAll('.nav[style*="display:none"], .nav[aria-hidden="true"]').length,
          mast: document.querySelectorAll('.mast').length,
          quickmenu: document.querySelectorAll('nav.quickmenu').length,
          consult: document.querySelectorAll('.column-consult').length,
          nap: document.querySelectorAll('.column-nap').length,
          referenceCards: document.querySelectorAll('.references li').length,
          referenceColumns: references ? getComputedStyle(references).gridTemplateColumns.split(' ').length : 0,
          primaryCta: document.querySelectorAll('.autonomic-primary-cta').length,
          primaryCtaText: primaryCta?.textContent.replace(/\s+/g, ' ').trim() || '',
          primaryCtaHeight: primaryCtaRect?.height || 0,
          primaryCtaWidth: primaryCtaRect?.width || 0,
          primaryCtaBackground: primaryCta ? getComputedStyle(primaryCta).backgroundColor : 'missing',
          actionLinks: document.querySelectorAll('.autonomic-action-links a').length,
          bookingLinks: document.querySelectorAll('a[href="https://m.booking.naver.com/booking/13/bizes/729883"]').length,
          phoneLinks: document.querySelectorAll('a[href="tel:02-3486-1777"]').length,
          mapLinks: document.querySelectorAll('.column-nap a[href^="https://map.naver.com/p/search/"]').length,
          contactIds: document.querySelectorAll('#contact').length,
          footer: document.querySelectorAll('footer.footer#contact').length,
          footerNap: document.querySelector('.footer__nap')?.textContent.replace(/\s+/g, ' ').trim() || '',
          overflowing: [...document.querySelectorAll('body *')]
            .map((element) => ({
              element: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${element.className && typeof element.className === 'string' ? `.${element.className.trim().replace(/\s+/g, '.')}` : ''}`,
              left: Math.round(element.getBoundingClientRect().left),
              right: Math.round(element.getBoundingClientRect().right),
            }))
            .filter((item) => item.left < -1 || item.right > innerWidth + 1),
          duplicateIds,
        };
      });

      assert.equal(metrics.bodyClass, 'autonomic-stress-page');
      assert.equal(metrics.documentWidth, metrics.viewportWidth, `${viewport.name}: 가로 넘침이 있습니다. ${JSON.stringify(metrics.overflowing)}`);
      assert.equal(metrics.navDisplay, 'flex', `${viewport.name}: 공통 내비가 보이지 않습니다.`);
      assert.equal(metrics.navPosition, 'fixed', `${viewport.name}: 공통 내비가 상단 고정이 아닙니다.`);
      assert.equal(metrics.navTop, 0, `${viewport.name}: 공통 내비가 화면 상단에서 벗어났습니다.`);
      assert.ok(metrics.h1Top > metrics.navBottom, `${viewport.name}: 제목이 공통 내비에 가려집니다.`);
      assert.notEqual(metrics.h1Color, 'rgb(255, 255, 255)', `${viewport.name}: 제목이 흰 배경에서 보이지 않습니다.`);
      assert.equal(metrics.navMenu, 5, `${viewport.name}: 공통 주 메뉴 수가 다릅니다.`);
      assert.equal(metrics.navSubmenus, 5, `${viewport.name}: 공통 메가메뉴가 생성되지 않았습니다.`);
      assert.equal(metrics.hiddenNav, 0, `${viewport.name}: 숨김 내비 자리표시자가 남아 있습니다.`);
      assert.equal(metrics.mast, 0, `${viewport.name}: 별도 mast 내비가 남아 있습니다.`);
      assert.equal(metrics.quickmenu, 1, `${viewport.name}: 빠른 메뉴가 생성되지 않았습니다.`);
      assert.equal(metrics.consult, 1, `${viewport.name}: 상담 CTA가 정확히 하나여야 합니다.`);
      assert.equal(metrics.nap, 1, `${viewport.name}: NAP 카드가 정확히 하나여야 합니다.`);
      assert.equal(metrics.referenceCards, 4, `${viewport.name}: 참고문헌 카드 수가 다릅니다.`);
      assert.equal(metrics.referenceColumns, viewport.width > 820 ? 2 : 1, `${viewport.name}: 참고문헌 반응형 열 수가 다릅니다.`);
      assert.equal(metrics.primaryCta, 1, `${viewport.name}: 주 예약 버튼이 정확히 하나여야 합니다.`);
      assert.match(metrics.primaryCtaText, /네이버로 예약하기/, `${viewport.name}: 주 예약 버튼의 행동명이 명확하지 않습니다.`);
      assert.ok(metrics.primaryCtaHeight >= 64, `${viewport.name}: 주 예약 버튼의 터치 높이가 부족합니다.`);
      assert.ok(metrics.primaryCtaWidth >= 300, `${viewport.name}: 주 예약 버튼의 시각적 면적이 부족합니다.`);
      assert.equal(metrics.primaryCtaBackground, 'rgb(255, 255, 255)', `${viewport.name}: 주 예약 버튼이 카드에서 분리되어 보이지 않습니다.`);
      assert.equal(metrics.actionLinks, 2, `${viewport.name}: 전화·위치 보조 행동이 정리되지 않았습니다.`);
      assert.ok(metrics.bookingLinks >= 3, `${viewport.name}: 예약 CTA가 충분히 연결되지 않았습니다.`);
      assert.ok(metrics.phoneLinks >= 3, `${viewport.name}: 전화 CTA가 충분히 연결되지 않았습니다.`);
      assert.equal(metrics.mapLinks, 1, `${viewport.name}: 위치 보기 CTA가 없습니다.`);
      assert.equal(metrics.contactIds, 1, `${viewport.name}: contact ID가 중복됩니다.`);
      assert.equal(metrics.footer, 1, `${viewport.name}: 공통 푸터가 없습니다.`);
      assert.match(metrics.footerNap, /디어한의원 · 대표자 김민지 · 사업자등록번호 828-09-02466/);
      assert.match(metrics.footerNap, /서울 서초구 사임당로 143 3층 309호, 310호/);
      assert.deepEqual(metrics.duplicateIds, [], `${viewport.name}: 중복 ID가 있습니다.`);
      assert.deepEqual(pageErrors, [], `${viewport.name}: 브라우저 JS 오류가 있습니다.`);

      const primaryCta = page.locator('.autonomic-primary-cta');
      await primaryCta.scrollIntoViewIfNeeded();
      const primaryCtaHitTarget = await primaryCta.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2));
      });
      assert.equal(primaryCtaHitTarget, true, `${viewport.name}: 주 예약 버튼의 중심이 다른 고정 UI에 가려집니다.`);

      if (viewport.width <= 768) {
        const toggle = page.locator('#navToggle');
        await toggle.click();
        assert.equal(await toggle.getAttribute('aria-expanded'), 'true', `${viewport.name}: 모바일 메뉴가 열리지 않습니다.`);
        assert.ok(await page.locator('#navMenu').evaluate((menu) => menu.classList.contains('is-open')));
        await page.keyboard.press('Escape');
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false', `${viewport.name}: Escape로 모바일 메뉴가 닫히지 않습니다.`);
      }

      if (screenshotDir) {
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: path.join(screenshotDir, `${viewport.name}-top.png`) });
        if (viewport.name === 'desktop' || viewport.name === 'mobile') {
          await page.screenshot({ path: path.join(screenshotDir, `${viewport.name}-full.png`), fullPage: true });
          for (const [label, selector] of [
            ['timetable', '#timetable'],
            ['manifesto', '#when'],
            ['evidence', '#evidence'],
            ['case-one', '#case-one'],
            ['case-two', '#case-two'],
            ['faq', '#faq'],
          ]) {
            await page.locator(selector).scrollIntoViewIfNeeded();
            await page.screenshot({ path: path.join(screenshotDir, `${viewport.name}-${label}.png`) });
          }
        }
        await page.locator('.references').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(screenshotDir, `${viewport.name}-references.png`) });
        await page.locator('.autonomic-action-grid').evaluate((element) => element.scrollIntoView({ block: 'center' }));
        await page.waitForTimeout(100);
        await page.screenshot({ path: path.join(screenshotDir, `${viewport.name}-cta-nap.png`) });
        await page.locator('.autonomic-action-grid').screenshot({ path: path.join(screenshotDir, `${viewport.name}-cta-nap-card.png`) });
        await page.locator('footer.footer').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(screenshotDir, `${viewport.name}-footer.png`) });
      }

      if (viewport.name === 'desktop') {
        await page.evaluate(() => scrollTo(0, 0));
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.reload({ waitUntil: 'networkidle' });
        const actionZone = page.locator('.autonomic-action-zone');
        assert.ok(await actionZone.evaluate((element) => element.classList.contains('reveal-pending')), 'desktop: 전환 구역의 스크롤 진입 상태가 없습니다.');
        await actionZone.evaluate((element) => element.scrollIntoView({ block: 'center' }));
        await page.waitForFunction(() => {
          const element = document.querySelector('.autonomic-action-zone');
          return element?.classList.contains('is-visible') && Number(getComputedStyle(element).opacity) > 0.99;
        }, { timeout: 4000 });
        const motionState = await actionZone.evaluate((element) => ({
          className: element.className,
          opacity: getComputedStyle(element).opacity,
          rect: element.getBoundingClientRect().toJSON(),
          viewportHeight: innerHeight,
        }));
        assert.ok(motionState.className.includes('is-visible') && Number(motionState.opacity) > 0.99, `desktop: 전환 구역의 스크롤 진입 모션이 완료되지 않습니다. ${JSON.stringify(motionState)}`);
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  process.stdout.write('자율신경 칼럼 UI 검사 통과: PC·노트북·태블릿·모바일 내비/References/CTA/NAP/푸터/가로폭\n');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
