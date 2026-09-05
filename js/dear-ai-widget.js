(function () {
  'use strict';
  if (window.top !== window || location.pathname.startsWith('/preview/')) return;
  const storage = {
    get(key) { try { return sessionStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { sessionStorage.setItem(key, value); } catch {} },
    remove(key) { try { sessionStorage.removeItem(key); } catch {} }
  };
  const query = new URLSearchParams(location.search);
  if (query.get('dear-ai-test') === 'off') {
    ['dear-ai-test', 'dear-ai-greeted', 'dear-ai-chat'].forEach(storage.remove);
    return;
  }
  if (query.get('dear-ai-test') === '1') storage.set('dear-ai-test', '1');
  if (storage.get('dear-ai-test') !== '1') return;
  const lang = (document.documentElement.lang || 'ko').slice(0, 2);
  const copy = {
    ko: ['궁금한 거 있어요? 제가 도와드릴게요 :)', '디숭이와 이야기하기', '닫기', '테스트 종료'],
    en: ['Questions? I’m here to help :)', 'Chat with Disoongi', 'Close', 'End test'],
    ja: ['気になることはありますか？お手伝いします :)', 'ディスンイと話す', '閉じる', 'テスト終了'],
    zh: ['有什么想问的吗？我来帮您 :)', '和迪崇聊聊', '关闭', '结束测试']
  }[lang] || ['Questions? I’m here to help :)', 'Chat with Disoongi', 'Close', 'End test'];
  const host = document.createElement('div');
  host.id = 'dear-ai-widget';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>
    :host{position:fixed;right:116px;bottom:22px;z-index:9998;font-family:Pretendard,sans-serif}
    *{box-sizing:border-box}button{font:inherit;cursor:pointer} [hidden]{display:none!important}.panel:not([hidden])~.launcher{display:none}
    .launcher{width:64px;height:64px;padding:0;border:2px solid #fff;border-radius:50%;overflow:hidden;background:#fae7d4;box-shadow:0 5px 22px #18332d30;transition:transform .2s}
    .launcher img{width:115%;height:115%;object-fit:cover;transform:translate(-6.52%,-6.52%)}
    .launcher:hover{transform:translateY(-4px) rotate(-5deg)}
    .hello{animation:hello 1.4s ease-in-out 1}
    @keyframes hello{0%,100%{transform:rotate(0)}25%{transform:translateY(-6px) rotate(-9deg)}60%{transform:translateY(-3px) rotate(7deg)}}
    .greeting{position:absolute;right:74px;bottom:8px;width:210px;padding:12px 15px;color:#174f43;background:#fffefa;border:1px solid #dce5df;border-radius:17px 17px 3px 17px;font-size:13px;line-height:1.5;box-shadow:0 4px 16px #18332d12}
    .panel{position:absolute;bottom:76px;right:0;width:min(440px,calc(100vw - 32px));height:min(740px,calc(100dvh - 118px));background:#fffefa;border-radius:20px;overflow:hidden;box-shadow:0 12px 55px #18332d40;display:flex;flex-direction:column}
    .bar{display:flex;justify-content:space-between;padding:5px 10px;background:#f5f2ec;flex-shrink:0}
    .bar button{border:0;background:none;color:#536b62;padding:7px;font-size:12px}
    iframe{width:100%;flex:1;border:0;min-height:0;background:#fffefa}
    @media(max-width:580px){:host{right:14px;bottom:calc(78px + env(safe-area-inset-bottom))}.launcher{width:56px;height:56px}.panel{position:fixed;inset:8px;width:calc(100vw - 16px);height:calc(100dvh - 16px);border-radius:18px}.greeting{right:65px}}
    @media(prefers-reduced-motion:reduce){.hello{animation:none}.launcher{transition:none}.launcher:hover{transform:none}}
  </style><div class="greeting" hidden></div><section class="panel" role="dialog" aria-modal="false" hidden><div class="bar"><button class="end" type="button"></button><button class="close" type="button"></button></div></section><button class="launcher" type="button" aria-expanded="false"><img src="/assets/images/disoongi-profile.png" alt=""></button>`;
  document.body.appendChild(host);
  const launcher = shadow.querySelector('.launcher');
  const greeting = shadow.querySelector('.greeting');
  const panel = shadow.querySelector('.panel');
  const close = shadow.querySelector('.close');
  launcher.setAttribute('aria-label', copy[1]);
  panel.setAttribute('aria-label', copy[1]);
  close.textContent = copy[2];
  shadow.querySelector('.end').textContent = copy[3];
  greeting.textContent = copy[0];
  let frame;
  function toggle(open) {
    if (open && !frame) {
      frame = document.createElement('iframe');
      frame.title = copy[1];
      frame.src = '/preview/dear-ai.html?embedded=1&lang=' + encodeURIComponent(lang);
      panel.appendChild(frame);
    }
    panel.hidden = !open;
    greeting.hidden = true;
    launcher.setAttribute('aria-expanded', String(open));
    if (!open) launcher.focus(); else close.focus();
  }
  launcher.addEventListener('click', () => toggle(panel.hidden));
  close.addEventListener('click', () => toggle(false));
  window.addEventListener('message', event => {
    if (event.origin === location.origin && event.source === frame?.contentWindow && event.data === 'dear-ai-close') toggle(false);
  });
  shadow.addEventListener('keydown', event => { if (event.key === 'Escape') toggle(false); });
  shadow.querySelector('.end').addEventListener('click', () => {
    ['dear-ai-test', 'dear-ai-greeted', 'dear-ai-chat'].forEach(storage.remove);
    const clean = new URL(location.href); clean.searchParams.delete('dear-ai-test');
    history.replaceState(null, '', clean); host.remove();
  });
  if (!storage.get('dear-ai-greeted')) {
    storage.set('dear-ai-greeted', '1');
    setTimeout(() => { if (panel.hidden) { greeting.hidden = false; launcher.classList.add('hello'); } }, 1800);
    setTimeout(() => { greeting.hidden = true; }, 8000);
  }
})();
