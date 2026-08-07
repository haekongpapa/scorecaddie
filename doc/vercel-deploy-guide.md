# Vercel 배포 가이드

> 작성일: 2026-07-29. Supabase DB 연결(100~113번 항목)과 Playwright e2e 8개 시나리오
> 전체 통과(114~116번 항목)가 끝난 뒤 진행하는 마지막 단계 — Vercel에 앱을 실제로 배포.
> 이 세션의 샌드박스는 `supabase.com` 때와 마찬가지로 `vercel.com`에도 네트워크 접근이
> 불가능(outbound allowlist에 github.com 외 대부분 차단)하므로, 계정 생성·프로젝트 연동·
> 환경변수 입력은 재홍님이 브라우저에서 직접 진행해야 합니다. 이 문서는 그 절차와
> 체크리스트, 그리고 미리 확인해둔 위험 요소를 정리한 것입니다.

## 0. 사전 결정 사항 (재확인)

- 배포 스택: **Vercel + Supabase** 확정(88번 항목, 2026-07-27) — Supabase 연결은 이미 완료된 상태.
- GitHub 저장소: `https://github.com/haekongpapa/scorecaddie` (origin/main까지 동기화 완료, 최신 커밋은 Playwright 시나리오 5~8).
- Next.js 프로젝트 위치는 저장소 루트가 아니라 `app/` 하위 — Vercel Root Directory 설정에서 반드시 지정 필요(아래 2번).

## 1. 코드 사전 점검 (이번 세션에서 미리 확인·수정한 내용)

Vercel에 올리기 전, 이 저장소 구조와 설정을 미리 검토해 아래 사항을 확인/조치했습니다.

- **`app/package.json`에 `postinstall: "prisma generate"` 추가** — 원래 없었던 스크립트입니다.
  Prisma 공식 권장 사항으로, Vercel의 빌드 캐시 재사용 방식 때문에 `npm install`만으로는
  Prisma Client가 재생성되지 않아 `next build`가 `@prisma/client did not initialize` 류
  에러로 실패하는 경우가 흔합니다. 이번에 미리 추가해뒀으니 별도 조치 불필요.
- **Prisma 쿼리 엔진**: 이 프로젝트는 `@prisma/adapter-pg`(driver adapter) 방식이라
  플랫폼별 네이티브 엔진 바이너리(`binaryTargets`)가 필요 없습니다 — Vercel 서버리스
  환경에서 흔히 겪는 "OpenSSL/엔진 바이너리 못 찾음" 문제 자체가 발생할 여지가 적은 구조입니다.
- **NextAuth v5 + Vercel**: `AUTH_URL`을 별도로 넣지 않아도 Auth.js v5는 Vercel 환경(`VERCEL` env
  var 존재)에서 요청 헤더 기준으로 자동으로 호스트를 신뢰(trust host)합니다 — 이 프로젝트
  `auth.config.ts`에도 관련 커스텀 설정이 없으므로 기본 동작 그대로 두면 됩니다.
- **미들웨어(`src/middleware.ts`)**: Edge 런타임 전용 경량 설정(`auth.config.ts`)만 사용하도록
  이미 분리되어 있어(Credentials/bcrypt/Prisma는 Edge에 안 실림) Vercel Edge 미들웨어와 호환됩니다.
- 로컬 빌드(`npm run build`)를 이 세션 샌드박스에서 직접 돌려 최종 검증하려 했으나, 마운트
  방식(FUSE) + 매 명령이 독립 프로세스로 격리되는 제약이 겹쳐 이번 세션 안에서는 실행하지
  못했습니다(114번 항목과 같은 유형의 샌드박스 제약). **재홍님이 로컬 PC나 Vercel 빌드 로그로
  최초 배포 시 실제 빌드 성공 여부를 확인해주셔야 합니다** — 위 postinstall 추가로 가장 흔한
  실패 원인은 선제 조치했지만 100% 보장은 아닙니다.

## 2. Vercel 프로젝트 생성 + GitHub 연동

1. https://vercel.com 접속 → GitHub 계정으로 로그인(가입) — `haekongpapa` GitHub로 이미
   저장소를 쓰고 있어 연동이 가장 간단합니다.
2. "Add New..." → "Project" → GitHub 저장소 목록에서 `haekongpapa/scorecaddie` 선택 → Import
   (처음이면 Vercel의 GitHub App에 저장소 접근 권한을 승인하는 화면이 뜹니다)
3. **Configure Project 화면에서 반드시 확인**:
   - **Root Directory**: `app` 로 지정(기본값 `.`을 그대로 두면 빌드가 실패합니다 — 이 저장소는
     `app/`이 실제 Next.js 프로젝트 루트)
   - **Framework Preset**: Next.js 자동 감지(Root Directory를 `app`으로 바꾸면 자동으로 잡힘)
   - Build Command / Output Directory / Install Command는 기본값(Next.js 프리셋 기본) 그대로 두면 됩니다.
