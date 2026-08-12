# 디어한의원 홈페이지 공동 작업 브리프

이 문서는 삥이와 부끄님, 그리고 두 사람의 Claude·Codex가 같은 기준으로 홈페이지를 수정하기 위한 짧은 안내서다. 자세한 브랜드·카피 원칙과 최신 구현 상태는 반드시 `CLAUDE.md`, `HANDOFF.md`에서 확인한다.

## 작업 범위

- 공개 홈페이지 저장소: `https://github.com/BBINGE/dear-clinic`
- 실제 홈페이지: `https://dearhani.com/`
- 기준 브랜치: `master`
- 배포: `master` 반영 후 GitHub Actions가 GitHub Pages에 배포
- 이 권한은 공개 홈페이지 개선용이다. 비공개 CMS, 로그인 정보, 환자정보는 이 저장소와 공동 작업 범위에 포함하지 않는다.

## 작업을 시작할 때

저장소를 처음 받는 PC에서는 GitHub 계정으로 clone한다.

```powershell
git clone https://github.com/BBINGE/dear-clinic.git
cd dear-clinic
```

매 작업 전에 아래 순서로 최신 상태를 확인한다.

```powershell
git fetch origin --prune
git status --short --branch
git log -10 --oneline
```

그다음 `AGENTS.md` → `CLAUDE.md` → `HANDOFF.md` → 이 문서를 처음부터 끝까지 읽는다. 출처를 모르는 로컬 변경이나 파일은 삭제하거나 덮어쓰지 않는다.

Claude·Codex에는 다음처럼 요청하면 된다.

```text
저장소의 AGENTS.md, CLAUDE.md, HANDOFF.md, COLLABORATOR_BRIEF.md를 처음부터 끝까지 읽고,
git fetch와 status, 최근 커밋을 확인한 뒤 현재 상태에서 작업해줘.
기존 카피와 디자인을 임의로 바꾸지 말고 PC·태블릿·모바일과 실제 배포까지 확인해줘.
```

## 안전하게 같이 수정하는 방법

1. `master`를 최신화한다.
2. 작업마다 별도 브랜치를 만든다. 예: `bukke/main-photo-fix`, `bbinge/column-layout`.
3. 요청받은 범위만 수정하고 PC·태블릿·모바일에서 확인한다.
4. 한국어 커밋 메시지로 저장하고 GitHub에 push한다.
5. 가능하면 Pull Request에서 서로 확인한 뒤 `master`에 합친다.
6. 배포 후 `https://dearhani.com/`에서 실제 결과를 확인한다.
7. 운영 방식이나 상태가 달라졌으면 같은 작업에서 `HANDOFF.md`도 갱신한다.

## 현재 최고 상태와 복구

- 복구 태그: `site-best-2026-08-12`
- 기준 커밋: `4d66229`
- 의미: 2026-08-12에 삥이가 현재 홈페이지의 최고 상태로 확정한 전체 사이트

문제가 생기면 먼저 새 작업을 멈추고 변경 내용을 보존한다. 바로 `master`를 강제로 되돌리지 말고, 아래 명령으로 복구본을 별도 브랜치에 연다.

```powershell
git fetch origin --tags
git switch -c restore/site-best-2026-08-12 site-best-2026-08-12
```

이 브랜치에서 사이트가 정상인지 확인한 뒤 삥이와 부끄님이 복구 범위를 결정한다. `git reset --hard`, 강제 push, 저장소 삭제는 합의 없이 실행하지 않는다.

## 공개 저장소에 넣지 않는 것

- 비밀번호, 토큰, SSH 개인키, API 키
- 환자 개인정보와 비공개 상담 내용
- CMS 로그인 정보와 비공개 원고
- 저작권이나 사용 허가가 확인되지 않은 원본 자산

Git 기록 자체가 일상적인 백업이며, GitHub의 원격 저장소가 공동 작업본이다. 큰 작업 전에는 날짜가 포함된 복구 태그를 추가하고, 중요한 원본 사진·영상은 별도의 비공개 보관소에도 보관한다.
