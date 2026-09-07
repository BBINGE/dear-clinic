(function initializeDearAiPreview() {
  "use strict";

  const options = new URLSearchParams(location.search);
  const embedded = options.get('embedded') === '1';
  if (embedded) document.documentElement.classList.add('embedded');
  const language = ['ko', 'en', 'ja', 'zh'].includes(options.get('lang')) ? options.get('lang') : 'ko';
  const pagePath = /^\/[a-z0-9/.-]{0,199}$/.test(options.get('page') || '') ? options.get('page') : '/';
  const isColumnArticle = /^\/columns\/[a-z0-9-]+\.html$/.test(pagePath);
  const isColumnPage = isColumnArticle || /^\/(?:en\/|ja\/|zh-cn\/)?columns\.html$/.test(pagePath);
  document.documentElement.lang = language;
  const privacyInfo = {
    ko: ['/privacy.html#ai-guide', 'AI 대화의 전송·보관 안내'],
    en: ['/en/privacy.html#ai-guide', 'AI chat data and retention'],
    ja: ['/ja/privacy.html#ai-guide', 'AI会話の送信・保存について'],
    zh: ['/zh-cn/privacy.html#ai-guide', 'AI对话传输与保留说明']
  }[language];
  document.querySelectorAll('[data-chat-privacy]').forEach(link => {
    link.href = privacyInfo[0];
    link.textContent = privacyInfo[1];
  });
  const labels = {
    ko: ['네이버로 예약할게요', '톡톡으로 먼저 물어볼게요', '전화로 상담할게요', '외국인 진료 일정·예약 안내', '인스타그램 DM으로 물어볼게요'],
    en: ['Naver booking', 'Naver Talk', 'Call DEAR', 'International appointment guide', 'Message us on Instagram'],
    ja: ['NAVER予約', 'NAVERトーク', '電話で相談', '外国人の診療日程・予約案内', 'Instagramで問い合わせ'],
    zh: ['NAVER预约', 'NAVER咨询', '致电诊所', '国际患者就诊与预约指南', 'Instagram私信咨询']
  }[language];

  const endpoint = document.querySelector('meta[name="dear-ai-endpoint"]')?.content || "";
  const messagesElement = document.querySelector("[data-chat-messages]");
  const suggestionsElement = document.querySelector("[data-chat-suggestions]");
  const form = document.querySelector("[data-chat-form]");
  const input = document.querySelector("[data-chat-input]");
  const sendButton = document.querySelector("[data-chat-send]");
  const resetButton = document.querySelector("[data-chat-reset]");
  const gate = document.querySelector("[data-chat-gate]");
  const gateForm = document.querySelector("[data-gate-form]");
  const gateInput = document.querySelector("[data-gate-input]");
  const gateError = document.querySelector("[data-gate-error]");
  const state = { history: [], accessCode: "", busy: false, publicMode: false, generation: 0, controller: null };
  let consentEnabled = options.get('consent-review') === '1';
  const savedTurns = [];
  let failureMessage = null;
  const failureCopy = {
    ko: ['답변을 받지 못했어요. 방금 적어주신 말은 이 대화에 남아 있어요. 다시 시도하거나 이어서 말씀해주세요.', '다시 시도', '지금은 요청을 처리할 수 없어요. 나중에 다시 시도해주세요. 적어주신 말은 남아 있어요.'],
    en: ['I couldn’t get a reply. Your message is still in this chat. You can retry or continue writing.', 'Try again', 'Requests are temporarily limited. Please try again later. Your message is still here.'],
    ja: ['回答を受け取れませんでした。送っていただいた内容はこの会話に残っています。再試行するか、続けてお話しください。', '再試行', '現在リクエストが制限されています。しばらくしてから再試行してください。内容は残っています。'],
    zh: ['暂时未能收到回复。您刚才的消息仍保留在本次对话中，可以重试或继续补充。', '重试', '请求暂时受到限制，请稍后重试。您的消息仍然保留。']
  }[language];
  const consentUi = window.createDearConsent({endpoint,language,getAccessCode:()=>state.accessCode,onReady:()=>input.focus(),onStop:()=>{
    state.generation++;state.controller?.abort();state.history=[];savedTurns.length=0;failureMessage=null;
    while(messagesElement.children.length>1)messagesElement.lastElementChild.remove();
    suggestionsElement.hidden=false;input.value='';setBusy(false);
    try{sessionStorage.removeItem('dear-ai-chat');}catch{}
  }});
  function saveSession() {
    if (!embedded) return;
    try { sessionStorage.setItem('dear-ai-chat', JSON.stringify({ turns: savedTurns.slice(-14), accessCode: state.accessCode, expires: Date.now() + 30 * 60 * 1000 })); } catch {}
  }
  const sessionId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const bookingLinks = {
    booking: "https://m.booking.naver.com/booking/13/bizes/729883",
    talk: "https://talk.naver.com/ct/w5zr5u",
    phone: "tel:02-3486-1777",
  };

  function escapeText(value) {
    const node = document.createElement("span");
    node.textContent = String(value || "");
    return node.innerHTML;
  }

  function scrollToLatest() {
    requestAnimationFrame(() => {
      messagesElement.scrollTop = messagesElement.scrollHeight;
    });
  }

  function addMessage(role, text) {
    const article = document.createElement("article");
    article.className = `chat-message chat-message--${role}`;
    const paragraphs = String(text).split(/\n{2,}/).filter(Boolean).map((part) => `<p>${escapeText(part)}</p>`).join("");
    article.innerHTML = role === "assistant"
      ? `<div class="chat-message__avatar" aria-hidden="true"><img src="../assets/images/disoongi-face-42@1x.png" srcset="../assets/images/disoongi-face-42@2x.png 2x, ../assets/images/disoongi-face-42@3x.png 3x" width="42" height="42" alt=""></div><div class="chat-message__body">${paragraphs}</div>`
      : `<div class="chat-message__body">${paragraphs}</div>`;
    messagesElement.appendChild(article);
    scrollToLatest();
    return article;
  }

  function addLoading() {
    const article = document.createElement("article");
    article.className = "chat-message chat-message--assistant chat-message--loading";
    article.setAttribute("aria-label", "디숭이가 답변을 생각하고 있어요");
    article.innerHTML = '<div class="chat-message__avatar" aria-hidden="true"><img src="../assets/images/disoongi-face-42@1x.png" srcset="../assets/images/disoongi-face-42@2x.png 2x, ../assets/images/disoongi-face-42@3x.png 3x" width="42" height="42" alt=""></div><div class="chat-message__body"><i></i><i></i><i></i></div>';
    messagesElement.appendChild(article);
    scrollToLatest();
    return article;
  }

  function addBookingActions(route) {
    const actions = document.createElement("div");
    actions.className = "dear-chat__booking";
    const links = route === 'international'
      ? [[`/international-appointment.html?lang=${language === 'ko' ? 'en' : language}`, labels[3]], ['https://www.instagram.com/dearhani__/', labels[4]]]
      : route === 'domestic_alternative'
        ? [['https://www.instagram.com/dearhani__/', labels[4]]]
        : [[bookingLinks.booking, labels[0]], [bookingLinks.talk, labels[1]]];
    links.push(['tel:+82234861777', labels[2]]);
    actions.innerHTML = links.map(([url, label]) => `<a href="${url}" target="_blank" rel="noopener">${escapeText(label)} <span>→</span></a>`).join('');
    messagesElement.appendChild(actions);
    scrollToLatest();
  }

  function setBusy(busy) {
    state.busy = busy;
    input.disabled = busy;
    sendButton.disabled = busy;
    messagesElement.setAttribute("aria-busy", String(busy));
  }

  function addColumnActions(items) {
    if (!Array.isArray(items)) return;
    const actions = document.createElement('div');
    actions.className = 'dear-chat__booking dear-chat__columns';
    for (const item of items.slice(0, 2)) {
      if (!item || typeof item.url !== 'string' || !/^\/columns\/[a-z0-9-]+\.html$/.test(item.url) || typeof item.title !== 'string') continue;
      const link = document.createElement('a');
      link.href = item.url;
      link.target = '_top';
      const title = document.createElement('strong');
      title.textContent = item.title.slice(0, 200);
      const reason = document.createElement('small');
      reason.textContent = typeof item.reason === 'string' ? item.reason.slice(0, 160) : '';
      link.append(title, reason);
      actions.appendChild(link);
    }
    if (actions.children.length) { messagesElement.appendChild(actions); scrollToLatest(); }
  }

  function showFailure(status = 0) {
    failureMessage?.remove();
    failureMessage = addMessage("assistant", failureCopy[status === 429 ? 2 : 0]);
    failureMessage.setAttribute("role", "status");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dear-chat__retry";
    button.dataset.chatRetry = "";
    button.textContent = failureCopy[1];
    button.addEventListener("click", () => {
      const last = state.history.at(-1);
      if (last?.role === "user") sendMessage(last.content, true);
    });
    failureMessage.querySelector(".chat-message__body").appendChild(button);
  }

  async function sendMessage(text, retry = false) {
    if (state.busy || !text.trim() || !gate.hidden || (!state.publicMode && !state.accessCode)) return;
    if (consentEnabled && !consentUi.token()) {consentUi.show();return;}
    if (!endpoint || endpoint.includes("__DEAR_AI_ENDPOINT__")) {
      addMessage("assistant", "아직 AI 연결 주소가 들어오지 않았어요. 열음에게 Cloudflare 연결을 마쳐달라고 해주세요 :)");
      return;
    }

    const userText = text.trim().slice(0, 1200);
    failureMessage?.remove();
    failureMessage = null;
    if (!retry) {
      state.history.push({ role: "user", content: userText });
      savedTurns.push({ role: 'user', content: userText, pending: true });
      addMessage("user", userText);
      input.value = "";
      input.style.height = "auto";
    }
    saveSession();
    suggestionsElement.hidden = true;
    setBusy(true);
    const loading = addLoading();
    // Keep the newest complete context within the server's 9,000-character limit.
    const requestHistory = state.history.slice(-14);
    while (requestHistory.length > 1 && requestHistory.reduce((sum, turn) => sum + turn.content.length, 0) > 9000) requestHistory.shift();
    while (requestHistory.length > 1 && requestHistory[0].role !== 'user') requestHistory.shift();
    const controller = new AbortController();
    state.controller=controller;
    const generation=state.generation;
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(endpoint, {
        signal: controller.signal,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Dear-Preview-Code": state.accessCode,
          "X-Dear-Session": sessionId,
        },
        body: JSON.stringify({ messages: requestHistory, language, pagePath, ...(consentEnabled ? {consentReview:true,consentToken:consentUi.token()} : {}) }),
      });

      const data = await response.json().catch(() => ({}));
      if(generation!==state.generation)return;
      if (!response.ok) {
        if(response.status===428&&consentEnabled){consentUi.clear();consentUi.show();}
        if (response.status === 401 && !state.publicMode) {
          state.accessCode = "";
          gate.hidden = false;
          gateError.textContent = "테스트 암호를 다시 확인해주세요.";
          gateInput.focus();
        }
        const error = new Error("chat-request-failed");
        error.status = response.status;
        throw error;
      }

      const reply = typeof data.reply === "string" ? data.reply.trim() : "";
      if (!reply) throw new Error("답변이 비어 있어요.");
      savedTurns.forEach(turn => { delete turn.pending; });
      state.history.push({ role: "assistant", content: reply });
      savedTurns.push({ role: 'assistant', content: reply, action: data.action, route: data.booking_route, columns: data.recommended_columns });
      saveSession();
      loading.remove();
      addMessage("assistant", reply);
      addColumnActions(data.recommended_columns);
      if (data.action === "offer_booking") addBookingActions(data.booking_route || (language === 'ko' ? 'domestic' : 'international'));
      if (data.action === "urgent_help") {
        const urgent = document.createElement("div");
        urgent.className = "dear-chat__booking";
        urgent.innerHTML = '<a href="tel:119">지금 119에 전화하기 <span>→</span></a>';
        messagesElement.appendChild(urgent);
        scrollToLatest();
      }
    } catch (error) {
      if(generation!==state.generation)return;
      loading.remove();
      saveSession();
      showFailure(error.status);
    } finally {
      clearTimeout(timeout);
      if(generation!==state.generation)return;
      setBusy(false);
      if (gate.hidden) input.focus();
    }
  }

  gateForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = gateInput.value.trim();
    if (!value) return;
    state.accessCode = value;
    saveSession();
    gateError.textContent = "";
    gate.hidden = true;
    gateInput.value = "";
    if(consentEnabled)consentUi.show();else input.focus();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage(input.value);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 116)}px`;
  });

  suggestionsElement.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (button) sendMessage(button.textContent);
  });

  resetButton.addEventListener("click", () => { try { sessionStorage.removeItem('dear-ai-chat'); } catch {} window.location.reload(); });
  if (language !== 'ko') {
    const ui = {
      en: ['Hello, I’m Disoongi, DEAR’s AI guide :) How can I help?', 'Ask me anything about your visit :)', 'New chat', 'Private test. Please do not enter names, contact details or other personal information.', 'AI guidance only, not diagnosis or prescriptions.', ['Weight management', 'Gongjindan', 'Fatigue', 'Appointments'], 'Private test access', 'Enter the test password to chat.', 'Test password', 'Enter'],
      ja: ['こんにちは、DEARのAI案内役ディスンイです :) 何かお手伝いしましょうか？', 'ご来院についてお気軽にどうぞ :)', '新しい会話', '非公開テストです。氏名・連絡先などの個人情報は入力しないでください。', 'AIによる案内であり、診断・処方ではありません。', ['体重管理', '拱辰丹', '疲労', '予約案内'], '非公開テスト', 'テスト用パスワードを入力してください。', 'パスワード', '開始'],
      zh: ['您好，我是DEAR的AI向导迪崇 :) 有什么可以帮您？', '关于就诊，欢迎随时提问 :)', '新对话', '非公开测试。请勿输入姓名、联系方式或其他个人信息。', 'AI仅提供指引，不进行诊断或处方。', ['体重管理', '拱辰丹', '疲劳', '预约指南'], '非公开测试', '请输入测试密码开始对话。', '测试密码', '进入']
    }[language];
    messagesElement.querySelector('.chat-message__body').textContent = ui[0];
    input.placeholder = ui[1]; resetButton.textContent = ui[2];
    resetButton.setAttribute('aria-label', ui[2]);
    document.querySelector('.dear-chat__top h1').textContent = {en:'Disoongi',ja:'ディスンイ',zh:'迪崇'}[language];
    document.querySelector('.dear-chat__top p').textContent = {en:'DEAR AI guide',ja:'DEAR AIご案内',zh:'DEAR AI向导'}[language];
    input.setAttribute('aria-label', ui[1]);
    sendButton.setAttribute('aria-label', {en:'Send message',ja:'送信',zh:'发送'}[language]);
    suggestionsElement.setAttribute('aria-label', {en:'Example questions',ja:'質問例',zh:'示例问题'}[language]);
    document.querySelector('.dear-chat__notice').textContent = ui[3];
    document.querySelector('.dear-chat__legal').textContent = ui[4];
    suggestionsElement.querySelectorAll('button').forEach((button, index) => { button.textContent = ui[5][index]; });
    gate.querySelector('h2').textContent = ui[6]; gate.querySelector('p').textContent = ui[7];
    gate.querySelector('label').textContent = ui[8]; gate.querySelector('button').textContent = ui[9];
  }
  if (embedded) {
    try {
      const saved = JSON.parse(sessionStorage.getItem('dear-ai-chat') || 'null');
      if (saved?.expires > Date.now() && Array.isArray(saved.turns)) {
        state.accessCode = typeof saved.accessCode === 'string' ? saved.accessCode : '';
        gate.hidden = Boolean(state.accessCode);
        for (const turn of saved.turns.slice(-14)) {
          if (!['user', 'assistant'].includes(turn.role) || typeof turn.content !== 'string') continue;
          state.history.push({ role: turn.role, content: turn.content.slice(0, 1200) });
          savedTurns.push(turn); addMessage(turn.role, turn.content.slice(0, 1200));
          if (turn.role === 'assistant') addColumnActions(turn.columns);
          if (turn.action === 'offer_booking') addBookingActions(turn.route || (language === 'ko' ? 'domestic' : 'international'));
        }
        suggestionsElement.hidden = savedTurns.length > 0;
        if (savedTurns.at(-1)?.pending) showFailure();
      } else { sessionStorage.removeItem('dear-ai-chat'); }
    } catch {}
    window.addEventListener('keydown', event => { if (event.key === 'Escape') parent.postMessage('dear-ai-close', location.origin); });
  }
  if (isColumnPage) {
    const columnUi = {
      ko: ['저랑 같이 읽어보실래요? 저희 대표원장님의 글에서 궁금한 부분을 쉽게 풀어드릴게요 :)', '어떤 주제가 궁금하세요? 저희 칼럼 중에서 같이 읽을 글을 찾아드릴게요 :)', ['이 글 핵심 알려줘', '어려운 부분 설명해줘'], ['체중 관리에 관한 칼럼 추천해줘', '수면에 관한 칼럼 추천해줘']],
      en: ['Shall we read together? I can explain our director’s article :)', 'What interests you? Let’s find an article from our clinic :)', ['Summarize this article', 'Help me understand this article'], ['Recommend articles about weight management', 'Recommend articles about sleep']],
      ja: ['一緒に読んでみませんか？当院の院長の記事をわかりやすく説明します :)', '気になるテーマはありますか？当院の記事から一緒に読むものを探しましょう :)', ['この記事の要点を教えて', 'この記事をわかりやすく説明して'], ['体重管理の記事をおすすめして', '睡眠の記事をおすすめして']],
      zh: ['要一起读吗？我来解释我们院长文章中的内容 :)', '您对什么主题感兴趣？一起找篇我们诊所的文章读吧 :)', ['告诉我这篇文章的重点', '帮我理解这篇文章'], ['推荐体重管理的文章', '推荐睡眠相关文章']]
    }[language];
    if (!savedTurns.length) messagesElement.querySelector('.chat-message__body').textContent = columnUi[isColumnArticle ? 0 : 1];
    suggestionsElement.replaceChildren(...columnUi[isColumnArticle ? 2 : 3].map(label => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label; return button;
    }));
    suggestionsElement.hidden = false;
  }
  gateInput.focus();
  if(consentEnabled&&gate.hidden)consentUi.show();
  function enablePublicView(){
    if(state.publicMode)return;
    state.publicMode=true;state.accessCode='';consentEnabled=true;gate.hidden=true;
    const title={ko:'디어한의원 AI 안내',en:'DEAR AI guide',ja:'DEAR AI案内',zh:'DEAR AI指引'}[language];
    document.title=title;document.querySelector('.ai-preview__header p').textContent=title;
    document.querySelector('.dear-chat__notice').textContent={ko:'AI 안내예요. 이름·연락처·진료기록은 입력하지 말아주세요.',en:'AI guidance. Do not enter names, contact details or medical records.',ja:'AIによる案内です。氏名・連絡先・診療記録は入力しないでください。',zh:'AI指引。请勿输入姓名、联系方式或诊疗记录。'}[language];
    consentUi.show();
  }
  if(options.get('public')==='1')enablePublicView();
  fetch(endpoint.replace(/\/chat$/, '/health'), {signal:AbortSignal.timeout(5000)}).then(response=>response.json()).then(config=>{if(config.publicChat===true)enablePublicView();}).catch(()=>{});
})();