4. 이 화면에서 바로 아래 3번의 환경변수를 입력한 뒤 "Deploy" — 또는 일단 Deploy 후 Project
   Settings에서 나중에 입력해도 됩니다(그 경우 재배포 필요, 5번 참고).

## 3. 환경변수 등록

Project Settings → Environment Variables 메뉴에서 아래 9개를 등록합니다(2026-08-07, 네이버
로그인 추가로 2개 늘어남 — 최초 배포 때는 7개였음). **값은 이 문서에
적지 않습니다 — `app/.env` 파일(git에는 없는 로컬 전용 파일)을 열어 그대로 복사해서 넣으세요**
(Supabase 가이드 3-1절과 동일한 원칙: 타이핑하지 말고 복사).

| 변수명 | 용도 | 비고 |
|---|---|---|
| `DATABASE_URL` | Supabase Session pooler 연결 문자열 | 로컬과 프로덕션이 **같은 Supabase DB**를 씀(별도 운영용 DB 없음) |
| `AUTH_SECRET` | NextAuth JWT 서명 키 | 로컬 값 그대로 재사용 가능(새로 발급해도 무방, 재발급 시 기존 세션 전부 무효화됨) |
| `GOOGLE_CLIENT_ID` | 구글 로그인 | 4번에서 리다이렉트 URI 추가 필요 |
| `GOOGLE_CLIENT_SECRET` | 구글 로그인 | |
| `NAVER_CLIENT_ID` | 네이버 로그인 | 4-1번에서 Callback URL 추가 필요(memory.md 134~135번) |
| `NAVER_CLIENT_SECRET` | 네이버 로그인 | |
| `PUBLIC_DATA_API_KEY` | 공공데이터포털(골프장 정보) | |
| `WEATHER_API_KEY` | 기상청 단기예보 | 공공데이터포털과 같은 키를 재사용 중(로컬과 동일) |
| `KAKAO_REST_API_KEY` | 카카오 로컬 API(주소 지오코딩) | NextAuth용 카카오 로그인 키가 아님(로그인은 구글도 네이버도 아닌 별개 용도) |

**Environment 범위 선택 시 주의**: Vercel은 변수마다 Production / Preview / Development
체크박스를 고를 수 있습니다. 이 프로젝트는 **운영용 DB가 하나뿐**이라(Supabase 무료 티어,
별도 스테이징 DB 없음), Preview 배포(PR마다 자동 생성되는 미리보기 URL)에도 같은
`DATABASE_URL`을 넣으면 미리보기 환경에서의 테스트 데이터가 실제 운영 데이터와 섞입니다.
**우선 Production에만 체크하고 시작하는 것을 권장** — Preview 배포가 필요해지면 그때
Supabase에 별도 프로젝트(무료 티어 추가 생성)를 만들어 분리하는 방식을 검토하세요.

## 4. Google OAuth 프로덕션 리다이렉트 URI 추가

Vercel이 배포 도메인(`https://<프로젝트명>.vercel.app` 또는 커스텀 도메인)을 발급한 뒤:

1. https://console.cloud.google.com → 해당 프로젝트의 OAuth 2.0 클라이언트 ID 설정으로 이동
2. **승인된 리디렉션 URI**에 아래 추가 (기존 로컬용 `http://localhost:3000/api/auth/callback/google`은
   그대로 유지):
   ```
   https://<vercel이 발급한 도메인>/api/auth/callback/google
   ```
3. **승인된 자바스크립트 원본**에도 `https://<vercel이 발급한 도메인>` 추가
4. 저장 후 반영까지 수 분 걸릴 수 있음

이 단계를 빼먹으면 이메일/비밀번호 로그인은 정상 동작하지만 구글 로그인만
`redirect_uri_mismatch` 에러가 납니다.

**Preview 배포 주의**: PR마다 도메인이 랜덤하게 바뀌므로, Preview URL에서는 구글 로그인이
기본적으로 막힙니다(리다이렉트 URI를 미리 등록할 수 없음) — 이메일/비밀번호 로그인으로 확인하거나,
Vercel의 "고정 Preview 도메인" 기능을 쓰는 방법이 있습니다(필요해지면 별도 검토).

## 4-1. 네이버 OAuth 프로덕션 Callback URL 등록 (2026-08-07 추가)

네이버는 구글과 달리 "Client ID"(서비스 ID) 자체는 로컬/프로덕션 공용이라 재발급이
필요 없습니다 — **등록해야 하는 건 서비스 URL과 Callback URL, 이 두 가지뿐**입니다.

