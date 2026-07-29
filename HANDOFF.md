# 디어한의원 홈페이지 — 공용 인수인계

최종 갱신: 2026-07-29

대상: Claude, Codex 및 이후 유지보수 담당자

공개 저장소: https://github.com/BBINGE/dear-clinic

배포 주소: https://bbinge.github.io/dear-clinic/

기준 브랜치: `master`

이 파일은 집·회사 PC와 Claude·Codex 사이에서 공유하는 현재 상태 문서다. 이제 Git에 커밋한다. 정적인 커밋 번호를 최신 상태로 믿지 말고 작업 시작 때 반드시 `git fetch`, `git status`, `git log`로 확인한다.

## 1. 작업 시작 절차

```powershell
git fetch origin
git status --short --branch
git log -10 --oneline
```

로컬 변경이 없고 `master`가 원격보다 뒤처졌다면:

```powershell
git pull --ff-only origin master
```

그다음 `AGENTS.md`, `CLAUDE.md`, 이 파일을 읽는다. 로컬 변경이 있으면 출처를 확인하기 전에는 pull, 덮어쓰기, 삭제를 하지 않는다.

## 2. 저장소 역할

### 공개 홈페이지

- 저장소: `BBINGE/dear-clinic`
- 정적 HTML/CSS/Vanilla JS
- GitHub Pages는 `master`의 공개 사이트를 배포한다.
- 칼럼 발행기가 생성한 HTML, Columns 카드, sitemap, 공개 이미지를 포함한다.

### 비공개 칼럼 콘텐츠

- 저장소: `BBINGE/dear-clinic-content`
- Pages CMS 설정, 비공개 초안 JSON, 원고 이미지를 저장한다.
- Pages CMS: https://app.pagescms.org/bbinge/dear-clinic-content/main
- 별도의 `AGENTS.md`, `CLAUDE.md`, `HANDOFF.md`가 있으며 CMS 작업은 그 문서를 함께 따른다.
- 공개 저장소에 비공개 원고, 인증정보, Deploy key를 복사하지 않는다.

## 3. 현재 공개 페이지

한국어 주요 페이지:

- `index.html` — 홈페이지
- `about.html` — About DEAR 허브
- `director.html` — 김민지 대표원장 소개
- `career.html` — 자격·학회·경력
- `philosophy.html` — 진료 철학
- `care.html` — Focus / Calm / Restore / Relief / Shape
- `services.html` — 비디어 다이어트, 디어 공진단, 원내탕전 체질한약, 디어밸런스
- `be-deer.html` — BE DEER 다이어트 독립 소개, 대표원장 운동 관련 자격, 진료 흐름, 작성자 식별 정보를 가린 네이버 영수증 리뷰와 생성형 인물 이미지
- `columns.html` — 공개 칼럼 목록
- `privacy.html`, `patient-rights.html` — 법률·환자 안내

다국어 초벌 페이지:

- 영어 `en/`
- 일본어 `ja/`
- 중국어 간체 `zh-cn/`

다국어 문구는 기계 번역 초벌이며 의료 용어, 경력, 제품 표현은 검수 전 확정 카피가 아니다. 한국어 원본을 번역 수정과 함께 바꾸지 않는다.

## 4. 칼럼 현재 상태

공개 칼럼:

- `columns/seocho-diet-clinic.html` — 최초 수동 제작 예시 칼럼
- `columns/seocho-diet-herbal-medicine.html` — Pages CMS 발행 칼럼

미리보기:

- `preview/seocho-diet-herbal-medicine.html`
- 미리보기는 `noindex`, `nofollow`, `robots.txt` 차단 대상이다.

발행기:

- `tools/publish-column.mjs`
- 테스트: `tools/test-column-publisher.mjs`
- 테스트 자료: `tools/fixtures/column-publisher-test.json`
- CMS 설치 템플릿: `tools/column-cms-template/`

발행기 변경 후 필수:

```powershell
node tools/test-column-publisher.mjs
git diff --check
```

## 5. Pages CMS 작성·발행 흐름

`Save`, `미리보기 만들기`, `홈페이지에 발행`은 서로 다른 동작이다.

