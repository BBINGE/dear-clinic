# 디어한의원 프로젝트 — Codex/AI 작업 규칙

이 저장소에서 작업하는 모든 AI 에이전트는 작업 전에 다음 파일을 순서대로 처음부터 끝까지 읽는다.

1. `CLAUDE.md` — 장기적으로 유지할 브랜드·카피·개발 원칙
2. `HANDOFF.md` — 현재 구현 상태·운영 방법·남은 작업

## 작업 시작

```powershell
git fetch origin
git status --short --branch
git log -10 --oneline
```

- 기준 브랜치는 `master`다.
- 원격보다 뒤처졌고 로컬 변경이 없다면 `git pull --ff-only origin master`로 최신화한다.
- 사용자의 변경이나 출처가 불분명한 변경은 덮어쓰거나 삭제하지 않는다.
- 공개 저장소이므로 비밀번호, 토큰, 개인키, 환자 개인정보, 비공개 이메일을 기록하지 않는다.

## 작업 중

- 사용자는 개발 초보다. 사용자가 직접 해야 하는 일이 있으면 프로그램 이름, 클릭 위치, 실행 명령을 순서대로 설명한다.
- 확정 카피, NAP, 진료시간, 원장 경력, 디자인 규칙을 요청 없이 변경하지 않는다.
- 논의·질문은 구현 승인으로 간주하지 않는다.
- 기존 정적 HTML/CSS/Vanilla JS 구조를 유지한다.
- 칼럼 CMS와 발행 흐름을 수정할 때는 비공개 저장소 `BBINGE/dear-clinic-content`와의 호환성을 함께 확인한다.

## 작업 종료

1. 변경 범위에 맞는 테스트와 PC·태블릿·모바일 검증을 수행한다.
2. 운영 상태나 절차가 달라졌다면 같은 작업에서 `HANDOFF.md`도 갱신한다.
3. `git diff --check`와 `git status`로 커밋 범위를 확인한다.
4. 한국어 커밋 메시지로 커밋하고 `master`에 push한다.
5. GitHub Pages의 실제 배포 결과를 확인한다.

`HANDOFF.md`는 이제 여러 PC와 Claude·Codex 사이의 공용 인수인계문이므로 커밋 대상이다. PC별 임시 정보는 `HANDOFF.local.md`에 적고 커밋하지 않는다.
