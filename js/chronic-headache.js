(() => {
  const progress = document.querySelector('.headache-progress');
  const links = [...document.querySelectorAll('.headache-toc a[href^="#"]')];
  const sections = links.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);

  const update = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = `${scrollable > 0 ? Math.min(100, Math.max(0, window.scrollY / scrollable * 100)) : 0}%`;

    let current = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= 190) current = section;
    }
    links.forEach((link) => link.toggleAttribute('aria-current', current && link.getAttribute('href') === `#${current.id}`));
  };

  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
})();