1. Pages CMS에서 작성한다.
2. 오른쪽 위 `Save`는 비공개 저장소에 초안을 저장한다. 홈페이지에 공개되지 않는다.
3. `미리보기 만들기`는 공개 저장소의 `preview/{slug}.html`을 갱신한다. Columns 목록과 sitemap에는 추가하지 않는다.
4. 검토 후 `저장·발행 상태`를 `홈페이지 발행 준비 완료`로 바꾸고 다시 `Save`한다.
5. `홈페이지에 발행`을 실행하면 공개 칼럼, `columns.html`, `sitemap.xml`, 공개 이미지가 갱신된다.
6. GitHub Pages 반영 후 실제 공개 주소를 확인한다.

현재 Pages CMS 설정 버전은 `.pages.yml`의 `v4.1`이다. 화면 디자인 블록:

- 큰 소제목과 설명 문단
- 진료에서 확인하는 항목표
- 경우의 수 번호 카드
- 진한 배경의 핵심 문장
- 본문 사진과 설명

Pages CMS 자체의 `Save`, `Add an item`, `Choose content block` 같은 시스템 문구는 영어로 남을 수 있지만 입력 항목과 설명은 한글이다.

## 6. 생성 파일과 수정 경계

- `<!-- GENERATED_BY_DEAR_COLUMN_PUBLISHER -->`가 있는 칼럼은 발행기가 다시 생성할 수 있다.
- 수동 제작 칼럼을 발행기로 덮어쓰지 않는다. 발행기가 마커 없는 기존 파일을 발견하면 중단하도록 되어 있다.
- CMS 원고의 확정 카피를 공개 HTML에서만 고치면 다음 발행 때 사라진다. CMS 원본 JSON을 먼저 수정한다.
- 대표 이미지와 본문 이미지는 5MB 이하 JPG/JPEG/PNG/WebP만 허용한다.
- URL slug는 영문 소문자·숫자·하이픈만 사용하며 발행 후 바꾸지 않는다.

## 7. 보안과 개인정보

- 환자 개인정보를 수집하거나 저장하는 기능은 없다.
- 문의·예약은 네이버 예약, 전화, 톡톡 등 외부 서비스로 연결한다.
- 칼럼과 미리보기에 환자 이름, 연락처, 진료 기록, 식별 가능한 사례를 넣지 않는다.
- 비공개 저장소의 Actions secret 이름은 `DEAR_PUBLIC_REPO_SSH_KEY`다. 값은 GitHub Secrets에만 있고 파일이나 문서에 기록하지 않는다.
- Deploy key는 공개 `BBINGE/dear-clinic` 한 저장소에만 쓰기 권한을 갖는다.
- GitHub Actions는 커밋 SHA로 고정한 `actions/checkout`을 사용한다.

## 8. SEO·검색 상태

- `robots.txt`, `sitemap.xml`, canonical, 기본 meta/OG, JSON-LD가 있다.
- Google Search Console 속성 및 sitemap 제출이 완료됐다.
- 홈페이지는 Google 색인 등록 상태를 확인했다.
- 새 칼럼 발행 후 사용자가 Google Search Console URL 검사에서 색인 생성을 요청한다.
- 네이버 서치어드바이저는 GitHub Pages 주소 등록에 제약이 있었다. 독립 도메인 연결 후 재등록하는 방향이다.
- 독립 도메인은 아직 연결하지 않았다.

도메인 연결 시 함께 바꿀 대상:

1. canonical과 Open Graph URL
2. hreflang
3. `sitemap.xml`
4. `robots.txt`
5. Search Console 속성
6. 네이버 서치어드바이저 등록

## 9. 현재 남은 주요 작업

### 2026-07-28 작업 보류 지점

