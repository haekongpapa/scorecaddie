# Supabase DB 배포 가이드

> 작성일: 2026-07-28. 로컬 Docker PostgreSQL에서 Supabase(PostgreSQL)로 전환하는 절차.
> 이 세션의 샌드박스는 `supabase.com`에 네트워크 접근이 불가능하므로(10번 항목 관련 이슈,
> 아웃바운드 allowlist에 github.com 외 대부분 차단 확인됨), 계정/프로젝트 생성 및 연결 정보
> 발급은 재홍님이 브라우저에서 직접 진행해야 한다. 이 문서는 그 절차를 정리한 체크리스트.

## 0. 사전 결정 사항 (재확인)

- 배포 스택: **Vercel + Supabase** 확정 (88번 항목, 2026-07-27)
- 인증: NextAuth 자체 구현 유지, Supabase Auth는 사용하지 않음 → Supabase는 순수 PostgreSQL DB로만 사용
- 현재 상태: Supabase 프로젝트 미생성 확인(`credentials.local.txt`에 관련 정보 없음, 2026-07-28)

## 1. Supabase 프로젝트 생성

1. https://supabase.com 접속 → GitHub 계정으로 로그인(가입) 권장 — 이미 GitHub(`haekongpapa`)로 저장소를 쓰고 있어 연동이 편함
2. "New Project" 클릭
   - Organization: 개인 조직 (없으면 자동 생성됨)
   - Name: `scorecaddie` (또는 원하는 이름)
   - Database Password: 강력한 비밀번호 생성 후 **반드시 별도 보관** (Supabase는 이후 재표시하지 않음) → `credentials.local.txt`의 `[postgre 접속]` 항목 아래에 추가해두는 것을 권장 (git 미추적 파일이라 안전)
   - Region: 한국에서 가장 가까운 리전 선택 (Northeast Asia (Seoul)이 목록에 있으면 그것, 없으면 Northeast Asia (Tokyo))
   - Pricing Plan: Free로 시작 (MVP 단계, 88번 결정 근거와 동일)
3. 프로젝트 생성은 1~2분 정도 프로비저닝 대기 필요

## 2. Connection String 확인 및 방식 선택

Project Settings → Database → Connection string 메뉴에서 두 가지 방식을 확인할 수 있음:

| 방식 | 포트 | 용도 |
|---|---|---|
| Direct connection | 5432 | 스키마 마이그레이션(`prisma migrate deploy`), 장시간 연결에 적합 |
| Transaction pooler (pgbouncer) | 6543 | Vercel 같은 서버리스 런타임의 짧은 연결에 적합, 동시 연결 수 제한 회피 |

- **현재 코드 구조**: `app/prisma.config.ts`(CLI/마이그레이션용)와 `app/src/lib/prisma.ts`(런타임용,
  `@prisma/adapter-pg`)가 **둘 다 같은 `DATABASE_URL` 하나만 사용**하는 구조 (91번 항목의
  `lib/config/env.ts`도 `databaseUrl` 단일 값).
- **1차 배포(MVP, 트래픽 적음)**: 우선 Direct connection 하나만으로 `DATABASE_URL`을 설정해도
  충분할 가능성이 높음(Vercel Hobby + 낮은 트래픽 전제).
- **추후 필요 시**: 동시 접속이 늘어나 커넥션 이슈가 생기면, Transaction pooler용 별도 변수
  (`DIRECT_URL` 등)를 추가해 마이그레이션은 Direct, 런타임은 Pooler로 분리하는 코드 변경 필요 —
  지금은 선제적으로 하지 않고 실제 문제 발생 시 진행 (미정 사항으로 memory.md에 기록).

## 3. 로컬에서 첫 마이그레이션 적용

브라우저에서 Connection string(Direct connection, URI 형식)을 복사한 뒤:

1. `app/.env`의 `DATABASE_URL`을 Supabase Direct connection 문자열로 교체
   (기존 로컬 Docker용 값은 주석 처리하거나 별도 보관해두면 다시 로컬 DB로 돌아가고 싶을 때 편함)
2. `cd app`
3. `npx prisma migrate deploy` — 기존 마이그레이션 8건(init ~ add_golf_course_address_lotno)이
   순서대로 적용됨. **주의: `migrate dev`가 아니라 `migrate deploy` 사용**
   (`dev`는 로컬 전용이며 새 마이그레이션 생성까지 시도해 운영 DB에는 부적합)
4. `npx prisma generate` — Prisma Client 재생성 (99번 항목과 동일한 이유로 필요)
5. `npx prisma studio` 로 Supabase에 테이블(User/GolfCourse/GolfCourseLoop/GolfCourseHole/Round/
   HoleScore 등)이 정상 생성됐는지 확인

## 4. 최초 관리자 계정 지정

아직 "최초 관리자 지정" 플로우가 없는 상태(미정 사항, 5번 항목) → Supabase Table Editor(웹
대시보드) 또는 `prisma studio`에서 `User` 테이블의 `role` 컬럼을 본인 계정만 `ADMIN`으로 직접 수정.

## 5. 앱 동작 스모크 테스트

`npm run dev` 후 아래 확인:

- 회원가입 / 이메일 로그인 / 구글 로그인
- 골프장 목록 조회, 관리자 화면 진입(위에서 ADMIN으로 바꾼 계정으로)
- 스코어 등록 → 조회 → 라운드 상세

## 6. 다음 단계 (참고, 이번 작업 범위 아님)

- Vercel 프로젝트 생성 + GitHub 저장소 연동, 환경변수 등록(`DATABASE_URL`, `GOOGLE_CLIENT_ID`/
  `GOOGLE_CLIENT_SECRET`, `KAKAO_REST_API_KEY`, `WEATHER_API_KEY`, `PUBLIC_DATA_API_KEY`, NextAuth
  `AUTH_SECRET` 등)
- Supabase 연결 완료 후 테스트 계획서(96번 항목) 로드맵 2단계 충족 → Playwright e2e 착수 가능

## 체크리스트

- [ ] Supabase 계정 생성 / 프로젝트 생성(scorecaddie, region 선택)
- [ ] DB 비밀번호 별도 보관 (`credentials.local.txt`)
- [ ] Connection string(Direct) 확인
- [ ] `app/.env`의 `DATABASE_URL` 교체
- [ ] `npx prisma migrate deploy`
- [ ] `npx prisma generate`
- [ ] `prisma studio`로 테이블 확인
- [ ] 관리자 계정(role=ADMIN) 수동 지정
- [ ] `npm run dev` 스모크 테스트
- [ ] 완료 후 결과를 알려주시면 memory.md / 테스트 계획서 갱신 + git commit 진행
