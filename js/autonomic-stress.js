(() => {
  const art = document.querySelector('.hero-art');
  const motionButton = document.querySelector('.motion-toggle');
  let motionPaused = false;
  let artVisible = true;
  const syncMotion = () => art.classList.toggle('motion-paused', motionPaused || !artVisible || document.hidden);
  motionButton.addEventListener('click', () => {
    motionPaused = !motionPaused;
    motionButton.setAttribute('aria-pressed', String(motionPaused));
    motionButton.textContent = motionPaused ? '움직임 재생하기' : '움직임 멈추기';
    syncMotion();
  });
  new IntersectionObserver(entries => { artVisible = entries[0].isIntersecting; syncMotion(); }).observe(art);
  document.addEventListener('visibilitychange', syncMotion);
  const links = [...document.querySelectorAll('.toc a')];
  const sections = links.map(link => document.querySelector(link.getAttribute('href')));
  const progress = document.querySelector('.progress');
  let scheduled = false;
  function update() {
    const marker = window.scrollY + 160;
    let active = 0;
    sections.forEach((section, index) => { if (section.offsetTop <= marker) active = index; });
    links.forEach((link, index) => {
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    const total = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = `${total > 0 ? Math.min(100, Math.max(0, scrollY / total * 100)) : 0}%`;
    scheduled = false;
  }
  addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
})();
