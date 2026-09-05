(function () {
  'use strict';
  const version = '20260906-public-1';
  const copy = {
    ko: ['대화 전에 잠깐 확인해주세요', '디숭이는 AI 안내자예요. 진단·처방·예약 확정은 하지 않아요. 이름·전화번호·진료기록과 다른 사람의 정보는 적지 말아주세요.', '만 14세 이상이에요', '대화 입력·응답의 개인정보 처리에 동의해요', '입력에 포함될 수 있는 건강정보 처리에 별도로 동의해요', '안내된 국외 이전에 별도로 동의해요', '처리 항목·보관·국외 이전 자세히 보기', '동의하고 대화 시작', '동의하지 않거나 만 14세 미만이라면', '전화로 안내받기', '예약 안내 보기', '대화 종료·동의 철회', '동의 정보를 확인하지 못했어요. 잠시 후 다시 시도해주세요.', '철회 요청을 완료하지 못했어요. 대화는 중단했으며 재시도할 수 있어요.', '대화가 종료됐어요. 이미 전송된 정보의 삭제 문의는 개인정보방침의 연락처로 요청해주세요.', '동의 내역 보기'],
    en: ['Before we chat', 'Disoongi is an AI guide, not a clinician. It cannot diagnose, prescribe or confirm bookings. Do not enter names, contact details, medical records or another person’s information.', 'I am at least 14 years old', 'I consent to processing personal data in chat inputs and replies', 'I separately consent to processing health information I may enter', 'I separately consent to the described overseas transfers', 'Data, retention and overseas transfer details', 'Agree and start chatting', 'Under 14 or prefer not to agree?', 'Call DEAR', 'Appointment guide', 'End chat and withdraw consent', 'We could not confirm your choices. Please try again.', 'Withdrawal could not be confirmed. Chat has stopped; please retry.', 'Chat ended. For deletion of information already sent, contact the clinic as described in the privacy notice.', 'View consent receipt'],
    ja: ['会話の前にご確認ください', 'ディスンイはAI案内役です。診断・処方・予約確定は行いません。氏名・連絡先・診療記録や他の方の情報は入力しないでください。', '14歳以上です', '会話の入力・回答に含まれる個人情報の処理に同意します', '入力に含まれる健康情報の処理に別途同意します', '案内された国外移転に別途同意します', '処理項目・保存・国外移転の詳細', '同意して会話を開始', '14歳未満、または同意しない場合', '電話で相談', '予約案内', '会話終了・同意撤回', '同意を確認できませんでした。再度お試しください。', '撤回を確認できませんでした。会話は停止しています。再試行してください。', '会話を終了しました。送信済み情報の削除は方針に記載の窓口へご相談ください。', '同意の記録を見る'],
    zh: ['开始对话前请确认', '迪崇是AI向导，不进行诊断、处方或确认预约。请勿输入姓名、联系方式、诊疗记录或他人的信息。', '我已满14周岁', '我同意处理对话输入及回复中的个人信息', '我另行同意处理可能输入的健康信息', '我另行同意所说明的境外传输', '处理项目、保留及境外传输详情', '同意并开始对话', '未满14周岁或不愿同意？', '致电诊所', '预约指南', '结束对话并撤回同意', '无法确认同意，请稍后重试。', '未能确认撤回。对话已停止，请重试。', '对话已结束。如需删除已发送的信息，请通过隐私政策中的联系方式提出。', '查看同意记录']
  };
  window.createDearConsent = function ({ endpoint, language, getAccessCode, onStop, onReady }) {
    const t = copy[language] || copy.ko;
    const root = document.createElement('div');
    root.className = 'dear-chat__gate dear-consent'; root.hidden = true;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'dearConsentTitle');
    const policy = `${language === 'ko' ? '' : '/' + (language === 'zh' ? 'zh-cn' : language)}/privacy.html#ai-guide`;
    const booking = language === 'ko' ? 'https://m.booking.naver.com/booking/13/bizes/729883' : `/international-appointment.html?lang=${language}`;
    root.innerHTML = `<form><h2 id="dearConsentTitle">${t[0]}</h2><p>${t[1]}</p><p><a href="${policy}" target="_blank" rel="noopener">${t[6]}</a></p><fieldset><legend class="sr-only">${t[0]}</legend>${['age14','personal','health','overseas'].map((name,i)=>`<label><input type="checkbox" name="${name}" required><span>${t[i+2]}</span></label>`).join('')}</fieldset><button type="submit">${t[7]}</button><p role="status" data-consent-status></p><p>${t[8]}</p><nav><a href="tel:+82234861777">${t[9]}</a><a href="${booking}" target="_blank" rel="noopener">${t[10]}</a></nav></form>`;
    document.querySelector('.dear-chat').appendChild(root);
    const form = root.querySelector('form');
    const status = root.querySelector('[data-consent-status]');
    const controls = document.createElement('div'); controls.className = 'dear-chat__legal dear-consent-controls'; controls.hidden = true;
    const end = document.createElement('button'); end.type='button'; end.textContent=t[11];
    const retry = document.createElement('button'); retry.type='button';retry.textContent=t[11];retry.hidden=true;status.after(retry);
    retry.addEventListener('click',()=>end.click());
    const receiptView = document.createElement('details'); const summary=document.createElement('summary'); summary.textContent=t[15]; receiptView.appendChild(summary);
    const receiptText=document.createElement('pre'); receiptView.appendChild(receiptText);
    controls.append(end,receiptView);document.querySelector('.dear-chat').appendChild(controls);
    let receipt = null; let timer; let pending = false; let deadline = 0;
    async function call(body) {
      const response = await fetch(endpoint.replace(/\/chat$/, '/consent'), {method:'POST',headers:{'Content-Type':'application/json','X-Dear-Preview-Code':getAccessCode()},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
      if (!response.ok) throw new Error(t[12]);
      return response.json();
    }
    function setCovered(covered) {for(const child of root.parentElement.children)if(child!==root)child.inert=covered;}
    function show() { root.hidden=false;setCovered(true); controls.hidden=!receipt; form.querySelector('input').focus(); }
    form.addEventListener('submit', async event => {
      event.preventDefault(); if(pending || !form.reportValidity())return;
      pending=true;form.querySelector('button').disabled=true; status.textContent='';
      try {
        if(receipt){await call({action:'withdraw',token:receipt.id});receipt=null;retry.hidden=true;}
        const consent={version,acceptedAt:Date.now()};for(const key of ['age14','personal','health','overseas'])consent[key]=form.elements[key].checked;
        const data=await call({consent});
        if(typeof data.receipt?.id!=='string'||!Number.isFinite(data.receipt.expires))throw new Error(t[12]);
        receipt=data.receipt;receiptText.textContent=`${receipt.version}\n${new Date(receipt.acceptedAt).toLocaleString(language)} → ${new Date(receipt.expires).toLocaleString(language)}`;
        const lifetime=Math.max(0,Math.min(30*60000,receipt.expires-receipt.acceptedAt));deadline=performance.now()+lifetime;
        root.hidden=true;setCovered(false);controls.hidden=false;clearTimeout(timer);
        timer=setTimeout(()=>{receipt=null;onStop();show();},lifetime);
        onReady();
      } catch { status.textContent=t[12]; }
      finally {pending=false;form.querySelector('button').disabled=false;}
    });
    end.addEventListener('click',async()=>{
      onStop();clearTimeout(timer);show();form.reset();status.textContent='';
      if(receipt){try{await call({action:'withdraw',token:receipt.id});receipt=null;controls.hidden=true;retry.hidden=true;status.textContent=t[14];}catch{status.textContent=t[13];retry.hidden=false;}}
      else status.textContent=t[14];
      form.querySelector('input').focus();
    });
    root.addEventListener('keydown',event=>{
      if(event.key!=='Tab')return;
      const elements=[...root.querySelectorAll('a,button,input')].filter(el=>!el.disabled);const first=elements[0],last=elements.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
    return { show, token:()=>root.hidden&&receipt&&deadline>performance.now()?receipt.id:null, clear:()=>{clearTimeout(timer);receipt=null;controls.hidden=true;form.reset();} };
  };
})();
