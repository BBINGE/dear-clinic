(() => {
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

  const categoryDefinitions = {
    Focus: { label: '인지·집중', image: 'assets/images/columns/student-herbal-medicine/cover-deer-v4.png', keywords: ['집중', '인지', '기억', '주의', '공부', '수험생', '시험', '머리', '정신적 피로'] },
    Calm: { label: '긴장·수면', image: 'assets/images/columns/depression-functional-recovery/cover.webp', keywords: ['잠', '수면', '불면', '불안', '우울', '긴장', '마음', '스트레스', '기분', '걱정'] },
    Restore: { label: '피로·회복', image: 'assets/images/columns/gongjindan-handmade/thumbnail-deer-gongjindan-v2.png', keywords: ['피로', '기력', '회복', '공진단', '보약', '피부', '건조', '면역', '지쳐', '활력'] },
    Relief: { label: '통증·불편', image: 'assets/images/columns/reflux-esophagitis-herbal-medicine/thumbnail-square.png', keywords: ['통증', '두통', '소화', '속쓰림', '신물', '복통', '더부룩', '목 이물감', '위장', '아파'] },
    Shape: { label: '체중·리듬', image: 'assets/images/columns/diet-herbal-medicine-price/cover.png', keywords: ['다이어트', '체중', '살', '식욕', '비만', '대사', '부종', '생리', '산후', '성장', '키', '지방', '가격', '요요'] },
  };

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
    category: card.dataset.category,
    search: `${card.dataset.search || ''} ${card.textContent || ''}`.toLocaleLowerCase('ko'),
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

  const normalize = (value) => value.trim().toLocaleLowerCase('ko').replace(/[?!.,/\\]+/g, ' ').replace(/\s+/g, ' ');
  const detectCategories = (query) => Object.entries(categoryDefinitions)
    .map(([key, definition]) => ({ key, score: definition.keywords.reduce((score, keyword) => score + (query.includes(keyword) ? keyword.length + 2 : 0), 0) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.key);

  const scoreArticles = (query, detectedCategories) => {
    const tokens = [...new Set(query.split(' ').filter((token) => token.length >= 2))];
    return articleIndex.map((article) => {
      let score = article.search.includes(query) ? 14 : 0;
      tokens.forEach((token) => { if (article.search.includes(token)) score += token.length + 1; });
      if (detectedCategories.includes(article.category)) score += 7 - detectedCategories.indexOf(article.category);
      return { ...article, score };
    }).filter((article) => article.score > 0).sort((a, b) => b.score - a.score || b.number - a.number);
  };

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
    const detectedCategories = detectCategories(query);
    const articles = scoreArticles(query, detectedCategories);
    const topicCategories = detectedCategories.length ? detectedCategories : [...new Set(articles.slice(0, 5).map((article) => article.category))];
    const finalTopics = topicCategories.length ? topicCategories : Object.keys(categoryDefinitions);
    const routes = detectedCategories.length ? routeCatalog.filter((route) => detectedCategories.includes(route.category)).slice(0, 4) : fallbackRoutes;

    discoveryTopics.replaceChildren(...finalTopics.map(makeTopic));
    discoveryArticles.replaceChildren(...(articles.length ? articles.slice(0, 9).map(makeArticle) : articleIndex.slice(0, 6).map(makeArticle)));
    discoveryRoutes.replaceChildren(...routes.map(makeRoute));
    discoveryRoutesSection.hidden = routes.length === 0;
    discoverySummary.textContent = articles.length
      ? `“${rawQuery.trim()}”와 가까운 주제 ${finalTopics.length}개와 칼럼 ${articles.length}편을 찾았습니다.`
      : `“${rawQuery.trim()}”와 정확히 일치하는 글은 아직 없지만, 이어서 살펴볼 수 있는 주제를 모았습니다.`;
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
