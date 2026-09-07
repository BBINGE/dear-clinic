const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const bootstrap = html.match(/<script>\s*\(\(\) => \{[\s\S]*?<\/script>/)[0]
  .replace(/<\/?script>/g, '');
const ids = [...html.matchAll(/data-popup-id="([^"]+)"/g)].map(match => match[1]);
const image = id => `assets/images/popups/popup-${id}.webp`;

function run(width, stored = {}, query = '', blocked = false) {
  const links = [];
  vm.runInNewContext(bootstrap, {
    URLSearchParams,
    location: { search: query },
    matchMedia: () => ({ matches: width <= 900 }),
    localStorage: {
      getItem(key) {
        if (blocked) throw new Error('Storage blocked');
        return stored[key] || null;
      },
    },
    document: {
      createElement: () => ({}),
      head: { append: link => links.push(link.href) },
    },
  });
  return links;
}

// Markup and the early preload list must stay synchronized when notices change.
assert.deepEqual(run(1440), ids.map(image));
for (const width of [390, 768, 900]) assert.deepEqual(run(width), [image(ids[0])]);
assert.deepEqual(run(901), ids.map(image));
assert.deepEqual(run(390, { [`dear-popup-dismissed-${ids[0]}`]: 'dismissed' }), [image(ids[1])]);
assert.deepEqual(run(390, { [`dear-popup-${ids[0]}`]: '2026-08-01' }), [image(ids[1])]);
const allDismissed = Object.fromEntries(ids.map(id => [`dear-popup-dismissed-${id}`, 'dismissed']));
assert.deepEqual(run(1440, allDismissed), []);
assert.deepEqual(run(390, {}, '?weather-preview=rain'), []);
assert.deepEqual(run(390, {}, '', true), [image(ids[0])]);
console.log('홈 로딩 검사 통과: 화면 크기, 닫은 안내, 이전 기록, 날씨 미리보기, 저장소 차단');
