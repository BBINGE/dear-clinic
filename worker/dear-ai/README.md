# 디어 AI 미리보기 Worker

홈페이지의 비공개 `preview/dear-ai.html`에서 Claude API를 호출하는 서버 전용 프록시다. 브라우저에는 Anthropic API 키가 노출되지 않는다.

## 현재 원칙

- 대화 원문을 D1, KV, Analytics 또는 애플리케이션 로그에 저장하지 않는다.
- 미리보기는 `PREVIEW_ACCESS_CODE`가 맞아야 호출할 수 있다.
- 호출 빈도는 브라우저 세션당 분당 12회로 제한한다.
- 모델은 `claude-sonnet-4-6`이며 `wrangler.jsonc`의 `ANTHROPIC_MODEL`로 교체할 수 있다.
- 개인정보처리방침과 공개 운영안이 확정되기 전에는 홈페이지 공개 메뉴나 공통 스크립트에 연결하지 않는다.

## 최초 설정

```powershell
npm install
npx wrangler login
npx wrangler secret put PREVIEW_ACCESS_CODE
npx wrangler secret put ANTHROPIC_API_KEY
npm run deploy
```

비밀값은 명령줄 인수, `.env`, 저장소 파일, 문서에 붙이지 않고 Wrangler의 숨은 입력 프롬프트에 직접 입력한다.

## 검사

저장소 루트에서:

```powershell
node tools/test-dear-ai.mjs
```

이 폴더에서:

```powershell
npm run check
```

## 공개 전 남은 결정

1. 삥이·부끄님 대화 테스트로 말투와 예약 제안 판단을 조정한다.
2. 개인정보 처리 주체, 국외 이전, 보유 여부와 안내 문구를 법률 검토와 함께 확정한다.
3. 운영 남용 방지는 테스트 암호 대신 Turnstile 또는 익명 세션 토큰 기반으로 전환한다.
4. 공개 위치와 노출 방식, GA4/NAVER에 보낼 비식별 CTA 이벤트 범위를 확정한다.
5. 네이버 플레이스·블로그·인스타그램·티스토리의 공식 답변과 홈페이지 지식 원본을 한 기준으로 유지한다.