- 현재 기능·디자인 구현은 부끄님이 전체 사이트를 검토하고 피드백을 줄 때까지 보류한다. 재개 시 새 기능을 임의로 추가하지 말고 부끄님 피드백 반영을 최우선으로 한다.
- 다른 PC나 새 Claude·Codex 작업에서 시작할 때는 이 저장소를 최신화하고 `AGENTS.md` → `CLAUDE.md` → `HANDOFF.md`를 읽은 뒤, 최근 커밋과 공개 Pages 상태를 확인한다. 사용자가 요약·브리프만 요청했다면 파일을 수정하지 않는다.
- 공개 저장소에는 현재 사이트가 실행되는 코드와 배포용 이미지·영상이 모두 있다. 메인 히어로의 웹 최적화 MP4·WebM·포스터는 커밋되어 있으나, 전달받은 편집 전 영상 원본은 저장소 밖 로컬 자산이므로 새 PC에서 원본 재인코딩이 필요하면 다시 제공받아야 한다.
- 환자 개인정보가 남은 리뷰 원본, 비공개 초안, 인증정보는 공개 저장소에 추가하지 않는다. 공개 전 원본 자산 보관이 필요하면 비공개 저장소를 사용한다.

- 메인페이지의 BE DEER CTA와 공진단 소개 사이에 `DEAR CLINICAL PROCESS` 섹션을 추가했다. 병력과 맥락 파악 → 진찰 및 상태 평가 → 감별·위험 신호·한의학적 변증을 포함한 임상적 종합 판단 → 진료 계획과 시행 → 재평가와 조정의 순환 구조이며, 기록·안전·설명은 전 과정을 관통하는 기준으로 분리했다. 기존 메인 섹션은 변경하지 않았다.
- `DEAR CLINICAL PROCESS`와 기존 공진단 소개 사이에 `DEAR HEALTH SYSTEM`을 추가했다. 기존 서비스는 삭제하지 않고 PROGRAM(BE DEER)·CLINICAL CARE(증상과 기능의 회복)·HERBAL MEDICINE(진찰에 근거한 한약 진료)의 서로 다른 세 층위로 분류했으며, 탭을 눌러 각 하위 내용을 확인한다.
- `care.html`은 기존 다섯 가지 Care 탭과 문구를 유지하면서 사진 중심 구조로 개편했다. 실제 원장 사진과 공간 사진을 참고한 문진·상태 평가·치료 준비 이미지 3장과 실제 치료실 사진을 사용한다. 진료 장면과 다섯 Care 사이에는 같은 진료 과정에서 오늘의 상태에 따라 살피는 초점이 달라진다는 연결 문장을 두었다. PC 첫 상담 사진은 글 블록과 비슷한 340–400px 높이의 컨테이너 안에서 크롭하고, 진료 장면은 넓은 대표 사진 1장과 하단 보조 사진 2장의 기존 흐름을 유지하면서 3:1 와이드 비율을 실제 높이에 적용했다. 모바일은 고정 높이를 해제하고 16:9 비율을 사용한다. 밝은 첫 화면의 상단 내비게이션은 초록색으로 보정했다.
- 메인 히어로 영상은 `KakaoTalk_20260728_191225631.mp4` 원본을 기반으로 960×720·24fps를 유지한 무음 웹 최적화본으로 교체했다. WebM(VP9)을 우선 제공하고 MP4(H.264)를 호환용으로 제공하며, 6초 지점의 WebP 포스터를 로딩 전에 표시한다.
- `services.html`은 기존 네 서비스와 확정 문구·사진을 유지하면서 `현재 상태와 목적 → 진료 판단 → 방법 선택 → 경과 확인`의 순서가 먼저 보이도록 재구성했다. 네 서비스를 상품처럼 나열하지 않고 PROGRAM·HERBAL CARE·DAILY CARE의 서로 다른 역할로 표시했으며, 히어로·서비스별 사진·제목·FIND YOUR CARE·CTA 크기를 줄여 한 요소가 화면 전체를 독점하지 않도록 했다.
- 메인 첫 진입 시 공진단·진료·패키지 안내 이미지 3종을 서로 독립된 팝업으로 노출한다. 페이지 배경은 흐리게 만들지 않고 각 팝업의 그림자로만 구분한다. PC에서는 3개를 나란히, 모바일에서는 하나씩 차례로 보여주며 개별 닫기와 오늘 하루 열지 않음을 지원한다. 숨김 상태는 브라우저 `localStorage`에 당일 날짜로만 저장한다.
- BE DEER 페이지는 2026-07-28 데스크톱·태블릿·모바일 타이포와 여백을 1차 정리했으며, 실제 공개 반응과 후기·생성형 이미지의 의료광고 심의 필요성을 운영 전 재점검
- Google Analytics 4 측정 ID `G-E5M36LQ66P`를 공통 `js/main.js`에 연결했다. 공개 페이지 조회와 전화·네이버 예약·톡톡·블로그·인스타그램·BE DEER 진입 클릭을 `dear_cta_click` 이벤트로 전송한다. `preview/` 페이지는 공개 페이지와 통계가 섞이지 않도록 별도 태그를 추가하지 않았다. 기존 `js/click-tracking.js`는 중복 이벤트가 생기지 않도록 호환 가드를 둔다.
- 실제 글쓰기 경험을 통해 Pages CMS 디자인 블록 사용성을 추가 점검
- 기존 CMS 발행 칼럼에 디자인 블록이 필요하면 카피를 임의 변경하지 말고 사용자와 구성을 먼저 결정
- 영어·일본어·중국어 의료 문구 검수
  - 완료: 고유명사·의료용어 오역 일괄 수정 (2026-07-27). 공진단(共振団·贡金丹 등→拱辰丹), 디어(Deere·鹿→DEAR), 비디어(Video·ビデオ·视频→Be Deer), 한의원(韓議員·東洋医院·东方医院→韓医院·韩医院), 원내탕전(園内湯田·浴室→院内湯煎·煎药室), 대표원장(CEO·首席执行官→Director·代表院長·代表院长), 학회·자격·경력 명칭 3개 언어 전면 재정비. 한국어 원본의 `BE DEER`·`DEER BALANCE` 표기는 확정 카피로 보고 유지함.
  - 완료: 2026-07-28 자동 문맥 검수로 중복 doctype, 언어별 OG locale, 영어 Services 전반의 번역투, 일본어 `ビDEAR`·`湯前`·`湯電`, 중국어 `谐振组`·`元内汤全`·`代表董事` 등 고신뢰 오류를 추가 수정하고 전 다국어 페이지에 클릭 이벤트 스크립트를 연결함.
  - 남음: ① 학회 공식 영문 명칭 확인(AKOM·추나학회 등 잠정 표기), ② 前 근무처 로마자 표기 확인(ター韓医院/Teo韩医院 = 터한의원 잠정), ③ 중국어 대표원장 성함 한자 표기(金敏智는 기계 추정, 본인 확인 필요), ④ director 에세이 등 본문 문체 다듬기
