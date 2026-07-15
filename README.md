# ScoreCaddie

- `doc/` — 분석/설계 요약 (PPT)
- `db/` — 로컬 PostgreSQL (Docker Compose)
- `app/` — 개발 소스 (Next.js + Prisma + NextAuth)
- `.vscode/` — VS Code 워크스페이스 설정 (아래 참고)

## VS Code 설치 및 연동

1. https://code.visualstudio.com 접속 → Windows용 다운로드 → 설치 (기본 옵션 그대로 진행)
2. VS Code 실행 → `File > Open Folder` → 이 `ScoreCaddie` 폴더 선택
3. 폴더를 열면 우측 하단에 "추천 확장 프로그램을 설치하시겠습니까?" 알림이 뜹니다 → **설치** 클릭
   (Prisma, ESLint, Prettier, Tailwind CSS IntelliSense, Docker, EditorConfig 자동 추천)
   알림을 놓쳤다면: 좌측 사이드바 확장 아이콘 → 검색창에 `@recommended` 입력 → 목록에서 전체 설치
4. 이미 구성해둔 작업 단축 실행 (`Ctrl+Shift+P` → `Tasks: Run Task`):
   - `DB: docker compose up` — PostgreSQL 기동
   - `App: npm install` — 패키지 설치
   - `App: prisma migrate dev` — DB 스키마 반영
   - `App: dev server` — 개발 서버 실행
5. 디버깅: 좌측 "실행 및 디버그" 탭 → `Next.js: dev (app)` 선택 후 F5
   (프론트 콜스택까지 보려면 `Next.js: attach to Chrome` 함께 사용)

## 빠른 시작 (터미널)
```
cd db && docker compose up -d
cd ../app && npm install && npx prisma migrate dev && npm run dev
```
자세한 내용은 각 폴더의 README 참고.

## GitHub 연동

저장소: https://github.com/haekongpapa/scorecaddie (이미 README.md 1개 커밋 존재)

`.gitignore` 는 이미 준비되어 있습니다 (`app/node_modules`, `app/.env`, `app/.next` 등 제외).

VS Code 터미널에서 `ScoreCaddie` 폴더 기준으로:
```
git init
git add .
git commit -m "Initial commit: ScoreCaddie dev environment"
git branch -M main
git remote add origin https://github.com/haekongpapa/scorecaddie.git
git push -u origin main --force
```
`--force` 는 원격에 있던 자동생성 README(커밋 1개)를 지금 커밋으로 덮어쓰기 위함입니다 — 지울 내용이 없는 초기 상태라 안전합니다. 이후부터는 `--force` 없이 `git push` 만 쓰면 됩니다.

푸시 시 브라우저로 GitHub 로그인 창이 뜨면 로그인하면 됩니다 (Git Credential Manager).

이미 `.git` 폴더가 있는데 안 될 경우: 폴더 탐색기에서 `ScoreCaddie\.git` 폴더를 먼저 수동 삭제한 뒤 위 명령을 다시 실행하세요.
