# ScoreCaddie 개발 소스 (app)

Next.js 15 (App Router) + TypeScript + Tailwind + Prisma 7 + NextAuth(Auth.js v5) 뼈대.
DB 설계는 `docs` 분석/설계 요약 PPT 기준 (User / GolfCourse / Round / HoleScore).

## 폴더 구조
```
app/
  prisma/schema.prisma      DB 스키마 (8개 테이블: User/Account/Session/VerificationToken/GolfCourse/GolfCourseHole/Round/HoleScore)
  prisma/migrations/        생성된 마이그레이션 (init, add_golf_course_hole_par, add_user_role)
  prisma.config.ts          Prisma 7 CLI 설정 (migrate용 DATABASE_URL)
  src/lib/prisma.ts         런타임 PrismaClient (adapter-pg)
  src/auth.ts                NextAuth 설정 (이메일/비밀번호 + 구글 + 카카오)
  src/app/                  페이지 (랜딩/로그인/회원가입/대시보드/골프장/스코어)
  src/middleware.ts          보호 라우트 (대시보드 등 로그인 필요)
```

## ⚠️ 시작 전 확인
`node_modules` 폴더가 이미 있다면(작업 과정에서 생긴 불완전한 임시 설치본입니다) **먼저 수동으로 삭제**해주세요.
탐색기에서 `app/node_modules` 폴더 삭제 (또는 PowerShell에서 `Remove-Item -Recurse -Force node_modules`) 후 아래 순서대로 진행하면 됩니다.

## 실행 순서

### 1. DB 먼저 띄우기
```
cd ../db
docker compose up -d
```

### 2. 패키지 설치
```
cd ../app
npm install
```

### 3. DB 스키마 반영
`.env` 는 이미 `db/docker-compose.yml` 값과 맞춰 채워져 있습니다 (수정 불필요).
```
npx prisma migrate dev
```
→ `prisma/migrations` 에 이미 포함된 초기 마이그레이션이 그대로 적용됩니다.

### 4. 개발 서버 실행
```
npm run dev
```
http://localhost:3000 접속

## 검증 완료 사항 (2026-07-15)
샌드박스 임시환경에서 아래를 실제로 실행하여 검증했습니다 (PC에는 남지 않음, 코드 정확성 확인용):
- `npx prisma generate` / `npx prisma validate` 정상
- `npx prisma migrate dev` — 실제 PostgreSQL에 8개 테이블 생성 성공 (GolfCourseHole 포함)
- `src/lib/prisma.ts` 의 adapter-pg 방식으로 User/GolfCourse/GolfCourseHole/Round/HoleScore 생성 및 관계 조회(include) 정상 동작 — 골프장 18홀 Par 등록 → 라운드 등록 시 HoleScore.par 스냅샷 저장까지 end-to-end 확인
- `new PrismaPg(pool)` (pg Pool 인스턴스를 직접 넘기는 방식)은 실제 쿼리 실행 시 `ERR_INVALID_ARG_TYPE` 오류로 깨지는 것을 확인하여, `new PrismaPg({ connectionString })` 방식으로 확정함

### GolfCourseHole / Par 관련 참고
- `GolfCourseHole` — 골프장별 18홀 규정타수(Par). 공공데이터에 없는 값이라 관리자가 직접 입력/보정.
- `HoleScore.par` — 라운드 등록 시점의 Par 스냅샷. 이후 골프장 Par가 바뀌어도 과거 라운드 기록은 그대로 유지됨.

### User.role (관리자 화면 접근 제어)
- `Role` enum (`USER` | `ADMIN`), 기본값 `USER`. 골프장 Par 등록/CSV 업로드 등 관리자 전용 화면을 이 값으로 구분한다.
- 샌드박스에서 `role: 'ADMIN'` 생성, 기본값 `USER` 적용, `role` 조건 조회까지 실제 쿼리로 검증 완료.
- 최초 관리자 계정은 가입 폼으로 만들 수 없으므로(기본값 USER), DB에서 직접 `role`을 `ADMIN`으로 올려주거나 시드 스크립트로 지정해야 함.

### 관리자 화면 (11~13번, doc/pages.md)
- 골프장 Par 관리 목록 → 개별 Par 입력/수정 → CSV 일괄 업로드. 목업: `doc/mockups/11-admin-courses.html` ~ `13-admin-upload.html`
- CSV 업로드 처리 로직(포맷/매칭/오류 처리) 상세 설계: `doc/admin-csv-upload.md`

## 아직 채워야 할 값 (.env)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — 구글 소셜 로그인 (Google Cloud Console)
- `KAKAO_CLIENT_ID` / `KAKAO_CLIENT_SECRET` — 카카오 소셜 로그인 (Kakao Developers)
- `PUBLIC_DATA_API_KEY` — 공공데이터포털 골프장 인허가 데이터
- `WEATHER_API_KEY` — 기상청 단기예보 API

`AUTH_SECRET` 은 이미 랜덤 값으로 채워져 있습니다 (운영 배포 시에는 새로 발급 권장).

## 다음 구현 단계 (미구현, 페이지만 뼈대)
- 골프장 목록/상세 (공공데이터 연동)
- 스코어 등록/조회
- 날씨 연동
- 로그인/회원가입 폼 UI
