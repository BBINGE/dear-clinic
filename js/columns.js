(() => {
  const search = document.querySelector('#columnSearch');
  const cards = [...document.querySelectorAll('.column-card')];
  const filters = [...document.querySelectorAll('[data-column-category]')];
  const empty = document.querySelector('#columnsEmpty');
  if (!search || !cards.length) return;

  const params = new URLSearchParams(location.search);
  let category = params.get('category') || 'all';
  const categories = new Set(['all', ...filters.map((button) => button.dataset.columnCategory)]);
  if (!categories.has(category)) category = 'all';
  search.value = params.get('q') || '';

  const update = () => {
    const query = search.value.trim().toLocaleLowerCase('ko');
    let visible = 0;
    cards.forEach((card) => {
      const matchesCategory = category === 'all' || card.dataset.category === category;
      const matchesQuery = !query || card.dataset.search.toLocaleLowerCase('ko').includes(query);
      card.hidden = !(matchesCategory && matchesQuery);
      if (!card.hidden) visible += 1;
    });
    empty.hidden = visible !== 0;
    filters.forEach((button) => {
      const active = button.dataset.columnCategory === category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const next = new URLSearchParams();
    if (query) next.set('q', search.value.trim());
    if (category !== 'all') next.set('category', category);
    history.replaceState(null, '', `${location.pathname}${next.size ? `?${next}` : ''}`);
  };

  filters.forEach((button) => button.addEventListener('click', () => {
    category = button.dataset.columnCategory;
    update();
  }));
  search.addEventListener('input', update);
  update();
})();
