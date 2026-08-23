(() => {
  const categoryDefinitions = {
    Focus: { label: '인지·집중', image: 'assets/images/columns/student-herbal-medicine/cover-deer-v4.png', keywords: ['집중', '인지', '기억', '주의', '공부', '수험생', '시험', '머리', '정신적 피로'] },
    Calm: { label: '긴장·수면', image: 'assets/images/columns/depression-functional-recovery/cover.webp', keywords: ['잠', '수면', '불면', '불안', '우울', '긴장', '마음', '스트레스', '기분', '걱정'] },
    Restore: { label: '피로·회복', image: 'assets/images/columns/gongjindan-handmade/thumbnail-deer-gongjindan-v2.png', keywords: ['피로', '기력', '회복', '공진단', '보약', '피부', '건조', '면역', '지쳐', '활력'] },
    Relief: { label: '통증·불편', image: 'assets/images/columns/reflux-esophagitis-herbal-medicine/thumbnail-square.png', keywords: ['통증', '두통', '소화', '속쓰림', '신물', '복통', '더부룩', '목 이물감', '위장', '아파'] },
    Shape: { label: '체중·리듬', image: 'assets/images/columns/diet-herbal-medicine-price/cover.png', keywords: ['다이어트', '체중', '살이 찌', '살 빼', '식욕', '비만', '대사', '부종', '생리', '산후', '성장', '키 성장', '지방', '가격', '요요'] },
  };

  const conceptDefinitions = [
    { categories: ['Focus'], terms: ['집중', '집중력', '기억', '기억력', '인지', '멍함', '멍해', '공부', '수험생', '시험', '성적', '주의력'], related: ['집중', '인지', '기억', '공부', '시험', '수험생'], slugs: ['student-herbal-medicine'] },
    { categories: ['Calm'], terms: ['잠', '수면', '불면', '잠들', '자다', '깨요', '새벽', '꿈', '과각성'], related: ['수면', '불면', '잠', '생활 리듬', '긴장'], slugs: ['depression-functional-recovery', 'gangnam-depression-bdnf', 'dear-column-20260729-1907'] },
    { categories: ['Calm'], terms: ['불안', '우울', '무기력', '긴장', '걱정', '스트레스', '기분', '마음', '의욕', '울적', '예민'], related: ['불안', '우울', '긴장', '스트레스', '기분', '기능 회복'], slugs: ['depression-functional-recovery', 'dear-column-20260729-1907', 'gangnam-depression-bdnf'] },
    { categories: ['Restore', 'Relief'], terms: ['피곤', '피로', '기운', '기력', '활력', '지쳐', '축 처져', '무기력', '회복', '면역', '감기', '몸살', '어지러', '손발', '차가워', '차요'], related: ['피로', '기력', '회복', '보약', '공진단', '생활 리듬'], slugs: ['gongjindan', 'student-herbal-medicine', 'depression-functional-recovery'] },
    { categories: ['Restore'], terms: ['피부', '건조', '속건조', '여드름', '트러블', '탄력', '색소', '스킨부스터', '엑소좀', '히알루론산', '콜라겐'], related: ['피부', '건조', '트러블', '스킨부스터', '엑소좀', '약침'], slugs: ['autumn-dry-skin-exosome-booster'] },
    { categories: ['Relief'], terms: ['소화', '체해', '체했', '더부룩', '답답', '속쓰림', '신물', '역류', '트림', '명치', '목 이물', '복통', '배 아', '메스꺼', '구역', '포만'], related: ['소화', '속쓰림', '신물', '역류', '명치', '포만감', '위장'], slugs: ['reflux-esophagitis-herbal-medicine', 'seocho-functional-dyspepsia'] },
    { categories: ['Relief', 'Focus'], terms: ['아파', '통증', '두통', '머리 아', '목 아', '허리', '어깨', '관절', '쑤셔', '저려'], related: ['통증', '두통', '불편', '진료'], slugs: ['student-herbal-medicine'] },
    { categories: ['Shape'], terms: ['다이어트', '체중', '살이 찌', '살쪄', '살쪘', '살 빼', '살빠', '감량', '비만', '요요', '체지방', '복부', '허리둘레', '운동', '식단'], related: ['다이어트', '체중', '감량', '비만', '체지방', '대사', '요요'], slugs: ['seocho-diet-clinic', 'seocho-diet-herbal-medicine', 'seocho-diet-6-reasons', 'gangnam-obesity-fatty-liver'] },
    { categories: ['Shape'], terms: ['식욕', '폭식', '과식', '야식', '입 터', '음식', '밥', '식사', '끼니', '배고파', '허기', '갈망', '군것질', '저녁'], related: ['식욕', '음식 갈망', '야식', '식사', '체중', '생활 리듬'], slugs: ['gyodae-diet-premenstrual-appetite', 'seocho-diet-6-reasons', 'seocho-diet-clinic'] },
    { categories: ['Shape'], terms: ['생리', '월경', '산후', '출산', '수유', '붓기', '부종', '여성'], related: ['생리', '월경주기', '산후', '출산', '부종', '체중'], slugs: ['gyodae-diet-premenstrual-appetite', 'seocho-postpartum-diet-herbal-medicine'] },
    { categories: ['Shape'], terms: ['아이', '어린이', '소아', '성장', '키가', '키는', '키 크', '키 성장', '성장판', '골연령', '성장곡선'], related: ['어린이', '소아', '성장', '키', '성장판', '성장곡선'], slugs: ['child-growth-herbal-medicine', 'gangnam-child-growth'] },
    { categories: ['Shape'], terms: ['간수치', '지방간', '간 건강', '대사', '혈당', '콜레스테롤', '내장지방'], related: ['지방간', '간수치', '대사', '내장지방', '체중'], slugs: ['gangnam-obesity-fatty-liver', 'seocho-diet-herbal-medicine'] },
    { categories: ['Restore', 'Shape', 'Relief'], terms: ['한약', '보약', '공진단', '탕약', '환약', '환제', '다이어트 환', '약재', '처방', '가격', '비용', '얼마'], related: ['한약', '보약', '공진단', '탕약', '가격', '비용', '처방'], slugs: ['gongjindan', 'diet-herbal-medicine-price', 'seocho-diet-herbal-medicine', 'reflux-esophagitis-herbal-medicine'] },
  ];

  const stopWords = new Set(['디어한의원', '한의원', '요즘', '계속', '자꾸', '너무', '많이', '조금', '정말', '어떻게', '왜', '제가', '저는', '우리', '있어요', '있나요', '같아요', '해요', '되나요', '일까요']);
  const normalize = (value) => String(value || '').normalize('NFKC').trim().toLocaleLowerCase('ko').replace(/[?!.,/\\·:;()[\]{}'"“”‘’]+/g, ' ').replace(/\s+/g, ' ');
  const tokenize = (value) => [...new Set(normalize(value).split(' ').filter((token) => token.length >= 2 && !stopWords.has(token)))];
  const bigrams = (value) => {
    const compact = normalize(value).replace(/\s/g, '');
    if (compact.length < 2) return compact ? [compact] : [];
    return Array.from({ length: compact.length - 1 }, (_, index) => compact.slice(index, index + 2));
  };
  const similarity = (left, right) => {
    const a = bigrams(left);
    const b = bigrams(right);
    if (!a.length || !b.length) return 0;
    const available = [...b];
    let overlap = 0;
    a.forEach((gram) => {
      const index = available.indexOf(gram);
      if (index >= 0) {
        overlap += 1;
        available.splice(index, 1);
      }
    });
    return (2 * overlap) / (a.length + b.length);
  };

  const analyzeQuery = (rawQuery) => {
    const query = normalize(rawQuery);
    const categoryScores = Object.fromEntries(Object.keys(categoryDefinitions).map((key) => [key, 0]));
    const relatedTerms = new Set();
    const matchedConcepts = [];
    conceptDefinitions.forEach((concept) => {
      const matches = concept.terms.filter((term) => query.includes(normalize(term)));
      if (!matches.length) return;
      matchedConcepts.push(concept);
      concept.related.forEach((term) => relatedTerms.add(normalize(term)));
      concept.categories.forEach((category, index) => {
        categoryScores[category] += matches.reduce((score, term) => score + Math.min(normalize(term).length, 5), 0) + Math.max(1, 4 - index);
      });
    });
    Object.entries(categoryDefinitions).forEach(([category, definition]) => {
      definition.keywords.forEach((keyword) => {
        if (query.includes(normalize(keyword))) categoryScores[category] += Math.min(normalize(keyword).length, 5) + 2;
      });
    });
    const categories = Object.entries(categoryScores).filter(([, score]) => score > 0).sort((a, b) => b[1] - a[1]).map(([category]) => category);
    return { query, tokens: tokenize(query), categories, categoryScores, relatedTerms: [...relatedTerms], matchedConcepts };
  };

  const scoreArticle = (article, analysis) => {
    const search = normalize(`${article.search || ''} ${article.title || ''} ${article.summary || ''}`);
    const searchTokens = tokenize(search);
    let score = search.includes(analysis.query) ? 30 : 0;
    let directMatches = 0;
    analysis.tokens.forEach((token) => {
      if (search.includes(token)) {
        score += Math.min(token.length, 8) + 4;
        directMatches += 1;
        return;
      }
      const closest = searchTokens.reduce((best, candidate) => Math.max(best, similarity(token, candidate)), 0);
      if (closest >= 0.58) score += closest * 4;
    });
    analysis.relatedTerms.forEach((term) => {
      if (search.includes(term)) score += 1.35;
    });
    analysis.matchedConcepts.forEach((concept) => {
      if (concept.slugs.includes(article.slug)) score += 9;
    });
    score += (analysis.categoryScores[article.category] || 0) * 0.7;
    return { ...article, score, directMatches };
  };

  const balancedFallback = (articles, count) => {
    const selected = [];
    Object.keys(categoryDefinitions).forEach((category) => {
      const article = articles.filter((item) => item.category === category).sort((a, b) => b.number - a.number)[0];
      if (article) selected.push(article);
    });
    articles.slice().sort((a, b) => b.number - a.number).forEach((article) => {
      if (selected.length < count && !selected.some((item) => item.slug === article.slug)) selected.push(article);
    });
    return selected.slice(0, count);
  };

  const searchArticles = (rawQuery, articles, minimum = 6) => {
    const analysis = analyzeQuery(rawQuery);
    const scored = articles.map((article) => scoreArticle(article, analysis)).sort((a, b) => b.score - a.score || b.number - a.number);
    const positive = scored.filter((article) => article.score >= 1);
    let ranked = positive.slice();
    if (!ranked.length) ranked = balancedFallback(scored, minimum);
    if (ranked.length < minimum) {
      const preferredCategories = analysis.categories.length ? analysis.categories : Object.keys(categoryDefinitions);
      scored
        .filter((article) => !ranked.some((item) => item.slug === article.slug))
        .sort((a, b) => {
          const aIndex = preferredCategories.indexOf(a.category);
          const bIndex = preferredCategories.indexOf(b.category);
          return (aIndex < 0 ? preferredCategories.length : aIndex) - (bIndex < 0 ? preferredCategories.length : bIndex) || b.number - a.number;
        })
        .forEach((article) => { if (ranked.length < minimum) ranked.push(article); });
    }
    const categories = analysis.categories.length
      ? analysis.categories
      : [...new Set(ranked.slice(0, 5).map((article) => article.category))];
    return {
      ...analysis,
      articles: ranked,
      categories: categories.length ? categories : Object.keys(categoryDefinitions),
      directCount: positive.filter((article) => article.directMatches > 0).length,
      usedFallback: positive.length === 0,
    };
  };

  globalThis.DearColumnsSearch = { analyzeQuery, searchArticles, similarity };
  if (typeof document === 'undefined') return;

  const search = document.querySelector('#columnSearch');
  const cards = [...document.querySelectorAll('.column-card')];
  const filters = [...document.querySelectorAll('[data-column-category]')];
  const suggestedSearches = [...document.querySelectorAll('[data-column-search-query]')];
  const empty = document.querySelector('#columnsEmpty');
  const discovery = document.querySelector('#columnsSearchResults');
  const discoverySummary = document.querySelector('#columnsSearchSummary');
  const discoveryTopics = document.querySelector('#columnsSearchTopics');
  const discoveryArticles = document.querySelector('#columnsSearchArticles');
  const discoveryRoutes = document.querySelector('#columnsSearchRoutes');
  const discoveryRoutesSection = document.querySelector('#columnsSearchRoutesSection');
  const discoveryReset = document.querySelector('#columnsSearchReset');
  const featured = document.querySelector('.column-featured');
  const toolbar = document.querySelector('.columns-toolbar');
  const grid = document.querySelector('#columnsGrid');
  const journalNav = document.querySelector('.columns-journal-nav');
  if (!search || !cards.length || !discovery) return;

  const routeCatalog = [
    { category: 'Focus', eyebrow: 'CARE · FOCUS', title: '집중과 정신적 피로를 살피는 Care', text: '수면의 질과 긴장 상태, 생활 리듬을 함께 확인합니다.', href: 'care.html?care=Focus' },
    { category: 'Calm', eyebrow: 'CARE · CALM', title: '잠과 긴장 반응을 살피는 Care', text: '불안과 과각성, 수면 유지의 어려움을 함께 살핍니다.', href: 'care.html?care=Calm' },
    { category: 'Calm', eyebrow: 'SERVICE · DEER BALANCE', title: '수면과 마음을 위한 DEER BALANCE', text: '잠과 감정, 몸의 불편이 이어질 때의 진료 방향입니다.', href: 'services.html#deer-balance' },
    { category: 'Restore', eyebrow: 'CARE · RESTORE', title: '피로와 회복력을 살피는 Care', text: '현재 체력과 소화 상태, 회복 속도를 함께 평가합니다.', href: 'care.html?care=Restore' },
    { category: 'Restore', eyebrow: 'SERVICE · GONGJINDAN', title: '디어 공진단의 조제 원칙', text: '약재 선별부터 원내 조제까지 디어의 기준을 확인합니다.', href: 'services.html#dear-gongjindan' },
    { category: 'Relief', eyebrow: 'CARE · RELIEF', title: '통증과 소화 불편을 살피는 Care', text: '발생 양상과 악화 요인, 기능적 제한을 함께 평가합니다.', href: 'care.html?care=Relief' },
    { category: 'Shape', eyebrow: 'CARE · SHAPE', title: '체중과 생활 리듬을 살피는 Care', text: '식욕과 수면, 소화, 활동량과 생활 패턴을 확인합니다.', href: 'care.html?care=Shape' },
    { category: 'Shape', eyebrow: 'SERVICE · BE DEER', title: '체중보다 몸의 흐름을 보는 BE DEER', text: '대사·식욕·수면·소화와 생활 리듬을 함께 살핍니다.', href: 'be-deer.html' },
    { category: 'Shape', eyebrow: 'BE DEER · CASES', title: 'BE DEER 감량 사례 보기', text: '실제 내원 기록에 남겨진 서로 다른 시작과 경과를 확인합니다.', href: 'be-deer-cases.html' },
  ];

  const fallbackRoutes = [
    { eyebrow: 'CARE', title: '현재의 상태부터 살펴보기', text: '다섯 가지 Care에서 지금의 불편과 가까운 주제를 찾아보세요.', href: 'care.html' },
    { eyebrow: 'DEAR SERVICES', title: '디어의 진료와 처방 보기', text: 'BE DEER부터 공진단과 체질한약까지 확인할 수 있습니다.', href: 'services.html' },
    { eyebrow: 'ABOUT DEAR', title: '대표원장의 진료 기준', text: '증상과 생활을 함께 보는 디어한의원의 기준을 소개합니다.', href: 'director.html' },
  ];

  const articleIndex = cards.map((card) => ({
    card,
    slug: card.dataset.columnSlug || '',
    category: card.dataset.category,
    search: `${card.dataset.search || ''} ${card.textContent || ''}`,
    title: card.querySelector('h2')?.textContent.trim() || '',
    summary: card.querySelector(':scope > p:not(.column-meta)')?.textContent.trim() || '',
    meta: card.querySelector('.column-meta')?.textContent.trim() || '',
    image: card.querySelector('img')?.getAttribute('src') || '',
    imageAlt: card.querySelector('img')?.getAttribute('alt') || '',
    href: card.getAttribute('href') || '#',
    number: Number(card.dataset.journalNumber || 0),
  }));

  const params = new URLSearchParams(location.search);
  let category = params.get('category') || 'all';
  const categories = new Set(['all', ...filters.map((button) => button.dataset.columnCategory)]);
  if (!categories.has(category)) category = 'all';
  search.value = params.get('q') || '';

  const makeTopic = (categoryKey) => {
    const definition = categoryDefinitions[categoryKey];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'columns-discovery-topic';
    button.dataset.discoveryCategory = categoryKey;
    const imageWrap = document.createElement('span');
    imageWrap.className = 'columns-discovery-topic__image';
    const image = document.createElement('img');
    image.src = definition.image;
    image.alt = '';
    image.loading = 'lazy';
    imageWrap.append(image);
    const label = document.createElement('strong');
    label.textContent = categoryKey;
    const description = document.createElement('small');
    description.textContent = definition.label;
    button.append(imageWrap, label, description);
    return button;
  };

  const makeArticle = (article) => {
    const link = document.createElement('a');
    link.className = 'columns-discovery-card';
    link.href = article.href;
    const imageWrap = document.createElement('span');
    imageWrap.className = 'columns-discovery-card__image';
    const image = document.createElement('img');
    image.src = article.image;
    image.alt = article.imageAlt;
    image.loading = 'lazy';
    imageWrap.append(image);
    const content = document.createElement('span');
    content.className = 'columns-discovery-card__content';
    const meta = document.createElement('small');
    meta.textContent = article.meta;
    const title = document.createElement('strong');
    title.textContent = article.title;
    const summary = document.createElement('span');
    summary.textContent = article.summary;
    const arrow = document.createElement('b');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';
    content.append(meta, title, summary, arrow);
    link.append(imageWrap, content);
    return link;
  };

  const makeRoute = (route) => {
    const link = document.createElement('a');
    link.className = 'columns-discovery-route';
    link.href = route.href;
    const eyebrow = document.createElement('small');
    eyebrow.textContent = route.eyebrow;
    const title = document.createElement('strong');
    title.textContent = route.title;
    const text = document.createElement('span');
    text.textContent = route.text;
    const arrow = document.createElement('b');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';
    link.append(eyebrow, title, text, arrow);
    return link;
  };

  const showDefaultFeed = (visible) => {
    [featured, toolbar, grid].forEach((element) => { if (element) element.hidden = !visible; });
    if (journalNav) journalNav.hidden = !visible;
    if (!visible) empty.hidden = true;
  };

  const renderDiscovery = (rawQuery) => {
    const query = normalize(rawQuery);
    if (!query) {
      discovery.hidden = true;
      showDefaultFeed(true);
      return false;
    }
    const result = searchArticles(query, articleIndex, 6);
    const finalTopics = result.categories.slice(0, 3);
    const relatedCategories = result.categories.length ? result.categories : [...new Set(result.articles.slice(0, 5).map((article) => article.category))];
    let routes = routeCatalog
      .filter((route) => relatedCategories.includes(route.category))
      .sort((a, b) => relatedCategories.indexOf(a.category) - relatedCategories.indexOf(b.category))
      .slice(0, 4);
    if (!routes.length) routes = fallbackRoutes;

    discoveryTopics.replaceChildren(...finalTopics.map(makeTopic));
    discoveryArticles.replaceChildren(...result.articles.slice(0, 9).map(makeArticle));
    discoveryRoutes.replaceChildren(...routes.map(makeRoute));
    discoveryRoutesSection.hidden = routes.length === 0;
    discoverySummary.textContent = result.usedFallback
      ? `“${rawQuery.trim()}”와 정확히 연결되는 글은 아직 없어, 디어의 대표 주제에서 시작할 수 있도록 모았습니다.`
      : result.directCount
        ? `“${rawQuery.trim()}”에 포함된 표현과 가까운 주제 ${finalTopics.length}개, 관련 칼럼 ${Math.min(result.articles.length, 9)}편을 찾았습니다.`
        : `“${rawQuery.trim()}”와 정확히 일치하지 않아도 의미가 가까운 칼럼과 진료 안내를 함께 모았습니다.`;
    discovery.hidden = false;
    showDefaultFeed(false);
    return true;
  };

  const update = () => {
    const rawQuery = search.value.trim();
    const query = normalize(rawQuery);
    const discoveryVisible = renderDiscovery(rawQuery);
    let visible = 0;
    cards.forEach((card) => {
      const matchesCategory = category === 'all' || card.dataset.category === category;
      card.hidden = discoveryVisible || !matchesCategory;
      if (!card.hidden) visible += 1;
    });
    if (!discoveryVisible) empty.hidden = visible !== 0;
    filters.forEach((button) => {
      const active = button.dataset.columnCategory === category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const next = new URLSearchParams();
    if (query) next.set('q', rawQuery);
    if (!query && category !== 'all') next.set('category', category);
    history.replaceState(null, '', `${location.pathname}${next.size ? `?${next}` : ''}`);
  };

  filters.forEach((button) => button.addEventListener('click', () => {
    category = button.dataset.columnCategory;
    search.value = '';
    update();
  }));
  search.addEventListener('input', () => {
    if (search.value.trim()) category = 'all';
    update();
  });
  suggestedSearches.forEach((button) => button.addEventListener('click', () => {
    category = 'all';
    search.value = button.dataset.columnSearchQuery;
    update();
    search.focus({ preventScroll: true });
    discovery.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  discoveryTopics.addEventListener('click', (event) => {
    const button = event.target.closest('[data-discovery-category]');
    if (!button) return;
    category = button.dataset.discoveryCategory;
    search.value = '';
    update();
    document.querySelector('.columns-journal-nav')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  discoveryReset.addEventListener('click', () => {
    category = 'all';
    search.value = '';
    update();
    search.focus({ preventScroll: true });
    document.querySelector('.columns-hero')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  update();
})();