- 독립 도메인 구매·연결
- 새 칼럼 발행 후 Google·네이버 수집 요청

## 10. 검증 기준

- HTML/CSS/JS 문법
- `git diff --check`
- 내부 링크와 외부 CTA
- Chrome 계열 데스크톱
- 768px 태블릿
- 390px 전후 모바일
- 긴 한국어 제목과 줄바꿈
- GitHub Pages 실제 배포
- 칼럼 변경 시 미리보기와 발행의 분리

## 11. 작업 종료 절차

1. 변경 파일과 사용자 기존 변경을 구분한다.
2. 테스트와 화면 검증을 수행한다.
3. 운영 상태·절차·남은 작업이 달라졌으면 이 파일을 갱신한다.
4. `HANDOFF.local.md`, 비밀번호, 토큰, 키, 환자정보가 staging에 없는지 확인한다.
5. 한국어 커밋 메시지로 커밋한다.
6. `git push origin master`
7. 원격과 실제 GitHub Pages 결과를 확인한다.

## 12. 다른 PC에서 처음 시작

공개 홈페이지:

```powershell
git clone https://github.com/BBINGE/dear-clinic.git
cd dear-clinic
```

비공개 칼럼 콘텐츠는 GitHub 권한이 있는 계정으로 별도 clone한다.

```powershell
git clone https://github.com/BBINGE/dear-clinic-content.git
cd dear-clinic-content
```

Claude 또는 Codex에 보낼 첫 문장:

```text
저장소 루트의 AGENTS.md, CLAUDE.md, HANDOFF.md를 처음부터 끝까지 읽고,
git status와 최근 커밋, 원격 브랜치 상태를 확인한 뒤 현재 상태에서 이어서 작업해줘.
```
