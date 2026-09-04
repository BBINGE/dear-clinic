(function initializeDearAiPreview() {
  "use strict";

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
  const state = { history: [], accessCode: "", busy: false };
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
      ? `<div class="chat-message__avatar" aria-hidden="true"><img src="../assets/images/disoongi-profile.png" alt=""></div><div class="chat-message__body">${paragraphs}</div>`
      : `<div class="chat-message__body">${paragraphs}</div>`;
    messagesElement.appendChild(article);
    scrollToLatest();
    return article;
  }

  function addLoading() {
    const article = document.createElement("article");
    article.className = "chat-message chat-message--assistant chat-message--loading";
    article.setAttribute("aria-label", "디숭이가 답변을 생각하고 있어요");
    article.innerHTML = '<div class="chat-message__avatar" aria-hidden="true"><img src="../assets/images/disoongi-profile.png" alt=""></div><div class="chat-message__body"><i></i><i></i><i></i></div>';
    messagesElement.appendChild(article);
    scrollToLatest();
    return article;
  }

  function addBookingActions() {
    const actions = document.createElement("div");
    actions.className = "dear-chat__booking";
    actions.innerHTML = `
      <a href="${bookingLinks.booking}" target="_blank" rel="noopener" data-track-action="ai_naver_booking">네이버로 예약할게요 <span>→</span></a>
      <a href="${bookingLinks.talk}" target="_blank" rel="noopener" data-track-action="ai_naver_talk">톡톡으로 먼저 물어볼게요 <span>→</span></a>
      <a href="${bookingLinks.phone}" data-track-action="ai_phone">전화로 상담할게요 <span>02-3486-1777</span></a>`;
    messagesElement.appendChild(actions);
    scrollToLatest();
  }

  function setBusy(busy) {
    state.busy = busy;
    input.disabled = busy;
    sendButton.disabled = busy;
    messagesElement.setAttribute("aria-busy", String(busy));
  }

  async function sendMessage(text) {
    if (state.busy || !text.trim()) return;
    if (!endpoint || endpoint.includes("__DEAR_AI_ENDPOINT__")) {
      addMessage("assistant", "아직 AI 연결 주소가 들어오지 않았어요. 열음에게 Cloudflare 연결을 마쳐달라고 해주세요 :)");
      return;
    }

    const userText = text.trim().slice(0, 1200);
    state.history.push({ role: "user", content: userText });
    addMessage("user", userText);
    suggestionsElement.hidden = true;
    input.value = "";
    input.style.height = "auto";
    setBusy(true);
    const loading = addLoading();

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Dear-Preview-Code": state.accessCode,
          "X-Dear-Session": sessionId,
        },
        body: JSON.stringify({ messages: state.history.slice(-14) }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) {
          state.accessCode = "";
          gate.hidden = false;
          gateError.textContent = "테스트 암호를 다시 확인해주세요.";
          gateInput.focus();
        }
        throw new Error(data.error || "응답을 불러오지 못했어요.");
      }

      const reply = typeof data.reply === "string" ? data.reply.trim() : "";
      if (!reply) throw new Error("답변이 비어 있어요.");
      state.history.push({ role: "assistant", content: reply });
      loading.remove();
      addMessage("assistant", reply);
      if (data.action === "offer_booking") addBookingActions();
      if (data.action === "urgent_help") {
        const urgent = document.createElement("div");
        urgent.className = "dear-chat__booking";
        urgent.innerHTML = '<a href="tel:119">지금 119에 전화하기 <span>→</span></a>';
        messagesElement.appendChild(urgent);
        scrollToLatest();
      }
    } catch (error) {
      loading.remove();
      state.history.pop();
      addMessage("assistant", `${error.message || "잠시 연결이 불안정해요."}\n\n급한 예약은 02-3486-1777로 전화해주시면 바로 도와드릴게요.`);
    } finally {
      setBusy(false);
      input.focus();
    }
  }

  gateForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = gateInput.value.trim();
    if (!value) return;
    state.accessCode = value;
    gateError.textContent = "";
    gate.hidden = true;
    gateInput.value = "";
    input.focus();
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

  resetButton.addEventListener("click", () => window.location.reload());
  gateInput.focus();
})();
