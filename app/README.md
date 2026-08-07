# ScoreCaddie 개발 소스 (app)

Next.js 15 (App Router) + TypeScript + Tailwind CSS + Prisma ORM 7 + NextAuth(Auth.js v5).
DB는 Supabase PostgreSQL 하나를 로컬 개발·Vercel Preview·Production이 그대로 공유합니다(별도 로컬 DB 없음, 2026-07-28 전환).

## 폴더 구조
```
app/
  prisma/schema.prisma      DB 스키마 — 7개 핵심 테이블(User/GolfCourse/GolfCourseSyncLog/
                             GolfCourseLoop/GolfCourseHole/Round/HoleScore) + NextAuth 3개
                             (Account/Session/VerificationToken)
  prisma/migrations/        마이그레이션 9건 (init ~ add_golf_course_sync_log)
  prisma.config.ts          Prisma 7 CLI 설정 (migrate 등 CLI용 DATABASE_URL)
  src/lib/prisma.ts         런타임 PrismaClient (@prisma/adapter-pg)
  src/lib/config/env.ts     환경변수 접근 창구 (다른 파일은 process.env 직접 참조 안 함)
  src/auth.ts / auth.config.ts   NextAuth 설정 (이메일/비밀번호 + 구글/네이버 소셜 로그인)
  src/middleware.ts          보호 라우트 + role=ADMIN 접근 제어
  src/app/                  페이지(랜딩~마이페이지, 관리자 4개) + api/ 라우트
  e2e/                       Playwright e2e 테스트 (8개 시나리오)
  e2e/mocks/                 외부 API(공공데이터/카카오) 로컬 목 서버 — e2e 전용
```

## 실행 순서

### 1. 패키지 설치
```
cd app
npm install
```
`postinstall` 스크립트가 `prisma generate`를 자동 실행합니다.

### 2. 환경변수 확인
`.env`에 아래 값이 이미 채워져 있습니다 (별도 설정 불필요):

`DATABASE_URL` · `AUTH_SECRET` · `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` · `PUBLIC_DATA_API_KEY` · `WEATHER_API_KEY` · `KAKAO_REST_API_KEY`

`DATABASE_URL`은 Supabase Session Pooler 연결 문자열입니다. 로컬 개발·Vercel Preview·Production이 전부 이 DB 하나를 공유하므로 별도 로컬 Postgres(Docker)를 띄울 필요가 없습니다 (`db/` 폴더는 초기 세팅 흔적으로만 남아있고 현재 미사용).

### 3. 개발 서버 실행
```
npm run dev
```
http://localhost:3000 접속

## 스키마 변경 시
`prisma/schema.prisma`를 수정했다면:
```
npx prisma migrate dev --name <설명>
```
Supabase(공유 DB)에 바로 반영되고 `prisma/migrations/`에 마이그레이션 파일이 새로 생성됩니다 — git에 커밋해주세요.

## 테스트

### 단위 테스트 (Vitest)
```
npm run test
```

### e2e 테스트 (Playwright)
```
npm run test:e2e
```
실행 전 기존에 띄워둔 `npm run dev`가 있다면 **반드시 먼저 종료**해주세요 — Playwright가 새 서버를 띄우지 않고 기존 서버를 재사용하면 목 서버 관련 환경변수가 반영 안 된 상태라 관리자 시나리오(공공데이터 동기화 등)가 실패할 수 있습니다. 테스트 계정/데이터는 `e2e/fixtures/`에서 자동 생성되고 `global-teardown`으로 정리됩니다.

## 핵심 참고사항
- **관리자 계정**: 최초 관리자는 가입 폼으로 만들 수 없습니다(기본 `role=USER`). Supabase에서 해당 계정의 `role`을 `ADMIN`으로 직접 변경해야 합니다.
- **소셜 로그인**: 구글 + 네이버(2026-08-07 추가)를 지원합니다. 카카오 OAuth 로그인은 2026-07-22 사용자 요청으로 삭제됐습니다(`KAKAO_REST_API_KEY`는 로그인용이 아니라 골프장 좌표 지오코딩의 주소 검색용 별개 키입니다). 네이버는 `NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET`를 네이버 개발자센터에서 발급받아 `.env`에 입력해야 실제 로그인이 동작합니다(콜백 URL: `/api/auth/callback/naver`).
- **골프장 데이터**: 공공데이터포털 실시간 API로 동기화합니다(`doc/admin-golfcourse-sync.md` 참고). 좌표는 TM 중부원점(EPSG:5174) → WGS84 변환 후, 실패 시 카카오 주소 검색으로 폴백합니다.
- **골프장 루프/Par**: `GolfCourseLoop`(9홀 단위 구간, 전반/후반 등) → `GolfCourseHole`(루프별 규정타수). `HoleScore.par`는 라운드 등록 시점의 스냅샷이라 이후 Par가 바뀌어도 과거 기록은 그대로 유지됩니다.

## 관련 문서
- 화면 설계: `../doc/pages.md`
- 프로젝트 전체 요약(개요/DB/화면/구현/배포): `../doc/ScoreCaddie_분석설계_요약.pptx`
- 배포 가이드: `../doc/supabase-deploy-guide.md`, `../doc/vercel-deploy-guide.md`
- 코딩 가이드: `../doc/coding-guidelines.md`
- 진행 이력 전체: `../memory.md`
