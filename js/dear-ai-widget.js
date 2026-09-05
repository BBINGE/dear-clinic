(function () {
  'use strict';
  const PUBLIC_WIDGET_ENABLED = true; // Also covers the standalone international page.
  if (window.top !== window || location.pathname.startsWith('/preview/')) return;
  const storage = {
    get(key) { try { return sessionStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { sessionStorage.setItem(key, value); } catch {} },
    remove(key) { try { sessionStorage.removeItem(key); } catch {} }
  };
  const query = new URLSearchParams(location.search);
  if (query.get('dear-ai-test') === 'off') {
    ['dear-ai-test', 'dear-ai-greeted', 'dear-ai-chat', 'dear-ai-position', 'dear-ai-compact'].forEach(storage.remove);
    return;
  }
  if (query.get('dear-ai-test') === '1') storage.set('dear-ai-test', '1');
  if (!PUBLIC_WIDGET_ENABLED && storage.get('dear-ai-test') !== '1') return;
  const lang = (document.documentElement.lang || 'ko').slice(0, 2);
  const copy = {
    ko: ['궁금한 거 있어요?\n제가 도와드릴게요 :)', '디숭이와 이야기하기', '닫기', '테스트 종료'],
    en: ['Questions? I’m here to help :)', 'Chat with Disoongi', 'Close', 'End test'],
    ja: ['気になることはありますか？お手伝いします :)', 'ディスンイと話す', '閉じる', 'テスト終了'],
    zh: ['有什么想问的吗？我来帮您 :)', '和迪崇聊聊', '关闭', '结束测试']
  }[lang] || ['Questions? I’m here to help :)', 'Chat with Disoongi', 'Close', 'End test'];
  if(PUBLIC_WIDGET_ENABLED)copy[3]={ko:'디숭이 숨기기',en:'Hide Disoongi',ja:'ディスンイを隠す',zh:'隐藏迪崇'}[lang]||'Hide Disoongi';
  const controls = {
    ko: ['디숭이', '작게 접어두기', '디숭이 펼치기', '드래그해서 이동 · Alt+방향키로 이동'],
    en: ['Disoongi', 'Minimize mascot', 'Expand mascot', 'Drag to move · Alt+arrow keys'],
    ja: ['ディスンイ', '小さくたたむ', 'キャラクターを開く', 'ドラッグで移動 · Alt+矢印キー'],
    zh: ['迪崇', '收起角色', '展开角色', '拖动移动 · Alt+方向键']
  }[lang] || ['Disoongi', 'Minimize mascot', 'Expand mascot', 'Drag to move · Alt+arrow keys'];
  const host = document.createElement('div');
  host.id = 'dear-ai-widget';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>
    :host{position:fixed;right:156px;bottom:20px;z-index:9998;font-family:"Pretendard",sans-serif;pointer-events:none}
    *{box-sizing:border-box}button{font:inherit;cursor:pointer;pointer-events:auto} [hidden]{display:none!important}.panel:not([hidden])~.launcher,.panel:not([hidden])~.fold{visibility:hidden}
    .launcher{display:block;width:144px;height:214px;padding:0;border:0;border-radius:0;overflow:visible;background:transparent;box-shadow:none;transform-origin:50% 95%;transition:transform .2s}
    .launcher img{display:block;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 4px 3px #18332d24)}
    .launcher{touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none}
    .launcher.dragging{cursor:grabbing;transform:none;transition:none;animation:none}
    .launcher span{display:none}
    :host([data-compact]) .launcher{width:76px;height:36px;background:#fffefa;border:1px solid #c8d9d1;border-radius:18px;color:#174f43;box-shadow:0 2px 8px #18332d18}
    :host([data-compact]) .launcher img,:host([data-compact]) .fold{display:none}
    :host([data-compact]) .launcher span{display:block;font-family:"Pretendard",sans-serif;font-size:13px;font-weight:600}
    .fold{position:absolute;right:-3px;top:-12px;width:26px;height:26px;padding:0;border:1px solid #dce5df;border-radius:50%;background:#fffefa;color:#536b62;font-size:18px;line-height:22px}
    .launcher:focus-visible{outline:2px solid #247860;outline-offset:5px;border-radius:12px}
    .launcher:hover{transform:translateY(-4px) rotate(-5deg)}
    .hello{animation:hello 1.4s ease-in-out 1}
    @keyframes hello{0%,100%{transform:rotate(0)}25%{transform:translateY(-6px) rotate(-9deg)}60%{transform:translateY(-3px) rotate(7deg)}}
    .greeting{position:fixed;width:min(232px,calc(100vw - 32px));padding:12px 16px;color:#174f43;background:#fffefa;border:1px solid #dce5df;border-radius:17px 17px 3px 17px;font-family:"Pretendard",sans-serif;font-size:14px;font-weight:500;line-height:1.6;white-space:pre-line;word-break:keep-all;overflow-wrap:normal;box-shadow:0 4px 16px #18332d12}
    .panel{position:fixed;width:min(440px,calc(100vw - 32px));height:min(740px,calc(100dvh - 40px));background:#fffefa;border-radius:20px;overflow:hidden;box-shadow:0 12px 55px #18332d40;display:flex;flex-direction:column;pointer-events:none;opacity:0;transform:translateY(14px) scale(.97);transform-origin:bottom center;transition:opacity 220ms ease,transform 220ms cubic-bezier(.2,.8,.2,1)}
    .panel.is-open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}
    .bar{display:flex;justify-content:space-between;padding:5px 10px;background:#f5f2ec;flex-shrink:0}
    .bar button{border:0;background:none;color:#536b62;padding:7px;font-size:12px}
    iframe{width:100%;flex:1;border:0;min-height:0;background:#fffefa}
    @media(max-width:768px){:host{right:14px;bottom:calc(86px + env(safe-area-inset-bottom))}.launcher{width:100px;height:149px}.panel{width:calc(100vw - 16px);height:calc(100dvh - 16px);border-radius:18px}}
    @media(prefers-reduced-motion:reduce){.hello{animation:none}.launcher,.panel{transition:none}.launcher:hover{transform:none}.panel{transform:none}}
  </style><div class="greeting" hidden></div><section class="panel" role="dialog" aria-modal="false" hidden><div class="bar"><button class="end" type="button"></button><button class="close" type="button"></button></div></section><button class="launcher" type="button" aria-expanded="false"><img src="/assets/images/disoongi-launcher-v1.webp" width="404" height="600" alt="" draggable="false"><span></span></button><button class="fold" type="button">−</button>`;
  document.body.appendChild(host);
  const launcher = shadow.querySelector('.launcher');
  const greeting = shadow.querySelector('.greeting');
  const panel = shadow.querySelector('.panel');
  const close = shadow.querySelector('.close');
  const fold = shadow.querySelector('.fold');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let compact = storage.get('dear-ai-compact') === '1';
  host.toggleAttribute('data-compact', compact);
  launcher.querySelector('span').textContent = controls[0];
  launcher.title = controls[3];
  fold.title = controls[1];
  fold.setAttribute('aria-label', controls[1]);
  launcher.setAttribute('aria-label', compact ? controls[2] : copy[1]);
  panel.setAttribute('aria-label', copy[1]);
  close.textContent = copy[2];
  shadow.querySelector('.end').textContent = copy[3];
  greeting.textContent = copy[0];
  const isHome = /^\/(?:en\/|ja\/|zh-cn\/)?(?:index\.html)?$/.test(location.pathname);
  if (!isHome) greeting.textContent += '\n' + ({
    ko: '작게 접어두거나\n원하는 곳으로 옮길 수 있어요 :)',
    en: 'You can minimize me\nor drag me to another spot :)',
    ja: '小さくたたんだり、\n好きな場所に移動できます :)',
    zh: '可以把我收起来，\n也可以拖到喜欢的位置 :)'
  }[lang] || 'You can minimize me or drag me to another spot :)');
  let frame, closeTimer, openFrame, position = null;
  let drag = null, suppressClick = false;
  const clamp = (value, min, max) => Math.min(Math.max(min, max), Math.max(min, value));
  const viewport = () => ({ width: document.documentElement.clientWidth, height: window.innerHeight });
  try {
    const saved = JSON.parse(storage.get('dear-ai-position'));
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) position = { x: clamp(saved.x, 0, 1), y: clamp(saved.y, 0, 1) };
  } catch {}
  function place(x, y, remember = false) {
    const view = viewport();
    const width = launcher.offsetWidth, height = launcher.offsetHeight;
    const left = clamp(x, 8, view.width-width-8);
    const top = clamp(y, 24, view.height-height-8);
    host.style.left = left + 'px'; host.style.top = top + 'px';
    host.style.right = 'auto'; host.style.bottom = 'auto';
    if (remember) {
      position = { x: left/Math.max(1, view.width-width), y: top/Math.max(1, view.height-height) };
      storage.set('dear-ai-position', JSON.stringify(position));
    }
  }
  function placeOverlays() {
    const view = viewport(), rect = host.getBoundingClientRect();
    if (!panel.hidden) {
      panel.style.left = (view.width <= 768 ? 8 : clamp(rect.right-panel.offsetWidth, 8, view.width-panel.offsetWidth-8)) + 'px';
      panel.style.top = (view.width <= 768 ? 8 : clamp(rect.bottom-panel.offsetHeight, 8, view.height-panel.offsetHeight-8)) + 'px';
    }
    if (!greeting.hidden) {
      const x = rect.left >= greeting.offsetWidth+20 ? rect.left-greeting.offsetWidth-12 : rect.right+12;
      greeting.style.left = clamp(x, 8, view.width-greeting.offsetWidth-8) + 'px';
      greeting.style.top = clamp(rect.top+20, 8, view.height-greeting.offsetHeight-8) + 'px';
    }
  }
  function restorePosition() {
    if (position) {
      const view = viewport();
      place(position.x*(view.width-launcher.offsetWidth), position.y*(view.height-launcher.offsetHeight));
    }
    placeOverlays();
  }
  restorePosition();
  window.addEventListener('resize', restorePosition);
  function setCompact(value) {
    const rect = host.getBoundingClientRect();
    compact = value;
    host.toggleAttribute('data-compact', compact);
    storage.set('dear-ai-compact', compact ? '1' : '0');
    launcher.setAttribute('aria-label', compact ? controls[2] : copy[1]);
    greeting.hidden = true;
    place(rect.right-launcher.offsetWidth, rect.bottom-launcher.offsetHeight, true);
    launcher.focus();
  }
  fold.addEventListener('click', () => setCompact(true));
  function toggle(open) {
    clearTimeout(closeTimer);
    cancelAnimationFrame(openFrame);
    if (open && !frame) {
      frame = document.createElement('iframe');
      frame.title = copy[1];
      frame.src = '/preview/dear-ai.html?embedded=1&lang=' + encodeURIComponent(lang) + (PUBLIC_WIDGET_ENABLED ? '&public=1' : '') + (query.get('consent-review') === '1' ? '&consent-review=1' : '');
      panel.appendChild(frame);
    }
    greeting.hidden = true;
    launcher.setAttribute('aria-expanded', String(open));
    if (open) {
      panel.hidden = false;
      panel.inert = false;
      placeOverlays();
      // Paint the closed state before transitioning into view.
      openFrame = requestAnimationFrame(() => { openFrame = requestAnimationFrame(() => panel.classList.add('is-open')); });
      close.focus();
    } else {
      panel.classList.remove('is-open');
      panel.inert = true;
      closeTimer = setTimeout(() => { panel.hidden = true; launcher.focus(); }, reducedMotion.matches ? 0 : 220);
    }
  }
  launcher.addEventListener('click', event => {
    if (suppressClick) { suppressClick = false; event.preventDefault(); return; }
    if (compact) setCompact(false); else toggle(true);
  });
  launcher.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick = false;
    const rect = host.getBoundingClientRect();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
    launcher.setPointerCapture(event.pointerId);
  });
  launcher.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX-drag.x, dy = event.clientY-drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    drag.moved = true;
    greeting.hidden = true;
    launcher.classList.remove('hello');
    launcher.classList.add('dragging');
    place(drag.left+dx, drag.top+dy);
  });
  function endDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    if (drag.moved) {
      suppressClick = true;
      const rect = host.getBoundingClientRect();
      place(rect.left, rect.top, true);
    }
    drag = null;
    launcher.classList.remove('dragging');
    if (launcher.hasPointerCapture(event.pointerId)) launcher.releasePointerCapture(event.pointerId);
  }
  launcher.addEventListener('pointerup', endDrag);
  launcher.addEventListener('pointercancel', endDrag);
  launcher.addEventListener('lostpointercapture', endDrag);
  launcher.addEventListener('keydown', event => {
    if (!event.altKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const rect = host.getBoundingClientRect();
    place(rect.left + (event.key === 'ArrowLeft' ? -24 : event.key === 'ArrowRight' ? 24 : 0), rect.top + (event.key === 'ArrowUp' ? -24 : event.key === 'ArrowDown' ? 24 : 0), true);
    greeting.hidden = true;
  });
  close.addEventListener('click', () => toggle(false));
  window.addEventListener('message', event => {
    if (event.origin === location.origin && event.source === frame?.contentWindow && event.data === 'dear-ai-close') toggle(false);
  });
  shadow.addEventListener('keydown', event => { if (event.key === 'Escape') toggle(false); });
  shadow.querySelector('.end').addEventListener('click', () => {
    ['dear-ai-test', 'dear-ai-greeted', 'dear-ai-chat', 'dear-ai-position', 'dear-ai-compact'].forEach(storage.remove);
    window.removeEventListener('resize', restorePosition);
    clearTimeout(closeTimer); cancelAnimationFrame(openFrame);
    clearTimeout(greetingTimer); clearTimeout(greetingHideTimer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    const clean = new URL(location.href); clean.searchParams.delete('dear-ai-test');
    history.replaceState(null, '', clean); host.remove();
  });
  // Six seconds of greeting, then twelve quiet seconds. No session-wide suppression.
  let greetingTimer, greetingHideTimer;
  function hideGreeting() {
    clearTimeout(greetingHideTimer);
    greeting.hidden = true;
    launcher.classList.remove('hello');
  }
  function showGreeting() {
    if (!host.isConnected || document.hidden || !panel.hidden || compact || drag) return;
    clearTimeout(greetingHideTimer);
    greeting.hidden = false;
    placeOverlays();
    launcher.classList.add('hello');
    greetingHideTimer = setTimeout(hideGreeting, 6000);
  }
  function greetingCycle() {
    if (!host.isConnected) return;
    showGreeting();
    greetingTimer = setTimeout(greetingCycle, 18000);
  }
  function onVisibilityChange() {
    clearTimeout(greetingTimer);
    hideGreeting();
    if (!document.hidden) greetingTimer = setTimeout(greetingCycle, 1800);
  }
  launcher.addEventListener('mouseenter', showGreeting);
  launcher.addEventListener('focus', showGreeting);
  document.addEventListener('visibilitychange', onVisibilityChange);
  greetingTimer = setTimeout(greetingCycle, 1800);
})();
