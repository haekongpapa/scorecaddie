# ScoreCaddie 개발 소스 (app)

Next.js 15 (App Router) + TypeScript + Tailwind + Prisma 7 + NextAuth(Auth.js v5) 뼈대.
DB 설계는 `docs` 분석/설계 요약 PPT 기준 (User / GolfCourse / Round / HoleScore).

## 폴더 구조
```
app/
  prisma/schema.prisma      DB 스키마 (7개 테이블: User/Account/Session/VerificationToken/GolfCourse/Round/HoleScore)
  prisma/migrations/        생성된 마이그레이션 (init)
  prisma.config.ts          Prisma 7 CLI 설정 (migrate용 DATABASE_URL)
  src/lib/prisma.ts         런타임 PrismaClient (adapter-pg + Pool)
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
- `npx prisma migrate dev` — 실제 PostgreSQL에 7개 테이블 생성 성공
- `src/lib/prisma.ts` 의 adapter-pg + Pool 방식으로 User/GolfCourse/Round/HoleScore 생성 및 관계 조회(include) 정상 동작

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