1. https://developers.naver.com/apps → 해당 애플리케이션 → "API 설정" 탭
2. **서비스 URL**에 배포 도메인 추가: `https://scorecaddie.vercel.app`
   (기존 로컬용 `http://localhost:3000`은 그대로 유지)
3. **네이버 로그인 Callback URL**에 아래 추가(줄바꿈으로 여러 개 등록 가능, 로컬용도 유지):
   ```
   https://scorecaddie.vercel.app/api/auth/callback/naver
   ```
4. 저장 후 반영까지 수 분 걸릴 수 있음 — Client ID/Secret 값 자체는 로컬과 동일한 값을
   Vercel 환경변수(`NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET`)에 그대로 등록하면 됨(위 3번
   환경변수 표 참고).

이 단계를 빼먹으면 네이버 로그인 버튼을 눌렀을 때 네이버 쪽에서 "등록되지 않은 서비스 URL"류
에러가 납니다(구글의 `redirect_uri_mismatch`와 같은 성격).

**커스텀 도메인을 나중에 연결하면**: 6번(커스텀 도메인)처럼 서비스 URL/Callback URL도 새
도메인 기준으로 추가 등록해야 합니다(기존 `*.vercel.app` 값은 유지해도 무방).

## 5. 첫 배포 확인

1. Deploy 실행 후 Vercel의 빌드 로그를 끝까지 확인 — 특히 `prisma generate` 관련 로그가
   정상 출력되는지(1번에서 추가한 postinstall이 실행된 흔적) 확인
2. 배포 완료 후 발급된 도메인으로 접속해 아래 스모크 테스트(Supabase 가이드 4번과 동일한 항목):
   - 이메일/비밀번호 회원가입 또는 로그인
   - 구글 로그인(4번 설정 완료 후)
   - 골프장 목록 조회
   - 스코어 등록 → 조회 → 라운드 상세
   - (관리자 계정으로) 관리자 화면 진입

빌드가 실패하면 로그의 에러 메시지를 그대로 공유해주시면 원인 파악하겠습니다 — 흔한 원인은
① Root Directory 미설정, ② 환경변수 누락/오타, ③ (이번엔 선제 조치했지만) Prisma Client
미생성 순입니다.

## 6. (선택) 커스텀 도메인

자체 도메인을 쓸 계획이 있다면 Project Settings → Domains에서 추가 가능. 이 경우 4번의
Google 리다이렉트 URI도 커스텀 도메인 기준으로 다시 등록해야 합니다. 예산/도메인 보유 여부는
아직 미정 사항(개발리스트.md 5번)이므로, 우선은 Vercel 기본 도메인(`*.vercel.app`)으로
시작하고 이후 필요 시 진행해도 무방합니다.

## 7. 배포 완료 (2026-07-29)

배포 도메인: **https://scorecaddie.vercel.app/**

첫 배포 시도에서 Vercel이 CVE-2025-66478(Next.js 15.0.0~16.0.6 영향)을 감지해 자동 차단 →
`next`/`eslint-config-next`를 15.1.6에서 같은 15.1.x 라인 최신 패치 `15.1.12`로 올려 해결
(memory.md 118번 항목 참고, 코드 변경 없이 버전 bump만). 재배포 성공 후 Google OAuth
리다이렉트 URI 등록 → 스모크 테스트(이메일/구글 로그인, 골프장 조회, 스코어 등록·조회·상세,
관리자 화면) 전부 재홍님이 직접 확인 완료.

## 체크리스트

- [x] `app/package.json`에 `postinstall: "prisma generate"` 추가 — 2026-07-29
- [x] Vercel 계정 생성 / GitHub(`haekongpapa/scorecaddie`) 연동 — 2026-07-29
- [x] 프로젝트 Import 시 Root Directory `app` 지정 — 2026-07-29
- [x] 환경변수 7종 등록(Production 범위) — 2026-07-29
- [x] (배포 중 추가 발견) CVE-2025-66478 대응: next 15.1.6 → 15.1.12 — 2026-07-29
- [x] Google Cloud Console에 프로덕션 리다이렉트 URI/원본 추가 — 2026-07-29
- [x] 첫 배포 성공 확인(빌드 로그 확인) — 2026-07-29
- [x] 스모크 테스트(로그인 2종/골프장 조회/스코어 등록/관리자 화면) — 2026-07-29
- [ ] (신규, 2026-08-07) `NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET` Vercel 환경변수 등록 +
      네이버 개발자센터 서비스 URL/Callback URL에 배포 도메인 추가(4-1번) — 재홍님 진행 예정
- [ ] (선택, 미착수) 커스텀 도메인 연결 — 예산/도메인 보유 여부 미정(개발리스트.md 5번)

**Vercel 배포 마일스톤 완료.** 이후 문제가 생기면 이 문서에 이어서 기록.
