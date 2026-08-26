import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(toolsDir, '..');
const context = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(siteRoot, 'js', 'columns.js'), 'utf8'), context);
const engine = context.DearColumnsSearch;
assert.ok(engine, 'Columns SERP 엔진을 불러오지 못했습니다.');

const source = fs.readFileSync(path.join(siteRoot, 'columns.html'), 'utf8');
const articles = [...source.matchAll(/<a class="column-card[^>]*href="([^"]+)"[^>]*data-column-slug="([^"]+)"[^>]*data-category="([^"]+)"[^>]*data-search="([^"]*)"[^>]*data-journal-number="(\d+)"[\s\S]*?<h2>([\s\S]*?)<\/h2>[\s\S]*?<p>([\s\S]*?)<\/p>/g)].map((match) => ({
  href: match[1],
  slug: match[2],
  category: match[3],
  search: match[4],
  number: Number(match[5]),
  title: match[6].replace(/<[^>]+>/g, ''),
  summary: match[7].replace(/<[^>]+>/g, ''),
}));

assert.equal(articles.length, 20, '공개 칼럼 20편을 검색 색인에서 읽어야 합니다.');

const cheongdamGongjindan = engine.searchArticles('청담 공진단 선물 상담', articles);
assert.equal(cheongdamGongjindan.articles[0].slug, 'cheongdam-gongjindan');

const reflux = engine.searchArticles('밥 먹고 나면 목이 답답하고 신물이 올라와요', articles);
assert.equal(reflux.categories[0], 'Relief');
assert.equal(reflux.articles[0].slug, 'reflux-esophagitis-herbal-medicine');
assert.ok(reflux.articles.some((article) => article.slug === 'seocho-functional-dyspepsia'));

const appetite = engine.searchArticles('밤마다 입이 터져서 야식을 먹어요', articles);
assert.equal(appetite.categories[0], 'Shape');
assert.ok(['gyodae-diet-premenstrual-appetite', 'seocho-diet-6-reasons'].includes(appetite.articles[0].slug));

const fatigue = engine.searchArticles('아침부터 기운이 없고 축 처져요', articles);
assert.equal(fatigue.categories[0], 'Restore');
assert.equal(fatigue.articles[0].slug, 'gongjindan');

const indirect = engine.searchArticles('손발이 차고 어지러워요', articles);
assert.ok(indirect.categories.includes('Restore'));
assert.ok(indirect.articles.length >= 6);

const skin = engine.searchArticles('환절기라 피부가 건조하고 트러블이 생겨요', articles);
assert.equal(skin.categories[0], 'Restore');
assert.equal(skin.articles[0].slug, 'autumn-dry-skin-exosome-booster');

const noSubstringTrap = engine.searchArticles('사이트를 간단히 살펴보고 싶어요', articles);
assert.equal(noSubstringTrap.usedFallback, true);

const unknown = engine.searchArticles('관련 단어가 전혀 없는 질문입니다', articles);
assert.equal(unknown.usedFallback, true);
assert.ok(unknown.articles.length >= 6);
assert.ok(new Set(unknown.articles.slice(0, 5).map((article) => article.category)).size >= 4);

process.stdout.write('Columns SERP 테스트 통과\n');
