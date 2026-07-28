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
   - Database Password: 강력한 비밀번호 생성 후 **반드시 별도 보관** (Supabase는 이후 재표시하지 않음) → `credentials.local.txt`의 `[supabase - postgre 접속]` 항목 아래에 추가해두는 것을 권장 (git 미추적 파일이라 안전)
   - Region: 한국에서 가장 가까운 리전 선택 (Northeast Asia (Seoul)이 목록에 있으면 그것, 없으면 Northeast Asia (Tokyo))
   - Pricing Plan: Free로 시작 (MVP 단계, 88번 결정 근거와 동일)
3. 프로젝트 생성은 1~2분 정도 프로비저닝 대기 필요

## 2. Connection String 확인 및 방식 선택

Project Settings → Database → Connection string 메뉴에서 세 가지 방식을 확인할 수 있음:

| 방식 | 포트 | 특징 |
|---|---|---|
| Direct connection | 5432 | **IPv6 전용** (2026-07-28 실사용 확인 — 일반 가정/회사 네트워크(IPv4)에서는 `P1001: Can't reach database server`로 연결 자체가 안 됨) |
| Session pooler | 5432 | IPv4 호환, prepared statement 지원 → **일반 네트워크에서 마이그레이션·런타임 모두에 사용 가능** |
| Transaction pooler (pgbouncer) | 6543 | IPv4 호환, prepared statement 미지원(짧은 트랜잭션 전용) → Prisma 사용 시 `?pgbouncer=true` 필요, 동시 연결이 매우 많을 때만 고려 |

- **실제 겪은 문제(2026-07-28)**: Direct connection 문자열로 로컬에서 `prisma migrate deploy`
  실행 → `P1001: Can't reach database server at db.<ref>.supabase.co:5432` 발생. 원인은 Supabase
  Direct connection이 IPv6 전용으로 바뀐 것(2024년경부터)인데, 국내 대부분 가정/회사 네트워크가
  IPv4라 도달 자체가 안 됨.
- **해결(채택)**: **Session pooler** 문자열 사용. Project Settings → Database → Connection string
  드롭다운에서 "Session pooler" 선택 후 표시되는 문자열을 **직접 조합하지 말고 그대로 복사**할 것.
  올바른 형태는 `postgresql://postgres.<project-ref>:[PASSWORD]@aws-<N>-<region>.pooler.supabase.com:5432/postgres`
  — 호스트에 리전 앞에 `aws-0-`, `aws-1-` 같은 **샤드 번호가 반드시 포함**되며(예:
  `aws-0-ap-northeast-2.pooler.supabase.com`), 사용자명도 `postgres`가 아니라
  **`postgres.<project-ref>`**(점 + 프로젝트 ref)로 Direct connection과 다름.
  2026-07-28에 `aws-ap-northeast-2.pooler.supabase.com`(샤드 번호 누락)으로 직접 조합했다가
  `P1001`(호스트 자체가 존재하지 않아 DNS 단계에서 실패)이 재현된 바 있음 — **반드시 대시보드
  문자열을 복사/붙여넣기하고 비밀번호만 치환할 것**.
  Session pooler는 prepared statement를 지원해 Prisma 마이그레이션에도 문제없이 쓸 수 있음.
- **현재 코드 구조**: `app/prisma.config.ts`(CLI/마이그레이션용)와 `app/src/lib/prisma.ts`(런타임용,
  `@prisma/adapter-pg`)가 **둘 다 같은 `DATABASE_URL` 하나만 사용**하는 구조 (91번 항목의
  `lib/config/env.ts`도 `databaseUrl` 단일 값) → Session pooler 문자열 하나를 `DATABASE_URL`에
  넣으면 마이그레이션과 런타임 모두 커버되어 별도 코드 변경 불필요.
- **비밀번호 URL 인코딩 필수**: 비밀번호에 `@`, `#`, `!` 등 특수문자가 있으면 반드시 퍼센트
  인코딩(`@`→`%40` 등) 후 연결 문자열에 넣을 것. 인코딩 안 하면 Prisma가 문자열 파싱에 실패함.
- **추후 필요 시**: 동시 접속이 매우 많아지면 Transaction pooler(6543)로 전환 검토 — 지금은
  Session pooler로 충분 (미정 사항으로 memory.md에 기록).

## 3. 로컬에서 첫 마이그레이션 적용

브라우저에서 Connection string(Direct connection, URI 형식)을 복사한 뒤:

1. `app/.env`의 `DATABASE_URL`을 Supabase **Session pooler** 문자열(비밀번호는 URL 인코딩
   적용)로 교체 (기존 로컬 Docker용 값은 주석 처리하거나 별도 보관해두면 다시 로컬 DB로
   돌아가고 싶을 때 편함)
2. `cd app`
3. `npx prisma migrate deploy` — 기존 마이그레이션 8건(init ~ add_golf_course_address_lotno)이
   순서대로 적용됨. **주의: `migrate dev`가 아니라 `migrate deploy` 사용**
   (`dev`는 로컬 전용이며 새 마이그레이션 생성까지 시도해 운영 DB에는 부적합)
4. `npx prisma generate` — Prisma Client 재생성 (99번 항목과 동일한 이유로 필요)
5. `npx prisma studio` 로 Supabase에 테이블(User/GolfCourse/GolfCourseLoop/GolfCourseHole/Round/
   HoleScore 등)이 정상 생성됐는지 확인

## 3-1. pgAdmin으로 접속 (선택)

