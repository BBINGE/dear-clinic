# 디어 칼럼 비공개 콘텐츠 저장소 템플릿

이 폴더의 파일은 공개 홈페이지 저장소에 바로 설치하는 관리자 화면이 아닙니다.
초안이 외부에 공개되지 않도록 별도의 비공개 GitHub 저장소에 복사해 사용하는 템플릿입니다.

## 운영 구조

1. Pages CMS에서 이메일로 로그인해 원고와 이미지를 저장합니다.
2. 저장한 내용은 비공개 콘텐츠 저장소에만 남습니다.
3. `발행하기`를 눌렀을 때 `publish-column.yml`이 실행됩니다.
4. 공개 홈페이지의 `tools/publish-column.mjs`가 칼럼 HTML, Columns 목록, sitemap.xml을 생성합니다.
5. 공개 홈페이지 `master`에 발행 커밋이 push되고 GitHub Pages가 갱신됩니다.

## 저장소에 필요한 비밀 값

- 이름: `DEAR_PUBLIC_REPO_TOKEN`
- 용도: 비공개 콘텐츠 저장소의 발행 작업이 공개 `BBINGE/dear-clinic` 저장소에 발행 파일을 push할 때만 사용합니다.
- 권한: `BBINGE/dear-clinic` 한 저장소의 Contents 읽기/쓰기만 허용하는 fine-grained token을 사용합니다.

토큰을 파일이나 `.pages.yml`에 직접 적지 않습니다. GitHub 저장소의
`Settings → Secrets and variables → Actions`에만 저장합니다.

## 관리자 구분

- 박성호: GitHub 소유자 및 관리자
- 김민지 대표원장: Pages CMS 이메일 협업자

두 사람 모두 원고 작성, 저장, 미리보기, 발행이 가능하도록 구성합니다.
설정 변경과 협업자 초대는 GitHub 소유자만 수행합니다.

## 발행 전 필수 확인

- 제목, 목록 요약, 검색 설명, 대표 이미지 설명
- 치료 효과를 보장하거나 단정하는 표현이 없는지
- 환자 후기 또는 전후 사진이 포함되지 않았는지
- 참고자료 링크가 실제 원문인지
- PC와 모바일 미리보기
- 발행 후 Google Search Console URL 검사
- 독립 도메인 연결 후 네이버 서치어드바이저 수집 요청