기존 로컬 Docker DB처럼 pgAdmin(`http://localhost:5050`)으로 Supabase도 확인 가능. `.env`에 넣은
Session pooler 연결 문자열을 필드별로 나눠 입력하면 됨(문자열의 `%40`은 실제 비밀번호 필드에는
인코딩 없이 원문 그대로 입력).

1. pgAdmin 접속 → Servers 우클릭 → Register → Server
2. **General 탭**: Name에 `Supabase - scorecaddie` 등 구분 가능한 이름 입력(기존 로컬 서버와 별도 항목으로 추가, 로컬 항목은 그대로 유지)
3. **Connection 탭** — **반드시 `app/.env`의 `DATABASE_URL`(마이그레이션이 이미 성공한 그 값)을
   열어 host/username을 그대로 복사할 것. 절대 이 문서의 예시 문자열을 그대로 타이핑하지 말 것**
   (같은 리전이라도 프로젝트마다 Supavisor 샤드 번호가 달라 `aws-0-...`가 아닐 수 있고, 다른
   샤드로 접속하면 `FATAL: Tenant or user not found`가 발생함 — 2026-07-28 실제 재현됨):
   - Host name/address: `DATABASE_URL`의 `@` 뒤 ~ `:5432` 앞 부분을 정확히 복사
   - Port: `5432`
   - Maintenance database: `postgres`
   - Username: `DATABASE_URL`의 `postgres.` 뒤 프로젝트 ref 부분까지 정확히 복사 (예:
     `postgres.sklyiwlevijfijsupynu` 형태, 앞뒤 공백 없이)
   - Password: `credentials.local.txt`의 Supabase DB 비밀번호 원문(URL 인코딩 없이 그대로, 예: `Paron@!72gg`)
4. **SSL 탭**: SSL mode를 **Require**로 설정 (Supabase는 SSL 연결을 요구함 — 로컬 Docker DB와의 차이점)
5. Save 후 좌측 트리에서 `postgres` DB 하위에 마이그레이션으로 생성된 테이블들이 보이면 정상

**문제 발생 시(`FATAL: Tenant or user not found`)**: 호스트나 사용자명이 실제 프로젝트에 할당된
값과 다르면 발생. DNS/TCP 연결 자체는 되지만(IP는 정상 응답) Supavisor가 해당 tenant를 못 찾는
것이므로, 짐작이 아니라 `.env`의 검증된 값을 그대로 복사했는지부터 다시 확인할 것.

## 4. 앱 동작 스모크 테스트 — 먼저 진행 (회원가입으로 User 행 생성)

**주의: `User` 테이블은 마이그레이션 직후엔 당연히 비어있음(스키마만 생성됐지 데이터는 없음).
반드시 이 단계를 먼저 해서 계정을 최소 1개 만든 뒤에 5번(관리자 지정)으로 넘어갈 것.**

`npm run dev` 후 아래 확인:

- 회원가입 / 이메일 로그인 / 구글 로그인 — 이 중 하나로 로그인하면 `User` 테이블에 행이 생김
- 골프장 목록 조회
- 스코어 등록 → 조회 → 라운드 상세

## 5. 최초 관리자 계정 지정

4번에서 만든 본인 계정이 `User` 테이블에 보이는 것을 pgAdmin(또는 Supabase Table Editor,
`prisma studio`)에서 확인한 뒤, 그 행의 `role` 컬럼만 `USER` → `ADMIN`으로 직접 수정.
아직 "최초 관리자 지정" 전용 플로우가 없는 상태라(미정 사항, 5번 항목) 이렇게 DB에서 직접
바꾸는 방법뿐임. 변경 후 앱에서 관리자 화면(골프장 Par 관리/회원 관리) 진입이 가능한지 재확인.

## 6. 다음 단계 (참고, 이번 작업 범위 아님)

- Vercel 프로젝트 생성 + GitHub 저장소 연동, 환경변수 등록(`DATABASE_URL`, `GOOGLE_CLIENT_ID`/
  `GOOGLE_CLIENT_SECRET`, `KAKAO_REST_API_KEY`, `WEATHER_API_KEY`, `PUBLIC_DATA_API_KEY`, NextAuth
  `AUTH_SECRET` 등)
- Supabase 연결 완료 후 테스트 계획서(96번 항목) 로드맵 2단계 충족 → Playwright e2e 착수 가능

## 체크리스트

- [x] Supabase 계정 생성 / 프로젝트 생성(scorecaddie, ap-northeast-2) — 2026-07-28
- [x] DB 비밀번호 별도 보관 (`credentials.local.txt`) — 2026-07-28
- [x] Connection string(Session pooler) 확인 — 2026-07-28
- [x] `app/.env`의 `DATABASE_URL` 교체 — 2026-07-28
- [x] `npx prisma migrate deploy` — 2026-07-28 (Direct→IPv6 이슈로 실패 후 Session pooler로 성공)
- [x] pgAdmin 연결 확인 — 2026-07-28 (예시 host 오타로 실패 후 `.env` 값 복사로 성공)
- [ ] `npx prisma generate`
- [ ] `npm run dev` 스모크 테스트로 계정 1개 생성(회원가입/로그인) — **관리자 지정보다 먼저**
- [ ] `User` 테이블에 생성된 계정 확인 후 관리자 계정(role=ADMIN) 수동 지정
- [ ] 완료 후 결과를 알려주시면 memory.md / 테스트 계획서 갱신 + git commit 진행
