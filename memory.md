# 프로젝트: 개인 골프 스코어 관리 서비스 (ScoreCaddie)

> 이 파일은 프로젝트의 핵심 결정사항과 맥락을 기록합니다.
> 새 대화 시작 시 이 파일을 업로드하면 이어서 작업할 수 있습니다.

---

## 0. 다음 세션 시작 가이드 (2026-07-22 갱신 — 먼저 읽을 것)

- **현재 상태**: **14개 화면(사용자 10 + 관리자 4) 전부 실구현 완료.** 관리자 화면 4개(11~14번)는 이미 2026-07-20~21에 구현이 끝나 있었음(상세 이력은 50/52/62~68번 항목) — 직전 세션에 이 파일 상단 가이드를 "관리자 화면은 설계만 되어있고 구현 착수 전"으로 잘못 적었던 것을 76번 항목에서 정정함. **새 세션에서는 이 섹션뿐 아니라 필요하면 8~75번 본문도 실제로 훑어보고, 의심스러우면 `git log`/코드로 재검증할 것** — memory.md 요약만 믿고 진행하다 이번처럼 오판할 수 있음.
- **화면 단위 밖에서 남은 작업(우선순위 순서 없음, 사용자 지정 대기)**:
  1. `app/README.md`·루트 `README.md`가 구버전 기준으로 멈춰 있음 — 스키마/화면 갱신 내용과 동기화 필요.
  2. 카카오 OAuth 실제 로그인 테스트 — `.env`의 `KAKAO_CLIENT_ID`/`KAKAO_CLIENT_SECRET`이 둘 다 빈 값(로그인용 카카오 앱 자체가 아직 미등록) — 사용자가 Kakao Developers에서 앱 등록/키 발급 후 로컬 테스트 예정(구글 로그인은 완료).
  3. 하이원CC 홀별 Par 자료 미확보(부차 데이터 이슈) — 사용자가 공식 스코어카드 확보 시 재요청 예정.
  4. **좌표 지오코딩(79~82번)은 REST API 키 발급·403 해결까지 실사용 검증 완료.** 82번(2026-07-22)에서 `GolfCourse.addressLotno`(지번 주소 원본) 컬럼을 추가해 도로명→지번→키워드(골프장명) 3단계 폴백으로 개편함 — **사용자 로컬에서 `prisma migrate deploy`+`generate` → 11번(골프장 Par 관리) "골프장 공공 데이터 업로드" 재실행(기존 652개 골프장 `addressLotno` 백필) → "좌표 지오코딩 실행" 재실행, 이 순서로 후속 조치 필요**(82번 항목 참고).
  5. **환경 팁(82번, 2026-07-22)**: 샌드박스에서 `prisma generate`가 `EPERM: unlink ...client/index-browser.js`로 실패하면, `mv node_modules/.prisma/client node_modules/.prisma/client_old_<ts>`로 기존 디렉터리를 비켜준 뒤 재실행하면 됨(삭제는 막혀있어도 이동은 허용되는 FUSE 마운트 특성 활용) — 이제 스키마 변경 후에도 샌드박스에서 `tsc` 타입 검증까지 가능.
- **기상청 날씨 API는 77/78번에서 실사용 검증까지 완료**(2026-07-22, `WEATHER_API_KEY` 정상 동작 확인됨) — 더 이상 대기 항목 아님.
- **로컬 DB 접근 불가 환경 제약** (재홍님과 논의 완료, 2026-07-22): 이 샌드박스는 재홍님 PC와 분리된 격리 환경이라 `localhost:5432`(Docker든 네이티브 설치든 무관)에 도달 불가, 아웃바운드도 극히 제한적 allowlist(github.com 외 대부분 차단 확인)라 클라우드 DB로 옮겨도 당장은 안 됨 — 실제 DB 동작 검증은 계속 재홍님이 로컬에서 진행하는 방식 유지하기로 확정.
- **작업 시 필수 규칙**: 이 프로젝트 폴더(`ScoreCaddie`)에 대한 파일 쓰기는 `Edit`/`Write` 툴이 아니라 항상 `mcp__workspace__bash`의 heredoc(`cat > file << 'EOF' ... EOF`)으로 하고, 직후 `wc -c`/`tail`/`grep -cP '\x00'`로 검증할 것(파일이 조용히 잘리거나 변경이 아예 반영 안 되는 마운트 버그가 반복 확인됨 — 8~12번 항목 참고). memory.md·doc/*.md처럼 이미 존재하는 큰 파일을 부분 수정할 때는 python3(`open().read()`→문자열 치환→`open().write()`)로 특정 블록만 교체하는 방식이 안전하고 효율적(전체를 다시 타이핑할 필요 없음, 순수 파일 I/O라 Edit/Write 툴의 truncation 버그와도 무관) — 이번 세션에 확립한 방식.
- **사용자 커뮤니케이션 선호(2026-07-22)**: 화면 번호를 언급할 때는 항상 화면 명칭을 함께 표기할 것(예: "11번" X → "11번(골프장 Par 관리)" O). 대화뿐 아니라 memory.md/개발리스트.md 등 문서에도 가능하면 이 표기를 유지.
- **TypeScript 판별 유니언 주의(80번, 2026-07-22)**: `tsconfig.json`이 `strict: false`라 `{ok:true}|{ok:false}` 같은 boolean 판별자 유니언은 `if/else`에서 제대로 안 좁혀짐(narrowing 실패, `tsc` 에러). 성공/실패를 나타내는 타입은 항상 `{lat,lng} | {reason}`처럼 필드 유무로 판별(`"필드명" in 값`)하게 설계할 것 — `lib/weather/kma.ts`(`FetchResult`), `lib/geocoding/kakao.ts`(`GeocodeResult`)가 이 스타일 예시.
- 세부 이력은 아래 8~79번 항목(시간순 작업 로그)에 모두 기록되어 있음.

---

## 1. 프로젝트 개요

개인(또는 소규모 그룹)의 골프 라운드 스코어를 골프장/일자/홀 단위로 기록하고 조회하는 웹 서비스. 서비스명 "ScoreCaddie"로 확정.

## 2. 핵심 기능 (확정, 2026-07-16 갱신)

1. **회원관리 및 로그인** — 이메일/비밀번호 + 구글·카카오 소셜 로그인 (NextAuth), 가입 시 "타인에게 정보 제공 동의"(`thirdPartyConsent`, 선택) 수집
2. **골프장 리스트 관리** — 공공데이터포털 연동 + 관리자 보정, 골프장은 9홀 단위 "루프"(`GolfCourseLoop`, 전반/후반 또는 동/서/남코스)로 구성
3. **날씨 정보** — 라운드 관련 날씨 표시 (기상청 단기예보 API)
4. **스코어 등록** *(2026-07-16 2-Step 구조로 재설계)* — Step1(골프장·루프·일자 선택) → Step2(스코어카드: 홀마다 티샷결과/페널티·OB·벙커/온그린핀거리/온그린·퍼트 스코어 4분할 입력, 홀메모)
5. **스코어 조회** *(2026-07-16 조회조건 개편)* — 기간·골프장 필터 + "내 기록만/전체 회원"(전체 회원은 `thirdPartyConsent=true`인 회원 데이터만 노출)
6. **라운드 상세** — 홀별 스코어 표시 UI는 3개 설계안(탭-상세형/매트릭스개선형/세로리스트형) 검토 중, 최종 확정 전
7. **관리자 골프장 Par 관리** — 골프장 → 루프 → 9홀 Par 개별 입력 + CSV 일괄 업로드(`골프장명,루프명,홀번호,Par`), `User.role=ADMIN` 전용
8. **관리자 회원 관리** *(2026-07-16 신규)* — 회원 목록 조회, 관리자 권한 부여/해제

## 3. 기술 스택 (확정 완료)

| 영역 | 선택 스택 | 사유 |
|---|---|---|
| 프론트엔드 | Next.js (React) + TypeScript | SSR/SEO, 풀스택 구성 용이 |
| 스타일링 | Tailwind CSS | 빠른 UI 개발 |
| 백엔드 | Next.js API Routes | 별도 서버 없이 통합 운영 (MVP 적합) |
| DB | PostgreSQL + Prisma ORM (7.x) | 관계형 데이터에 적합, 타입 안전 |
| 인증 | NextAuth.js (Auth.js) + `User.role` 구분 | 이메일/소셜 로그인 + 관리자 권한 구분 |
| 날씨 API | 기상청 단기예보 API (공공데이터포털) | 국내 서비스 적합, 좌표 기반 조회 |
| 배포 | Vercel + Supabase/Neon | MVP 단계 무료/저비용 |
| 로컬 개발 DB | Docker Compose (postgres:16-alpine) | `db/docker-compose.yml`, 로컬 기동/연결 검증 완료 |

## 4. 결정사항 로그

- **2026-07-14**: 프로젝트 착수. 핵심 기능 5가지 확정.
- **2026-07-14**: "회원" 범위 확정 → 불특정 다수 대상 서비스형, 개방형 회원가입.
- **2026-07-14**: 로그인 방식 확정 → 이메일/비밀번호 + 소셜 로그인(구글/카카오), NextAuth.js 통합.
- **2026-07-14**: 골프장 데이터 소스 확정 → 공공데이터포털 "행정안전부_골프장" 인허가 데이터, 관리자 보정 가능.
- **2026-07-14**: 날씨 API 확정 → 기상청 단기예보 API.
- **2026-07-15**: 서비스명 "ScoreCaddie" 확정. 분석/설계 요약 PPT 최초 작성 (`doc/ScoreCaddie_분석설계_요약.pptx`).
- **2026-07-15**: 로컬 개발 환경 구성 완료 — `db/`(Docker Compose PostgreSQL 16), `app/`(Next.js 15 + Prisma 7 + NextAuth 스캐폴딩), `.vscode/`(워크스페이스 설정), GitHub 저장소 연동(`github.com/haekongpapa/scorecaddie`).
- **2026-07-15**: 화면 설계 10개 확정 (`doc/pages.md`), 전체 HTML 목업 작성 (`doc/mockups/`).
- **2026-07-15**: 스코어 등록 화면 UI 반복 확정 — 홀 2열 → 1행 1홀로 변경, 홀별 메모 입력 추가 후 최종적으로 타수 입력 바로 옆에 메모를 나란히 배치하는 구조로 확정. 라운드 상세의 "수정" 버튼은 별도 화면을 새로 만들지 않고 스코어 등록 화면을 `?edit=1` 쿼리로 재사용.
- **2026-07-15~16**: `GolfCourseHole` 모델(골프장별 18홀 Par) 신설, `HoleScore.par`(등록 시점 Par 스냅샷) 필드 추가 → 실 DB 마이그레이션/쿼리 검증 완료.
- **2026-07-15~16**: `User.role`(`USER`/`ADMIN`) 필드 신설 → 관리자 전용 화면 접근 제어 근거. 최초 관리자 계정은 DB에서 직접 role 지정 필요 (별도 초대/승격 플로우는 미구현, 논의 필요 항목으로 이관).
- **2026-07-15~16**: 관리자 화면 3개 신규 설계 → 골프장 Par 관리 목록 / 개별 Par 입력 / CSV 일괄 업로드. 대시보드에 `role=ADMIN`일 때만 보이는 관리자 진입 배너 추가. CSV 업로드 처리 로직(포맷, 골프장명 매칭 규칙, 부분 성공 처리) 문서화 (`doc/admin-csv-upload.md`).
- **2026-07-16**: `src/lib/prisma.ts`의 `new PrismaPg(pool)`(pg Pool 인스턴스 직접 전달) 패턴이 실제 쿼리 실행 시 `ERR_INVALID_ARG_TYPE`로 크래시하는 버그 발견 → `new PrismaPg({ connectionString })` 방식으로 확정, 전체 재검증 완료.
- **2026-07-16**: 분석/설계 요약 PPT v2 갱신 — 화면 13개(관리자 3개 포함), DB 5개 핵심 테이블, 개발 환경 구성 슬라이드 신설, DB 컬럼 정의 상세 슬라이드 추가, 이슈 3건(adapter-pg Pool 버그 포함) 반영. 총 14페이지.

## 5. 미정 사항 (다음 논의 필요, 2026-07-16 갱신)

- [x] ~~스코어 입력 단위~~ → 확정: 2-Step(코스선택→스코어카드) + 4분할 상세 입력 방식으로 재확정 (2026-07-16)
- [ ] 배포/호스팅 예산 및 도메인 여부
- [ ] 모바일 대응: 반응형 웹으로 충분한지, 추후 앱 전환 고려 여부
- [x] 공공데이터포털 API 키 발급 완료 (2026-07-14, `.env`에 저장)
- [x] 골프장 공공데이터 요청 URL/파라미터 확인 완료 (2026-07-14, 아래 9번 참조)
- [ ] **관리자 계정 발급 절차** — 현재는 DB에서 직접 `role`을 `ADMIN`으로 변경해야 함. 별도 초대/승격 플로우가 필요한지 논의 필요. (14번 관리자 회원관리 화면에서 기존 회원의 role 변경은 가능해졌지만, "최초" 관리자 지정 방법은 여전히 미정)
- [ ] **CSV 업로드 골프장명 매칭 정책** — 동일 이름 골프장이 여러 개일 경우 현재는 매칭 실패 처리. `externalOrgCd` 등 식별자 기반 매칭으로 보완할지 검토. (루프명 매칭 실패 시 자동 신규 루프 생성 로직은 반영됨 — 관리자 확인 UI로 보완할지는 여전히 검토 필요)
- [ ] **09 라운드 상세 홀별 표시 UI 최종 확정** *(신규)* — 탭-상세형/매트릭스개선형/세로리스트형 3안이 목업에 토글로 병존, 안2가 가장 많이 다듬어진 상태이나 사용자 확정 필요
- [ ] **관리자 본인 계정 권한 자가 해제 정책** *(신규)* — 회원 관리 화면에서 관리자가 본인 role을 스스로 낮출 수 있게 둘지 여부
- [ ] **`app/README.md` / 루트 `README.md` 동기화** *(신규)* — 현재 구버전 스키마(8개 테이블) 기준으로 멈춰 있어 최신 상태 반영 필요

## 6. 진행 단계 (PM 워크플로우, 2026-07-16 갱신)

- [x] 요구사항 수집
- [x] 초기 기획 문서 작성 (본 파일)
- [x] DB 스키마 설계 1차 → `prisma/schema.prisma` (총 8테이블)
- [x] 화면(페이지) 설계 1차 → `doc/pages.md` (13개 화면: 사용자 10 + 관리자 3) + 전체 HTML 목업
- [x] 구현 1단계: 프로젝트 구조 + 인증 (2026-07-14)
- [x] 구현 2단계-a: 골프장 공공데이터 연동 (백엔드/동기화) (2026-07-14)
- [x] `apis.data.go.kr` 네트워크 접근 확인 + Prisma 7 런타임 버그 수정 (2026-07-14)
- [x] 로컬 개발 환경 구성 — Docker Compose(PostgreSQL), VS Code 연동, GitHub 저장소 연동 (2026-07-15)
- [x] DB 스키마 확장 1차 — GolfCourseHole/Par, User.role 추가 및 검증 (2026-07-15~16)
- [x] 관리자 기능 설계 1차 — 화면 3개, CSV 업로드 로직 문서화, 대시보드 진입 배너 (2026-07-15~16)
- [x] Prisma adapter-pg Pool 런타임 버그 수정 및 재검증 (2026-07-16)
- [x] 분석/설계 요약 PPT v2 작성 (14페이지) (2026-07-16)
- [x] 스코어 등록 화면 2-Step 재설계 (Step1 코스선택 + Step2 4분할 스코어카드) (2026-07-16)
- [x] DB 스키마 확장 2차 — 스코어카드 상세 필드 8종, GolfCourseLoop 엔티티, thirdPartyConsent 추가 (2026-07-16)
- [x] 관리자 화면 루프 UI 재설계(11/12/13번) + 회원 관리 화면 신규(14번, 총 14개 화면) (2026-07-16)
- [x] 08 스코어 조회 화면 조회조건 개편(기간/골프장/전체회원) (2026-07-16)
- [x] 05→06→07-1→07-2, 08→09 등 화면 간 호출관계(쿼리 파라미터) 전체 정리 (2026-07-16)
- [x] 로컬 DB 마이그레이션 6건 전부 사용자 직접 실행 완료 확인 (init/hole_par/user_role/scorecard_detail/golf_course_loop/third_party_consent) (2026-07-16)
- [x] 분석/설계 요약 PPT v4까지 갱신 (16페이지, DB컬럼정의/PK·FK 명기/GolfCourseLoop/화면설계 반영) (2026-07-16)
- [ ] **09 라운드 상세 홀별 표시 UI 최종 확정** (3안 중 1개 선택 필요)
- [ ] `app/README.md` / 루트 `README.md` 최신 스키마·화면 기준으로 동기화
- [ ] 구현 2단계-b: 골프장 목록/상세 화면(UI), 좌표 결측 지오코딩 배치
- [ ] 구현 2단계-c: 스코어 등록/조회/라운드상세 화면(UI, 최신 설계 반영), 날씨 연동
- [ ] 구현 2단계-d: 관리자 화면(루프·Par 입력·CSV 업로드·회원관리) 구현
- [ ] 테스트
- [ ] 배포

## 7. 화면 구성 요약 (2026-07-16 최종 갱신, 14개 화면)

- 총 14개 화면: 사용자 10개(랜딩/로그인/회원가입/대시보드/골프장 목록/골프장 상세/스코어 등록/스코어 조회/라운드 상세/마이페이지) + 관리자 4개(골프장 Par 관리 목록/골프장 루프·Par 입력·수정/CSV 일괄 업로드/회원 관리)
- 대시보드가 허브 역할, `role=ADMIN`일 때 "골프장 Par 관리" + "회원 관리" 2개 관리자 배너 추가 노출
- **스코어 등록(7번)**: 2-Step 구조로 재설계 — 7-1(코스/루프/일자 선택) → 7-2(스코어카드: 전반/후반 표 + 홀 탭 + 4분할 입력 패널[티샷결과/페널티·OB·벙커/온그린핀거리/온그린·퍼트 스코어] + 홀메모). 라운드 상세의 "수정"은 `07-round-new-step2.html?edit=1&...&scores=`로 Step1을 건너뛰고 바로 연결(실제 구현 시엔 `roundId` 하나만 전달하는 방식으로 대체 예정)
- **스코어 조회(8번)**: 기간·골프장 필터 + "내 기록만/전체 회원"(전체 회원은 `thirdPartyConsent` 동의 회원만 노출)
- **라운드 상세(9번)**: 홀별 스코어 표시 UI 3안(탭-상세형/매트릭스개선형/세로리스트형)을 목업에 토글로 병존, **최종 확정 전** (미정 사항 참고)
- **관리자 Par 관리**: 골프장 → 루프(전반/후반 등 9홀 단위, `GolfCourseLoop`) → 9홀 Par 입력. CSV 포맷 `골프장명,루프명,홀번호,Par`
- **관리자 회원 관리(14번, 신규)**: 회원 목록 조회 + 관리자 권한 부여/해제
- 화면 간 호출관계(쿼리 파라미터)는 `doc/pages.md`의 "7번 화면 호출 관계 요약" 표에 전부 정리됨 (05→06: `course` / 06→07-1: `course` / 7-1→7-2: `holes,course,date,frontLoop,backLoop` / 09→07-2: `edit=1,course,date,holes,scores`)
- 관리자 화면은 `role !== ADMIN`이면 서버 사이드에서 차단(AdminGuard)
- 상세 스펙은 `doc/pages.md`, 목업은 `doc/mockups/`(17개 파일, `_shared.css`/`index.html` 포함) 참조

## 8. 구현 1단계 완료 내역 (2026-07-14)

**스택 확정**: Next.js 15(App Router) + TypeScript + Tailwind CSS + Prisma + NextAuth(Auth.js v5 beta)

**구현 완료**
- Next.js 프로젝트 스캐폴딩 (`app/`)
- Prisma 스키마 작성 (`app/prisma/schema.prisma`) — DB 설계 문서 기반
- NextAuth 설정 (`app/src/auth.ts`) — 이메일/비밀번호(Credentials) + 구글 + 카카오 소셜 로그인
- 회원가입 API (`/api/signup`), NextAuth 라우트 핸들러 (`/api/auth/[...nextauth]`)
- 로그인/회원가입 페이지 (`/login`, `/signup`)
- 보호 라우트 미들웨어 (`/dashboard`, `/rounds`, `/courses`, `/profile`)
- 대시보드 placeholder 페이지

**해결된 이슈 (2026-07-14 재검증)**
- Prisma 7부터 `datasource.url`이 schema.prisma에서 지원되지 않는 breaking change 대응: `prisma.config.ts` 신설, `dotenv` devDependency 추가
- 검증 완료: `npx prisma generate`, `npx tsc --noEmit`, `eslint` 통과

**다음 구현 단계 후보**: 골프장 목록(공공데이터 연동) → 스코어 등록 → 스코어 조회 → 날씨 연동

## 9. 골프장 공공데이터 연동 구현 완료 (2026-07-14)

**실제 API 스펙 확인됨**
- 엔드포인트: `https://apis.data.go.kr/1741000/golf_courses/info`
- 파라미터: `serviceKey`, `pageNo`, `numOfRows`
- 응답: `response.body.items.item[]` (필드명 `BPLC_NM`, `LOTNO_ADDR`, `CRD_INFO_X/Y` 등)
- 전체 약 652건, 페이지네이션 필요

**중요 이슈 발견 및 대응**
- 좌표가 WGS84가 아니라 TM 중부원점(Bessel, EPSG:5174)이며 다수 레코드 좌표값 결측
- `src/lib/public-data/coordinate.ts`에 proj4 기반 변환 유틸 작성, 실측 검증 완료
- 좌표 없는 레코드는 `needsGeocoding=true`로 표시 후 저장 (주소 기반 지오코딩 배치는 미구현)

**구현 완료**: `GolfCourse` 모델 확장(좌표 nullable, rawCoordX/Y, needsGeocoding, externalOrgCd+externalMngNo 복합 unique 등), `src/lib/public-data/golf-courses.ts`(API 클라이언트), `scripts/sync-golf-courses.ts`(동기화 스크립트)

**다음 단계**: 골프장 목록/상세 화면(UI) 구현 → 주소 기반 지오코딩 배치 → 스코어 등록

## 10. `apis.data.go.kr` 네트워크 허용 후 검증 및 Prisma 런타임 버그 수정 (2026-07-14)

- `apis.data.go.kr` 도메인 차단 이슈 해결 확인 (더미 키로 401 응답 정상 수신)
- **심각 버그 발견**: Prisma 7의 기본 엔진은 `DATABASE_URL`을 런타임에 자동으로 읽지 않아 `new PrismaClient()` 생성 시점에 즉시 크래시 — `src/lib/prisma.ts` 포함 앱 전역에 영향
- **수정**: `@prisma/adapter-pg` 드라이버 어댑터로 커넥션을 명시적으로 전달하도록 변경
- **재검증**: 동기화 스크립트가 `PrismaClient` 생성 통과 → API 도달 → 더미 키로 401 실패까지 정상 확인
- **미검증(사용자 로컬 필요)**: 실제 API 키로 652건 파싱, 실 Postgres에 대한 upsert 동작

## 11. 관리자 기능 설계 및 개발 환경 구성 (2026-07-15 ~ 07-16)

**로컬 개발 환경**
- `db/docker-compose.yml` — PostgreSQL 16-alpine, 로컬 DB 기동/연결 검증 완료 (pgadmin은 `profiles: [tools]`로 선택 실행)
- `app/` — Next.js 스캐폴딩 + `prisma.config.ts` + `src/lib/prisma.ts`(adapter-pg 런타임 클라이언트)
- `.vscode/` — 워크스페이스 설정, 추천 확장(Prisma/ESLint/Prettier/Tailwind/Docker), 태스크 단축 실행(`extensions.json`/`settings.json`/`launch.json`/`tasks.json`)
- GitHub 저장소 연동 (`github.com/haekongpapa/scorecaddie`) — 실제 git 인증/push는 사용자가 VS Code에서 직접 수행 (OAuth 방식, PAT 공유 없이 진행)

**DB 스키마 확장**
- `GolfCourseHole` 모델 신설 — 골프장별 18홀 Par(규정타수), `@@unique([golfCourseId, holeNumber])`
- `HoleScore.par` 필드 추가 — 라운드 등록 시점의 Par 스냅샷(골프장 Par가 나중에 바뀌어도 과거 기록 유지)
- `User.role`(`Role` enum: `USER`/`ADMIN`) 추가, 기본값 `USER`
- 마이그레이션 3건(`init`, `add_golf_course_hole_par`, `add_user_role`) 모두 실 DB 기준 `prisma migrate dev` + 실제 쿼리(Client/adapter-pg)로 end-to-end 검증 완료

**관리자 화면 설계 (신규 3개, `doc/pages.md` 11~13번)**
- 골프장 Par 관리 목록 (`/admin/golf-courses`) — Par 등록 현황 배지(완료/부분/미등록), CSV 업로드 진입
- 골프장 Par 입력/수정 (`/admin/golf-courses/[id]/par`) — 18홀 Par 개별 입력
- CSV 일괄 업로드 (`/admin/golf-courses/upload`) — 포맷 `골프장명,홀번호,Par`, 처리 결과 리포트
- 처리 로직 상세 설계: `doc/admin-csv-upload.md` (매칭 규칙, 행 단위 부분 성공 처리, 오류 응답 형식)
- 목업 파일: `doc/mockups/11-admin-courses.html`, `12-admin-course-par.html`, `13-admin-upload.html`
- 대시보드(`04-dashboard.html`)에 `role=ADMIN`일 때만 노출되는 관리자 진입 배너 추가

**스코어 등록 화면 UI 확정 (`doc/mockups/07-round-new.html`)**
- 1차: 홀 2열 배치 → 2차: 1행 1홀로 변경 + 홀별 메모 입력 추가 → 3차(최종): 메모를 타수 입력 바로 옆에 나란히 배치
- 라운드 상세(`09-round-detail.html`)의 "수정" 버튼은 별도 화면 없이 `07-round-new.html?edit=1`로 스코어 등록 화면 재사용

**Prisma adapter-pg 런타임 버그 (신규 발견/해결)**
- `new PrismaPg(pool)`(pg Pool 인스턴스를 직접 전달하는 패턴)이 구성 자체는 에러 없이 성공하지만, 실제 쿼리 실행 시 `pg-protocol`에서 `ERR_INVALID_ARG_TYPE`로 크래시하는 것을 확인 (raw `pg.Pool` 자체는 정상 동작, adapter 구성도 정상 — 오직 실제 쿼리 실행 시점에만 발현되어 발견이 늦어짐)
- **해결**: `new PrismaPg({ connectionString: process.env.DATABASE_URL })` 방식(객체 전달)으로 확정, `src/lib/prisma.ts` 수정 후 GolfCourseHole/Round/HoleScore 생성 및 관계 조회까지 전체 스모크 테스트 재검증 완료

**분석/설계 요약 PPT v2 (`doc/ScoreCaddie_분석설계_요약.pptx`, 총 14페이지)**
- 화면 13개/DB 5개 핵심 테이블 반영, "개발 환경 구성" 슬라이드 신설, "DB 컬럼 정의" 상세 슬라이드 신설(전체 컬럼/타입/설명), 이슈 슬라이드에 adapter-pg Pool 버그 추가(3건), 다음 단계/논의사항 갱신
- pptxgenjs로 생성, 파일 검증(schema/relationship) 통과 및 전체 슬라이드 이미지 QA 완료

**다음 단계**: 골프장 목록/상세 · 스코어 등록/조회 · 관리자 화면의 실제 React/Next.js 구현 → 날씨 연동 → 테스트 → 배포

## 12. 스코어 입력 화면 2-Step 재설계 (2026-07-16)

**배경**: 스코어 입력 화면을 1) 골프장/코스 선택, 2) 스코어카드 입력 2단계로 분리 요청 → 목업 우선 제작 후 검토하는 방식으로 진행.

**Step 1** (`doc/mockups/07-round-new-step1.html`): 골프장 선택, 9H/18H 토글, 전반/후반 코스 선택(18H만 후반 노출), 라운드 일자, 날씨 카드(자동 표시), "스코어 카드" 버튼. 선택값은 전부 URL 쿼리(holes/course/date/front9/back9)로 Step 2에 전달.

**Step 2** (`doc/mockups/07-round-new-step2.html`, 사용자 제공 참조 앱 "Even Par" 스타일 반영 v4): 바텀시트 모달 방식을 버리고 스코어카드(전반/후반 표, 홀 탭으로 이동) + PAR 3/4/5/6 버튼 + 4분할 입력 패널(1.티샷결과 2.페널티/OB 스테퍼+그린주변벙커 3.온그린핀거리 4.스코어 스테퍼+오버파 자동계산)을 한 화면에 상시 노출하는 방식으로 전환. 홀메모(100자 제한), "전반/후반 N번홀 입력" 버튼(저장 시 다음 홀 자동 이동), 하단 ◀▶🔄 홀 이동/초기화 네비게이션 추가. 9H/18H 표시는 Step 1에서 넘어온 URL 파라미터로만 결정(화면 내 수동 토글 제거). 온그린 핀거리 "0m~20m"는 1m 단위 셀렉트 박스(0~20m, 21개 옵션)로 변경, "20m 이상"은 버튼으로 별도 유지.

**중요 이슈 발견 및 대응 — 대용량 파일 저장 시 truncation 버그**
- Write 도구로 스코어카드 렌더링 스크립트가 포함된 큰 HTML(약 15~18KB)을 저장했을 때, 파일이 스크립트 중간에서 잘려 저장되는 현상 재현(2회 연속 발생, 각기 다른 지점에서 잘림) → 저장된 파일을 열면 JS가 SyntaxError로 전체 실행 불가 → 사용자가 "스코어카드에 홀 항목이 표시되지 않는다"고 보고한 원인이 바로 이것이었음
- **후속 발견**: Write뿐 아니라 **Edit 도구도 동일 증상** — 18KB 파일에 Edit로 내용을 추가했더니 편집 전과 정확히 같은 바이트 수에서 잘림
- **더 심각한 후속 발견**: memory.md(약 14.6KB)를 Edit로 갱신했을 때, Read 도구로는 갱신된 내용이 정상적으로 보였지만 실제로 `ScoreCaddie` 폴더(사용자 컴퓨터에 마운트된 실 파일)에는 반영되지 않고 이전 버전 그대로 남아있는 현상 확인 — 즉 Edit 성공 응답과 Read 결과만으로는 실제 파일 저장을 신뢰할 수 없고, 반드시 `mcp__workspace__bash`로 파일 바이트 수/끝부분을 직접 확인해야 함
- **해결/우회**: 위 파일들 모두 Write/Edit 도구 대신 `mcp__workspace__bash`의 heredoc(`cat > file << 'EOF' ... EOF`)으로 전체 내용을 직접 작성 → 이후 정상 확인
- **검증 방법 확립**: (1) `wc -c`/`tail -c`로 파일이 의도한 지점에서 끝나는지 확인, (2) HTML/JS의 경우 `jsdom`(npm)으로 실제 파싱 후 `<script>` 텍스트를 추출해 `node --check`로 문법 검증 + `runScripts:'dangerously'`로 실제 DOM 렌더링까지 시뮬레이션(요소가 채워지는지, 클릭/입력 동작하는지)
- **향후 지침**: 10KB 넘는 파일(특히 memory.md, HTML 목업)은 Write/Edit 도구의 "성공" 응답이나 Read 결과를 그대로 신뢰하지 말고, 매번 bash heredoc으로 전체를 다시 쓰고 bash로 직접 바이트/렌더링 검증까지 마친 뒤에만 완료로 간주할 것

## 13. 스코어카드 재설계 반영 — DB 스키마 확장 · 문서 갱신 (2026-07-16)

**배경**: 12번 스코어 등록 화면 재설계(2-Step) 완료 후, 실제 반영을 위해 DB 스키마와 분석/설계 문서(`doc/pages.md`, `doc/ScoreCaddie_분석설계_요약.pptx`)를 갱신 요청받음.

**DB 스키마 확장 (`app/prisma/schema.prisma`)**
- `HoleScore`에 스코어카드 상세 필드 8개 추가: `teeShotResult`(enum `TeeShotResult`: FAIRWAY/MISS/PENALTY/OB), `penaltyStrokes`, `obStrokes`, `bunkerUsed`, `pinDistanceType`(enum `PinDistanceType`: NEAR/FAR), `pinDistanceMeters`, `onGreenStrokes`, `puttStrokes`. 구버전 화면(직접 타수 입력)에서는 모두 비워질 수 있으며 이 경우 `strokes`만으로 기록 유지.
- `Round`에 `holesPlayed`(Int, 기본값 18), `frontCourseLabel`/`backCourseLabel`(String?, 자유 텍스트) 추가. 코스 라벨은 골프장에 여러 9홀 루프가 있는 경우를 위한 표시용 필드이며, `GolfCourseHole`은 아직 골프장당 단일 18홀 구성만 지원하므로 실제 코스 데이터와는 연결되어 있지 않음 — **복수 루프 개념이 필요해지면 GolfCourse/GolfCourseHole 재설계 필요 (미정 사항으로 추가 검토 권장, 아직 문서에는 미반영)**.
- `npx prisma validate` 통과 확인. 실제 DB 마이그레이션(`prisma migrate dev`)은 사용자 로컬에서 별도 실행 필요(이 환경엔 연결된 Postgres 없음, 미검증).

**`doc/pages.md` 갱신**
- 7번 "스코어 등록" 화면을 2-Step 구조(7-1 코스 선택 / 7-2 스코어카드 입력)로 전면 재작성. 4분할 입력 패널 스펙, 티샷결과 자동계산 규칙, 온그린 핀거리 셀렉트 방식, 데이터 의존성(신규 HoleScore/Round 필드)까지 반영.

**`doc/ScoreCaddie_분석설계_요약.pptx` v3 갱신 (14 → 16페이지)**
- 표지: v3, 날짜 2026-07-16, 부제 "스코어 등록 화면 2-Step 재설계 · DB 스키마 확장 반영"으로 갱신
- DB 스키마 설계(슬라이드6) 다이어그램의 Round/HoleScore 설명에 신규 필드 반영
- **신규 슬라이드8** "HoleScore 상세 필드": teeShotResult/페널티·OB·벙커/핀거리/온그린·퍼트 4그룹으로 정리
- 화면 설계(슬라이드9)의 "스코어 등록" 노드를 "2-Step · 스코어카드"로 갱신
- **신규 슬라이드10** "스코어 등록 화면 재설계": Step1/Step2/4분할 패널/자동계산 규칙 4그룹 카드
- 구현 진행 현황(슬라이드12) 완료 목록에 "스코어 등록 화면 2-Step 재설계", "DB 스키마 확장" 2건 추가
- 닫는 슬라이드 버전 v3으로 갱신
- 신규 슬라이드 삽입에 따라 슬라이드8~13(구 번호)의 하단 페이지 번호를 9,11,12,13,14,15로 전부 재정렬
- `scripts/office/validate.py` 스키마 검증 통과, `markitdown` 콘텐츠 QA(플레이스홀더 없음) 통과, 변경된 슬라이드 전체(1,6,7,8,9,10,12,16) 육안 확인 완료. 최초 렌더에서 슬라이드6·7 부제가 2줄로 줄바꿈되며 표/본문과 겹치는 오버플로를 발견해 문구를 축약해 재수정함.

**작업 방식 관련 추가 발견**
- pptx 편집(unzip → XML 텍스트 치환 → zip)을 이 프로젝트의 `outputs` 작업 폴더에서 수행하면 `zip`이 임시파일을 최종 파일명으로 rename하는 단계에서 `Operation not permitted`로 실패함(파일 truncation 버그와 같은 계열의 마운트 이슈로 추정). **해결**: 압축 작업은 `/tmp` 등 순수 리눅스 경로에서 수행하고, 완성된 바이너리(.pptx)만 `cp`로 최종 위치에 복사하는 방식으로 우회. HTML/메모리 파일에 이어 "바이너리 zip 파일도 outputs 폴더에서 직접 생성하면 깨질 수 있다"는 점을 추가로 확인.

**다음 단계**: 실제 Next.js 화면 구현(Step1/Step2 컴포넌트, 스코어카드 API), `prisma migrate dev`로 신규 필드 로컬 DB 반영은 여전히 미착수 상태.

## 14. GolfCourseLoop 도입 — 전반/후반 코스 데이터 모델링 결정 (2026-07-16)

**배경**: 13번에서 남겨둔 미정 사항("Round.frontCourseLabel/backCourseLabel이 자유 텍스트일 뿐 실제 Par 데이터와 연결 안 됨")을 사용자와 논의. 3가지 안(①보류·자유텍스트 유지 ②루프별 별도 GolfCourse 등록 ③GolfCourseLoop 엔티티 신설) 중 **③ GolfCourseLoop 엔티티 신설(가장 정확한 정식 설계)** 로 확정.

**DB 스키마 변경 (`app/prisma/schema.prisma`)**
- `GolfCourseLoop` 모델 신규: 골프장을 구성하는 9홀 단위 루프(구간). `golfCourseId`, `name`(예: "전반"/"후반" 또는 "동코스"/"서코스"/"남코스"), `sortOrder`. `@@unique([golfCourseId, name])`. 단순 18홀 골프장은 보통 "전반"/"후반" 2개 루프, 27/36홀 골프장은 3개 이상.
- `GolfCourseHole` 재구성: 기존 `golfCourseId` + `holeNumber(1~18)` → `loopId` + `holeNumber(1~9)`로 변경(`@@unique([loopId, holeNumber])`). **Breaking change** — 기존에 로컬 DB에 입력해둔 Par 테스트 데이터가 있다면 마이그레이션 후 루프별로 재입력 필요.
- `Round`: `frontCourseLabel`/`backCourseLabel`(자유 텍스트) → `frontLoopId`/`backLoopId`(`GolfCourseLoop` FK, nullable)로 교체. 루프가 아직 등록 안 된 골프장은 null 허용.
- `HoleScore`는 변경 없음(holeNumber 1~18 절대값 그대로 유지, par 스냅샷도 그대로).
- `npx prisma validate` 통과. **`prisma migrate dev`는 사용자 로컬에서 아직 미실행** — Windows PowerShell 실행정책 문제로 대기 중(해결법 안내: cmd.exe 사용 또는 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` 또는 `npx.cmd` 사용).

**`doc/pages.md` 갱신**
- 7-1(Step1): 데이터 의존성에 `GolfCourseLoop`(선택된 골프장의 루프 목록을 select 옵션으로 표시) 추가, 루프 미등록 골프장은 "코스 정보 없음" 안내 후 루프 선택 없이 진행 가능하도록 상태 추가
- 7-2(Step2): `Round` 생성 시 `frontLoopId`/`backLoopId` 저장, 홀 초기 Par를 선택 루프의 `GolfCourseHole.par`에서 불러오도록 명시
- 11(관리자 Par 목록): 골프장별 "루프 수" 컬럼/배지 추가
- 12(관리자 Par 입력) 전면 재설계: 기존 "골프장 1개당 18홀 그리드" → "루프 탭(전반/후반/+ 루프 추가) 선택 후 해당 루프의 9홀 Par 그리드" 구조로 변경. 루프 CRUD(생성/이름변경/삭제/순서변경) 포함. 루프 삭제 시 해당 루프를 참조 중인 Round 경고 처리 명시.
- 13(CSV 업로드): 포맷을 `골프장명,홀번호,Par` → `골프장명,루프명,홀번호,Par`로 변경, 홀번호 범위 1~18 → 1~9.

**`doc/admin-csv-upload.md` 갱신**
- CSV 포맷/검증 로직에 루프명 컬럼 반영. 루프 매칭 실패 시 자동 생성(신규 루프는 관리자가 확인하도록 강조 표시하는 안을 향후 보완 후보로 기재). 응답 JSON의 에러 객체에 `loopName` 필드 추가.

**아직 반영 안 된 부분 (다음 논의/작업 필요)**
- 관리자 목업 HTML(`doc/mockups/11-admin-courses.html`, `12-admin-course-par.html`, `13-admin-upload.html`)은 여전히 구버전(골프장당 18홀 단일 그리드) 구조 — 루프 탭 UI로 재작업 필요
- Step1 목업(`07-round-new-step1.html`)의 전반/후반 코스 select는 아직 하드코딩된 옵션(동코스/서코스/남코스) — 실제 구현 시 `GolfCourseLoop` API 연동 필요
- 분석/설계 PPT(v3)에는 이번 GolfCourseLoop 변경이 아직 반영되지 않음 — 필요 시 v4로 갱신 요청 가능
- 기존 로컬 DB에 Par 테스트 데이터가 있다면 `GolfCourseHole` 재구성으로 인해 마이그레이션 후 루프별 재입력 필요 (백필 스크립트는 아직 미작성)

**작업 방식 관련 재확인**: `schema.prisma`(약 7~8KB, 이전엔 문제없던 파일)도 Edit 도구로 2건 수정했더니 파일 끝부분이 mid-line에서 잘려 `prisma validate`가 문법 오류로 실패함 — 파일 크기와 무관하게 Edit도 truncation 위험이 있음을 재확인. bash heredoc 전체 재작성으로 해결. **이 프로젝트에서는 앞으로 크기와 무관하게 코드/스키마/문서 파일은 Write/Edit 대신 bash heredoc으로 작성하고, 저장 직후 `wc -c`/`tail`/`prisma validate`(또는 해당 파일 형식의 파서)로 매번 검증하는 것을 기본 원칙으로 삼는다.**

## 15. 관리자 목업 루프 UI 재설계 + 분석설계 PPT v4 (2026-07-16)

GolfCourseLoop 도입(14번 항목) 후 남아있던 후속 작업 2건을 완료.

### 관리자 목업 3종 → 루프 단위 UI로 재작업

- `doc/mockups/11-admin-courses.html`: 골프장 목록에 루프 개수 배지("루프 2개"/"루프 미등록") 추가, Par 등록 현황을 루프 합산 홀 수 기준으로 표시.
- `doc/mockups/12-admin-course-par.html`: 기존 "골프장당 18홀 고정 그리드"를 완전히 폐기하고, 루프 탭(추가/이름변경/삭제) + 탭별 9홀 Par 그리드로 재구성. jsdom으로 탭 전환·추가·삭제·합계 재계산 동작을 시뮬레이션해 로직 검증 완료.
- `doc/mockups/13-admin-upload.html`: CSV 포맷을 `골프장명,루프명,홀번호,Par`로 변경, 결과 테이블에 "루프" 컬럼과 "신규 루프(자동생성, 확인필요)" 상태 표시 추가.
- 3개 파일 모두 bash heredoc으로 작성 후 `wc -c` + jsdom 검증 → 워크스페이스 폴더에 복사, `md5sum` 일치 확인.

### 분석설계 PPT `v3` → `v4` 갱신 (GolfCourseLoop 반영)

작업은 항상 `/tmp`(순수 리눅스 경로)에서 unzip/XML 편집/rezip 후 최종 바이너리만 워크스페이스로 복사하는 방식으로 진행(outputs 디렉토리에서 직접 zip 시 `Operation not permitted` 발생하는 기존 이슈 회피).

- **슬라이드6 (DB 스키마 다이어그램)**: 기존 GolfCourse→GolfCourseHole 박스+커넥터 구조를 그대로 재활용해, 기존 GolfCourseHole 박스를 "GolfCourseLoop"로 개명하고, 그 아래 동일한 간격/스타일로 새 "GolfCourseHole" 박스+커넥터를 추가(좌표 오프셋을 기존 간격과 정확히 일치시켜 시각적 정합성 확보). 캡션 문장과 하단 요약도 GolfCourseLoop 관계를 반영해 갱신. subtitle "5개 핵심 테이블" → "6개 핵심 테이블".
- **슬라이드7 (DB 컬럼 정의 표)**: `GolfCourseHole` 섹션의 `golfCourseId`→`loopId`, 설명 "GolfCourse 참조"→"GolfCourseLoop 참조", `holeNumber` 타입 "Int (1~18)"→"Int (1~9)"로 갱신 (실제 `<a:tbl>` 표 구조라 행 추가 없이 텍스트만 교체 — 레이아웃 안전).
- **슬라이드10(구현 진행 현황, 파일명 slide10.xml=화면번호 12)**: 기존 "DB 스키마 확장" 완료 항목에 "GolfCourseLoop 엔티티 도입" 문구 추가, "관리자 화면 골프장 루프 UI 재설계" 완료 항목 신규 추가(총 10개 불릿, 렌더링 확인 결과 박스 하단 여유 있음 — 오버플로우 없음).
- **슬라이드1(표지)/슬라이드14(감사 슬라이드)**: 버전 표기 v3→v4, 표지 하단 문구에 "GolfCourseLoop 도입 반영" 추가.
- 모든 XML 편집은 `<p:cNvPr id="N">` 기준으로 해당 shape 블록만 잘라내 텍스트 치환하는 방식(전역 문자열 치환 금지 — 동일 문자열이 여러 shape에 중복 등장하는 경우가 많아 오치환 위험).
- 편집 후 `xml.dom.minidom.parse`로 각 슬라이드 XML 무결성 확인 → `/tmp`에서 rezip → `scripts/office/validate.py` PASS → `soffice.py --headless --convert-to pdf` + `pdftoppm`으로 슬라이드 1/6/7/12/14 렌더링 후 육안 검수(다이어그램 정렬, 표 레이아웃, 불릿 오버플로우 여부) 완료 → 워크스페이스로 복사 후 `md5sum` 일치 확인.

### 남은 미해결 항목 (14번 항목에서 이어짐, 계속 유효)

- Step1 목업의 전반/후반 코스 select는 여전히 하드코딩된 옵션 — 실제 구현 시 GolfCourseLoop API 연동 필요.
- 로컬 DB(`prisma migrate dev`) 실행 여부 사용자로부터 최종 확인 안 됨 (PowerShell 실행정책 이슈 안내까지만 진행).
- 기존 로컬 DB Par 테스트 데이터는 마이그레이션 후 루프별 재입력 필요 (백필 스크립트 미작성).

이번 항목으로 GolfCourseLoop 도입에 따른 문서/목업/PPT 갱신 작업은 모두 완료.

## 16. Step1 목업 GolfCourseLoop 연동 + 로컬 DB 마이그레이션 완료 (2026-07-16)

- `doc/mockups/07-round-new-step1.html`: 하드코딩된 동코스/서코스/남코스 옵션을 골프장별 `COURSE_LOOPS` mock 데이터(loop id+name)로 교체. 전반/후반 select가 서로의 선택값을 제외해 같은 루프 중복 선택을 방지하고, Step2 링크 파라미터를 `front9`/`back9` → `frontLoop`/`backLoop`(GolfCourseLoop.id 값)로 스키마와 맞춤. 루프 미등록 골프장 선택 시 안내 문구 표시. jsdom으로 골프장 전환/중복선택 방지/9홀 전환 시나리오 검증 완료.
- 사용자가 로컬 DB에 `npx prisma migrate dev --name add_golf_course_loop` 실행 완료 확인 (2026-07-16). GolfCourseLoop 스키마가 로컬 DB에 반영됨.

### 남은 항목 (갱신)

- 기존 로컬 DB Par 테스트 데이터는 루프별로 재입력 필요할 수 있음 (마이그레이션 시 리셋되었는지는 미확인 — 관리자 화면(12번, 루프 탭 UI)에서 직접 확인 후 입력 권장).
- Step1/Step2 목업은 여전히 정적 mock 데이터 기반 — 실제 화면 구현(Next.js API 연동)은 진행 예정 단계.

## 17. PPT 7페이지 GolfCourseLoop 컬럼 정의 누락 수정 (2026-07-16)

v4 갱신 시 슬라이드7(DB 컬럼 정의)의 GolfCourseHole 섹션 필드만 갱신하고 GolfCourseLoop 자체의 컬럼 정의 섹션 추가를 누락했던 것을 사용자가 지적, 수정.

- 왼쪽 표(`<a:tbl>`, User/GolfCourseHole/Round 섹션 포함)에 "GolfCourseLoop (신규)" 섹션(golfCourseId/name/sortOrder, 총 4행: 헤더+3필드)을 GolfCourseHole 섹션 바로 앞에 삽입 — 표 순서가 User → GolfCourseLoop → GolfCourseHole → Round가 되어 스키마 계층과 일치.
- 행이 18→22개로 늘어나면서 기존 표 높이(4892040 EMU, 슬라이드 하단 여백이 91440 EMU밖에 없어 표를 늘릴 수 없었음)를 유지해야 했으므로: 행 높이를 271780→222365 EMU로, 셀 상하 여백을 25400→12700 EMU로 축소해 22행이 원래 표 높이 안에 들어가도록 재계산. 렌더링 결과 텍스트 잘림 없이 정상 표시 확인(1130px 렌더 기준 육안 검수).
- 기존 방식대로 `/tmp`에서 unzip/XML 편집(row 템플릿을 `<p:cNvPr>` 기준이 아닌 실제 텍스트 앵커로 위치를 찾아 clone 후 텍스트만 치환) → rezip → validate.py PASS → soffice 렌더링으로 슬라이드7만 확대 검수 → 워크스페이스 복사 후 md5sum 일치 확인.

이로써 PPT v4에 GolfCourseLoop 관련 누락 사항 없음.

## 18. PPT 6/7페이지 PK/FK 명기 (2026-07-16)

사용자가 슬라이드7(DB 컬럼 정의)에 PK/FK 필드가 빠져있다고 지적, 6/7페이지 모두에 PK·FK를 실제 필드 기준으로 명기.

### 슬라이드6 (다이어그램)

각 박스의 부제 텍스트를 기존 설명 문구에서 "PK id · FK 필드명" 형식으로 교체(User/GolfCourse는 FK 없이 PK만, Round는 FK가 4개라 3줄로 표기: `PK id·holesPlayed(9/18)` / `FK userId·golfCourseId` / `FK frontLoopId·backLoopId`). 박스/커넥터 위치는 건드리지 않고 텍스트만 교체해 레이아웃 리스크 최소화.

### 슬라이드7 (컬럼 정의 표)

- 6개 섹션 전부에 누락돼 있던 **PK `id` 행을 각 섹션 최상단에 추가**(`id (PK)` / `String` / `기본 키 (cuid)`).
- 기존에 있던 FK 필드는 컬럼명에 `(FK)`를 붙여 명시: `golfCourseId (FK)`(GolfCourseLoop), `loopId (FK)`(GolfCourseHole), `userId (FK) / golfCourseId (FK)`(Round), `roundId (FK)`(HoleScore).
- **Round 섹션에 그동안 통째로 빠져 있던 `frontLoopId`/`backLoopId` FK 행을 신규 추가** — GolfCourseLoop 도입 이후 스키마에는 있었지만 슬라이드7 표에는 한 번도 반영된 적이 없었던 누락이었음.
- 행이 늘어난 만큼(좌 22→미변경이지만 GolfCourseHole 이동, 우 16→23) 좌/우 표를 리밸런싱: **GolfCourseHole 섹션을 좌측 표에서 우측 표로 이동**(GolfCourse→GolfCourseHole→HoleScore 순), 좌측은 User/GolfCourseLoop/Round 유지. 결과 좌 22행, 우 23행으로 균형.
- 부제 문구를 "PK/FK 명기" 언급하도록 갱신하되 기존 81자 한도 내(68자)로 축약해 1줄 유지(2줄로 넘치면 표와 겹치는 문제 사전 방지).

### 이번에 새로 겪은 버그와 교훈

- **row 텍스트 치환 버그**: `<a:t>` 태그를 순서대로 바꾸려고 `re.sub(pattern, repl, text, count=1)`를 텍스트별로 반복 호출했더니, 매 호출이 문자열을 처음부터 다시 스캔해 **항상 같은(첫 번째) occurrence만 계속 덮어쓰는** 버그 발생 — PK 행의 3번째 컬럼(설명)이 전부 엉뚱한 값으로 렌더링됨. 첫 렌더링에서 육안으로 발견. **1회의 `re.sub`에 callback(`next(iterator)`)을 써서 왼쪽에서 오른쪽으로 한 번에 순서대로 치환**하도록 수정, 이후 `re.findall`로 결과 텍스트 리스트를 assert 비교해 재발 방지.
- **부제 2줄 오버플로우 재발**: PK/FK 언급을 추가하며 부제가 81자를 넘겨 2줄로 줄바꿈, 표 상단과 겹침 — 기존에 검증된 "81자 이하 1줄" 기준을 다시 넘겨서 발생. 68자로 축약해 해결.
- **워크스페이스 파일 쓰기 일시 차단**: PPT 파일이 사용자 PC에서 열려 있는 동안 `cp` 덮어쓰기가 `Permission denied`로 실패(같은 계정 소유인데도). 파일을 닫아달라고 요청 후 재시도해 해결 — 앞으로도 워크스페이스 파일 덮어쓰기 실패 시 "혹시 그 파일이 열려 있나요?"부터 확인할 것.

이번 건으로 PPT의 GolfCourseLoop/PK/FK 관련 내용은 다이어그램·컬럼표 모두 스키마와 완전히 일치.

## 19. 목업 화면 간 호출관계 정리 (2026-07-16)

사용자가 지정한 3가지 네비게이션을 실제로 연결.

- **04-dashboard.html** "스코어 등록" 카드: `07-round-new.html`(구버전) → `07-round-new-step1.html`로 교체.
- **06-course-detail.html** "이 골프장에서 스코어 등록": `07-round-new-step1.html?course=<골프장명>`으로 연결. Step1 스크립트에 `?course=` 읽어서 골프장 select를 미리 선택하는 로직 추가(대상 골프장에 등록된 루프로 전반/후반 select도 함께 갱신됨).
- **09-round-detail.html** "수정": `07-round-new-step2.html?edit=1&course=&date=&holes=&scores=<콤마구분 타수>`로 Step1을 건너뛰고 바로 연결. Step2 스크립트에 `scores` 파라미터 파싱 로직 추가 — 홀별 타수를 `saved=true` 상태로 미리 채워 스코어카드에 기존 기록처럼 표시(온그린/퍼트는 `putt=2` 고정값으로 역산). 상단에 "기존 라운드 수정 중" 안내 배지 추가(`edit=1`일 때만 노출). 과거 라운드는 티샷결과/핀거리 등 상세 필드가 없을 수 있다는 점(해당 컬럼들이 nullable인 이유)을 그대로 반영해 그 부분은 비워둔 채 시작.
- `doc/pages.md`에 7번 화면 섹션과 화면 흐름도를 갱신해 위 3개 호출관계 + 파라미터를 표로 정리(6/9번 화면 섹션에도 "화면 이동" 항목 추가).

### 검증

- jsdom으로 실제 시나리오 재현: `?course=파인밸리 GC`로 Step1 진입 시 골프장 select와 루프 옵션이 올바르게 선택되는지, `?edit=1&scores=4,5,4,...`로 Step2 진입 시 전반/후반 Sc. 행에 기존 타수가 정확히 채워지고 합계(36/36)가 맞는지, 특정 홀 클릭 시 온그린/퍼트가 타수 기준으로 올바르게 역산되는지 확인.
- 이번에도 **Edit 툴이 07-round-new-step1.html에 대해 truncation 버그를 재현**(파일 크기가 수정 전과 정확히 동일한 8697바이트로 유지됨, tail로 확인). bash heredoc 전체 재작성으로 우회 — 이 프로젝트에서 Edit 툴은 계속 신뢰할 수 없음이 재확인됨.

### 남은 참고사항

- `scores` 파라미터 방식은 목업 전용 임시 방편이며, 실제 구현 시에는 `roundId` 하나만 전달해 서버에서 `HoleScore` 전체를 조회하는 방식으로 대체 예정(pages.md에 명시).
- 09-round-detail.html의 표시 총타수("88타")와 홀별 타수 합(72타)이 애초부터 서로 안 맞는 목업 데이터였음 — 이번 작업 범위 밖이라 손대지 않았고, 필요 시 후속으로 정리 가능.

## 20. 05-courses.html → 06-course-detail.html 골프장 연계 (2026-07-16)

- **05-courses.html**: 골프장 4건(레이크사이드 CC/파인밸리 GC/선셋힐스 CC/그린밸리 CC) 각 리스트 항목의 링크를 `06-course-detail.html?course=<골프장명>`으로 변경.
- **06-course-detail.html**: 하드코딩된 "레이크사이드 CC" 표시를 걷어내고, `COURSES` mock 데이터(주소/홀수/공공·민간/좌표유무)를 `?course=` 값으로 조회해 동적 렌더링하도록 전환. 골프장명 매칭 실패/파라미터 없음 시 레이크사이드 CC로 폴백. 좌표 결측 골프장(선셋힐스 CC)은 지도 영역에 "지도 좌표 확인 중" 표시(pages.md 6번 화면 "좌표 없음" 상태 정의와 일치). "이 골프장에서 스코어 등록" 버튼도 현재 보고 있는 골프장 기준으로 `?course=`를 동적으로 실어 07-1로 전달.
- **07-round-new-step1.html**: 체인 일관성을 위해 `COURSE_LOOPS`와 골프장 select에 그린밸리 CC(전반/후반 2루프)를 추가 — 05/06에는 있었지만 Step1엔 없어서 05→06→07-1로 이어질 때 그린밸리 CC 선택이 씹히던 gap을 메움.
- jsdom으로 파라미터 있음/없음/매칭실패/좌표결측 4가지 케이스와 그린밸리 CC 전체 체인(course-select 선택 → 루프 옵션 → next-link) 모두 검증.
- **Edit 툴이 pages.md에 대해 또 truncation 재현**(1줄 삽입 시도했는데 파일이 수정 전과 정확히 동일한 바이트 수로 유지, 새 텍스트는 아예 반영 안 됨). 이제 이 프로젝트에서는 Edit 툴을 완전히 배제하고 항상 bash heredoc 전체 재작성만 사용하는 것으로 방침을 굳힘 — 작은 한 줄 삽입조차도 예외 없음.
- `doc/pages.md`에 5/6/7번 화면 섹션과 "7번 화면 호출 관계 요약" 표를 갱신해 05→06 연결을 반영.

## 21. 관리자 화면 신규 추가: 회원 관리 (14번, 2026-07-16)

기존 13개 화면에 신규 관리자 화면 1개 추가 (총 14개, 관리자 3→4).

- **`doc/mockups/14-admin-users.html`**: 조회 조건(이름 검색 + 가입일자 시작~종료 range) → 검색/초기화 버튼 → 전체 인원 수 → 회원 그리드 테이블(행 선택 체크박스, 이름, 이메일, 가입일, **"어드민" 컬럼** — `role` 값을 텍스트 대신 체크박스로 표시, `ADMIN`이면 체크·읽기전용) → 1건 이상 선택 시 하단에 "N명 선택됨" + "어드민 권한 부여/해제" 버튼이 있는 일괄 액션 바 노출.
  - 헤더의 전체선택 체크박스는 부분 선택 시 `indeterminate` 상태로 표시.
  - `name`이 `null`인 계정(소셜 로그인 등, `User.name`이 nullable인 이유) 은 "이름 없음"으로 표시하는 mock 데이터 1건 포함.
  - 일괄 "어드민 권한 부여/해제" 버튼 클릭 시 선택된 회원들의 `role`을 실제로 바꾸고 "어드민" 컬럼 체크박스에 즉시 반영 — jsdom으로 이름검색/날짜범위검색/전체선택-부분선택 indeterminate/일괄 권한해제 전체 시나리오 검증 완료.
- **`04-dashboard.html`**: 기존 "골프장 Par 관리" 관리자 배너 아래에 "회원 관리" 배너를 하나 더 추가(동일하게 `?admin=1`일 때만 노출). 관리자가 대시보드에서 두 관리자 기능 중 하나를 선택해 이동하는 구조.
- **`index.html`**: 14번 카드 추가, 총 화면 수 문구 13→14 갱신.
- **`doc/pages.md`**: 섹션 14 신규 작성(목적/경로/레이아웃/컴포넌트/데이터의존성/상태/화면 이동), 인트로 문구·AdminGuard 적용범위(11~13→11~14)·4번 화면 "화면 이동" 항목 갱신.
- 이번에도 pages.md에 대해 처음엔 Edit 툴로 한 줄만 추가하려다 truncation 재발(파일 크기 불변) → 곧바로 bash heredoc 전체 재작성으로 전환해 해결. Edit 툴은 이 프로젝트에서 완전히 배제, 앞으로도 계속 heredoc만 사용.

### 남은 참고사항 (설계 시점 미결정, pages.md에 명시해둠)

- 본인 계정의 어드민 권한을 스스로 해제하는 경우의 처리 정책(확인 경고 vs 차단)은 실제 구현 시 결정 필요.

## 22. PPT 9페이지 화면설계 다이어그램에 회원 관리(14번) 반영 (2026-07-16)

- 파일명 기준 `slide8.xml`이 실제 시각적 9페이지(화면 설계 허브 다이어그램)임을 `presentation.xml`의 `sldIdLst` 순서로 재확인 후 수정(파일명 번호와 시각적 페이지 번호가 다른 경우가 있으므로 매번 직접 확인 필요 — v4 작업 때도 같은 이슈 있었음).
- 부제 "총 13개 화면(사용자 10 + 관리자 3)" → "총 14개 화면(사용자 10 + 관리자 4)"로 갱신.
- 하단 "관리자" 박스의 설명 텍스트 "Par 관리 3개 (ADMIN)" → "Par/회원 관리 (ADMIN)"로 갱신(박스가 1줄만 들어가는 좁은 크기라 축약 표현 사용).
- `/tmp`에서 unzip/편집/rezip → validate.py PASS → soffice 렌더링으로 9페이지만 확대 검수(텍스트 잘림 없음 확인) → 워크스페이스로 복사 후 md5sum 일치 확인, 이번엔 파일이 열려있지 않아 한 번에 덮어쓰기 성공.

## 23. 회원 정보에 "타인에게 정보 제공 동의" 항목 추가 (2026-07-16)

- **`app/prisma/schema.prisma`**: `User` 모델에 `thirdPartyConsent Boolean @default(false)` 추가(role 필드 바로 아래). `npx prisma validate` PASS 확인. 마이그레이션은 아직 생성/실행 안 함 — 다음에 로컬에서 `npx prisma migrate dev --name add_third_party_consent` 실행 필요(사용자에게 안내 예정).
- **`doc/mockups/03-signup.html`**: 비밀번호 확인 입력 아래에 "타인에게 정보 제공 동의 (선택)" 체크박스 + 안내 문구("동의하지 않아도 가입/이용 제한 없음, 마이페이지에서 변경 가능") 추가. 선택 항목이라 가입 절차를 막지 않음.
- **`doc/mockups/10-profile.html`**: "개인정보" 섹션 신설, 토글 스위치로 동의 상태 표시/변경(현재 상태를 "동의함"/"동의 안 함" 텍스트로 함께 노출). CSS 토글 스위치 컴포넌트 신규 제작, JS로 토글 시 상태 텍스트 갱신 — jsdom으로 ON/OFF 전환 확인.
- **`doc/pages.md`**: 3번(회원가입), 10번(마이페이지) 섹션의 레이아웃/컴포넌트/데이터의존성/상태에 반영.
- **PPT 슬라이드7(DB 컬럼 정의)**: User 섹션에 `thirdPartyConsent (신규)` 행 추가(role 바로 아래, createdAt/updatedAt 위). 왼쪽 표가 22→23행으로 늘어 행 높이를 212697 EMU로 재계산(우측 표와 동일 높이로 우연히 맞아떨어짐). 렌더링 확인 완료.
- **관리자 회원 관리(14번) 화면은 이번 변경 범위에서 제외** — 요청이 회원 본인의 동의 관리 흐름(가입/마이페이지)에 대한 것이라 판단, 관리자 그리드에 컬럼 추가는 하지 않음.
- **PPT 파일 배포 보류**: 워크스페이스의 PPT 파일이 현재 열려있어(`Permission denied`) 최종 복사를 못 함 — 사용자가 파일을 닫으면 재시도 예정. 나머지 파일(schema.prisma, 03/10 목업, pages.md)은 모두 정상 배포·md5 확인 완료.

## 24. 마무리 - 로컬 DB 마이그레이션 확인 + PPT 배포 완료 (2026-07-16)

- 로컬 DB 마이그레이션(`20260716071035_add_third_party_consent`) 확인 — `ALTER TABLE "User" ADD COLUMN "thirdPartyConsent" BOOLEAN NOT NULL DEFAULT false`로 schema.prisma와 정확히 일치, drift 없음.
- 이전에 파일 열림으로 보류됐던 PPT(`ScoreCaddie_분석설계_요약.pptx`) 배포를 사용자가 파일을 닫은 후 재시도해 성공(md5 일치). 이로써 23번 항목(타인에게 정보 제공 동의)의 모든 산출물(스키마/로컬DB/목업 2개/pages.md/PPT)이 전부 동기화됨.

## 25. 스코어 조회(08) 화면 조회조건 개편 (2026-07-16)

- 요청: 8번 스코어 조회 화면의 조회 조건을 "기간 From~To / 골프장(전체 또는 특정) / 사용자(내 기록만 또는 전체 회원 — 전체는 정보제공 동의자만) / 전체 조회 시 사용자 이름 표시"로 개편.
- `08-rounds.html` 전면 재작성(7817 bytes):
  - 필터 UI: `#filter-from`/`#filter-to`(기본값 2026-06-01~2026-07-16), `#filter-course` select(전체 골프장 + 4개 골프장), `#scope-seg` 세그먼트(내 기록만/전체 회원, 전환 즉시 재조회).
  - Mock 데이터: `USERS`(재홍 포함 7명, 각자 `consent` boolean) + `ALL_ROUNDS`(10건, 재홍 4건 + 나머지 6명 각 1건).
  - `applyFilter()`: `scope==='me'`면 본인 데이터만(동의 여부 무관), `scope==='all'`이면 `consent===true`인 사용자 데이터만(본인 포함 동일 기준 적용) → 이후 기간/골프장 추가 필터.
  - `render()`: `scope==='all'`일 때만 각 리스트 항목에 사용자 이름 태그 추가 표시.
  - jsdom으로 초기 렌더, scope 전환 시 비동의자(이서연/정하은) 제외·동의자(강태현 등) 포함, 기간+골프장+scope 복합 필터, 초기화, 빈 상태 등 전수 검증 완료.
  - 배포 완료, md5 `f58e6ee94976d42847db147f20cc942a` 양쪽 일치 확인.
- `pages.md` 갱신:
  - 8번 섹션 전면 재작성 — 새 레이아웃/컴포넌트/데이터 의존성(`User.thirdPartyConsent` 게이팅 포함)/상태 반영.
  - 9번 섹션 상태 문구 수정 — 기존 "본인 라운드가 아닐 경우 접근 차단" 정책을 8번의 "전체 회원" 조회 신설과 정합되도록 완화: 8번을 통해 진입 + 소유자가 `thirdPartyConsent=true`인 경우에 한해 읽기 전용 열람 허용(수정/삭제 버튼 숨김)으로 명기. 단 `09-round-detail.html` 목업 자체는 이 읽기전용 변형을 아직 별도 구현하지 않았음을 명시(후속 과제로 남김).
  - 배포 완료, md5 `3b0849ec5adf53b2ed460ac73a3aec12` 양쪽 일치 확인.
- 이번 작업은 사용자가 PPT를 명시적으로 언급하지 않아 PPT는 건드리지 않음(범위 외 확장 방지 원칙 유지).

## 26. PPT 3페이지 "핵심 기능" - 스코어 조회 설명 갱신 (2026-07-16)

- 25번(스코어 조회 화면 개편) 반영을 사용자가 명시 요청 → 3페이지(파일 `slide3.xml`, 6대 핵심 기능 카드) 중 "스코어 조회" 카드 설명을 "일자별 조회, 회원별 조회" → "기간·골프장·회원 범위 조회, 동의 회원만 전체 공개"로 수정.
- 9페이지(화면 설계 허브 다이어그램, 파일 `slide8.xml`)의 "스코어 조회" 박스는 화면명 라벨만 있고 상세 설명이 없어 수정 불필요 확인.
- 다른 슬라이드 전수 검색 결과 "조회 조건/필터/본인 라운드/접근 차단" 등 관련 문구를 가진 슬라이드는 3페이지가 유일함을 확인.
- 텍스트 박스 크기(4572000 x 685800 EMU)는 다른 카드(예: "공공데이터포털...", "홀별 Par 개별 입력...")와 동일 규격이라 리사이즈 없이 그대로 적용, 렌더링(soffice+pdftoppm) 확인 결과 한 줄로 정상 표시됨.
- validate.py PASS, 배포 후 md5 `85185cd1f3bc43db75611833a8d7df6c` 양쪽 일치 확인.

## 앞으로의 작업 원칙 (2026-07-16 사용자 지시)

- "PPT도 수정 필요하면 바로 적용해" — 이제부터 스키마/화면/문서(pages.md) 변경 시 관련 PPT 슬라이드도 확인 후 필요하면 사용자에게 묻지 않고 바로 함께 수정·배포한다. (기존에는 PPT는 사용자가 "분석설계문서" 등을 명시적으로 언급할 때만 건드리는 방침이었으나, 이 지시로 표준 워크플로에 편입됨)

## 27. 08→09 골프장 연계 + 09 홀별 스코어 표시 설계안 3종 (2026-07-16)

- 요청 1: 08(스코어 조회)에서 09(라운드 상세) 호출 시 선택한 골프장이 반영되도록 연계.
  - `08-rounds.html`의 `roundHref(r)`: `course`, `date`, `score`, `weather`, `ownerId`, `owner` 쿼리파라미터를 담아 `09-round-detail.html`로 링크 생성.
  - `09-round-detail.html`: 위 파라미터로 상단 요약 카드(골프장/날짜/날씨/타수)를 동적 구성. `ownerId`가 본인('me')이 아니면 "OOO님의 라운드 · 읽기 전용" 배지 표시 + 수정/삭제 버튼 숨김 + 읽기전용 안내문 노출 — 이전(24번 항목)에 pages.md에만 "후속 작업"으로 남겨뒀던 정책을 이번에 실제 목업에 구현 완료.
- 요청 2: 첨부 이미지(홀별 스코어카드 — 파/스코어/온그린/핀거리/퍼트/기타 행 + ■●S 등 중첩 심볼 범례) 분석 후, 티샷결과/GIR/스크램블링/GB(샌드세이브) 정보를 더 읽기 쉽게 만든 3가지 설계안을 `09-round-detail.html`에 전환 스위치(안1/안2/안3)로 함께 구현:
  1. **탭-상세형**: 9칸 홀 스트립(스코어 색상 코딩) → 탭한 홀의 상세를 아래 카드에 텍스트 뱃지(🏌️티샷/🎯GIR/🛟스크램블링/🏖️샌드세이브)로 표시. GIR 성공 홀은 스크램블링 뱃지 자체를 숨김(N/A).
  2. **매트릭스 개선형**: 기존 18홀 한눈에 보기 표 형태 유지, "특이사항" 행에 티샷 2글자 약어 칩(FW/MS/PN/OB) + GIR 점 + S(스크램블 성공)/✓✗(샌드세이브) 보조표시로 정리, 범례를 화면 상단에 고정 노출(기존엔 하단에 작게 있어 대조하며 봐야 했음).
  3. **세로 리스트형**: 18홀을 한 줄씩 카드로 나열, 뱃지에 풀 텍스트 라벨 사용(범례 불필요), 스크롤 길이 증가가 트레이드오프.
  - 공통 파생 로직: `computeStats(h)` — GIR = onGreenStrokes ≤ par-2, 스크램블링 = (GIR 실패 홀에 한해) strokes ≤ par, 샌드세이브 = (bunkerUsed 홀에 한해) strokes ≤ par 여부(성공/실패). 모두 기존 `HoleScore` 필드에서 계산하는 파생값이며 DB 컬럼 추가 없음.
  - 18홀 mock 데이터를 전반 36타(E)/후반 39타(+3)로 설계해 버디·보기·더블보기·GIR 성공/실패·스크램블 성공/실패·샌드세이브 성공/실패 케이스를 고루 포함시킴.
  - jsdom 검증: 08의 me/all 스코프별 링크 파라미터, 09의 소유자/타인 라운드 헤더·읽기전용 분기, 안1의 홀2(GIR실패+샌드실패+메모)/홀6(스크램블성공)/홀17(버디+GIR성공+스크램블뱃지없음) 상세, 안2의 매트릭스 FW/샌드실패 마크, 안3의 18행 렌더 및 메모 포함 여부, 수정 버튼 href의 scores 파라미터 — 전부 통과.
  - 배포 완료: `08-rounds.html` md5 `fe26cbc2d3c151fc7fd4403f5ac33b71`, `09-round-detail.html` md5 `c5f773227d0ed7fd8a9f323ec3c8a4aa` (양쪽 일치).
- `pages.md` 8번(화면 이동에 09 파라미터 전달 명시) / 9번(진입 파라미터, 설계안 3종 설명, 읽기전용 정책 "구현 완료"로 갱신) 섹션 갱신, 배포 완료(md5 `5f923f80d24fd8f9f64117cc4f8739d2`).
- PPT는 이번엔 보류 — 09 화면은 3가지 설계안이 아직 검토/확정 전 단계라 PPT에 반영할 "확정된" 내용이 없음(스키마 변경도 없음, GIR/스크램블링/샌드세이브는 파생 계산값이라 DB 컬럼 추가 없음). 사용자가 3안 중 하나를 확정하면 그 시점에 PPT(필요 시 화면설계 다이어그램 등)도 함께 반영 예정.

## 앞으로의 작업 원칙 (갱신)

- 08번 요청("PPT도 수정 필요하면 바로 적용해")에 따라 스키마/화면/문서 변경 시 PPT도 기본적으로 함께 검토·반영한다. 다만 이번 09번 건처럼 **아직 여러 설계안이 확정되지 않은 검토 단계**에서는 PPT에 반영할 확정 내용이 없으므로, 설계가 확정된 뒤 한 번에 반영하는 것이 원칙(중복 작업 방지) — 사용자에게 이 판단 기준을 공유해 둠.

## 28. 09 안2(매트릭스 개선형) 가독성 보완 + 샌드세이브 성공/실패 대조 예시 (2026-07-16)

- 요청: 안1/안3은 그대로 두고, 안2에서 "홀/파/스코어" 행 구분이 더 잘 보이도록 개선 + 샌드세이브 실패 예시 추가.
- 안2(매트릭스) 개선:
  - `.mtx-hole-row`(홀 행): 옅은 하단 보더로 헤더처럼 구분.
  - `.mtx-par-row`(파 행): `--card-bg` 배경 + 굵기 600, 합계 셀은 primary 색상 강조.
  - `.mtx-score-row`(스코어 행): `--card-bg2` 배경 + 굵기 800 + 폰트 살짝 확대, 합계 셀 primary 강조.
  - 이렇게 세 행이 배경색과 굵기로 즉시 구분되도록 처리.
  - 특이사항 행의 스크램블(S)/샌드세이브(✓·✗) 표시를 기존 "색상 텍스트 한 글자"에서 티샷칩과 동일한 스타일의 배지(배경+둥근모서리)로 변경해 시인성을 높임.
- 샌드세이브 성공/실패 대조 예시: 기존엔 12번 홀도 2번 홀과 마찬가지로 실패 사례였음(둘 다 GBx) → 12번 홀을 "벙커 탈출 후 파 세이브" 성공 사례(strokes 4→3, onGreen 2, putt 1)로 변경. 이제 2번 홀(실패)·12번 홀(성공)이 안1/안2/안3 전부에서 뚜렷하게 대조되어 보임. 12번 홀은 GIR 실패 + 스크램블링 성공 + 샌드세이브 성공이 동시에 성립하는 논리적으로 일관된 케이스(그린을 놓치고 벙커에 빠졌지만 좋은 벙커샷+원퍼트로 파 세이브).
  - 이로 인해 후반 18홀 합계가 39타(+3) → 38타(+2)로, 전체 합계가 75타 → 74타로 자연히 바뀜 — 목업 예시 데이터 한계 관련 코드 주석과 jsdom 테스트도 함께 갱신.
- jsdom 재검증: 안2 매트릭스에 `mtx-hole-row`/`mtx-par-row`/`mtx-score-row` 클래스 존재, 샌드 배지가 전체 표에서 fail 1건·good 1건으로 정확히 1:1 대조되는지, 안1 상세카드에서 12번 홀이 "샌드세이브 성공"+"스크램블링 성공"+"GIR 실패"로 표시되는지, 수정 버튼 href의 `scores` 합계가 74로 재계산되는지 — 전부 통과.
- 배포 완료: `09-round-detail.html` md5 `a7896b694156306636132d62b3b84add`.

## 29. 09 안2 추가 보완 — 메모 라벨 + 언더파/오버파 표시 (2026-07-16)

- 요청: 안2의 "기타" 행 제목을 "메모"로 변경, 스코어가 언더파/오버파일 때 숫자 둘레에 표시.
- "기타" → "메모"로 라벨 변경(해당 행은 원래도 메모 아이콘만 표시하던 행이라 실제 용도와 일치시킴).
- 스코어 셀에 `sc-mark` 래퍼 추가, 골프 스코어카드 관례대로 버디는 동그라미, 이글 이하는 이중 동그라미, 보기는 네모, 더블보기 이상은 이중 네모로 숫자를 감싸도록 구현(파는 표시 없음). 이중 테두리는 `box-shadow` 링으로 표현하고 배경(`--card-bg2`)과 맞춰 자연스럽게 이어지도록 처리.
- jsdom으로 전반/후반 18홀 전체의 모양-relScore 매핑을 전수 대조(버디 2건=동그라미, 보기 2건=네모, 더블보기 1건=이중네모, 나머지 파=표시없음) — 전부 일치 확인.
- 배포 완료: `09-round-detail.html` md5 `a98ac96a8525f1da459fc57f3717a249`.

## 30. 안2 메모 아이콘 클릭 시 내용 표시 기능 (2026-07-16)

- 요청: 안2(매트릭스)에서 메모(📝) 아이콘을 클릭하면 메모 내용이 보이도록.
- 메모가 있는 홀만 `.memo-icon-btn`(버튼, `data-idx`=홀 전역 인덱스)로 렌더링, 없는 홀은 빈 셀 유지.
- 전반/후반 표 아래 공용 `#opt2-memo-panel` 패널 추가(초기엔 안내 placeholder 문구) — 아이콘 클릭 시 "OO반 N번 홀 메모"+내용으로 갱신, 클릭한 버튼에 `active` 배경 하이라이트(다른 버튼 클릭 시 이전 활성 해제).
- `design-option-2` 컨테이너에 클릭 이벤트 위임으로 처리(전/후반 어느 표든 동일하게 동작).
- jsdom 검증: 메모 보유 홀 5개(2/6/12/15/17번)만 버튼 생성됨, h2→h12 순차 클릭 시 패널 내용·활성 버튼 전환이 올바르게 동작함을 확인.
- 배포 완료: `09-round-detail.html` md5 `35eb6ca95f1507e5f0327dcd36497c89`.

## 31. 안2 전반/후반 라벨에 코스명 추가 (2026-07-16)

- 요청: 안2(매트릭스)의 "전반"/"후반" 라벨 옆에 코스명도 표시.
- `renderMatrix()`가 클로저 내 `course`(08→09로 전달된 파라미터, 기본값 레이크사이드 CC) 변수를 참조해 라벨을 "전반 · {코스명}" / "후반 · {코스명}" 형태로 렌더링하도록 수정.
- jsdom으로 기본값(레이크사이드 CC)과 08에서 다른 골프장으로 넘어온 경우(그린밸리 CC) 모두 라벨이 올바르게 반영되는지 확인.
- 배포 완료: `09-round-detail.html` md5 `ecbca29a2ce79a710f1ccdbb336d82b8`.

## 32. 안2 전반/후반 표 시각적 구분 카드화 (2026-07-16)

- 요청: 안2(매트릭스)에서 전반 데이터와 후반 데이터 사이에 구분이 있으면 좋겠음.
- 각 표를 `.matrix-half-card`(테두리+둥근모서리+옅은 그림자+흰 배경)로 감싸 두 블록을 명확히 분리, 전반은 좌측에 primary(초록) 컬러바, 후반은 accent(골드) 컬러바를 달아 색으로도 구분되게 함. 표 내부(파/스코어 행 배경색)와 겹치지 않도록 카드 배경은 흰색으로 유지.
- jsdom으로 `mhc-front`/`mhc-back` 클래스, 라벨, 내부 table 존재, 메모 클릭 기능이 래핑 후에도 정상 동작하는지 확인.
- 배포 완료: `09-round-detail.html` md5 `408871dcbda996c815d316cc57ecfc80`.

## 33. 09 라운드 상세 — 안2(매트릭스 개선형)로 최종 확정 (2026-07-16)

- 요청: 검토용으로 남겨뒀던 3안 스위처를 정리하고 안2로 확정.
- `09-round-detail.html` 전면 정리:
  - 안1(탭-상세형)·안3(세로 리스트형) 마크업/CSS/JS 전부 제거: `hstrip`/`hchip`/`hole-detail-card`/`hlrow` 관련 CSS, `renderStrip`/`renderHoleDetail`/`renderList`/`teeBadge`/`girBadge`/`scrambleBadge`/`sandBadge`/`badge`/`pinLabel`/`TEE_LABEL`/`OPT_DESC`/`selectOption` 등 미사용 함수 전부 삭제.
  - 상단 `review-tag`/`opt-switch`/`opt-desc` UI 제거 — 이제 "홀별 스코어" 섹션에 매트릭스만 단독으로 표시.
  - 컨테이너/요소 id를 확정 상태에 맞게 정리: `design-option-2` → `hole-score-section`, `opt2-memo-panel` → `hole-memo-panel`(클래스명도 동일하게 변경).
  - `screen-label`을 "홀별 스코어 매트릭스형 확정 + 08→09 골프장 연계"로 갱신.
  - 안2의 핵심 로직(`computeStats`/`relClass`/`scShapeClass`/`matrixTeeCell`/`matrixMiscCell`/`renderMatrix`/`renderMatrixAll`/메모 클릭)은 그대로 유지.
  - jsdom 전체 재검증(안1/3 잔존 요소 없음, 소유자/읽기전용 헤더, 전반/후반 카드+라벨, 언더파·오버파 모양 18홀 전수 대조, 메모 버튼 5개 및 클릭 동작, 수정 버튼 scores 합계 74) — 전부 통과.
  - 배포 완료: `09-round-detail.html` md5 `c14d58c6b792fdafe9bb47747249a4f0`.
- `pages.md` 9번 섹션을 "설계안 3종(검토용)" 서술에서 "최종 확정안(탭-상세형/세로 리스트형은 제외)" 서술로 갱신, 매트릭스 세부 개선사항 리스트는 유지. 배포 완료(md5 `064659f30d4177f78000085afc8f3cac`).
- PPT 확인 결과 추가 반영 불필요: 이번 확정은 08/09 기존 화면 내 UI 개선이며 새 DB 컬럼이 없고(GIR/스크램블링/샌드세이브는 파생 계산값), PPT 3페이지(핵심기능 "스코어 조회" 카드)·9페이지(화면설계 허브의 "스코어 조회" 박스)는 이미 26/27번 항목에서 이 기능 범위를 포괄적으로 설명하도록 갱신돼 있어 추가 수정 대상이 없음을 슬라이드 전수 검색으로 확인.
- Task #30(09 최종안 확정 및 PPT 반영) 완료 처리.

## 34. 7-2(Step2) "전체홀" 버튼 → "라운드 상세" 링크로 변경 (2026-07-16)

- 요청: 07-round-new-step2.html의 "전체홀" 버튼(기존 disabled 상태의 미구현 자리표시자)을 "라운드 상세"로 바꾸고 클릭 시 09(라운드 상세)로 이동.
- `<button disabled>` → `<a>` 링크로 전환(다른 화면의 동적 링크들과 동일한 패턴), 텍스트 "전체홀" → "라운드 상세".
- `updateAllHolesLink()` 함수 추가: 지금까지 저장된 홀(`h.saved`)의 타수 합계를 계산해 `course`/`date`/`score`/`weather`/`ownerId=me`/`owner=재홍` 파라미터로 09를 호출하는 href를 구성. 페이지 최초 로드(수정모드 `scores=` 프리필 포함), 홀 저장(commit), 초기화(reset) 시점마다 재계산해 href를 갱신.
- CSS: `.action-row .btn.secondary`에 `flex:1`을 기본 적용(기존엔 `disabled` 클래스에만 있었음)해 버튼→링크 전환 후에도 "전반 1번홀 입력"(flex:2)과의 2:1 비율 레이아웃 유지.
- jsdom 검증: 신규 입력 진입 시 `score=0`으로 시작 후 첫 홀 저장 시 값이 갱신되는지, 수정모드(`scores=` 파라미터)로 진입 시 로드 즉시 18홀 합계(72)가 반영되는지, course/date/ownerId/owner 파라미터가 정확히 전달되는지 — 전부 통과.
- 배포 완료: `07-round-new-step2.html` md5 `b5b3b36be0d9a4f58727d68f9839a716`.
- `pages.md` 7-2 섹션에 "화면 이동" 불릿 신설(전체홀→라운드 상세 변경 이력 + 파라미터 명시 + 향후 draft/세션 상태 설계 필요성 메모), 주요 컴포넌트 항목도 갱신. 배포 완료(md5 `0f96e5bd82cd64d9c6b8ae29e753447f`).
- PPT: 이번 변경은 화면 내 버튼 목적지 변경(기존에도 09와의 연계는 이미 PPT 화면설계 다이어그램에 반영돼 있던 흐름) 수준이라 추가 반영 대상 없음.

## 35. 개발 리스트(구현 2단계 백로그) 작성 (2026-07-20)

- 요청: "개발 리스트 작성 단계" — 설계/목업 단계 완료 후 실제 구현 착수를 위한 작업 목록 정리.
- 현재 실 구현 상태를 코드 기준으로 재확인: `app/src/app`에는 랜딩/로그인/회원가입/인증/미들웨어만 실제 구현되어 있고, `dashboard`/`courses`/`rounds`는 "구현 예정" 문구만 있는 placeholder임을 확인. 골프장 상세·스코어 등록(7-1/7-2)·라운드 상세·마이페이지·관리자 화면 4개는 아직 실 코드 없음(목업/설계만 존재).
- `doc/개발리스트.md` 신규 작성 — 공통 정리(README 동기화 등) → 사용자 화면(골프장/스코어) → 관리자 화면 4개 → 테스트 → 배포 순으로 20개 항목 정리, 각 항목에 근거 문서(pages.md/mockups/schema.prisma/admin-csv-upload.md) 명시. 5번 미정 사항(배포 예산, CSV 매칭 정책 등)도 하단에 재정리해 착수 전 확인 필요 항목으로 남김.
- 작성은 이번엔 `/tmp`에서 heredoc으로 만든 뒤 `cp`로 워크스페이스에 복사, `wc -c`/`md5sum` 양쪽 일치 확인(3659 bytes) — truncation 없이 정상 배포.
- **다음 세션 시작 시**: `doc/개발리스트.md`를 실행 우선순위로 삼아 항목 3번(골프장 목록)부터 착수 권장. 단, 항목 1(README 동기화)·2(최초 관리자 계정 지정 방법)는 코드 작업 전 먼저 정리해도 되는 가벼운 선행 작업.

## 36. 개발 리스트를 화면별 기능 단위로 상세화 + 실제 구현 상태 재확인 (2026-07-20)

- 요청: 35번의 요약형 개발리스트를 pages.md/mockups/PPT 기준으로 화면별 기능까지 세분화하고 각 기능의 구현 여부를 표시.
- `app/src` 코드를 실제로 열어 재확인한 결과, 기존 memory.md 8번 항목이 "구현 완료"로 남겨뒀던 `/login`, `/signup`, 랜딩(`/`) 페이지가 실제로는 "OO 화면 (구현 예정)" 문구만 있는 placeholder임을 확인(폼/`signIn()` 연동 전혀 없음). **memory.md 이력과 실제 코드가 불일치했던 사례.**
- 골프장 공공데이터 연동 코드(`src/lib/public-data/`, `scripts/sync-golf-courses.ts` 등, memory.md 9~10번에서 "구현 완료"로 기록됨)가 현재 프로젝트 폴더에 전혀 존재하지 않음을 확인 — `app/README.md`의 "샌드박스 임시환경에서 검증(PC에는 남지 않음)" 문구로 보아, 예전에 검증만 하고 실제 파일을 저장한 적이 없었던 것으로 추정. **처음부터 재작성 필요.**
- `/api/signup` 라우트도 `email`/`password`/`name`만 저장하고 `thirdPartyConsent`는 저장하지 않는 버그 발견(스키마엔 필드 있음, 화면 미구현이라 지금까지 드러나지 않았음).
- 보호 라우트 미들웨어(`src/middleware.ts`)에 `/admin` 경로가 빠져있음을 확인 — 관리자 화면 구현 시 함께 추가 필요.
- `doc/개발리스트.md`를 화면별 기능 체크리스트(표 형식, ✅/🟡/⬜)로 전면 재작성. 0번 "기반 작업 현황" 섹션을 신규로 추가해 화면에 속하지 않는 인프라 항목(DB 스키마/인증 설정/미들웨어/공공데이터 연동/날씨 API)도 별도로 정리. 결과적으로 거의 모든 화면 기능이 ⬜(미구현)이고, 부분 구현(🟡)은 회원가입 API·NextAuth 설정·미들웨어 3건뿐임이 드러남.
- `/tmp` heredoc → `cp` → `wc -c`/`md5sum` 검증 방식 유지(11730 bytes, 양쪽 일치).
- **다음 세션 시작 시**: `doc/개발리스트.md`의 "착수 순서 제안"(1. 버그성 수정 → 2. 인증 3종 → 3. 골프장 데이터 → …) 순서대로 진행 권장. 착수 전 이 재확인 결과(placeholder였던 화면들, 사라진 공공데이터 연동 코드)를 사용자에게 먼저 공유했음.

## 37. 버그성 수정 2건 완료 (2026-07-20)

- 36번에서 발견한 버그 2건을 프로젝트 지침(PM은 서브에이전트로 기능구현 진행, 파일 쓰기는 Edit/Write 금지·bash heredoc + 검증 필수)에 따라 처리.
- 기능구현 서브에이전트에게 정확한 목표 코드(before/after)를 지정해 위임, 완료 후 본인이 직접 `Read`로 재검증.
- **`app/src/app/api/signup/route.ts`**: 요청 body에서 `thirdPartyConsent`를 받아 `Boolean(=== true)`로 강제 변환 후 `User.create`에 저장하도록 수정(867 bytes). 단, 회원가입 화면(3번)이 아직 이 API를 호출하지 않는 placeholder라 실제 가입 플로우 전체는 여전히 미완성 — API만 정상화됨.
- **`app/src/middleware.ts`**: `PROTECTED_PATHS`/`matcher`에 `/admin`을 추가(593 bytes) — 로그인 안 한 사용자의 `/admin/*` 접근을 `/login`으로 리다이렉트. `role=ADMIN` 여부를 확인하는 AdminGuard는 별개 미구현 기능(관리자 화면 실제 구현 시 함께 추가 예정)이라 이번 범위에서 제외.
- 검증: 서브에이전트가 `npx tsc --noEmit` 실행 시도 — 5개 에러 발생했으나 전부 `@/auth`·`@/lib/prisma` 경로 미해석 및 Prisma client 미생성 등 **샌드박스 환경 자체의 기존 이슈**이며 이번에 수정한 두 파일과는 무관함(신규 타입 에러 없음). 사용자 로컬(Docker+Node, prisma generate 완료 환경)에서 재확인 권장.
- `doc/개발리스트.md` 갱신: 0번 표의 "회원가입 API"/"보호 라우트 미들웨어" 행 상태와 "착수 순서 제안" 1번 항목에 완료 반영. 이번엔 bash `sed`/python 치환 후 `diff`로 의도한 3곳만 정확히 바뀌었는지 확인(Edit 툴 미사용).

### 다음 세션 시작 시

- `doc/개발리스트.md` 착수 순서 2번(인증 3종 세트: 랜딩/로그인/회원가입 화면-API 연동)부터 진행 권장.

## 38. 인증 3종 세트(랜딩/로그인/회원가입) 구현 완료 (2026-07-20)

- `doc/개발리스트.md` 착수 순서 2번에 따라 진행. 기획(스펙 확정: mockups 01/02/03의 정확한 카피·필드 재확인) → 기능구현 서브에이전트 위임(정확한 코드 사전 확정 후 heredoc으로만 작성하도록 지시) → 본인이 직접 `Read`로 재검증하는 순서로 진행.
- **`app/src/app/page.tsx`(랜딩)**: `auth()`로 로그인 세션 체크 후 있으면 `/dashboard` 리다이렉트(서버 컴포넌트), 히어로+4개 기능 카드(골프장 검색/스코어 기록/날씨 연동/통계 확인 — mockup 01-landing.html 카피 그대로)+로그인/회원가입 CTA. 1664 bytes.
- **`app/src/app/login/page.tsx`**: 클라이언트 컴포넌트. `next-auth/react`의 `signIn("credentials", {redirect:false})`로 로그인 처리, 실패 시 인라인 에러, 성공 시 `/dashboard`로 `router.push`. 구글/카카오 버튼은 `signIn("google"|"kakao", {callbackUrl:"/dashboard"})`. 제출 중 로딩 상태로 버튼 비활성화. 3550 bytes.
- **`app/src/app/signup/page.tsx`**: 클라이언트 컴포넌트. 이름/이메일/비밀번호/비밀번호확인 + 정보제공동의 체크박스(선택, mockup 03-signup.html 안내문구 그대로), 클라이언트 단에서 비밀번호 8자 미만/불일치 검증 후 `POST /api/signup` 호출(`thirdPartyConsent` 포함), 이메일 중복(409) 등 서버 에러 메시지 그대로 노출, 성공 시 `/login`으로 이동. 4762 bytes.
- **버그 추가 발견 및 수정 — `tsconfig.json`에 `baseUrl`/`paths` 누락**: `@/auth`, `@/lib/prisma` 같은 절대경로 import가 tsc뿐 아니라 실제 `next build`/`next dev`에서도 깨질 수 있는 구성 오류였음(Next.js는 tsconfig의 paths를 그대로 module resolution에 사용). `"baseUrl": "."`, `"paths": {"@/*": ["./src/*"]}` 추가로 수정. 이전 세션(37번)에서 "샌드박스 환경 고유 문제"로 넘겼던 tsc 에러들이 사실 이 설정 누락 때문이었음 — 재확인 필요성을 보여준 사례로 기록.
- 검증: `npx prisma generate`(샌드박스에 Prisma client 미생성 상태였음, 실행해 생성) → `npx tsc --noEmit` **0 에러**로 완전히 통과 확인. `npx next build`는 이 샌드박스의 `node_modules`가 사용자 PC(Windows)에서 마운트된 것이라 리눅스용 `@next/swc` 네이티브 바이너리가 없고, 샌드박스는 npm 레지스트리 네트워크 접근도 안 돼 다운로드도 실패함 — **풀 빌드/실행 검증은 사용자 로컬(Docker+Node)에서 필요**. ESLint도 `eslint.config.js`가 프로젝트에 없어 실행 불가(이번 범위 밖이라 손대지 않음, 후속 과제 후보로 남김).
- `doc/개발리스트.md` 갱신: 1~3번 화면 표 전체 ✅로 갱신, 0번 표에 NextAuth 설정/회원가입 API 상태를 ✅로 올리고 tsconfig 경로 별칭 수정 항목 신규 추가. python 치환 후 `diff`로 의도한 곳만 바뀌었는지 확인(Edit 툴 미사용).

### 남은 참고사항

- 로그인/회원가입 화면의 **실제 동작(구글/카카오 OAuth 콜백, DB 연동 가입/로그인)은 사용자 로컬 `npm run dev` 환경에서 최종 확인 필요** — 이 샌드박스는 DB 연결도 없고 next dev 서버 자체를 못 띄움.
- ESLint 설정 파일(`eslint.config.js`) 부재는 이번에 발견했지만 범위 밖이라 미해결 — 필요 시 다음에 추가.
- NavBar 공통 컴포넌트는 이번 3개 화면에 포함하지 않음(랜딩/로그인/회원가입은 비로그인 진입점이라 NavBar 불필요) — 대시보드 구현 시 함께 만들 예정.

### 다음 세션 시작 시

- `doc/개발리스트.md` 착수 순서 3번(골프장 공공데이터 연동 재작성 → 골프장 목록/상세)부터 진행 권장.

## 39. 대시보드 화면 구현 + NextAuth 세션 보강 (2026-07-20)

- 배경: 사용자가 로컬 `npm run dev`로 인증 3종 세트를 확인하다 로그인 후 `/dashboard`가 404(placeholder만 있던 상태)라 대시보드부터 이어서 진행 요청.
- **`app/src/types/next-auth.d.ts`(신규)**: NextAuth `Session`/`User`에 `id`/`role` 커스텀 필드를 추가하는 모듈 증강 파일. 대시보드가 로그인한 사용자의 `Round`를 조회하고 관리자 배너를 표시하려면 필요.
- **`app/src/auth.ts`**: `authorize()`가 `role`도 반환하도록 수정, `jwt`/`session` 콜백을 추가해 `token`/`session.user`에 `id`·`role`이 실리도록 함(기존엔 콜백 자체가 없어서 세션에 `id`/`role`이 전혀 없었음).
- **`app/src/app/dashboard/page.tsx`**: 인사말, 메뉴 카드 4개(골프장/스코어등록/스코어조회/마이페이지), `role=ADMIN`일 때만 보이는 관리자 배너 2개, 최근 라운드 3건(`Round`+`golfCourse`+`holeScores` 조회, 타수 합산) 또는 빈 상태 렌더링.
- **404 방지용 최소 placeholder 4개 신규 생성**: `/rounds/new`(7-1/7-2 스코어 등록), `/profile`(마이페이지), `/admin/golf-courses`, `/admin/users` — 대시보드의 메뉴 카드/관리자 배너가 가리키는 곳인데 아직 실제 화면이 없어서 또 404가 나는 걸 막기 위함. 기존 `courses`/`rounds` placeholder와 동일한 스타일("OO 화면 (구현 예정)").
- **tsc 검증 중 새 에러 2건 발견 및 수정**: `session` 콜백에서 `token.id`/`token.role`을 읽는 부분이 `Type 'unknown' is not assignable` 에러 발생. 원인: Auth.js의 `JWT` 인터페이스가 `Record<string, unknown>`을 확장하고 있어서, 우리가 만든 `declare module "next-auth/jwt"` 모듈 증강이 `session` 콜백의 `token` 파라미터 타입에는 완전히 병합되지 않고(원인 불명확 — 아마 `@auth/core`의 콜백 파라미터 타입이 복잡한 교차 타입이라 증강이 못 붙는 것으로 추정), 결과적으로 `token.id`/`token.role` 읽기가 인덱스 시그니처(`unknown`)로 폴백됨. **해결**: 읽는 시점에 `(token.id as string | undefined) ?? ""` 식으로 명시적 캐스팅 — 모듈 증강 병합 여부와 무관하게 항상 안전하게 동작.
- **중요한 실수와 교훈 — 이 세션에서 Edit 툴을 실수로 사용함**: 위 tsc 에러 2건을 고치면서 습관적으로 `Edit` 툴을 사용했는데, 곧바로 `wc -c`/`cat`으로 확인해보니 **파일이 정확히 이전과 같은 1789 bytes로 그대로였고 `cat` 출력이 문장 중간(`"USER" | "ADMIN" |`)에서 잘려있었음** — memory.md에 수십 번 기록된 바로 그 truncation 버그가 실제로 재현된 것. 즉시 bash heredoc으로 전체를 다시 써서 복구(1857 bytes, md5 일치 확인). **재확인: 이 프로젝트 폴더에 대해서는 사소한 한 줄 수정이라도, PM 본인이 직접 고칠 때도 예외 없이 Edit 툴을 쓰면 안 되고 항상 heredoc + 검증이어야 함.**
- 최종 검증: `npx tsc --noEmit` **0 에러**로 통과. 파일 7개(타입 파일 1 + auth.ts + dashboard + placeholder 4개) 전부 `Read`로 재확인 완료.
- `doc/개발리스트.md` 갱신: 4번(대시보드) 표 전체 ✅ (단 "최근 라운드" 항목은 실제 라운드 데이터가 없어 아직 빈 상태로만 보인다는 단서 추가), 7-2/10/11/14번 섹션에 "placeholder만 생성됨, 기능은 미구현" 안내 인용구 추가. python 치환 + `diff`로 의도한 곳만 바뀌었는지 확인.

### 남은 참고사항

- 대시보드의 "최근 라운드" 영역은 스코어 등록 기능이 아직 없어 실제로는 항상 빈 상태로만 보임 — 정상 동작이며 버그 아님.
- Google/Kakao OAuth 로그인은 `PrismaAdapter`가 설정되어 있지 않음(schema.prisma에 Account/Session 테이블은 있지만 `auth.ts`에서 실제 어댑터를 연결한 적이 없음) — Credentials(이메일/비밀번호) 로그인은 자체 DB 조회라 문제없지만, 소셜 로그인은 인증 자체는 될 수 있어도 DB의 `User`/`Account` 레코드와 제대로 연결되지 않을 가능성이 있음(세션의 `id`가 우리 DB cuid와 다른 값일 수 있음). 아직 실사용 전이라 이번엔 손대지 않았지만, 소셜 로그인을 실제로 테스트/사용하기 전에 반드시 짚어야 할 항목으로 남김.
- 사용자에게 로컬에서 대시보드까지 재확인 요청 필요(특히 로그인 후 인사말에 이름이 잘 뜨는지 — 이건 `session.user.name`에 의존하는데 회원가입 시 입력한 이름이 정상 반영되는지 확인 필요).

### 다음 세션 시작 시

- 사용자 로컬 확인 결과에 따라 이어서 진행. 다음 정식 착수 항목은 여전히 `doc/개발리스트.md`의 골프장 공공데이터 연동(목록/상세) 또는 사용자가 우선순위를 바꾸면 그에 따름.

## 40. Edge 런타임 crypto 오류 수정 (2026-07-20)

- 사용자가 로컬에서 로그인 시 `Error: The edge runtime does not support Node.js 'crypto' module` 발생 보고.
- 원인: `src/middleware.ts`가 `@/auth`(전체 `auth.ts`)를 그대로 가져오는데, `auth.ts`가 `bcryptjs`(Credentials `authorize`의 비밀번호 비교)와 `@/lib/prisma`(`@prisma/adapter-pg`, `pg` 드라이버)를 임포트함. Next.js 미들웨어는 기본적으로 Edge 런타임에서 실행되는데 이 두 패키지는 Node.js 전용 `crypto` 등을 사용해 Edge에 번들 자체가 안 됨. 39번 항목에서 다뤘던 세션 콜백 타입 이슈와는 별개로, **이 프로젝트가 처음부터 갖고 있던 아키텍처 결함**(미들웨어와 풀 인증 설정을 분리하지 않음)이었고, 지금까지는 로그인 화면 자체가 placeholder라 실제로 로그인을 시도한 적이 없어서 드러나지 않았던 것.
- **해결 (Auth.js v5 공식 "config 분리" 패턴 적용)**:
  - **`app/src/auth.config.ts`(신규)**: Edge에 안전한 최소 설정. Google/Kakao provider + `pages`/`session`/`callbacks`(jwt·session — 순수 필드 복사라 Edge에도 안전)만 포함, **Credentials provider와 Prisma/bcrypt는 여기 없음**.
  - **`app/src/auth.ts`(전체 재작성)**: `authConfig`를 스프레드해 확장하고, `providers`에 Credentials(기존 authorize 로직 그대로, prisma+bcrypt 사용)를 추가로 얹음. API 라우트/서버 컴포넌트 등 Node.js 런타임에서만 사용.
  - **`app/src/middleware.ts`(재작성)**: `@/auth` 대신 `NextAuth(authConfig)`로 별도의 가벼운 `auth()` 인스턴스를 그 자리에서 새로 만들어 사용 — Credentials/Prisma/bcrypt가 전혀 번들되지 않음. `PROTECTED_PATHS`/`matcher` 등 기존 로직은 그대로 유지.
- 세 파일 모두 처음부터 `mcp__workspace__bash` heredoc으로 작성(37번 항목에서 겪은 Edit 툴 truncation 재발 방지를 위해 이번엔 처음부터 Edit 툴을 시도조차 하지 않음), 작성 직후 `wc -c`/`md5sum`로 로컬 임시본과 대조.
- `npx tsc --noEmit` **0 에러** 확인, `Read`로 세 파일 전체 재확인 완료.
- **한계**: 이 샌드박스는 리눅스용 `@next/swc` 바이너리가 없고 npm 레지스트리 접근도 안 돼 `next dev`/`next build`를 직접 실행해 런타임으로 재현·검증할 수 없음. 이번 수정은 Auth.js 공식 문서의 표준 해법이고 에러 메시지·원인이 정확히 일치해 타입 수준 검증(tsc)까지는 마쳤지만, **실제 로그인 성공 여부는 사용자 로컬에서 재확인 필요**(미들웨어 변경은 dev 서버 재시작이 필요할 수 있음).

### 다음 세션 시작 시

- 사용자가 로컬에서 `npm run dev` 재시작 후 로그인 재시도 결과를 받아서 확인. 성공하면 `doc/개발리스트.md`의 "골프장 공공데이터 연동" 등 다음 항목으로 진행.

## 41. 대시보드 목업 디자인 반영 + 공통 컴포넌트 신설 (2026-07-20)

- 사용자가 로그인 성공 후 대시보드가 `doc/mockups/04-dashboard.html`과 시각적으로 다르다고 지적 → 언제 맞출지 물어봤고, "지금 바로(추천)" 응답을 받아 진행.
- 목업(`doc/mockups/_shared.css`) 대비 실제 구현 차이: 메뉴 카드에 이모지 아이콘 없음, 하단 고정 네비게이션 없음, 관리자 배너/최근 라운드가 카드형이 아니라 목업은 "리스트 아이템"(제목+부제 좌측, 값 우측, `card-bg` 배경) 스타일.
- **`app/tailwind.config.ts`**: 목업 CSS 변수(`--card-bg`, `--card-bg2`, `--text-muted`, `--text-dark`, `--border`)를 Tailwind 커스텀 색상으로 추가(`card-bg`/`card-bg2`/`muted`/`ink`/`line`) — 앞으로 모든 화면에서 재사용.
- **`app/src/components/NavBar.tsx`(신규, 공통 컴포넌트)**: 하단 고정 네비게이션(홈/골프장/스코어/마이, 이모지 아이콘), `usePathname()`으로 현재 경로에 맞는 active 스타일. `pages.md` 공통 컴포넌트 "NavBar"에 해당.
- **`app/src/components/RoundListItem.tsx`(신규, 공통 컴포넌트)**: 목업의 `.list-item` 스타일(제목/부제 좌측, 값 우측)을 그대로 컴포넌트화. `pages.md`가 "RoundListItem: 4, 8번 화면에서 재사용"이라고 명시한 컴포넌트라 8번(스코어 조회) 구현 시에도 그대로 재사용 가능.
- **`app/src/app/dashboard/page.tsx` 재작성**: 메뉴 카드 4개에 목업과 동일한 아이콘(⛳✏️📋👤), 관리자 배너 2개를 점선 테두리+`card-bg2` 배경+ADMIN 뱃지 스타일로, 최근 라운드를 `RoundListItem`으로 교체, 하단에 `NavBar` 추가(겹침 방지로 `pb-24` 여백).
- **`courses/page.tsx`, `rounds/page.tsx`, `profile/page.tsx`(기존 placeholder)**: 동일하게 `NavBar` + 일관된 레이아웃(`max-w-md p-5 pb-24`)으로 갱신 — 대시보드에서 다른 탭으로 이동해도 하단 네비게이션이 유지되도록.
- **`rounds/[id]/page.tsx`(신규 placeholder)**: 대시보드 최근 라운드 항목이 링크하는 라운드 상세 화면이 아직 없어서 또 404 나는 걸 방지(현재는 라운드 데이터가 없어 실제로 클릭될 일은 없지만 안전하게 추가).
- 판단: `rounds/new`(스코어 등록 플로우)와 `/admin/*` 화면에는 NavBar를 넣지 않음 — 목업상 이런 "몰입형 플로우/관리자 영역" 화면은 하단 탭 없이 별도 상단 바(뒤로가기 등)를 쓰는 패턴이라 하단 탭을 유지하는 게 맞지 않다고 판단(11~14번, 7-1/7-2 실제 구현 시 재검토 가능).
- 검증: `npx tsc --noEmit` 0 에러, 8개 파일 전부 `Read`/`md5sum`으로 재확인. 이번엔 처음부터 전부 bash heredoc으로만 작성(Edit 툴 사용 안 함).
- `doc/개발리스트.md` 4번(대시보드) 표에 디자인 반영 완료 행 추가.

### 남은 참고사항

- 여전히 이 샌드박스에서는 `next dev`를 못 띄워서 실제 렌더링 결과를 픽셀 단위로 확인할 수는 없음 — 사용자가 로컬에서 보고 색상/간격이 기대와 다르면 추가 조정 필요.
- `courses`/`rounds`/`profile`은 아직 내용 자체는 placeholder라 화면 하단 네비게이션만 실제처럼 보이고 본문은 계속 "구현 예정" 상태.

### 다음 세션 시작 시

- 사용자 로컬 확인 후 다음 항목(골프장 공공데이터 연동 등)으로 진행.

## 42. 상단 타이틀 바(TopBar) 추가 (2026-07-20)

- 41번 이어서, 사용자가 목업처럼 페이지 상단에 타이틀 표시가 있으면 좋겠다고 제안 → 목업 재확인 결과 대시보드/골프장/스코어조회/마이페이지 전부 topbar가 있었는데(대시보드는 좌측 빈칸+제목+우측 👤, 나머지는 "‹ 뒤로"+제목+빈칸) 41번 작업 때 빠뜨렸던 것으로 확인, 동의하고 바로 반영.
- **`app/src/components/TopBar.tsx`(신규, 공통 컴포넌트)**: `title`/`backHref`(선택, 있으면 좌측에 "‹ 뒤로" 링크)/`rightHref`+`rightIcon`(선택, 있으면 우측에 아이콘 링크) props. 좌우 슬롯을 `w-8`로 고정해 제목이 항상 중앙 정렬되도록 구성.
- **`dashboard/page.tsx`**: `<TopBar title="대시보드" rightHref="/profile" rightIcon="👤" />` 추가(뒤로가기 없음, 우측에 프로필 아이콘).
- **`courses/page.tsx`, `rounds/page.tsx`, `profile/page.tsx`**: 각각 `<TopBar title="골프장|스코어 조회|마이페이지" backHref="/dashboard" />`로 교체, 기존에 있던 중복 `<h1>` 제거.
- 로그인/회원가입은 이미 별도 카드형 레이아웃(뒤로가기 없이 자체 `<h1>`)이라 이번 범위에서 제외 — 필요해지면 별도 논의.
- 검증: `npx tsc --noEmit` 0 에러, 5개 파일 전부 `Read`+`md5sum` 재확인. 전부 bash heredoc으로만 작성.
- `doc/개발리스트.md` 4번(대시보드) 표에 TopBar 반영 행 추가.

### 다음 세션 시작 시

- 사용자 로컬 확인 후 다음 항목(골프장 공공데이터 연동 등)으로 진행.

## 43. 마이페이지(10번 화면) 구현 (2026-07-20)

- 사용자가 순서를 바꿔 마이페이지를 먼저 진행해달라고 요청(원래 다음 항목은 골프장 공공데이터 연동이었음).
- `doc/mockups/10-profile.html`을 기준으로 구현(다른 화면들과 동일하게 mockup 시각 디자인 우선 기준):
  - **아바타+이름+이메일**: 목업엔 가입일 표시가 없어(pages.md 텍스트는 "이름/이메일/가입일"이라 적혀 있었지만 실제 mockup에는 가입일이 없음) mockup 기준으로 가입일 생략. `doc/개발리스트.md`에 이 불일치를 명시해둠.
  - **통계 카드 3개**: pages.md 텍스트는 "총 라운드 수/평균 타수/최근 라운드"라 적혀 있지만, mockup은 세 번째 칸이 "베스트 스코어"임 — 역시 mockup을 기준으로 삼음(총 라운드/평균 타수/베스트 스코어). `Round`+`HoleScore`를 조회해 라운드별 총타수를 계산 후 평균/최솟값 산출(홀스코어가 없는 빈 라운드는 집계에서 제외). 현재는 스코어 등록 기능이 없어 항상 0/-/- 로 표시됨(정상).
  - **`app/src/components/ConsentToggle.tsx`(신규)**: `thirdPartyConsent` on/off 토글 스위치(목업의 커스텀 슬라이더를 Tailwind `peer` 패턴으로 재현, 38×22px 트랙/16px 썸), 상태 텍스트("동의함"/"동의 안 함"/"저장 중...") 함께 표시, 변경 시 `PATCH /api/me` 호출, 실패하면 이전 값으로 롤백.
  - **`app/src/app/api/me/route.ts`(신규)**: 로그인 세션 확인 후 `thirdPartyConsent`만 업데이트하는 PATCH 핸들러.
  - **`app/src/components/LogoutListItem.tsx`(신규)**: `next-auth/react`의 `signOut({ callbackUrl: "/" })` 호출하는 로그아웃 리스트 아이템(목업의 강조색 `#D85A30` 그대로 사용).
  - **비밀번호 변경/알림 설정**: mockup은 `href="#"` 무효 링크였지만, 이 세션에서 계속 지켜온 "미구현은 명확히 표시" 원칙에 따라 dead link 대신 `opacity-60` + "준비 중" 라벨로 의도적으로 변경(디자인 판단, memory에 기록). 비밀번호 변경은 `passwordHash` 존재 여부로 노출 분기(소셜 전용 계정은 숨김)는 실제로 구현했지만, 클릭했을 때의 실제 변경 플로우 자체는 pages.md에 별도 화면으로 정의돼 있지 않아 범위 밖으로 남김.
- `app/src/app/profile/page.tsx` 전체 재작성(서버 컴포넌트: 세션→유저 조회→통계 집계→렌더링, 인터랙션은 위 클라이언트 컴포넌트에 위임).
- 검증: `npx tsc --noEmit` 0 에러. 4개 파일(API 라우트, ConsentToggle, LogoutListItem, profile/page.tsx) 전부 `Read`+`md5sum` 재확인. 전부 bash heredoc으로만 작성.
- `doc/개발리스트.md` 10번 섹션 표 전체 갱신(비밀번호 변경만 🟡, 나머지 전부 ✅), 41번 항목에서 남겨뒀던 "placeholder만 생성됨" 안내문을 "구현 완료"로 교체.

### 다음 세션 시작 시

- 사용자 로컬 확인 후, 원래 다음 순서였던 골프장 공공데이터 연동이나 다른 우선순위로 진행.

## 44. 마이페이지 목업 수정 — 가입일 표시 + 비밀번호 변경 화면 신설 (2026-07-20, 목업만 반영)

- 요청: "mockup까지만 반영" — `doc/pages.md`나 실제 앱 코드(`app/src`)는 건드리지 않고 `doc/mockups/`만 갱신.
- **`doc/mockups/10-profile.html`**: 아바타 옆 이름/이메일 아래에 "2026.07.14 가입" 가입일 텍스트 추가(43번 항목에서 mockup에 없어 구현 안 했던 부분). "비밀번호 변경" 리스트 항목의 `href`를 `#`(무효 링크)에서 신규 `10-1-change-password.html`로 연결.
- **`doc/mockups/10-1-change-password.html`(신규)**: 마이페이지 하위 화면(07-1/07-2와 같은 번호 체계로 "10-1"). 현재 비밀번호/새 비밀번호/새 비밀번호 확인 3개 입력 필드 + 에러 상태 예시("현재 비밀번호가 올바르지 않습니다") + 규칙 안내 문구("영문, 숫자 포함 8자 이상") + "변경하기" 버튼. 하단 네비게이션 바는 넣지 않음(06/09번 등 기존 "상세/드릴인" 화면들이 전부 네비바 없이 뒤로가기만 쓰는 패턴을 따름).
- **`doc/mockups/index.html`**: "10-1" 카드 추가(07-1/07-2와 동일한 서브넘버링 방식). "총 14개 화면" 문구는 07-1/07-2 때와 마찬가지로 10번 화면의 하위 화면 취급이라 변경하지 않음.
- 전부 `mcp__workspace__bash` heredoc으로 작성, 작성 직후 `wc -c`+`md5sum`으로 로컬 임시본과 대조, `Read`로 최종 내용 재확인.
- **의도적으로 하지 않은 것**: `doc/pages.md`(10번 섹션에 가입일/비밀번호 변경 화면 스펙 추가 필요), 실제 구현(`app/src/app/profile/page.tsx`에 가입일 표시 추가, `app/src/app/profile/change-password/page.tsx` 신설, 비밀번호 변경 API) — 전부 사용자가 목업을 확인한 뒤 진행 예정.

### 다음 세션 시작 시

- 사용자가 이 두 목업(10-profile.html 가입일, 10-1-change-password.html)을 확인한 뒤 "pages.md에 반영" 또는 "바로 구현"을 요청하면 그때 `doc/pages.md`(10번 섹션 갱신 + "10-1" 하위 화면 스펙 신설)와 `app/src`(가입일 표시, 비밀번호 변경 화면+API) 순서로 진행.

## 45. pages.md 반영 + 비밀번호 변경 실제 구현 (2026-07-20)

- 44번에서 목업만 먼저 반영해뒀던 것을 사용자 확인 후 pages.md와 실제 코드로 확장.
- **`doc/pages.md` 10번 섹션 갱신**: 레이아웃/데이터의존성/상태 문구를 실제 mockup·구현과 맞춤(3번째 통계 "최근 라운드"→"베스트 스코어"로 정정, "가입일"은 이미 텍스트엔 있었고 이번에 mockup·구현이 따라잡음). "화면 이동" 불릿 신규 추가. **`### 10-1. 비밀번호 변경` 섹션 신규 작성**(7-1/7-2와 동일한 하위 화면 번호 체계) — 목적/경로/목업/레이아웃/컴포넌트/데이터의존성/상태/화면이동 전부 명시. python 치환 후 `diff`로 의도한 블록만 바뀌었는지 확인.
- **`app/src/app/api/me/password/route.ts`(신규)**: `PATCH` — 세션 확인 → 새 비밀번호 8자 이상 검증 → 대상 유저의 `passwordHash` 존재 확인(없으면 403, 소셜 전용 계정 방어) → 현재 비밀번호를 `bcrypt.compare`로 검증(틀리면 400) → 새 비밀번호를 `bcrypt.hash`로 저장.
- **`app/src/app/profile/change-password/page.tsx`(신규)**: 클라이언트 컴포넌트, `TopBar`(뒤로가기→`/profile`)만 쓰고 `NavBar`는 안 씀(06/09번 등 드릴인 화면과 동일 패턴 유지). 현재/새/새 확인 3개 입력, 클라이언트 단에서 8자 미만·불일치 우선 검증 후 API 호출, 서버 에러 메시지 그대로 노출, 성공 시 `/profile`로 이동.
- **`app/src/app/profile/page.tsx` 갱신**: `user.createdAt`을 "YYYY.MM.DD 가입" 형식으로 아바타 영역에 추가, "비밀번호 변경" 항목을 기존 `opacity-60`+"준비 중" 비활성 표시에서 `Link href="/profile/change-password"`로 교체(소셜 전용 계정 숨김 조건은 그대로 유지).
- 검증: `npx tsc --noEmit` 0 에러, 3개 파일 전부 `Read`+`md5sum` 재확인. 전부 bash heredoc으로만 작성.
- `doc/개발리스트.md` 10번 표 갱신 — 비밀번호 변경 항목 🟡→✅, `PATCH /api/me/password` API 행 신규 추가.
- 이로써 10번(마이페이지) + 10-1(비밀번호 변경)의 목업·pages.md·실제 구현이 전부 동기화됨.

### 다음 세션 시작 시

- 사용자 로컬 확인(특히 비밀번호 변경 실제 동작 — 현재 비밀번호 틀렸을 때 에러, 정상 변경 후 재로그인 필요 여부 등) 후 다음 항목(골프장 공공데이터 연동 등)으로 진행.

## 46. 구글/카카오 OAuth 로그인 안 됨 — 원인 진단 + PrismaAdapter 연결 (2026-07-20)

- 사용자 질문: "구글과 카카오 인증으로 로그인 안되는데 필요한 것이 있나?"
- **원인 1 (외부, 사용자 조치 필요)**: `.env`의 `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`KAKAO_CLIENT_ID`/`KAKAO_CLIENT_SECRET`가 전부 빈 문자열(`""`)임을 `python3`로 직접 확인. 즉 구글 클라우드 콘솔/카카오 디벨로퍼스에 앱 자체를 등록한 적이 없는 상태 — 지금 당장은 이것만으로도 로그인이 안 되는 게 정상.
- **원인 2 (코드, 이번에 발견·수정)**: `auth.ts`에 `adapter`가 전혀 연결돼 있지 않았음(`prisma/schema.prisma`엔 Account/Session/VerificationToken이 "NextAuth Prisma Adapter 사용을 위해" 포함돼 있다고 주석까지 있었는데 실제로 한 번도 연결된 적 없었음 — 8번 항목부터 이어진 미완성 상태였음). 어댑터 없이는 구글/카카오로 "인증"까지는 될 수 있어도, 세션의 `user.id`가 우리 `User` 테이블의 cuid와 무관한 값이 되어 대시보드·마이페이지의 `prisma.user.findUnique({ where: { id: session.user.id }})` 같은 조회가 전부 실패/빈 값이 됨.
- **조치**:
  - `app/package.json`에 `@auth/prisma-adapter": "^2.11.2"` 의존성 추가(WebSearch로 최신 버전 확인, 2.11.2가 3개월 전 배포된 최신 버전).
  - `app/src/auth.ts`에 `import { PrismaAdapter } from "@auth/prisma-adapter"` + `adapter: PrismaAdapter(prisma)` 추가. `session.strategy: "jwt"`는 `auth.config.ts`에서 그대로 유지되므로 세션 저장 방식 자체는 안 바뀜(어댑터는 OAuth 계정 연결/User 생성 용도로만 쓰임) — Credentials provider는 어댑터와 무관하게 계속 자체 로직으로 동작(Auth.js가 Credentials는 항상 어댑터를 거치지 않도록 설계돼 있어 충돌 없음).
- **검증 한계(중요)**: `@auth/prisma-adapter`가 이 샌드박스의 `node_modules`엔 없고, 샌드박스는 npm 레지스트리 접근이 안 돼(이전 40/41번 항목에서도 확인된 제약) 설치·검증이 불가능함. `npx tsc --noEmit` 결과 **`Cannot find module '@auth/prisma-adapter'` 에러 1건만 발생**(다른 신규 에러 없음 — 이는 패키지 미설치 때문이지 코드 오류가 아님). **사용자가 로컬에서 `npm install` 실행 후 `npx tsc --noEmit`으로 재검증 필요** — 이번 건은 이 프로젝트에서 처음으로 "샌드박스에서 완전히 검증 못 하고 넘긴" 코드 변경임을 명확히 기록.
- **추가로 남는 리스크(아직 미해결, 사용자에게 안내함)**:
  - Prisma 7이 매우 최신 버전이라 `@auth/prisma-adapter`와의 호환성이 100% 보장되진 않음(WebSearch 결과, 비슷한 어댑터들이 Prisma 6/7 전환기에 버전 호환 이슈를 겪은 사례들 확인됨 — 예: better-auth 진영에서도 Prisma 7 전환 이슈 보고). 로컬에서 설치 후 문제가 있으면 알려달라고 안내.
  - 카카오 개발자 앱은 기본적으로(비즈 앱 전환 없이는) 이메일 동의항목이 제한적일 수 있음 — 우리 `User.email`은 필수+unique 필드라, 카카오 로그인 시 이메일이 아예 안 넘어오면 어댑터의 `createUser`가 실패할 수 있음. 카카오 개발자 콘솔에서 "카카오 로그인 > 동의항목 > 카카오계정(이메일)"이 활성화돼 있는지 사용자가 직접 확인 필요.
  - 이메일/비밀번호로 먼저 가입한 계정과 동일한 이메일로 나중에 구글/카카오 로그인을 시도하면 Auth.js 기본 정책상 자동으로 연결되지 않고 "OAuthAccountNotLinked" 에러가 날 수 있음(계정 연결 커스텀 로직 미구현, 후속 과제로 남김).
- 사용자에게 안내한 외부 설정 절차:
  - **Google**: Google Cloud Console → OAuth 동의 화면 구성 → OAuth 2.0 클라이언트 ID(웹 애플리케이션) 생성 → 승인된 리디렉션 URI `http://localhost:3000/api/auth/callback/google` 등록 → 발급된 Client ID/Secret을 `.env`에 입력.
  - **Kakao**: Kakao Developers → 앱 생성 → "카카오 로그인" 활성화 → Redirect URI `http://localhost:3000/api/auth/callback/kakao` 등록 → REST API 키(Client ID)와 보안 탭에서 발급하는 Client Secret을 `.env`에 입력 → 동의항목에서 이메일 활성화 확인.

### 다음 세션 시작 시

- 사용자가 `npm install` 후 tsc 결과와 실제 구글/카카오 로그인 시도 결과(에러 메시지 포함)를 알려주면 그에 맞춰 후속 조치(어댑터 버전 조정, 계정 연결 로직 추가 등) 진행.

## 47. 구글 OAuth 로그인 성공 확인 (2026-07-20)

- 사용자가 Google Cloud Console에서 발급한 실제 Client ID/Secret을 전달 → `.env`의 `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`에 반영(python 스크립트로 해당 두 줄만 정확히 교체, 값은 이후 어떤 로그/응답에도 다시 노출하지 않음).
- 사용자가 로컬에서 `npm install`(`@auth/prisma-adapter` 설치) → 개발 서버 재시작 → "구글로 계속하기" 클릭 → **실제 로그인 성공 확인**. 46번 항목에서 추가한 `PrismaAdapter` 연결이 정상 동작함을 실사용으로 확인한 것.
- 카카오는 사용자가 직접 Kakao Developers에서 앱 등록 및 Client ID/Secret 발급, 테스트까지 진행하기로 함 — 46번에서 남겨둔 "카카오 이메일 동의항목 제한 가능성" 리스크는 사용자가 테스트하면서 직접 확인할 예정.
- `doc/개발리스트.md` "구글/카카오 OAuth 실제 로그인" 행을 "구글 OAuth"(✅ 완료)와 "카카오 OAuth"(⬜ 사용자 진행 예정) 두 행으로 분리.
- 이 시점까지의 세션 작업(37~47번 항목: 버그성 수정 2건, 인증 3종 세트, 대시보드, Edge 런타임 crypto 수정, 대시보드/마이페이지 목업 디자인 반영, 마이페이지+비밀번호 변경 구현, PrismaAdapter 연결, 구글 로그인 확인)을 git에 커밋 예정(48번 항목 참고).

## 48. 세션 작업 git 커밋 (2026-07-20)

- 사용자 요청: "지금까지 진행한 내용 memory.md와 필요한 파일 업데이트하고 git에 커밋까지 진행해줘."
- `.gitignore`에 `app/.env`가 이미 제외되어 있음을 재확인(민감정보 커밋 방지) 후 `git add`/`git commit` 진행.
- **push는 하지 않음** — root README.md에 명시된 기존 방침대로, 실제 GitHub push는 사용자가 VS Code의 Git Credential Manager(OAuth)로 직접 수행(이 세션엔 GitHub 인증 수단이 없음). 커밋만 로컬 저장소에 완료.

## 49. git push 완료 확인 (2026-07-20)

- 샌드박스에서 `index.lock`/`HEAD.lock` 잔여 파일로 인해 `git add`/`git commit`/`git reset` 등 쓰기 작업이 계속 "Operation not permitted"로 실패(사용자가 Windows 탐색기에서 직접 삭제하고 VS Code를 완전히 종료했음에도 샌드박스 쪽 `.git` 마운트 캐시가 꼬여 있는 것으로 판단 — 세션 내에서 해결 불가로 결론).
- 사용자에게 로컬 터미널에서 직접 `git add -A && git commit`/`git push` 실행을 요청 → 사용자가 직접 수행 후 "푸시완료" 보고.
- `git log --oneline -5`(로컬)와 `git log origin/main --oneline -3`(원격) 조회로 커밋 `85bc279`(인증 3종 세트/대시보드/마이페이지 구현, 버그 수정 5건, OAuth 어댑터 연결)가 원격에 정확히 반영된 것을 확인. 읽기 작업(`git log`, `git status`)은 이후에도 정상 동작하나 쓰기 작업은 이 세션 내내 불가능한 상태로 남음(다음 세션은 새 샌드박스이므로 재발 여부 다시 확인 필요).

## 50. 11번 관리자 골프장 Par 관리 목업 — 공공 데이터 업로드/최종 업데이트 표시 추가 (2026-07-20)

- 사용자 요청: "11-admin-courses 골프장 Par 관리 화면 mockup만 우선 수정. 골프장 공공 데이터 업로드 기능 추가. 최종 업데이트 날짜 표시 필요." — **목업까지만** 반영(10-1번 때와 동일한 패턴, `pages.md`/`app/src`는 아직 손대지 않음).
- `doc/mockups/11-admin-courses.html`에 상단(관리자 전용 배지 바로 아래, 기존 "CSV 일괄 업로드" 버튼 위)에 `.card.sync-card` 블록 추가:
  - 제목 "🌐 골프장 공공 데이터 업로드" + 설명 "공공데이터포털 골프장 정보 API에서 최신 목록을 가져와요"
  - "최종 업데이트: 2026-07-18 14:32" 표시
  - 우측에 "업로드" 버튼(`.btn.secondary`, 작은 사이즈로 `.sync-card .btn` 스타일 추가)
  - 기존 "CSV 일괄 업로드"(수동 파일 업로드)와는 별개 기능으로 구분 — 공공데이터포털 API 연동 자동 동기화 vs 수동 CSV 업로드, 두 경로 모두 유지.
- 기존 각 골프장 행의 "최종 수정일"(예: "2026-07-10 수정")은 원래 있던 것 그대로 유지 — 이번에 추가한 "최종 업데이트"는 공공데이터 동기화 자체의 최종 실행 시각을 의미하는 페이지 레벨 정보로, 개별 골프장 행의 수정일과는 다른 개념.
- `screen-label`을 "공공 데이터 업로드/최종 업데이트 표시 추가 (2026-07-20)"로 갱신.
- bash heredoc → `/tmp/sc/` 스테이징 → `cp` → `wc -c`/`md5sum` 일치 확인 → Read 툴로 최종 내용 재확인, 프로젝트 규칙(Edit/Write 금지) 준수.
- **`doc/pages.md`, `doc/개발리스트.md`, `app/src`는 이번 변경에 포함하지 않음** — 사용자 승인 후 다음 단계로 pages.md 11번 섹션 반영 + `app/src/app/admin/golf-courses/page.tsx`(현재 placeholder) 실제 구현 예정.

### 다음 세션 시작 시

- 사용자가 11번 목업 리뷰 후 "pages.md 반영하고 실제 구현진행" 같은 승인을 주면, 10번/10-1번 때와 동일한 절차(pages.md 갱신 → 실제 API/컴포넌트 구현 → 개발리스트.md 갱신)로 진행.

## 51. 11번 목업에 업로드 결과 토스트 인터랙션 추가 (2026-07-20)

- 사용자 질문: "업로드 버튼을 클릭했을 때 동작을 설명해봐" → 설명 후 "결과를 토스트로 표시한다고 했는데 목업 화면에 표시 해 줄 수 있어?" 요청.
- `doc/mockups/11-admin-courses.html`에 실제 클릭 시 흉내 낼 수 있도록 JS 인터랙션 추가(10-profile.html의 동의 스위치 스크립트와 동일한 패턴 — 목업 단계에서도 순수 정적이 아닌 mock 인터랙션 허용):
  - 버튼 클릭 → "동기화 중..." 비활성화 상태로 0.7초 대기(실제 API 호출을 흉내) → 버튼 복구 + "최종 업데이트" 텍스트를 현재 시각으로 갱신 + 화면 하단에 토스트("신규 2개 추가 · 3개 갱신 완료") 2.5초간 표시 후 자동 숨김.
  - 토스트 위치를 위해 `.phone`에 `position: relative` 추가(공유 CSS는 건드리지 않고 이 페이지 `<style>` 블록에서만 오버라이드).
  - 스크립트 내 주석으로 실제 구현 시 연결 지점 명시: `POST /api/admin/golf-courses/sync` 응답의 `{ added, updated, updatedAt }`로 토스트/텍스트를 채우는 구조가 되어야 함.
- bash heredoc → `/tmp/sc/` 스테이징 → `cp` → `wc -c`/`md5sum` 일치 확인 → Read로 최종 내용 재확인.
- 여전히 목업 단계만 진행 — `pages.md`/`app/src`는 미반영.

## 52. 11번 관리자 골프장 Par 관리 — 공공 데이터 업로드 실제 구현 (2026-07-20)

- 사용자 요청: "해당 내용 pages.md에 반영하고 구현시작해." (50/51번에서 목업만 진행한 공공 데이터 업로드 + 최종 업데이트 표시 기능을 pages.md 반영 + 실제 코드 구현까지 진행)
- **설계 전 조사(WebSearch)**: 행정안전부_생활_골프장 데이터셋이 `data.go.kr`의 **파일데이터**(`fileData.do`)로 제공되며 실시간 Open API가 아님을 확인 → 애초 대화에서 언급했던 "외부 API 자동 호출" 방식 대신, **관리자가 다운로드한 CSV 파일을 업로드**하는 방식으로 설계 변경(목업의 "업로드" 버튼 라벨과도 자연스럽게 일치). 정확한 CSV 컬럼명은 실제 파일 없이는 확정 불가라, `doc/admin-golfcourse-sync.md`에 별칭(alias) 매핑 표와 "TODO: 실제 파일로 검증" 메모를 남겨둠.
- **스키마**: `GolfCourse` 모델에 이미 `externalOrgCd`/`externalMngNo`/`businessStatus`/`subCategory`/`publicPrivate`/`rawCoordX`/`rawCoordY`/`needsGeocoding` 필드가 이전 세션에서부터 존재(공공데이터 연동을 염두에 두고 미리 설계돼 있었음) — **스키마 변경 없이** 그대로 활용. "최종 업데이트" 값도 별도 이력 테이블 없이 `GolfCourse.externalOrgCd IS NOT NULL` 중 최신 `updatedAt`으로 근사(현재는 다른 기능이 이 값을 안 건드리므로 근사가 아니라 정확한 값).
- **신규/수정 파일**:
  - `app/src/lib/csv.ts`(신규): 외부 의존성 없는 간단 CSV 파서 + 헤더 별칭 매칭 유틸(`parseCsv`, `findColumnIndex`) — 13번 CSV Par 업로드 구현 시에도 재사용 가능하게 범용으로 작성
  - `app/src/app/api/admin/golf-courses/sync/route.ts`(신규): `POST` — 세션/role 검사 → CSV 파싱(UTF-8만 지원) → `externalOrgCd`+`externalMngNo` 매칭 키로 `GolfCourse` upsert(있으면 update, 없으면 `needsGeocoding:true`로 create) → `{addedCount, updatedCount, skippedCount, errors, lastUpdatedAt}` 응답
  - `app/src/components/PublicDataSyncCard.tsx`(신규, client): 숨김 파일 인풋 + "업로드" 버튼 → 업로드 중 로딩 → 완료 시 토스트("신규 N개 추가 · M개 갱신 완료") + "최종 업데이트" 텍스트 갱신, 실패 시 에러 메시지 표시
  - `app/src/components/GolfCourseAdminList.tsx`(신규, client): 검색 입력(이름/주소 클라이언트 필터) + 골프장 목록(루프 수 배지, Par 등록 상태 배지 완료/부분/미등록 로직, 12번 화면으로 링크)
  - `app/src/app/admin/golf-courses/page.tsx`(placeholder → 실구현): 세션+role 서버 가드, `GolfCourse`+`GolfCourseLoop`+`GolfCourseHole` 조회 후 Par 등록 상태 계산, 위 두 컴포넌트 조합
  - `app/src/app/admin/golf-courses/[id]/par/page.tsx`, `app/src/app/admin/golf-courses/upload/page.tsx`(신규 placeholder): 11번 화면의 행 클릭/CSV 업로드 버튼이 404 나지 않도록 최소 placeholder 생성(12번/13번은 아직 미구현 범위)
  - `app/src/middleware.ts`(수정): **버그 수정** — 기존엔 `/admin/*` 경로를 로그인 여부만 검사하고 `role`은 전혀 검사하지 않아, 일반 회원도 URL을 직접 입력하면 관리자 화면에 진입 가능했음. `req.auth.user.role !== "ADMIN"`이면 `/dashboard`로 리다이렉트하는 검사 추가(JWT에 이미 role이 실려 있어 Edge 런타임에서도 Prisma 없이 처리 가능). 페이지 자체에도 동일 검사를 중복으로 넣어 이중 방어.
- **문서 갱신**:
  - `doc/admin-golfcourse-sync.md`(신규): CSV 포맷 가정/별칭 매핑 표, "왜 업로드 방식인가" 설명, API 처리 순서, "최종 업데이트" 값 산출 근거, 향후 보완 후보(실제 파일 검증/EUC-KR 지원/좌표 변환) 기록
  - `doc/pages.md` 11번 섹션: python 타겟 치환으로 갱신(공공 데이터 업로드 카드/컴포넌트/데이터 의존성/상태 반영, `diff`로 해당 블록만 바뀐 것 확인)
  - `doc/개발리스트.md` 11번 섹션: 전부 ⬜ → 대부분 ✅로 갱신(12번/13번 화면 자체는 아직 없어 관련 항목은 🟡로 표기), python 타겟 치환 + `diff` 확인
- **검증**: `npx tsc --noEmit` 0 에러(EXIT_CODE=0) 확인. 실제 런타임 동작(파일 업로드 흐름, DB 반영)은 샌드박스에서 검증 불가 — **사용자가 로컬에서 실제 공공데이터포털 CSV로 업로드 테스트 필요**. 특히 컬럼 헤더가 문서에 적어둔 별칭과 다르면 "필수 컬럼을 찾을 수 없습니다" 오류가 날 수 있음 — 이 경우 실제 헤더를 알려주면 별칭 표를 교정할 것.
- **다음 세션 시작 시**: 사용자가 로컬에서 실제 CSV 업로드 테스트 결과(성공/실패, 실제 컬럼 헤더명)를 알려주면 `doc/admin-golfcourse-sync.md`와 `route.ts`의 별칭 매핑을 교정. 이후 12번(루프·Par 편집)/13번(CSV Par 업로드) 중 하나로 이어서 진행하거나, 카카오 OAuth 사용자 테스트 결과 확인.

## 53. 골프장 공공 데이터 업로드 — CSV 업로드 → 실시간 API 방식으로 전면 교체 (2026-07-20)

- 사용자가 실제 API 스펙 문서(`골프장api.txt` 업로드)를 제공: `https://apis.data.go.kr/1741000/golf_courses/info` — **실시간 Open API**로 확인됨. 52번 항목에서 WebSearch로 "파일데이터라 CSV 업로드만 가능"이라 판단했던 게 틀렸음이 드러남(정정).
- 사용자 질문: "totalCount 획득 후, 100개씩 루프 돌며 DB 작업 vs 전체 count 한번에 가져오기, 판단해서 설명해봐" → 페이지네이션(100개씩, 페이지마다 즉시 upsert) 방식을 추천하고 근거 설명(상한 미확인 위험, 부분 실패 안전성, totalCount는 스냅샷이라 하드코딩 부적절, 1페이지 응답에서 totalCount를 바로 얻어 count 전용 호출 절약 가능, item이 단일 결과일 때 배열이 아닌 객체로 오는 함정 등) → 사용자가 "네가 이야기한 대로 진행해줘" 승인.
- **API 키 처리**: 업로드된 파일의 `serviceKey`를 `.env`의 기존 `PUBLIC_DATA_API_KEY=""` 자리에 python 정규식으로 그 줄만 교체(다른 라인 영향 없음, 값은 로그/응답에 출력하지 않고 길이(64자)만 확인). 원본 API 스펙 텍스트 파일은 프로젝트 폴더/git에 넣지 않도록 문서에 명시.
- **`app/src/app/api/admin/golf-courses/sync/route.ts` 전면 재작성**(CSV/multipart 파싱 제거):
  - `POST`(바디 없음, 버튼 클릭이 곧 트리거) — 세션/role 검사 → `PUBLIC_DATA_API_KEY` 존재 확인 → 1페이지(`numOfRows=100`) 호출해 `totalCount` 획득 + 즉시 upsert → `totalPages = Math.ceil(totalCount/100)`만큼 2페이지부터 순차 호출, 페이지마다 즉시 upsert
  - 안전장치: `MAX_PAGES=200`(최대 2만 건) 상한, 페이지별 `AbortController` 10초 타임아웃, 페이지 요청 실패 시 그 지점까지 결과 반환(전체 재시도 안 함)
  - `normalizeItems()`: `items.item`이 단일 객체로 올 수 있는 경우(결과 1건) + `items`가 빈 문자열로 오는 경우(결과 0건) 모두 방어
  - 필드 매핑(실제 응답으로 확정): `BPLC_NM`→name, `ROAD_NM_ADDR`(없으면 `LOTNO_ADDR`)→address, `SALS_STTS_NM`→businessStatus, `DTIL_TPBIZ_NM`→subCategory, `PBP_SE_NM`→publicPrivate, `OPN_ATMY_GRP_CD`→externalOrgCd, `MNG_NO`→externalMngNo, `CRD_INFO_X/Y`→rawCoordX/Y — 매칭 키는 `externalOrgCd`+`externalMngNo`(기존 `@@unique` 그대로 재사용, 스키마 변경 없음)
- **`PublicDataSyncCard.tsx` 단순화**: 파일 인풋/`FormData` 제거, 버튼 클릭 → `fetch(POST)` 바로 호출하는 구조로 교체. 토스트/최종 업데이트 텍스트 갱신 로직은 그대로 유지.
- **문서**: `doc/admin-golfcourse-sync.md` 전면 재작성(실 API 스펙/필드 매핑표/페이지네이션 근거/구현 함정 정리, 이전 CSV 가정 내용 삭제), `doc/pages.md` 11번에 "공공 데이터 업로드 API 구현 방식" 항목 신설(python 타겟 치환 + diff 확인), `doc/개발리스트.md` 11번 갱신, `app/README.md`의 ".env 아직 채워야 할 값" 목록에서 이미 채워진 `GOOGLE_CLIENT_ID`류/`PUBLIC_DATA_API_KEY` 정리(카카오/기상청만 남김) — 겸사겸사 지난 세션에서 놓쳤던 문서 lag도 수정.
- **검증**: `npx tsc --noEmit` 1차 실행 시 `normalizeItems`의 `items === ""` 비교에서 TS2367(빈 문자열 좁히기 오류 — `!items`가 이미 falsy인 `""`를 걸러내서 이후 `=== ""` 비교가 불가능해짐) 발생 → `if (!items) return [];` 한 줄로 단순화해서 해결, 재실행 결과 EXIT_CODE=0.
- **미검증 사항(실제 API 호출 자체)**: 샌드박스는 외부 네트워크(apis.data.go.kr) 호출을 실제로 검증할 수 없음 — 사용자가 로컬에서 관리자 계정으로 "업로드" 버튼을 눌러 실제 동작(정상 응답, 페이지네이션 전체 순회, DB 반영) 확인 필요. 특히 이 API의 실제 `numOfRows` 상한이 100을 넘게 허용하는지, rate limit이 있는지는 실사용으로만 확인 가능.

### 다음 세션 시작 시

- 사용자가 로컬에서 실제 "업로드" 버튼 테스트 결과(성공/실패, 실제 반영된 골프장 수, 에러 메시지)를 알려주면 그에 맞춰 후속 조치. 이후 12번(루프·Par 편집)/13번(CSV Par 업로드) 중 하나로 이어서 진행하거나, 카카오 OAuth 사용자 테스트 결과 확인.

## 54. 공공 데이터 업로드 실사용 테스트 완료 확인 (2026-07-20)

- 사용자: "api로 골프장 리스트 가져오는 것 테스트 완료." — 53번에서 실시간 API 방식으로 재구현한 `POST /api/admin/golf-courses/sync`를 로컬에서 실제로 눌러본 결과 정상 동작 확인.
- 세부 결과(추가/갱신 건수, 에러 유무 등)는 아직 전달받지 않음 — 문제가 있었다면 사용자가 알려줄 것으로 보고 일단 "동작 확인 완료"로만 기록.
- `doc/개발리스트.md` 11번 "공공 데이터 업로드 API" 행에 실사용 검증 완료 메모 추가(python 타겟 치환).

### 다음 세션 시작 시

- 실제 반영된 골프장 수/이상 유무를 사용자가 추가로 알려주면 기록. 이후 12번(루프·Par 편집)/13번(CSV Par 업로드) 중 하나로 이어서 진행하거나, 카카오 OAuth 테스트 결과 확인.

## 55. 공공 데이터 업로드 실사용 결과: 신규 652개 추가 (2026-07-20)

- 사용자: "652개 추가됨." — 예시 응답의 `totalCount`(652)와 정확히 일치. 페이지네이션(100개씩 7페이지)이 마지막 페이지까지 누락 없이 정상 순회했고, upsert도 전부 `create`로 처리됐음을 확인(신규 DB라 전량 신규 등록된 것으로 보임).
- `doc/개발리스트.md` 11번 항목에 "신규 652개 추가" 결과 반영.
- 11번(관리자 골프장 Par 관리 목록) 화면의 공공 데이터 업로드 기능은 이것으로 목업→pages.md→실제 API 구현→실사용 검증까지 전체 사이클 완료.

## 56. 05번 골프장 목록 화면 실제 구현 (2026-07-20)

- 사용자 요청: "먼저 골프장 조회 화면 목업기준으로 05-courses.html 먼저 진행해줘." — 12번/13번(관리자 Par 관리 후속)보다 05번(사용자용 골프장 목록)을 먼저 진행하기로 순서 변경. 목업/pages.md가 이미 있어 바로 실제 구현으로 진행(이전 마이페이지 때처럼 mockup-only 단계 생략).
- 마침 652건 실데이터가 이미 DB에 있어(55번), placeholder가 아니라 실제 데이터로 화면을 만들 수 있었음.
- **신규/수정 파일**:
  - `app/src/components/CourseSearchList.tsx`(신규, client): 검색(이름/주소) + 필터 탭(전체/공공/민간) + "더 보기" 버튼 방식 페이지네이션(20개씩, 모바일 UX상 번호 페이지네이션보다 load-more가 자연스럽다고 판단)
  - `app/src/app/courses/page.tsx`(placeholder → 실구현): 세션 체크 후 `GolfCourse` 전체 + `GolfCourseLoop`(홀 수 계산용) 조회, `CourseSearchList`에 전달
  - `app/src/app/courses/[id]/page.tsx`(신규 placeholder): 05번 카드 클릭 시 404 방지, 6번 화면 자체는 이번 범위 밖
- **실데이터 미검증 가정 3가지(문서화)**:
  1. 주소 요약 — 전체 주소 문자열 앞 2토큰(시/도+시/군/구)만 사용. 실제 주소 포맷이 다양하면(예: 시 이름이 3토큰인 경우 등) 부정확할 수 있음
  2. 공공/민간 분류 — `publicPrivate` 원문에 "공공" 포함 여부로만 이분화(비어있지 않은 나머지는 전부 "민간"). 실제 API 예시 응답에서 이 필드는 대부분 빈 값이고 드물게 "사립"만 관찰됨 — 실제 652건에서 값 분포가 어떤지 확인 후 교정 필요
  3. "위치 확인 중" 표시 — `needsGeocoding` 플래그 대신 `latitude`/`longitude` null 여부로 직접 판단. 현재 좌표 변환 로직이 없어 전체 골프장이 "위치 확인 중"으로 보이는 게 정상(11번 공공 데이터 업로드가 좌표를 채우지 않기 때문)
- **문서 갱신**: `doc/pages.md` 5번, `doc/개발리스트.md` 5번 — python 타겟 치환 + `diff` 확인, 위 3가지 가정을 TODO로 명시
- **검증**: `npx tsc --noEmit` EXIT_CODE=0

### 다음 세션 시작 시

- 사용자가 로컬에서 05번 화면 실제 확인(검색/필터/더보기 동작, 652건 중 실제로 몇 개가 "위치 확인 중"으로 뜨는지, 공공/민간 필터가 실제로 의미 있게 나뉘는지) 후 피드백 주면 반영. 이후 6번(골프장 상세) 또는 12번/13번(관리자 Par 관리) 중 사용자가 지정하는 순서로 진행.

## 57. "위치 확인 중" 해결 — TM 중부원점→WGS84 좌표 변환 추가 (2026-07-20)

- 사용자 질문: "위치 확인 중 해결 방법은?" → AskUserQuestion으로 3가지 옵션(좌표계 변환만/주소 지오코딩 API/둘 다) 제시했고, 사용자가 추가로 "좌표계 변환은 어떻게 처리하는 것인가?"를 물어 proj4 기반 변환 원리(TM 중부원점 EPSG:5174, Bessel 타원체 → WGS84, `towgs84` 7-parameter 필요한 이유)를 설명 → "응 진행해." 승인.
- **신규 파일 `app/src/lib/geo.ts`**: `convertTmToWgs84(rawX, rawY)` — `proj4` 라이브러리로 TM 중부원점(EPSG:5174) X/Y를 WGS84 위경도로 변환. 입력 파싱 실패나 변환 결과가 대한민국 대략 범위(위도 32~39.5, 경도 124~132)를 벗어나면 이상치로 보고 `null` 반환.
- **`package.json`**: `proj4: ^2.20.9` 추가(WebSearch로 최신 버전 확인). `@types/proj4`는 처음에 같이 추가했다가, WebSearch로 "proj4가 최근 버전부터 자체 타입을 내장해서 별도 `@types` 불필요"함을 확인하고 제거.
- **`app/src/app/api/admin/golf-courses/sync/route.ts` 수정**: 매 upsert 시점에 `rawCoordX`/`rawCoordY`로 `convertTmToWgs84()` 호출 → 성공하면 `latitude`/`longitude` 채우고 `needsGeocoding: false`, 실패하면 기존과 동일하게 `null`+`needsGeocoding: true`. **핵심 포인트**: sync는 매번 전체 골프장을 다시 조회해 `update`하므로, 관리자가 "업로드" 버튼을 한 번 더 누르면 이미 저장된 652건에도 이 변환이 소급 적용됨 — 별도 백필 스크립트 불필요.
- **문서 갱신**: `doc/admin-golfcourse-sync.md`에 "좌표 변환" 절 신설(원리/구현 위치/한계/소급 적용 설명), `doc/pages.md` 5번의 "위치 확인 중" 설명 정정(이전엔 "좌표 변환 안 해서 전량 null"이라고 적어뒀던 게 이제 틀린 설명이 되어 교정), `doc/개발리스트.md` 5번/11번 항목에 반영. 전부 python 타겟 치환 + `diff` 확인.
- **검증**: `npx tsc --noEmit` 결과 `Cannot find module 'proj4'` 에러 1건만 발생(예상된 것 — 샌드박스가 npm 레지스트리 접근 불가라 새 패키지 설치 검증 불가, `@auth/prisma-adapter` 때와 동일한 패턴). **사용자가 로컬에서 `npm install` 후 재검증 필요**.

### 다음 세션 시작 시

- 사용자가 로컬에서 `npm install` → 관리자 화면에서 "업로드" 버튼 재클릭(기존 652건 좌표 소급 채움) → 05번 화면에서 실제로 "위치 확인 중"이 몇 건이나 남는지 확인 후 알려주면 기록. 이후 6번(골프장 상세, 지도 표시까지 필요하면 이 좌표를 그대로 사용)이나 12번/13번(관리자 Par 관리) 중 사용자가 지정하는 순서로 진행.

## 58. 오늘 작업 git 커밋/푸시 완료 확인 (2026-07-20)

- 사용자 요청: "오늘 작업한 내용 관련 파일에 업데이트 해주고 소스 커밋 해줘" — 문서(memory.md/pages.md/개발리스트.md/admin-golfcourse-sync.md/README.md)는 작업 진행하며 이미 계속 갱신해둔 상태였음.
- 샌드박스에서 `git add -A` 시도 → 53번 이전 세션과 동일한 `.git/index.lock` 에러 재발(파일 timestamp가 이전 세션의 stale lock과 동일한 10:47로 남아있어, 사용자 로컬 git 상태가 아니라 샌드박스 마운트 캐시 잔상으로 추정). 사용자에게 로컬 터미널에서 직접 `git add -A && git commit -m "..." && git push` 실행을 요청.
- 사용자가 로컬에서 실행 후 "커밋 완료" 보고 → `git log --oneline -3`(로컬)과 `git log origin/main --oneline -3`(원격) 둘 다 커밋 `7759ea5`(11번 관리자 골프장 공공데이터 업로드/05번 골프장 목록 화면/role 버그 수정)로 일치하는 것 확인 — **커밋뿐 아니라 푸시까지 이미 완료된 상태**였음.
- 오늘 세션(49~57번 항목) 작업 전체가 원격 저장소에 정상 반영됨: 11번 공공데이터 업로드(CSV 오판→실시간 API 재구현→좌표변환 추가), 05번 골프장 목록 화면, 미들웨어 role 검사 버그 수정, 관련 문서 일체.
- 샌드박스 쪽 `git status --short`는 여전히 `fatal: unknown index entry format 0x76000000` 같은 이상한 에러를 내는 상태 — 읽기 전용 명령(`git log`)은 정상 동작하므로 실제 상태 파악에는 문제없음. 이 샌드박스의 git 쓰기 계열 명령은 이번 세션에서도 계속 불가능한 것으로 결론.

### 다음 세션 시작 시

- 6번(골프장 상세) 또는 12번/13번(관리자 Par 관리) 중 사용자가 지정하는 순서로 진행. 카카오 OAuth 테스트 결과, 실제 좌표 변환 재업로드 결과(위치 확인 중 잔여 건수)도 확인 필요.

## 59. 06번 골프장 상세 화면 실제 구현 (2026-07-21)

- 사용자 요청: "골프장 상세화면부터 개발 진행해줘" — 58번 메모의 "다음 세션" 후보 중 6번을 선택. 목업(`06-course-detail.html`)/`doc/pages.md`/`doc/개발리스트.md`에 이미 설계가 있어 05번 때처럼 바로 실제 구현으로 진행.
- **신규/수정 파일**:
  - `app/src/lib/course-format.ts`(신규): `summarizeAddress`/`groupPublicPrivate`를 `courses/page.tsx`에서 분리해 공용화(05/06번이 같은 가공 로직을 쓰므로 중복 방지).
  - `app/src/app/courses/page.tsx`: 위 유틸 import로 교체(로직 변경 없음).
  - `app/src/app/courses/[id]/page.tsx`(placeholder → 실구현): 세션 체크 → `GolfCourse` 단건 조회(`loops` 포함, 없으면 `notFound()`) → 이름/주소 요약/홀수/공공·민간 표시, 지도 영역은 좌표 있으면 위경도 숫자 표시·없으면 "위치 확인 중"(05번과 문구 통일 — 실제 지도 렌더링은 이번 범위 밖, 좌표 유무 표시만), "이 골프장에서 스코어 등록" 버튼(`/rounds/new?courseId=<id>`), `Round`(golfCourseId+userId, holeScores 포함) 조회해 라운드 이력 리스트(날짜+합산 타수) 표시.
  - `app/src/components/RoundListItem.tsx`: `sub` prop을 필수 → optional로 변경(대시보드는 골프장명을 sub로 쓰지만, 06번은 골프장이 고정 컨텍스트라 날짜만 title로 표시 — sub 없이 재사용).
- **설계 변경(목업 대비)**: 목업은 5→6 이동 시 `?course=<골프장명>` 문자열 매칭 + 매칭 실패 시 첫 골프장 대체 표시였으나, 05번 목록이 이미 실제 `golfCourseId`로 카드를 링크하고 있어(`/courses/${course.id}`) 그대로 경로 파라미터(`/courses/[id]`)를 쓰도록 설계 변경 — 더 단순하고 실수 여지가 적음. 존재하지 않는 id 접근은 `notFound()`로 404 처리(별도 폴백 로직 불필요).
- **범위 밖으로 확인**: "이 골프장에서 스코어 등록" 버튼이 가리키는 7-1(`/rounds/new`)과 라운드 이력 항목이 가리키는 9번(`/rounds/[id]`)은 아직 placeholder라 실제 파라미터 반영/상세 표시는 안 됨 — 각 화면 구현 시점에 확인 필요.
- **문서 갱신**: `doc/pages.md` 6번(상태/진입파라미터/화면이동/실제구현 절), `doc/개발리스트.md` 6번 체크리스트 — 전부 실제 구현 반영해 갱신.
- **검증**: `npx tsc --noEmit` EXIT_CODE=0.

### 다음 세션 시작 시

- 사용자가 로컬에서 06번 화면 실제 확인(652건 중 좌표 있는 골프장으로 접근 시 위경도 표시, 없는 골프장은 "위치 확인 중" 표시되는지, 스코어 등록 버튼 클릭 시 `courseId` 쿼리 파라미터 정상 전달되는지) 후 피드백 주면 반영. 이후 7-1/7-2(스코어 등록 2-Step, 이번에 courseId 파라미터를 받는 지점이라 우선순위 있음) 또는 12번/13번(관리자 Par 관리) 중 사용자가 지정하는 순서로 진행.

## 60. 공통 TopBar "‹ 뒤로" 두 줄 표시 버그 수정 (2026-07-21)

- 사용자 리포트: "모든 화면의 '< 뒤로' 글자가 두 라인으로 표시 됨."
- 원인: `TopBar.tsx`가 모든 화면(01~14번 전체)에서 공용으로 쓰이는데, 뒤로가기 링크를 감싸는 좌측 컨테이너가 `w-8`(32px)로 고정돼 있어 "‹ 뒤로" 텍스트(text-sm 기준 약 44px 필요)가 줄바꿈됨. 06번 신규 구현 중 발견된 게 아니라 기존부터 있던 버그.
- 수정: `app/src/components/TopBar.tsx` — 좌/우 컨테이너를 `w-8` → `w-12 shrink-0`으로 확장(양쪽 폭을 동일하게 유지해 타이틀 중앙 정렬 유지), 뒤로가기 `Link`에 `whitespace-nowrap` 추가.
- 영향 범위: `TopBar`를 쓰는 모든 화면(대시보드/골프장 목록/골프장 상세/마이페이지 등 backHref 지정된 전체 화면) 1개 파일 수정으로 일괄 반영. `grep`으로 "뒤로" 텍스트가 다른 곳에 중복 구현돼 있지 않은지 확인함(TopBar.tsx 1곳뿐).
- **검증**: `npx tsc --noEmit` EXIT_CODE=0. (샌드박스는 브라우저 렌더링 확인 불가 — 사용자가 로컬에서 실제 한 줄로 표시되는지 확인 필요)

### 다음 세션 시작 시

- 사용자가 로컬에서 뒤로가기 버튼이 한 줄로 정상 표시되는지 확인 후 피드백. 이후 06번 화면 확인 결과와 함께 7-1/7-2 또는 12번/13번 중 지정하는 순서로 진행.

## 61. GitHub push protection — to-do.txt의 Google OAuth secret 노출/제거 (2026-07-21)

- 60번 커밋을 로컬에서 push하는 과정에서 GitHub push protection이 `to-do.txt:50`의 Google OAuth Client Secret을 감지해 push가 거부됨(`remote rejected ... repository rule violations`). 원격에는 올라간 적 없음(거부됐으므로).
- 원인: `to-do.txt`에 Google OAuth secret, data.go.kr 계정 비밀번호/serviceKey, GitHub 계정 비밀번호가 평문으로 들어있었고, 이게 사용자가 로컬에서 실행한 커밋에 포함됨.
- **조치**:
  - `to-do.txt`에서 위 계정정보 전부 제거, 대신 신규 `credentials.local.txt`(git 미추적)로 이동.
  - `.gitignore`에 `credentials.local.txt` 추가.
  - 샌드박스 git은 여전히 쓰기 계열 명령 불가(index.lock 권한 문제 지속)라 히스토리 재작성은 사용자가 로컬에서 직접 수행: `git reset --soft origin/main` → (제가 수정해둔 파일 상태 그대로) 재커밋 → push. 이 방법을 쓴 이유는 문제의 커밋들이 아직 origin에 반영되지 않은 상태였어서, soft reset으로 되돌리고 깨끗한 내용으로 재커밋하면 시크릿이 포함된 커밋 오브젝트가 아예 push 대상에서 빠지기 때문(rebase/filter-branch 같은 복잡한 히스토리 재작성 불필요).
  - 사용자에게 Google OAuth Client Secret / data.go.kr 비밀번호 / GitHub 비밀번호 재발급(rotate) 권장.
  - 사용자가 로컬 `.env`의 `GOOGLE_CLIENT_SECRET`/`PUBLIC_DATA_API_KEY` 값을 새로 발급받아 갱신함(`credentials.local.txt`도 사용자가 직접 새 값으로 갱신 — git 미추적이라 안전).
  - 사용자가 "git push 했어" 확인 → `git fetch` 후 `git log origin/main`이 로컬과 `a88eca5`로 일치, `to-do.txt` 원격 버전에도 시크릿 없음을 재확인. **push protection 이슈 완전 해결.**
- **교훈/재발 방지**: 앞으로 `to-do.txt`나 다른 git 추적 문서에 API 키/비밀번호 등 실제 계정정보를 절대 직접 적지 않고, `credentials.local.txt`(git 미추적)에만 기록하도록 사용자에게도 안내함.

## 62. 06번에 이어 다음 화면 결정 — 12번(관리자 루프·Par 입력) 선택 및 실제 구현 (2026-07-21)

- 사용자 질문: "그럼 다음으로 진행하지. 어떤 화면 할지 알려줘." — AskUserQuestion으로 4가지 옵션(12번 추천/7-1·7-2/13번/14번) 제시, 12번 추천 사유는 "652개 골프장 전부 루프/Par가 없어서, 이걸 먼저 해야 7-1/7-2(스코어 등록)를 실제 데이터로 테스트할 수 있음". 사용자가 12번 선택.
- **신규 파일**:
  - `app/src/lib/admin-api.ts`: `requireAdminSession()` — 세션+ADMIN role 체크 공용 헬퍼(12번 API가 3개 라우트로 나뉘며 반복되는 체크를 분리; 기존 11번 sync/route.ts는 라우트가 1개뿐이라 인라인 유지, 나중에 admin API 늘어나면 그쪽도 통합 고려).
  - `app/src/app/api/admin/golf-courses/[id]/loops/route.ts`(POST, 루프 생성), `.../loops/[loopId]/route.ts`(PATCH 이름/순서, DELETE), `.../loops/[loopId]/holes/route.ts`(PUT, 9홀 Par 트랜잭션 upsert).
  - `app/src/components/GolfCourseParEditor.tsx`(클라이언트): 루프 탭(더블클릭 이름변경/▲▼ 순서변경/✕ 삭제 — 즉시 API 반영), "+ 루프 추가", 9홀 Par 그리드(3열, select 3/4/5), "저장" 버튼(활성 루프만 배치 저장, dirty 상태 아니면 비활성화 + "저장됨" 표시).
  - `app/src/app/admin/golf-courses/[id]/par/page.tsx`(placeholder → 실구현): 골프장+루프+홀+`_count`(참조 라운드 수) 조회 후 위 컴포넌트에 전달.
- **설계 변경(목업 대비)**:
  1. 드래그 재정렬 → ▲▼ 버튼(새 DnD 라이브러리 추가 회피, 인접 루프와 `sortOrder` swap).
  2. 저장 범위를 "활성 루프의 Par 값만"으로 한정 — 루프 CRUD(추가/이름변경/삭제/순서변경)는 클릭 즉시 API 반영, Par 값 변경만 로컬 편집 후 "저장" 버튼으로 배치 반영. 다른 루프로 탭 전환 시 미저장 Par 변경 있으면 confirm 경고.
  3. 루프 삭제 confirm의 참조 라운드 건수는 페이지 로드 시점 값 사용(재조회 안 함) — 관리자 단독 툴이라 동시성 이슈 낮다고 판단한 근사치.
  4. 미저장 홀은 Par 4로 기본 표시(select가 3/4/5뿐이라 "미정" 표현 불가 — 목업과 동일한 한계).
- **문서 갱신**: `doc/pages.md` 12번(실제구현 절 신설), `doc/개발리스트.md` 12번 체크리스트 전체 ✅ 반영.
- **검증**: `npx tsc --noEmit` EXIT_CODE=0. 로컬 DB 접근 불가로 실제 CRUD 동작(루프 추가/삭제/Par 저장)은 미검증.

### 다음 세션 시작 시

- 사용자가 로컬에서 12번 화면 전체 플로우(루프 추가/이름변경/▲▼순서변경/삭제, Par 저장, 미저장 경고) 실제 확인 후 피드백. 특히 652개 골프장 중 아무거나 하나 골라 루프 2개(전반/후반) + Par 9개씩 등록해보고, 05/06번 화면에 홀수(`18홀` 등)가 정상 반영되는지도 함께 확인하면 좋음. 이후 7-1/7-2(스코어 등록, 이번에 등록한 Par 데이터로 실제 테스트 가능) 또는 13번(CSV 일괄 업로드) 중 지정하는 순서로 진행.

## 63. DB 골프장 Par 데이터 CSV 내보내기 기능 추가 (2026-07-21)

- 사용자 요청: "db에 저장된 골프장들의 코스별 파 정보를 조사해서 csv 양식에 맞게 파일로 저장해줘." — 12번 작업 직후 요청. 샌드박스는 사용자 로컬 Postgres(`localhost:5432`, docker)에 네트워크 접근 불가(`/dev/tcp/localhost/5432` 연결 시도 → `Connection refused`로 재확인)이므로, 직접 조회해서 파일로 떨궈줄 수 없어 대신 **관리자가 로컬 브라우저에서 클릭하면 다운로드되는 API**로 구현.
- **신규 파일**: `app/src/app/api/admin/golf-courses/export/route.ts` — `GET`, `requireAdminSession()`으로 관리자 인증, `GolfCourse`→`GolfCourseLoop`(sortOrder순)→`GolfCourseHole`(holeNumber순)를 13번 업로드와 동일한 CSV 포맷(`골프장명,루프명,홀번호,Par`, UTF-8 BOM, CSV 표준 이스케이프)으로 직렬화해 `Content-Disposition: attachment`로 응답 — 브라우저가 자동으로 파일 다운로드.
- **핵심 설계 결정**: 12번 UI(`GolfCourseParEditor`)는 미저장 홀을 화면에 Par 4로 기본 표시하지만, 이 내보내기는 "DB 조사" 목적이므로 **실제 `GolfCourseHole` 행이 있는 홀만** 출력하고 UI 기본값은 섞지 않음 — 즉 아직 Par를 저장하지 않은 홀/루프는 결과에서 자연히 빠짐.
- **11번 화면**(`app/src/app/admin/golf-courses/page.tsx`)에 "⇩ CSV 내보내기" 버튼을 "⇪ CSV 일괄 업로드" 바로 아래 추가(같은 톤이지만 outline 스타일로 구분).
- **문서 갱신**: `doc/admin-csv-upload.md`에 "CSV 내보내기" 절 신설, `doc/개발리스트.md` 11번 표에 항목 추가 + 오래된 "12번 placeholder" 문구 정정(12번은 62번에서 이미 구현 완료됨에도 이 표만 갱신이 안 돼 있었음).
- **검증**: `npx tsc --noEmit` EXIT_CODE=0. 실제 다운로드된 CSV 내용은 DB 접근 불가로 미확인.

### 다음 세션 시작 시

- 사용자가 로컬에서 관리자로 로그인 후 11번 화면 "⇩ CSV 내보내기" 버튼 클릭 → 다운로드된 CSV가 12번에서 등록한 Par 데이터와 일치하는지, 한글(골프장명)이 엑셀에서 깨지지 않는지 확인 후 피드백. 이후 7-1/7-2 또는 13번 중 지정하는 순서로 진행.

## 64. golfcourse_export.csv 기반 골프장 3곳 Par 조사 + 13번 CSV 업로드 화면 구현 (2026-07-21)

- **골프장 Par 조사**: 사용자가 pgAdmin으로 내보낸 `golfcourse_export.csv`(652건, `GolfCourse` 테이블 전체 raw dump)를 업로드하며 "코스 정보를 찾아서 CSV로 만들어달라"고 요청. 652건 전체 웹 조사는 비현실적이라고 판단해 AskUserQuestion으로 범위를 물었고, 사용자가 "자주 가는 공 몇 군데"를 직접 지정(하이원컨트리클럽/글렌로스골프클럽/월송리컨트리클럽).
  - 업로드된 CSV에서 `grep`으로 DB 정확 표기 확인: "하이원 컨트리클럽"/"월송리 컨트리클럽"(둘 다 사용자가 부른 이름과 달리 띄어쓰기 있음), "글렌로스골프클럽"(띄어쓰기 없음, 일치).
  - **월송리 컨트리클럽**: 2024년 개인 라운드 후기 블로그(dvdprime, 홀마다 사진+거리+Par가 명시적으로 적혀 있는 형태)에서 18홀 전체 Par를 확보(전반/후반 각 파36, 총 파72) — 신뢰도 높음. `doc/wolsongricc-par.csv`로 저장해 전달.
  - **하이원 컨트리클럽**: 파73(밸리코스 파37+마운틴코스 파36) 총계는 여러 소스에서 확인했으나, 홀별 배분을 알려주는 자료를 못 찾음(공식 사이트 코스안내 페이지는 JS 렌더링이라 텍스트로 못 읽음, 리뷰 블로그들도 홀별 상세 없음).
  - **글렌로스골프클럽**: 물리적으로 9홀(파36)인데 티박스/그린 2세트로 아웃코스/인코스를 나눠 18홀(파72)처럼 운영하는 구조라는 것까지는 확인했으나, 역시 홀별 Par는 못 찾음.
  - 이 둘은 AskUserQuestion으로 "추정치로라도 만들지/직접 확인해서 알려줄지/일단 제외할지" 물었고, 사용자가 "일단 이 둘은 제외하고 월송리만 업로드"로 결정 — 근거 없는 추정 데이터를 실제 앱에 등록하지 않기로 함.
- **13번(CSV 일괄 업로드) 실제 구현**: 사용자가 이어서 "CSV 일괄 업로드 화면 개발 진행해줘" 요청. `doc/admin-csv-upload.md`에 처리 로직이 이미 상세히 확정돼 있어 바로 구현.
  - **신규 파일**: `app/src/app/api/admin/golf-courses/upload/route.ts`(POST, multipart CSV 파싱 → 행단위 유효성검사(골프장명/루프명 누락, 홀번호 1~9, Par 3/4/5) → `GolfCourse.name` 정확매칭(0건/2건+ 오류) → `GolfCourseLoop` 이름 매칭/자동생성(업로드 1건 내 캐시로 중복조회 방지) → `GolfCourseHole` upsert, 행 단위 부분성공), `app/src/app/admin/golf-courses/upload/page.tsx`(placeholder→실구현), `app/src/components/CsvUploadForm.tsx`(드롭존+파일선택, 업로드, 결과 요약), `app/public/sample-golfcourse-par.csv`(샘플 다운로드, API 없이 정적 파일로 제공).
  - **재사용 발견**: `app/src/lib/csv.ts`의 `parseCsv()`가 이미 존재했지만 어디서도 쓰이지 않고 있었음(memory.md 49~51번 즈음 11번을 CSV 업로드 방식으로 처음 만들었다가 실시간 API로 전면 재구현하며 남은 죽은 코드) — 이번에 그대로 재사용해 새로 안 만들어도 됐음.
  - **설계 변경(목업 대비)**: 처리 결과 테이블을 목업(성공/실패/신규루프 전체 나열)이 아니라 `doc/admin-csv-upload.md`에 이미 확정된 응답 스펙(`totalRows`/`successCount`/`failCount`/`errors`)대로 구현 — 실패 행만 표로, 성공은 건수만. 신규 루프 강조 표시는 그 문서에 "향후 보완 후보"로 남겨진 항목이라 이번엔 제외.
  - **문서 갱신**: `doc/admin-csv-upload.md`(상단에 구현완료 표시), `doc/pages.md`/`doc/개발리스트.md` 13번.
  - **검증**: `npx tsc --noEmit` EXIT_CODE=0. 로컬 DB 접근 불가로 실제 업로드 동작(특히 매칭/자동생성/부분성공)은 미검증.

### 다음 세션 시작 시

- 사용자가 로컬에서 13번 화면으로 지난번 만든 `wolsongricc-par.csv` 실제 업로드 → 결과 리포트 확인(성공 18건 예상) → 12번 화면에서 월송리 컨트리클럽 Par가 정상 반영됐는지, 05/06번 화면 홀수 표시도 확인. 이후 7-1/7-2(스코어 등록, 이제 12번+13번 둘 다 됐으니 실제 Par 데이터로 테스트 가능) 또는 14번(회원 관리) 중 지정하는 순서로 진행. 하이원CC/글렌로스는 사용자가 공식 스코어카드 확인되면 재요청 예정.

## 65. 13번 CSV 업로드 실사용 + 골프장 2곳 추가 Par CSV + 11번 화면 배지 제거 (2026-07-21)

- **13번 실사용 성공**: 사용자가 `wolsongricc-par.csv` 업로드 → 성공. `pajucc-par.csv`는 골프장명이 DB와 달라("파주컨트리클럽" vs 실제 "(주) 파주컨트리클럽") 실패 → 이름만 고쳐서 `doc/golfcourse/pajucc-par.csv`로 재작성해드리니 성공.
- **글렌로스골프클럽 Par 추가 확보**: 사용자가 직접 확인한 값 제공(아웃코스/인코스 각 5,4,3,4,4,4,3,4,5 — 파36×2=72) → `doc/golfcourse/glenross-par.csv` 작성. 이걸로 지난번 세션에서 자료를 못 찾아 보류했던 3곳(파주/월송리/글렌로스) 전부 CSV 완성. 하이원CC만 아직 미해결(홀별 Par 자료 없음, 사용자가 나중에 확인 예정).
- **11번 화면 상태 배지 제거**: 사용자 요청 "골프장 Par 관리 화면에서 코스 미등록시 오른쪽 끝에 표시되는 미등록/완료 표시는 삭제해줘. 화면이 뭔가 깔끔하지 않음." → `GolfCourseAdminList.tsx`의 `statusBadge()` 함수와 그 호출부 삭제(완료/부분/미등록 배지). 좌측 "루프 N개"/"루프 미등록" 배지는 유지(그건 별도 요청 대상 아님).
- **문서 갱신**: `doc/개발리스트.md` 11번 표에서 "Par 등록 상태 배지" 항목을 ❌로 정정.
- **검증**: `npx tsc --noEmit` EXIT_CODE=0.

### 다음 세션 시작 시

- 사용자가 로컬에서 11번 화면 배지 제거 확인, `pajucc-par.csv`/`glenross-par.csv` 업로드 결과 확인. 하이원CC는 자료 확보되면 재요청. 이후 7-1/7-2(스코어 등록) 또는 14번(회원 관리) 중 지정하는 순서로 진행.

## 66. 11번 목업에 "코스 등록된 골프장만" 필터 추가 (목업만, 2026-07-21)

- 사용자 요청: "11-admin-courses 목업에 코스가 등록된 골프장만 조회하는 기능 추가해서 만들어줘. 일단 목업만 수정." — 실제 구현(`GolfCourseAdminList.tsx`)은 건드리지 않고 `doc/mockups/11-admin-courses.html`만 수정.
- **변경 내용**: 검색창 아래에 "전체"/"코스 등록된 골프장만" 필터 탭(알약 모양 토글) 추가. 각 골프장 카드에 `data-registered` 속성(루프가 1개 이상 있으면 true — Par 값이 채워졌는지와는 무관, "루프 미등록" 배지가 있는지만 기준)을 부여하고, 탭 클릭 시 JS로 표시/숨김 처리. 필터링 결과 0건이면 "코스가 등록된 골프장이 없습니다" 안내 표시.
- mock 데이터 5개 중 "선베이 힐스 CC"(루프 미등록)만 `data-registered="false"`, 나머지 4개(레이크사이드/파인밸리/선셋힐스/그린밸리)는 루프가 있으므로 true — 선셋힐스는 Par 0/27(미등록 배지)이어도 루프 자체는 3개 있어서 "코스 등록됨"으로 취급(주의: 65번에서 제거한 우측 Par 상태 배지와는 별개 개념).
- 65번에서 이미 실제 구현 쪽 우측 상태 배지를 지웠지만, 이 목업 파일은 그 변경 이전 버전이라 여전히 배지가 남아있음 — 이번 요청 범위 밖이라 그대로 둠(목업과 실제 구현 화면이 이 지점에서 살짝 어긋나 있다는 점 기록).
- **문서 갱신**: `doc/개발리스트.md` 11번 표에 "전체/코스 등록된 골프장만 필터 탭" 행 추가(⬜, 목업만 완료 상태 명시).
- **검증**: HTML/JS라 tsc 대상 아님. 브라우저 목업 파일이라 로컬에서 직접 열어 확인 필요.

### 다음 세션 시작 시

- 사용자가 로컬에서 목업 파일(`doc/mockups/11-admin-courses.html`)을 브라우저로 열어 필터 탭 동작 확인. 승인되면 실제 구현(`GolfCourseAdminList.tsx`에 필터 상태 추가 + `loopNames.length > 0` 기준 필터링)으로 진행 여부 확인. 그 외 7-1/7-2 또는 14번 진행 순서는 계속 사용자 지정 대기.

## 67. 11번 "코스 등록됨" 필터 실제 구현 (2026-07-21)

- 사용자 요청: "구현진행." — 66번 목업을 바로 승인, 실제 구현으로 진행.
- `app/src/components/GolfCourseAdminList.tsx`에 `registeredFilter` state 추가. 05번 `CourseSearchList.tsx`의 "전체/공공/민간" 칩 필터와 동일한 스타일/패턴으로 "전체"/"코스 등록됨" 두 칩 추가(검색창 바로 아래). 필터링 기준은 목업과 동일하게 `loopNames.length > 0`(Par 값 채움 여부와 무관). 라벨은 목업의 "코스 등록된 골프장만"을 칩 스타일에 맞게 "코스 등록됨"으로 줄임.
- 빈 결과 문구도 필터 상태에 따라 분기: "코스 등록됨" 필터에서 0건이면 "코스가 등록된 골프장이 없습니다.", 그 외엔 기존 "검색 결과가 없습니다."
- **문서 갱신**: `doc/개발리스트.md` 11번 표에서 해당 행 ⬜→✅.
- **검증**: `npx tsc --noEmit` EXIT_CODE=0.

### 다음 세션 시작 시

- 사용자가 로컬에서 11번 화면 필터 탭 실제 동작 확인(특히 루프는 있지만 Par 미등록인 골프장이 "코스 등록됨"에 정상 포함되는지). 이후 7-1/7-2(스코어 등록) 또는 14번(회원 관리) 중 지정하는 순서로 진행.

## 68. 14번 관리자 회원 관리 화면 실제 구현 (2026-07-21)

- 사용자 요청: "다음은 관리자 - 회원관리 개발 진행해줘." — pages.md에 미결 정책으로 남아있던 "본인 계정 어드민 권한 자가 해제" 처리 방식을 AskUserQuestion으로 확인(서버에서 차단/확인 경고만/제한 없음 3가지 제시) → 사용자가 "서버에서 차단" 선택 후 바로 구현 진행.
- **신규 파일**:
  - `app/src/app/api/admin/users/role/route.ts`(PATCH): `userIds[]` + `role`(ADMIN/USER) 받아 `prisma.user.updateMany`. role이 USER(해제)이고 대상에 본인 id가 포함돼 있으면 그 id만 제외하고 나머지 처리(전체 거부 아님) — 응답에 `skippedSelf: boolean` 포함.
  - `app/src/components/AdminUserGrid.tsx`(클라이언트): 이름/가입일 범위 입력 + "검색"/"초기화" 버튼(목업 그대로 버튼 클릭 시에만 필터 적용 — 05/11번의 실시간 필터와 다른 UX, 목업 설계를 그대로 따름), 그리드(체크박스/이름·"(나)"표시/이메일/가입일/어드민 읽기전용 체크박스), 헤더 전체선택 체크박스는 `useRef`+`useEffect`로 DOM `indeterminate` 속성 직접 제어(React가 JSX prop으로 지원 안 함), 선택 인원 있을 때만 하단 일괄 액션 바 표시.
  - `app/src/app/admin/users/page.tsx`(placeholder → 실구현): AdminGuard(세션+role 체크) 후 전체 `User` 조회(별도 API 없이 서버 컴포넌트 직접 쿼리 — 05/11번과 동일 패턴)해 그리드에 전달.
- **정책 확정 반영**: `doc/pages.md`/`doc/개발리스트.md` 14번의 "본인 계정 권한 자가 해제 처리 ⬜(미정)" 항목을 확정된 내용으로 갱신.
- **검증**: `npx tsc --noEmit` EXIT_CODE=0. 로컬 DB 접근 불가로 실제 동작(특히 본인 계정 포함 일괄 해제 시 스킵되는지)은 미검증.

### 다음 세션 시작 시

- 사용자가 로컬에서 14번 화면 확인: 이름/가입일 검색, 전체선택 indeterminate, 어드민 권한 부여/해제(특히 본인 계정 포함해서 일괄 해제 시도했을 때 본인만 제외되고 나머지는 해제되는지, 토스트에 "본인 계정은 제외됐습니다" 문구 뜨는지). 이후 7-1/7-2(스코어 등록, 12/13번으로 이제 실제 Par 데이터 있으니 테스트 가능) 중 지정하는 순서로 진행 — 남은 미구현 화면은 사실상 7-1/7-2뿐(1~6, 10~14번 전부 실제 구현 완료).

## 69. 14번 목업 UX 변경 3건 (목업만, 2026-07-21)

- 사용자 요청: "14-admin-users 목업만 수정. 1.유저 선택은 1명만 선택, 멀티선택은 안되게 수정, 2.선택한 유저의 어드민 상태에 따라 '어드민 권한 부여/어드민 권한 해제' 버튼 노출 제어, 3.어드민만 검색하는 기능 추가" — 66번 때처럼 실제 구현(`AdminUserGrid.tsx`)은 건드리지 않고 `doc/mockups/14-admin-users.html`만 수정.
- **변경 내용**:
  1. 다중선택 체크박스+전체선택 헤더 체크박스를 전부 제거하고 라디오 버튼(`name="member-radio"`)으로 교체 — `selectedId`가 최대 1개만 담기도록 JS 전면 수정.
  2. 하단 액션 바가 선택된 1명의 현재 `role`을 보고 버튼을 하나만 렌더링(USER면 "어드민 권한 부여"만, ADMIN이면 "어드민 권한 해제"만) — 기존엔 항상 두 버튼이 같이 떠서 실수로 반대 버튼을 누를 여지가 있었음.
  3. 가입일자 범위 아래에 "관리자만 보기" 체크박스 추가, `applyFilter()`에서 `role === 'ADMIN'` 조건으로 필터링.
- **문서 갱신**: `doc/개발리스트.md` 14번 섹션 상단에 "목업과 실제 구현이 어긋나 있음" 경고 블록 추가, 관련 행들을 🟡/⬜로 정정(66번 때 11번에서 했던 것과 동일한 패턴 — 목업 변경 시점과 실제 반영 시점 사이 갭을 문서로 추적).
- **검증**: HTML/JS라 tsc 대상 아님.

### 다음 세션 시작 시

- 사용자가 로컬에서 목업(`doc/mockups/14-admin-users.html`) 브라우저로 열어 단일선택/버튼 노출/관리자만 보기 동작 확인. 승인되면 `AdminUserGrid.tsx` + 필요 시 `PATCH /api/admin/users/role` 쪽 실제 구현 반영(API는 `userIds` 배열에 1개만 넣으면 되므로 변경 불필요할 가능성 높음, 본인 자가해제 차단 로직도 단일선택 기준으로 단순화 가능). 그 외 7-1/7-2 진행 여부도 계속 확인.

## 70. 14번 실제 구현을 단일선택 UX로 갱신 (2026-07-21)

- 사용자 요청: "실제 구현 진행해." — 69번 목업을 바로 승인, 실제 구현(`AdminUserGrid.tsx`)에 반영.
- **변경 내용**:
  1. `selected: Set<string>`(다중선택) → `selectedId: string | null`(단일선택). 헤더 전체선택 체크박스/`useRef` indeterminate 로직 전부 제거(단일선택에서는 의미 없음). 행 선택 UI를 체크박스 → 라디오(`name="member-select"`)로 교체.
  2. 하단 액션 바를 "선택 인원 수 + 버튼 2개"에서 "선택된 1명 이름 + 버튼 1개"로 변경 — `selectedUser.role`이 `USER`면 "어드민 권한 부여"만, `ADMIN`이면 "어드민 권한 해제"만 렌더링.
  3. "관리자만 보기" 체크박스 추가, `appliedFilter.adminOnly`로 다른 필터와 함께 "검색" 클릭 시 적용.
  4. **추가 UX 보강(목업에는 없었지만 자연스럽게 따라온 것)**: 선택된 회원이 본인 계정이면서 현재 ADMIN이면, "어드민 권한 해제" 버튼을 아예 비활성 안내 텍스트("본인 계정은 해제 불가")로 바꿔 클릭 자체를 막음. 기존엔 클릭은 되고 서버(`skippedSelf`)가 조용히 스킵하는 방식이었는데, 단일선택으로 바뀌며 "눌렀는데 왜 안 바뀌지?"보다 "애초에 못 누르게" 하는 쪽이 더 명확하다고 판단해 클라이언트 방어를 추가. 서버 쪽 차단 로직(`role/route.ts`)은 안전망으로 그대로 유지(API를 직접 호출하는 경우 등 대비).
- `PATCH /api/admin/users/role` API 자체는 변경 없음(원래도 `userIds` 배열을 받는 구조라 1개짜리 배열로 호출하면 그대로 동작).
- **문서 갱신**: `doc/pages.md`/`doc/개발리스트.md` 14번 섹션을 단일선택 기준으로 전면 재작성(66번/69번 때처럼 남겨뒀던 "목업과 실구현 갭" 경고 블록은 이제 갭이 해소돼서 제거).
- **검증**: `npx tsc --noEmit` EXIT_CODE=0.

### 다음 세션 시작 시

- 사용자가 로컬에서 14번 화면 최종 확인(단일선택, 역할별 버튼 노출, 관리자만 보기, 본인 계정 해제 버튼 비활성화 전부). 이후 남은 미구현 화면은 사실상 7-1/7-2(스코어 등록 2-Step)뿐 — 1~6, 10~14번 전부 실제 구현 완료 상태.

## 71. 7-1/7-2 스코어 등록 2-Step 실제 구현 (2026-07-21)

- 사용자 요청: "다음 화면 진행해줘." — 마지막 남은 미구현 화면인 7-1(코스 선택)/7-2(스코어카드 입력)를 진행.
- **설계 변경(가장 중요)**: 목업은 Step1→Step2 이동, 수정모드 진입 모두 URL 쿼리 파라미터(`course`, `scores=` 등)와 클라이언트 상태만으로 시연했다. pages.md에 이미 "실제 구현 시 서버 임시저장/세션 설계가 필요하다"는 미해결 메모가 있었는데, 이번에 다음과 같이 확정: **Step2에서 첫 홀을 저장하는 시점에 `Round`를 DB에 생성**(빈 라운드가 남는 걸 막기 위해 Step1이 아니라 지연 생성)하고, 이후 각 홀 저장은 `HoleScore`를 upsert. 라운드 생성 직후 `router.replace`로 URL을 `?step=2&edit=<roundId>`로 바꿔 새로고침해도 중복 생성되지 않게 함. 수정모드는 `edit=<roundId>`로 서버 컴포넌트가 DB에서 전체 필드를 그대로 복원(목업의 `scores=` 방식과 달리 `teeShotResult`/`pinDistanceType`/`memo` 등 필드 유실 없음).
- **신규 파일**:
  - `app/src/app/api/rounds/route.ts`(POST): `golfCourseId`/`playedAt`/`holesPlayed`/`frontLoopId`/`backLoopId` 받아 로그인 사용자 소유 `Round` 생성, `roundId` 반환.
  - `app/src/app/api/rounds/[id]/holes/[holeNumber]/route.ts`(PUT): 라운드 소유자 검증 후 `HoleScore`를 `roundId_holeNumber` unique 기준 upsert(4분할 패널 전 필드 + `strokes = onGreenStrokes + puttStrokes` 서버 계산). par 3~6, teeShotResult/pinDistanceType enum, 메모 100자 등 유효성 검증 포함.
  - `app/src/components/RoundStep1.tsx`(클라이언트): 골프장 select, 9H/18H 세그먼트, 전반/후반 루프 select(같은 루프 중복 선택 방지), 루프 미등록 시 안내문, 날짜 피커(기본값 오늘), 날씨 카드는 기상청 API 미착수라 "날씨 연동 준비 중" 정적 문구만 표시. "스코어 카드" 버튼이 `/rounds/new?step=2&...`로 이동.
  - `app/src/components/RoundStep2.tsx`(클라이언트): 전반/후반 스코어카드 표(홀 탭 이동), PAR 3/4/5/6 버튼, 4분할 패널(티샷결과 자동가산/되돌리기 로직 포함), 홀메모, 저장 시 위 API 호출 후 다음 홀 자동 이동, 이전/다음/초기화 네비게이션, "라운드 상세" 버튼(roundId 생기기 전엔 비활성).
  - `app/src/app/rounds/new/page.tsx`(placeholder → 실구현, 서버 컴포넌트): `step` 쿼리로 Step1/Step2 분기. Step2는 `edit` 유무로 "신규(Step1 파라미터로 초기 Par 구성)" / "수정(DB에서 Round+HoleScore 전체 조회해 복원)" 분기.
- **목업 대비 파라미터명 변경**: `course`(이름)→`courseId`(id), `holes`→`holesPlayed`, `frontLoop`/`backLoop`→`frontLoopId`/`backLoopId`. 06번 골프장 상세 "이 골프장에서 스코어 등록" 버튼이 이미 `?courseId=`로 링크해뒀던 것과 일치시킴.
- **범위에서 제외한 것**: 날씨 API 연동(기존에도 "미착수"로 문서화돼 있던 부분, 이번에도 정적 placeholder만). 9번(라운드 상세) 화면에 "수정" 진입 버튼 연결은 9번 자체가 아직 placeholder라 보류 — `edit=<roundId>` 파라미터 처리 자체는 이미 구현해뒀으므로 9번 구현 시 버튼만 연결하면 됨.
- **문서 갱신**: `doc/pages.md` 7번 섹션에 "실제 구현 설계 변경" 문단 추가 + 파라미터명 갱신, `doc/개발리스트.md` 7-1/7-2 표 전체 ⬜→✅(날씨 스냅샷만 ⬜ 유지).
- **검증**: `npx tsc --noEmit` EXIT_CODE=0. 로컬 DB 접근 불가로 실제 저장/조회 동작(특히 홀 저장 후 다음 홀 이동, 수정모드 복원)은 미검증.

### 다음 세션 시작 시

- 사용자가 로컬에서 7-1/7-2 화면 실제 동작 확인: 골프장 선택→9H/18H→루프 선택→날짜→스코어 카드 이동, 홀 저장 시 Round/HoleScore가 실제 DB에 쌓이는지, "라운드 상세" 버튼이 실제 roundId로 이동하는지, `?step=2&edit=<roundId>`로 직접 접속했을 때 기존 입력값이 그대로 복원되는지. 문제없이 확인되면 1~14번 전 화면이 실제 구현 완료 상태 — 다음으로는 8번(스코어 조회 목록)/9번(라운드 상세, 현재 placeholder) 중 남은 화면이 있는지 재점검하거나 기상청 API 연동 등 "미착수" 항목 착수 여부를 사용자에게 확인.

## 72. 9번 라운드 상세 화면 실제 구현 (2026-07-21)

- 사용자 요청: "라운드 상세 화면 개발 진행." — 8번(스코어 조회 목록)은 아직 placeholder지만, 06번 골프장 상세("내 라운드 이력" 리스트)와 7-2번("라운드 상세" 버튼)이 이미 실제 `roundId`로 `/rounds/[id]`를 링크해두고 있어서 9번을 먼저 구현해도 진입 경로가 이미 존재.
- **설계 변경(가장 중요)**: 목업은 8번에서 `course`/`date`/`score`/`weather`/`ownerId`/`owner`를 URL 쿼리로 넘겨받아 화면을 구성하고 홀별 상세는 항상 동일한 예시 데이터를 썼다. 실제 구현은 URL의 `roundId` 하나만으로 서버 컴포넌트가 `Round`+`HoleScore`+`GolfCourse`+`User`를 직접 조회 — 쿼리 파라미터 자체가 필요 없어짐.
- **신규 파일**:
  - `app/src/app/api/rounds/[id]/route.ts`(DELETE): 본인 소유 라운드만 삭제 허용, `HoleScore`는 `onDelete: Cascade`로 함께 삭제.
  - `app/src/components/RoundDetailMatrix.tsx`(클라이언트): 범례 바 + 전반/후반 매트릭스 카드(홀/파/스코어/티샷/특이사항/퍼트/메모 7개 행). GIR = `onGreenStrokes <= par-2`, 스크램블링 = GIR 실패 홀에서 `strokes <= par`, 샌드세이브 = `bunkerUsed` 홀에서 `strokes <= par`(성공/실패)로 화면에서 파생 계산(DB에 별도 컬럼 없음, pages.md 설계 그대로). 스코어 언더파/오버파는 동그라미(버디)/이중동그라미(이글 이하)/네모(보기)/이중네모(더블보기 이상)로 표시. 메모가 있는 홀의 📝 아이콘 클릭 시 표 아래 패널에 표시(React state로 처리, 목업의 DOM 직접조작 방식을 React화).
  - `app/src/components/RoundActions.tsx`(클라이언트): 본인 라운드면 "수정"(`/rounds/new?step=2&edit=<roundId>`로 7-2 재사용) + "삭제"(확인창 → DELETE API → `/rounds`로 이동) 버튼, 타인 라운드면 읽기 전용 안내문.
  - `app/src/app/rounds/[id]/page.tsx`(placeholder → 실구현): 세션 확인 후 라운드 조회, `isOwner`/`canView`(소유자 `thirdPartyConsent`) 판정. **동의하지 않은 회원의 라운드에 본인이 아닌 사용자가 URL로 직접 접근하면 404 처리**(목업엔 없던 방어 로직 — 존재 여부 자체를 노출하지 않기 위함). `holesPlayed` 길이만큼 홀 배열을 구성하되, 아직 저장 안 된 홀은 `frontLoop`/`backLoop`의 `GolfCourseHole.par`를 fallback으로 채우고 스코어는 "-"로 표시(라운드 진행 중에 상세를 열어봐도 자연스럽게 보이도록).
- **범위에서 제외한 것**: 날씨 표시는 `Round.weatherSnapshot`이 항상 null이라(기상청 API 미착수) "날씨 정보 없음"만 표시. 8번(스코어 조회 목록)은 여전히 placeholder — "뒤로" 버튼이 가리키는 `/rounds`가 아직 목록 기능은 없음.
- **문서 갱신**: `doc/pages.md` 9번 섹션 진입 파라미터/화면 이동 문단 갱신, `doc/개발리스트.md` 9번 표 전체 ⬜→✅ + 실제 구현 설계 변경 경고 블록 추가.
- **검증**: `npx tsc --noEmit` EXIT_CODE=0. 로컬 DB 접근 불가로 실제 매트릭스 렌더링(특히 GIR/스크램블링/샌드세이브 표시, 메모 패널, 삭제 후 리다이렉트)은 미검증.

### 다음 세션 시작 시

- 사용자가 로컬에서 9번 화면 확인: 06번 "내 라운드 이력"이나 7-2번 "라운드 상세" 버튼으로 진입해 실제 저장된 홀 스코어가 매트릭스로 잘 보이는지, 메모 아이콘 클릭 동작, "수정" 버튼이 7-2 수정모드로 정확히 이어지는지, "삭제" 버튼 동작(삭제 후 `/rounds`로 이동은 되지만 8번 자체가 아직 placeholder라 빈 화면일 수 있음 — 정상). 이후 남은 미구현 화면은 8번(스코어 조회 목록)뿐 — 이걸로 1~14번 전 화면이 완료된다.

## 73. 출발 시간(Starting Time) 필드 실구현 + 중복 라운드 등록 방지 (2026-07-21)

- 사용자 요청 흐름: (1) "스코어 등록 step1 화면에 라운드 일자 다음에 Starting Time 추가, 형식은 시간과 분까지만. 목업만 수정해서 알려줘." → 목업(`07-round-new-step1.html`)에 네이티브 `<input type=time>`으로 추가. (2) "출발시간 시간 항목 오전 오후로 입력하려면 01~12까지만 선택가능 해야 하는데 숫자가 반복적으로 표시됨." → 네이티브 time input이 브라우저/OS 로캘에 따라 24시간제로 뜨거나 스피너 숫자가 이상하게 표시되는 문제라, 오전/오후 토글 + 시(01~12) select + 분(00~59) select로 직접 조합하는 커스텀 피커로 목업 교체. (3) "동일한 코스에 일자/시간이 같은 스코어가 이미 등록되어 있으며 메세지 처리하고 입력 안되게 로직 구성해줘." → 이번엔 "목업만" 단서가 없어 실제 구현까지 진행. 이 3번째 요청이 "일자/시간이 같은"을 요구하므로, 그동안 목업에만 있던 출발 시간을 실제 스키마/화면에도 반영하는 게 선행되어야 했음.
- **스키마 변경**: `Round.startTime String?` 추가("HH:MM" 24시간제 문자열, nullable — 기존 라운드는 null). 마이그레이션 `app/prisma/migrations/20260721090000_add_round_start_time/migration.sql`(`ALTER TABLE "Round" ADD COLUMN "startTime" TEXT;`) 직접 작성(샌드박스가 로컬 DB에 접근 못해 `prisma migrate dev` 실행 불가, 기존 마이그레이션 파일 포맷을 그대로 따라 수기 작성).
- **신규 파일**:
  - `app/src/lib/round-duplicate.ts`: `findDuplicateRound({userId, golfCourseId, playedAt, startTime})` — 동일 조건 라운드 조회 공용 함수, `DUPLICATE_ROUND_MESSAGE` 공용 에러 문구.
  - `app/src/app/api/rounds/check-duplicate/route.ts`(GET): Step1에서 "스코어 카드" 클릭 시 사전 확인용. `{duplicate, message}` 반환.
- **변경 파일**:
  - `app/src/app/api/rounds/route.ts`(POST): `startTime` 필드 검증("HH:MM" 정규식) 추가, `Round` 생성 직전 `findDuplicateRound`로 최종 재확인 후 있으면 409 + 메시지 반환(최종 방어선 — check-duplicate를 우회해도 여기서 막힘).
  - `app/src/components/RoundStep1.tsx`: 목업과 동일한 오전/오후 토글 + 시(01~12)/분(00~59) select 커스텀 피커 추가. "스코어 카드" 클릭 시 `goNext()`가 먼저 `GET /api/rounds/check-duplicate` 호출 → 중복이면 버튼 아래 빨간 안내 문구 표시하고 Step2로 이동 자체를 막음(중복 아니면 `startTime`을 24시간제로 변환해 쿼리에 포함시켜 이동). 날짜/시간/골프장 중 하나라도 바꾸면 이전 중복 안내는 자동으로 지움.
  - `app/src/components/RoundStep2.tsx`: `startTime` prop 추가 → 첫 홀 저장 시 `POST /api/rounds` 바디에 포함. 상단 정보 바에 `· 오전 09:00 출발` 형식으로 표시(`startTimeLabel()` 헬퍼).
  - `app/src/app/rounds/new/page.tsx`: 신규 모드는 `?startTime=` 쿼리 파싱해 전달, 수정 모드는 `round.startTime`을 그대로 전달.
  - `app/src/app/rounds/[id]/page.tsx`(9번): 요약 카드 메타 줄에 `startTime`이 있으면 "오전/오후 HH:MM 출발"을 날짜와 날씨 사이에 추가 표시.
- **중요한 환경 제약**: 샌드박스에서 `npx prisma generate`가 `node_modules/.prisma/client` 파일 잠금(`EPERM: operation not permitted, unlink ...`) 때문에 10회 넘게 재시도해도 계속 실패 — git의 `index.lock`과 비슷하지만 이쪽은 한 번도 성공하지 못함. 그 결과 `npx tsc --noEmit`에서 `startTime` 관련 타입 에러 5건이 발생하는데, 전부 "생성된 Prisma 타입에 아직 `startTime`이 없다"는 동일한 원인이고 나머지 로직 에러는 없음(스키마와 코드 자체는 일치). **로컬에서 `git pull` → `npx prisma migrate deploy`(또는 `dev`) → `npx prisma generate` 실행하면 해소되어야 함.**
- **문서 갱신**: `doc/개발리스트.md` 7-1에 "로컬 반영 필요" 경고 블록(마이그레이션+generate 안내) 추가, 출발 시간/중복 검증 행 ✅ 반영. `doc/pages.md` 7-1 섹션에 출발 시간 피커·중복 검증 설명 추가.
- **검증**: `npx tsc --noEmit`은 위에서 설명한 5건(전부 동일 원인)을 제외하고 클린. 로컬 DB 접근 불가로 실제 중복 등록 차단 동작과 마이그레이션 적용은 미검증 — 사용자가 로컬에서 확인 필요.

**후속 확인(2026-07-21, 같은 날)**: 사용자가 로컬에서 `git pull` + `npx prisma migrate deploy` + `npx prisma generate` 전부 실행 완료. 샌드박스에서 재확인한 결과 `npx tsc --noEmit` EXIT_CODE=0(클린), `node_modules/.prisma/client/index.d.ts`에 `startTime` 반영 확인(마운트 폴더라 로컬에서 생성한 결과가 샌드박스에도 바로 보임). `doc/개발리스트.md`의 "로컬 반영 필요" 경고 블록은 제거하고 완료 안내로 교체.

### 다음 세션 시작 시

- 타입 체크는 끝났으니, 사용자가 로컬에서 실제 동작 확인: 7-1에서 출발 시간 오전/오후+시+분 선택, 같은 골프장·일자·시간으로 두 번째 스코어 등록 시도 시 안내 메시지가 뜨고 Step2로 못 넘어가는지, 9번 라운드 상세 요약 카드에 출발 시간이 잘 보이는지. 그 외 남은 미구현 화면은 여전히 8번(스코어 조회 목록)뿐.

## 74. 라운드 리스트(대시보드/골프장 상세)에 출발시간 표시 추가 (2026-07-22)

- 사용자 요청: "지난번에 추가한 시작시간 정보를 라운드 리스트 보여주는 부분에 일자와 같이 보여줬으면 해." — 73번에서 `Round.startTime`을 9번(라운드 상세) 요약 카드에는 반영했지만, 목록형 화면(4번 대시보드 "최근 라운드", 06번 골프장 상세 "내 라운드 이력")에는 반영이 빠져있었음.
- **신규 파일**: `app/src/lib/round-format.ts` — `formatRoundDateLabel(playedAt)`("YYYY.MM.DD"), `formatStartTimeLabel(startTime)`("오전 09:00" 형식, suffix 없음), `formatRoundDateTimeLabel(playedAt, startTime)`(둘을 " · "로 결합, startTime 없으면 날짜만) 3개 함수로 날짜/시간 포맷 로직을 공용화. 기존에 9번 화면(`rounds/[id]/page.tsx`)에 인라인으로 있던 오전/오후 변환 로직과 동일한 규칙(0시→12시, 13~23시→1~11시 오후)을 그대로 옮김.
- **변경 파일**:
  - `app/src/app/dashboard/page.tsx`(4번): `RoundListItem`의 `sub`를 `round.playedAt.toISOString()...` 인라인 포맷 대신 `formatRoundDateTimeLabel(round.playedAt, round.startTime)` 호출로 교체 → "2026.07.21 · 오전 09:00" 형식으로 표시(출발시간 없으면 날짜만).
  - `app/src/app/courses/[id]/page.tsx`(06번): `RoundListItem`의 `title`(기존엔 날짜만 표시)도 동일하게 `formatRoundDateTimeLabel`로 교체.
  - `app/src/app/rounds/[id]/page.tsx`(9번): 인라인 `startTimeLabel` 계산 로직을 제거하고 신설한 `formatRoundDateLabel`/`formatStartTimeLabel`을 import해 사용하도록 리팩터링(표시 문구는 기존과 동일하게 " 출발" suffix 유지, 동작 변경 없음 — 중복 로직 제거 목적).
- **검증**: `npx tsc --noEmit` EXIT_CODE=0(클린). 로컬 DB 접근 불가로 실제 화면 렌더링은 미검증 — 사용자가 로컬에서 대시보드 "최근 라운드"와 골프장 상세 "내 라운드 이력"에 날짜 옆 출발시간이 잘 보이는지 확인 필요(출발시간 없는 과거 라운드는 날짜만 나오는 게 정상).
- **문서 갱신**: `doc/개발리스트.md` 4번(대시보드)·6번(골프장 상세) 표에 출발시간 반영 사실 갱신.

### 다음 세션 시작 시

- 사용자가 로컬에서 확인: 대시보드 최근 라운드 목록과 골프장 상세 라운드 이력에 날짜 옆 출발시간이 정상 표시되는지(출발시간 없는 라운드는 날짜만). 문제없으면 다음 작업 후보는 8번(스코어 조회 목록) 실구현 착수.

## 75. 로컬 DB 접근 환경 논의 + 8번 스코어 조회 목록 실구현 (2026-07-22)

**로컬 DB 접근 관련 논의(구현 아님)**: 사용자가 "샌드박스에서 로컬 DB 접근 가능하게 하려면?" 질문 → 이 세션의 리눅스 샌드박스는 사용자 PC와 분리된 격리 환경이라 `.env`의 `DATABASE_URL=...@localhost:5432/...`에 애초에 도달 불가함을 실측 확인(아웃바운드 테스트 결과 `github.com`은 200, `neon.tech`/`supabase.com`/`google.com`/`api.github.com` 등은 전부 실패 — 매우 제한적인 allowlist). 후속 질문 "Docker 대신 네이티브 설치하면?"에도 동일하게 안 됨을 답변(Docker/네이티브 여부와 무관하게 "사용자 PC의 localhost"는 샌드박스 입장에서 도달 불가능한 별개 네트워크). **결론**: 클라우드 DB 전환도 지금 당장은 네트워크 허용 목록에 막혀 있어 대안이 못 됨 — 기존 방식(스키마/코드는 여기서, 실제 DB 동작 검증은 사용자가 로컬에서) 유지로 확정.

**8번 스코어 조회 목록 실구현** — `doc/pages.md`/`doc/개발리스트.md` 8번 스펙(기간 range·골프장 select·내 기록만/전체 회원 세그먼트·검색/초기화·전체 건수·빈 상태 2종) 기준으로 구현. 이로써 사용자 화면 10개(1~10번) 전부 실구현 완료.
- **신규 파일**: `app/src/components/RoundSearchList.tsx`(클라이언트) — `AdminUserGrid.tsx`(14번 회원관리)의 "draft input → 검색 버튼으로 applied filter에 반영" 패턴을 그대로 재사용해 기간(from/to)·골프장을 검색 버튼으로 적용하고, 사용자범위(내 기록만/전체 회원)만 스펙대로 버튼 클릭 즉시 반영. 빈 상태는 "내 기록만 모드 + 필터 없음 + 실제 라운드 0건"일 때만 "아직 등록된 라운드가 없어요" 안내, 그 외 0건은 전부 "조건에 맞는 라운드가 없습니다"로 통일(스펙의 두 빈 상태를 이 기준으로 명확화 — 스펙 원문은 두 상태의 구분 기준이 모호했음).
- **변경 파일**: `app/src/app/rounds/page.tsx`(placeholder → 실구현) — 별도 `GET /api/rounds` API를 새로 만들지 않고, 다른 화면들과 동일하게 서버 컴포넌트에서 Prisma 직접 조회. `where: { OR: [{userId}, {user:{thirdPartyConsent:true}}] }` 한 번의 쿼리로 "내 기록만"/"전체 회원" 두 모드가 필요로 하는 데이터를 전부 커버하고(본인 라운드는 동의 여부 무관하게 항상 포함), scope 전환은 클라이언트에서 이 결과를 필터링만 하도록 설계(05번 `CourseSearchList`와 동일한 "서버가 넉넉히 내려주고 클라이언트가 필터링" 패턴).
- **설계 변경(목업/`pages.md` 대비)**:
  1. 리스트 항목 클릭 시 9번으로 `course`/`date`/`score`/`weather`/`ownerId`/`owner` 쿼리를 넘기던 목업 방식 대신, 9번이 이미 `roundId` 하나로 직접 조회하도록 바뀌어 있어(72번 항목) `/rounds/[id]` 단순 링크로 구현.
  2. 골프장 select 옵션을 전체 골프장(~650건, 05번 데이터)이 아니라 "조회 가능한(본인+동의회원) 라운드가 실제로 걸린 골프장"만으로 좁힘 — 리스트를 실용적인 길이로 유지하기 위한 설계 판단.
  3. 라운드 리스트에 74번에서 만든 `formatRoundDateTimeLabel`을 그대로 재사용해 날짜 옆 출발시간도 함께 표시(스펙엔 없던 항목이지만 73/74번 작업과 일관성을 위해 포함).
- **문서 갱신**: `doc/개발리스트.md` 8번 표 전체 ⬜→✅ + 실제 구현 설계 변경 안내 블록 추가, `doc/pages.md` 8번 섹션에 실제 구현(2026-07-22) 문단 추가.
- **검증**: `npx tsc --noEmit` EXIT_CODE=0(클린). 로컬 DB 접근 불가로 실제 필터 동작·빈 상태·전체 회원 모드 데이터 노출 범위는 미검증 — 사용자가 로컬에서 확인 필요.

### 다음 세션 시작 시

- 사용자가 로컬에서 8번 화면 확인: 기간/골프장 필터가 검색 버튼으로 정상 적용되는지, 사용자범위 전환이 즉시 반영되는지, 전체 회원 모드에서 동의하지 않은 회원 데이터가 보이지 않는지, 리스트 항목 클릭 시 9번으로 정상 이동하는지. 문제없으면 사용자 화면 10개 전부 완료 확정 — 다음 작업은 관리자 화면 4개(11~14번) 실구현 착수 여부를 사용자에게 확인.

## 76. "관리자 화면도 개발 완료 상태" 정정 — memory.md 가이드 오류 수정 (2026-07-22)

- 사용자 지적: "관리자 화면도 개발 완료 상태임. 확인해봐." — 직전에 내가 쓴 0번 가이드/75번 항목이 "관리자 화면 4개는 설계만 되어있고 구현 착수 전"이라고 잘못 적었던 것에 대한 정정 요청.
- **원인**: 이번 세션에서 8번(스코어 조회) 작업을 시작할 때 memory.md를 처음부터 끝까지 읽지 않고 키워드 검색("시작시간")과 파일 끝부분만 확인한 뒤 0번 가이드를 다시 썼는데, 마침 파일 끝부분(72~75번)이 최근 사용자 화면 작업 위주라 관리자 관련 언급이 없었던 것을 "관리자는 안 됐다"로 성급히 일반화함. 실제로는 50/52/62/63/64/65/66/67/68번 항목(모두 2026-07-20~21)에 11~14번 관리자 화면 실구현 이력이 상세히 기록되어 있었음 — 안 읽고 지나쳤을 뿐.
- **검증(이번에 재확인)**: `find app/src/app -path '*admin*'` → 4개 페이지(`admin/golf-courses`, `admin/golf-courses/[id]/par`, `admin/golf-courses/upload`, `admin/users`) + 관련 API 라우트 7개 전부 실존, placeholder 문구 없음. `git log`로 실제 구현 커밋 확인(`85bc279`~`27ed6ab`, 2026-07-20~21). `doc/개발리스트.md`는 애초에 11~14번 섹션 전부 "실제 구현 완료"로 정확하게 기록돼 있었음(이 파일은 문제없었음, memory.md 가이드만 틀렸던 것).
- **부수 발견 및 정정**: `doc/개발리스트.md`의 "0. 기반 작업 현황" 표 2곳도 이후 작업으로 이미 해소됐는데 갱신이 안 되어 있어 함께 정정: (1) "보호 라우트 미들웨어" 행의 "AdminGuard는 추가 예정" 문구 → 실제로는 미들웨어(JWT role 체크) + 각 관리자 페이지 세션 체크의 이중 구조로 이미 완료. (2) "골프장 공공데이터 연동" 행 ⬜ → 11번의 실시간 API 동기화(`POST /api/admin/golf-courses/sync`)로 이미 ✅.
- **결론**: 14개 화면(사용자 10 + 관리자 4) 전부 실구현 완료 상태가 맞음. 재작업 불필요.
- **재발 방지**: 0번 가이드에 "새 세션에서는 요약만 믿지 말고 의심되면 8~76번 본문/git log/코드로 재검증" 문구 추가.

## 77. 기상청 단기예보 API 연동 (2026-07-22)

- 사용자 요청: "기상청 날씨 api 연동부터 진행해." — 남은 화면 밖 작업 중 첫 번째로 지정.
- **사전 확인**: `.env`에 `WEATHER_API_KEY=""`(빈 값)가 이미 자리만 잡혀 있었음(초기 세팅 때 미리 만들어둔 것으로 추정) — 실제 키는 아직 미발급. `PUBLIC_DATA_API_KEY`(골프장 데이터용)와는 별개 서비스라 data.go.kr에서 "기상청_단기예보 조회서비스" 활용신청을 별도로 해야 함.
- **API 스펙 확인**: WebSearch + `data.go.kr/data/15084084/openapi.do` 직접 fetch로 재검증(11번 골프장 API 때 "파일데이터인 줄 알았는데 실시간 API였다"는 착오가 있었던 선례가 있어, 추측 대신 실제 공식 페이지를 확인). 서비스 URL `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/`, 단기예보 조회는 `getVilageFcst`, 파라미터 serviceKey/pageNo/numOfRows/dataType/base_date/base_time/nx/ny. 발표시각은 02/05/08/11/14/17/20/23시(3시간 간격, KST), 예보 제공 범위는 오늘~글피(+3일)까지.
- **신규 파일**:
  - `app/src/lib/weather/grid.ts`: 기상청 공식 LCC(Lambert Conformal Conic) 격자변환 공식/상수를 그대로 옮긴 `latLngToGrid(lat,lng) -> {nx,ny}`. proj4 등 별도 라이브러리 없이 삼각함수 계산만으로 처리(골프장 좌표 TM→WGS84 변환에 쓰는 `lib/geo.ts`의 proj4와는 무관한 별개 로직).
  - `app/src/lib/weather/kma.ts`: `getLatestBaseDateTime()`(현재 KST 기준 가장 최근 발표시각 계산, 발표 후 10분 반영 지연 고려), `isWithinForecastRange()`(대상 날짜가 오늘~+3일인지), `getWeatherSnapshot({lat,lng,targetDate,targetTimeHHMM})`(격자변환→API 호출→대상 날짜의 SKY/PTY/TMP 파싱→"☀️ 맑음 24°C" 형태 라벨 문자열 조합, 실패 시 전부 null). **타임존 이슈에 신경 씀**: 발표시각 스케줄이 KST 기준인데 배포 서버 프로세스의 로컬 타임존이 UTC일 수 있어(Vercel 등 흔한 케이스), 모든 "지금"/"오늘" 계산을 UTC+9로 명시 변환한 뒤 `getUTC*()` 게터로만 읽도록 구현 — 로컬 타임존에 의존하는 버그를 원천 차단. 순수 날짜 계산 로직이라 별도 node 스크립트로 5가지 경계 케이스(자정 직후, 발표 직후 10분 이내 등)를 직접 실행해 검증 완료(샌드박스에서 실제 API 키 없이도 이 부분은 확정적으로 확인 가능했음).
  - `app/src/app/api/weather/preview/route.ts`(GET): 7-1 화면의 "라운드 당시 날씨" 카드용 조회 전용 엔드포인트. `courseId`+`date`+`time`으로 골프장 좌표 조회 후 `getWeatherSnapshot` 호출.
- **변경 파일**:
  - `app/src/components/RoundStep1.tsx`: 기존에 있던 정적 "날씨 연동 준비 중" 카드를 실제 호출로 교체. `courseId`/`date`/`ampm`/`hour`/`minute` 변경 시 400ms 디바운스 후 `/api/weather/preview` 재조회, 로딩/라벨/미제공 3가지 상태 표시.
  - `app/src/app/api/rounds/route.ts`(POST): Round 생성 직전 골프장 좌표+`playedAt`+`startTime`으로 `getWeatherSnapshot`을 한 번 더 호출해 `weatherSnapshot` 컬럼에 고정 저장(이후 실제 날씨가 바뀌어도 등록 당시 예보 그대로 유지하는 게 원래 스키마 의도). 좌표 없음/예보 범위 밖/API 실패는 전부 null로 자연스럽게 귀결(fail-soft, 라운드 생성 자체는 막지 않음).
- **설계 결정**: `weatherSnapshot`은 스키마 주석상 "JSON 텍스트로 저장" 의도였지만, 9번/8번 화면이 이미 이 필드를 가공 없이 그대로 표시하는 문자열로 다루고 있어서(`round.weatherSnapshot ?? "날씨 정보 없음"`) 굳이 JSON으로 감싸지 않고 완성된 라벨 문자열("☀️ 맑음 24°C")을 그대로 저장하는 쪽으로 단순화. 향후 온도/강수확률 등을 분리 표시할 일이 생기면 그때 JSON 구조로 바꾸는 게 낫다고 판단(현재 소비하는 쪽이 전부 단일 문자열이라 지금 JSON화하는 건 과설계).
- **한계**: 단기예보 API 특성상 과거 날짜(이미 지난 라운드를 나중에 등록하는 경우가 흔함)나 오늘+4일 이후는 애초에 예보가 없어 `weatherSnapshot`이 계속 null로 남는 게 정상 — "요즘 등록한 라운드인데도 날씨가 안 보인다"는 문의가 오면 이 범위 제약부터 확인.
- **문서 갱신**: `doc/개발리스트.md` 7-1/7-2/9번 표 갱신 + "0. 기반 작업 현황"의 "기상청 단기예보 API 연동" 행 ⬜→✅, `doc/pages.md` 7-1 섹션에 실제 구현 문단 추가.
- **검증**: `npx tsc --noEmit` EXIT_CODE=0(클린). 날짜/시간 계산 로직은 순수 함수라 node로 직접 실행해 KST 경계 케이스 5건 검증 완료. **API 실호출은 미검증** — `WEATHER_API_KEY`가 비어있어 이 상태로는 항상 "날씨 정보 없음"만 나오고(에러 아님, 의도된 fail-soft), 로컬 DB 접근도 안 되니 실제 예보 데이터 파싱은 사용자가 키 발급 후 로컬에서 확인해야 함.

### 다음 세션 시작 시

- **사용자가 먼저 할 일**: data.go.kr에서 "기상청_단기예보 조회서비스"(또는 "기상청 API허브 연계" 버전) 활용신청 → 발급받은 키를 `app/.env`의 `WEATHER_API_KEY`에 입력 → 로컬에서 7-1 화면 열어 골프장/오늘 날짜 선택 시 "라운드 당시 날씨" 카드에 실제 날씨가 뜨는지 확인, 라운드 하나 등록해 9번 상세/8번 목록에 날씨가 잘 붙는지도 확인. 안 뜨면 nx/ny 격자값이나 base_date/time 계산이 실제 API 응답과 안 맞을 수 있어 디버깅 필요(그때 실제 응답 JSON을 공유해주면 원인 파악이 빠름).
- 그 외 남은 화면 밖 작업(README 동기화/좌표 지오코딩/카카오 로그인 테스트)은 계속 사용자 지정 대기.

## 78. 기상청 API 실사용 검증 + 간헐적 실패 대응 재시도 로직 추가 (2026-07-22)

- 사용자가 `WEATHER_API_KEY` 발급을 마치고 로컬에서 `GET /api/weather/preview`를 4회 직접 호출해 결과 공유:
  1. `cmrsy6lx10077a4u3l8cvshz1`, 2026-07-22 09:00 → `{"available":true,"label":"☁️ 흐림 25°C"}` — **정상 동작 확인**.
  2. 좌표 없는 다른 골프장(`cmrsy6tsv00eza4u37howvyvh`) → `reason: "course_no_coordinates"` — 의도한 대로 정확히 구분됨.
  3. 1번과 동일 호출인데 `reason: "api_call_failed_or_no_data"` — 1회성 실패.
  4. 곧이어 같은 호출 재시도 → 다시 `{"available":true,"label":"☁️ 흐림 29°C"}` 성공.
  - 즉 좌표/키/범위 판정 로직은 전부 의도대로 정확히 동작. 3번만 data.go.kr 쪽의 일시적 오류/빈 응답으로 추정(재시도 시 바로 복구된 것으로 보아 코드 버그보다는 실제 공공 API의 간헐적 불안정성일 가능성이 높음).
- **대응**: `lib/weather/kma.ts`의 `fetchForecastItems`에 1회 재시도 추가(실패 시 500ms 대기 후 한 번 더 호출, 그래도 실패하면 포기) + 실패 사유를 `console.warn`으로 로그(HTTP 상태코드 또는 `resultCode` 또는 예외 메시지) — 이전엔 실패 원인이 조용히 사라져서(전부 catch → []) 디버깅하려면 매번 preview API를 반복 호출해야 했는데, 이제 서버 로그만 봐도 원인이 남는다.
- **검증**: `npx tsc --noEmit` EXIT_CODE=0. 재시도 로직 자체는 실제 API 재호출을 동반해 샌드박스에서 재현 검증은 못 했지만, 로직은 단순(실패 시 1회 재시도)해 리스크 낮다고 판단.
- **결론**: 기상청 날씨 API 연동은 실사용 검증까지 완료된 상태. 화면 밖 남은 작업은 README 동기화/좌표 지오코딩/카카오 로그인 테스트/하이원CC Par 자료 정도.

### 다음 세션 시작 시

- 사용자가 로컬에서 7-1/9번/8번 화면에 날씨가 실제로 잘 붙어 보이는지 최종 확인(API 응답 자체는 이미 검증됐으니 화면 표시만 확인하면 됨). 그 외 남은 화면 밖 작업 중 다음에 진행할 항목을 사용자가 지정.

## 79. 좌표 지오코딩 배치 구현 (2026-07-22)

- 사용자 질문: "좌표 지오코딩은 현재 적용 안되있어?" → 확인 결과 TM→WGS84 "변환"(공공데이터에 원본 좌표가 있는 경우)만 되어 있고, 원본 좌표 자체가 없는 골프장을 주소로 "검색"해서 채우는 지오코딩은 `needsGeocoding=true`로 표시만 해두고 실제 구현은 안 돼 있었음(11번 sync 라우트 주석에 "후속 과제"로 명시돼 있던 부분) → 사용자가 "진행해" 요청.
- **API 선택**: 카카오 로컬 API(`GET https://dapi.kakao.com/v2/local/search/address.json`) 채택 — 무료, REST API 키 하나로 바로 사용 가능, 한국 주소 커버리지가 좋음. WebSearch + 공식 문서로 응답 필드(`documents[].x`=경도, `y`=위도 — 순서가 헷갈리기 쉬워 특히 확인) 재검증.
- **중요 발견**: `.env`를 다시 보니 `KAKAO_CLIENT_ID`/`KAKAO_CLIENT_SECRET`이 둘 다 빈 값이었음(로그인용 카카오 앱이 아직 전혀 등록 안 된 상태) — 기존에 "카카오 로그인 키를 재사용하면 되지 않을까" 생각했던 전제가 틀렸음을 확인하고, 완전히 별도인 `KAKAO_REST_API_KEY`를 신규 env로 추가(로그인 앱 등록 여부와 무관하게 발급 가능한 키라 카카오 로그인 미완료 상태와는 독립적으로 진행 가능).
- **신규 파일**:
  - `app/src/lib/geocoding/kakao.ts`: `geocodeAddress(address) -> {lat,lng}|null`. 키 미설정/검색결과 없음/네트워크 실패 전부 null(fail-soft), 8초 타임아웃.
  - `app/src/app/api/admin/golf-courses/geocode/route.ts`(POST): `requireAdminSession()`으로 관리자 인증 → `needsGeocoding=true`인 골프장 조회 → 주소 있는 것만 최대 150건(`BATCH_LIMIT`, 서버리스 실행시간 대비 안전장치) 순차 처리(호출 간 150ms 간격으로 카카오 API 순간 QPS 제한 방지) → 성공 시 `latitude/longitude` 채우고 `needsGeocoding=false`로 갱신. 150건 넘게 남으면 `remainingCount`로 안내하고 버튼 재클릭으로 이어서 처리(별도 진행 상태 저장 없이 `needsGeocoding` 플래그 자체가 진행 상태 역할). 주소 자체가 없는 골프장(`address` null)은 애초에 대상에서 제외하고 `noAddressCount`로 안내.
  - `app/src/components/GeocodeBatchCard.tsx`(클라이언트): 11번 화면의 `PublicDataSyncCard`(공공데이터 업로드 카드)와 동일한 UI 패턴(카드+버튼+토스트)으로 통일. 처리 대상이 0건(성공+주소없음 전부 소진)이면 카드 자체를 숨김.
- **변경 파일**: `app/src/app/admin/golf-courses/page.tsx`(11번) — `needsGeocoding=true` 개수를 서버에서 세어 `GeocodeBatchCard`에 전달, `PublicDataSyncCard` 바로 아래 배치. `app/.env`에 `KAKAO_REST_API_KEY=""` 플레이스홀더 추가(빈 값, 기존 `WEATHER_API_KEY` 처음 세팅 때와 동일한 패턴).
- **실수/수정**: Edit 도구로 11번 페이지에 카드 삽입하면서 바로 아래 있던 `<a href="/admin/golf-courses/upload">...` 태그의 `<a`를 실수로 `<`로 잘라먹은 오타 발생 → 저장 직후 파일을 다시 읽어 확인하는 과정에서 발견, 즉시 수정하고 재검증(이 프로젝트에서 하도 여러 번 파일 손상을 겪어서 습관적으로 저장 후 바로 재확인하는 게 실제로 도움이 된 사례).
- **문서 갱신**: `doc/개발리스트.md` "0. 기반 작업 현황"의 "좌표 결측 지오코딩 배치" 행 ⬜→✅, 11번 섹션에 신규 행 추가.
- **검증**: `npx tsc --noEmit` EXIT_CODE=0(클린). `KAKAO_REST_API_KEY`가 비어있어 실제 지오코딩 호출은 미검증 — 사용자가 로컬에서 카카오 REST API 키 발급 후 11번 화면에서 "실행" 버튼으로 확인 필요.

### 다음 세션 시작 시

- 사용자가 먼저 할 일: Kakao Developers에서 앱 하나 만들고(로그인 설정 없이 그냥 앱 등록만 해도 REST API 키는 발급됨) REST API 키를 `app/.env`의 `KAKAO_REST_API_KEY`에 입력 → 로컬에서 11번(골프장 Par 관리) 화면 열어 "좌표 지오코딩 실행" 버튼 클릭 → 성공/실패 건수와 "위치 확인 중" 골프장이 실제로 줄어드는지 확인. 그 외 남은 화면 밖 작업(README 동기화/카카오 로그인 테스트/하이원CC 자료)은 계속 사용자 지정 대기.

## 80. 지오코딩 안 됨 디버깅 중 tsconfig strict:false discriminated union 버그 발견 (2026-07-22)

- 사용자 보고: "rest api키 입력했는데 작동 좌표값이 업데이트 안되는 것 같음." — 원인 파악을 위해 `lib/geocoding/kakao.ts`/API 라우트에 실패 사유(reason)를 반환하도록 진단 정보를 보강하려다, `{ok:true,...}|{ok:false,reason}` 형태의 판별 유니언(discriminated union)을 쓴 코드에서 `npx tsc --noEmit`이 "Property 'reason' does not exist" 에러를 냄.
- **원인 규명**: `/tmp`에 최소 재현 코드를 만들어 격리 테스트한 결과, 이 프로젝트 `tsconfig.json`의 `"strict": false`(→ `strictNullChecks`도 꺼짐) 때문에 **boolean 리터럴 판별자(`ok: true`/`ok: false`) 기반 유니언이 `if/else`에서 제대로 좁혀지지(narrowing) 않는 TypeScript 동작**임을 확인(`--strict` 붙이면 정상, 빼면 항상 재현). 79번에서 만든 `kma.ts`의 `FetchResult`는 우연히 `"items" in result`(in 연산자 판별)를 썼던 덕에 이 문제를 안 겪었던 것.
- **수정**: `GeocodeResult` 타입을 `{lat,lng} | {reason}`으로 바꾸고 `if ("lat" in result)`로 판별하도록 전면 수정(kma.ts와 동일 스타일로 통일). `npx tsc --noEmit` EXIT_CODE=0 재확인.
- **진단 기능 보강(원래 목적)**: `geocodeAddress()`가 실패 사유를 구체적으로 반환하도록 개선 — 키 미설정/401 인증실패(REST API 키가 아닌 다른 키를 넣은 경우 등)/HTTP 에러/검색결과 없음/네트워크 실패를 구분. 특히 **401이 첫 건부터 나오면 배치를 조기 중단**하고 이유를 명확히 보여줌(키 자체가 잘못됐으면 나머지 건들도 다 실패할 게 뻔하므로). `GeocodeBatchCard.tsx`도 이 정보를 토스트/에러 메시지로 그대로 노출하도록 갱신.
- **향후 지침(중요)**: 이 프로젝트에서 `{ok:true}|{ok:false}` 같은 boolean 판별자 유니언은 쓰지 말 것 — 항상 `"필드명" in 값` 형태로 판별 가능하게 타입을 설계할 것(`{lat,lng} | {reason}`처럼 성공/실패 케이스의 필드 자체를 다르게 두는 방식). `tsconfig.json`을 `strict: true`로 바꾸는 근본 해결도 가능하지만, 기존 코드 전반에 영향이 커서(다른 곳에서도 non-strict 전제로 작성된 코드가 있을 수 있음) 이번엔 손대지 않음 — 필요해지면 별도 논의.
- **잔여 이슈**: `app/src/lib/geocoding/_repro.ts`(디버깅용으로 만든 빈 임시 파일)가 삭제 권한 문제로 안 지워져서 빈 주석 한 줄짜리로 남겨둠(tsc에는 영향 없음, 나중에 접근 가능해지면 정리).
- **아직 못 밝힌 것**: 사용자가 실제로 겪은 "좌표값이 업데이트 안 됨"의 진짜 원인(키 오타/잘못된 키 종류/주소 형식 문제 등)은 여전히 미확인 — 이번엔 진단 정보만 보강했고, 사용자가 개선된 버전으로 다시 실행해 정확한 실패 사유를 알려줘야 다음 조치 가능.

### 다음 세션 시작 시

- 사용자가 로컬에서 11번(골프장 Par 관리) 화면의 "좌표 지오코딩 실행" 버튼을 다시 클릭해 토스트/에러 메시지에 찍히는 구체적 사유를 확인 후 공유. `인증 실패(401)`이면 REST API 키가 아닌 다른 키(JavaScript 키 등)를 넣었을 가능성이 높음 — Kakao Developers 앱 요약 정보에서 "REST API 키" 항목 값을 다시 확인 안내.

## 81. 지오코딩 순차 디버깅 2건 — 403(카카오맵 서비스 비활성화) → 키워드 검색 폴백 추가 (2026-07-22)

80번에서 진단 정보를 보강해둔 덕에, 사용자가 재실행 → 에러 샘플 공유 → 원인 특정 → 코드 수정을 두 라운드에 걸쳐 빠르게 반복.

- **1라운드**: 에러 샘플에 `"HTTP 403: {\"errorType\":\"NotAuthorizedError\",\"message\":\"App(scorecaddie) disabled OPEN_MAP_AND_LOCAL service.\"}"` — REST API 키 자체는 맞았지만, Kakao Developers 앱에서 카카오맵/로컬 서비스 자체를 켜지 않은 상태였음. WebSearch로 확인해 "내 애플리케이션 > 제품 설정 > 카카오맵 > 활성화 설정 ON" 경로 안내. 코드에도 403을 별도 사유로 구분해 반환하도록 `lib/geocoding/kakao.ts`에 이미 있던 401 분기 옆에 추가(사용자 안내 전에 먼저 코드부터 반영해둠).
- **2라운드**: 사용자가 카카오맵 활성화 후 재실행 → 이번엔 `"검색 결과 없음(주소 형식을 카카오가 못 찾음)"` 사유로 일부(연습장/컨트리클럽류) 실패. 주소 검색 API(`search/address.json`)는 정형 도로명/지번 주소에만 강하고, `GolfCourse.address`에 시설명이 섞여 있거나 형식이 애매한 경우 매칭을 못 하는 것으로 판단.
- **수정**: `lib/geocoding/kakao.ts`를 확장 — 주소 검색이 "검색 결과 없음"일 때만 카카오 키워드(장소) 검색(`search/keyword.json`)으로 골프장명(`GolfCourse.name`)을 한 번 더 시도하는 폴백 추가(인증/권한/네트워크 실패는 폴백해도 똑같이 실패할 게 뻔하므로 그 경우엔 폴백 안 하고 바로 원래 사유 반환). 두 번째 호출 전 120ms 대기 추가(한 골프장에 API를 연달아 두 번 호출하게 되므로). `app/src/app/api/admin/golf-courses/geocode/route.ts`에서 `geocodeAddress(course.address!, course.name)`로 호출부만 한 줄 변경. 403도 401과 마찬가지로 "첫 건부터 나오면 배치 조기 중단" 대상에 포함.
- **문서 갱신**: `doc/개발리스트.md` "좌표 결측 지오코딩 배치" 행에 이 디버깅 과정 요약 반영.
- **검증**: `npx tsc --noEmit` EXIT_CODE=0. 키워드 검색 폴백 자체의 실사용 결과(연습장류가 실제로 찾히는지)는 사용자가 로컬에서 재확인 필요.

### 다음 세션 시작 시

- 사용자가 로컬에서 11번(골프장 Par 관리) "좌표 지오코딩 실행" 재실행 → 이전에 "검색 결과 없음"이었던 연습장/컨트리클럽류가 키워드 검색 폴백으로 성공하는지, 그래도 실패하는 게 있으면 어떤 사유인지 확인. 남은 화면 밖 작업(README 동기화/카카오 로그인 테스트/하이원CC 자료)은 계속 사용자 지정 대기.

## 82. 지오코딩 근본 원인 해결 — 도로명/지번 주소 분리 보관 + 3단계 폴백 (2026-07-22)

81번의 키워드 검색 폴백은 증상 대응이었음. 사용자가 "근본적으로 해결하자"며 공공데이터 API가 이미 `ROAD_NM_ADDR`(도로명)/`LOTNO_ADDR`(지번) 두 필드를 따로 제공한다는 점에 착안 — 도로명 검색이 실패해도 지번으로 재시도할 수 있도록 원본을 분리 보관하자는 제안.

- **설계 논의**: 처음엔 `address`=도로명 전용, `address_lotno`=지번 전용으로 완전히 분리하는 안을 검토했으나, `address`가 이미 8개 파일(코스 검색/상세, 관리자 리스트 등)에서 화면 노출용으로 쓰이고 있어 도로명이 없는 골프장(연습장류)은 주소가 빈 값으로 보이는 회귀가 생김을 확인 → **`address`는 기존 그대로(도로명 우선, 없으면 지번) 유지**하고 `addressLotno`(지번 원본)만 신규 추가하는 안으로 확정(화면 8곳 무변경). 사용자가 추가로 "addressLotno가 address와 같은 값이면(=애초에 도로명이 없어 address가 이미 지번이었던 경우) 재조회하지 말고 바로 키워드 검색으로" 제안, 그대로 반영.
- **스키마**: `GolfCourse.addressLotno String?` 추가. 마이그레이션 `app/prisma/migrations/20260722060000_add_golf_course_address_lotno/migration.sql`(`ALTER TABLE "GolfCourse" ADD COLUMN "addressLotno" TEXT;`) 수기 작성(샌드박스 DB 접근 불가로 여전히 `prisma migrate dev` 실행 불가).
- **동기화**: `api/admin/golf-courses/sync/route.ts`의 upsert `data`에 `addressLotno: item.LOTNO_ADDR?.trim() || null` 추가(`address` 계산 로직은 무변경).
- **지오코딩 로직 개편**: `lib/geocoding/kakao.ts`의 `geocodeAddress` 시그니처를 `(address, addressLotno?, fallbackKeyword?)`로 변경, 3단계 폴백: ① `address`(도로명 우선값)로 주소 검색 → ② 실패 시 `addressLotno`가 있고 `address`와 값이 다를 때만 주소 검색 재시도 → ③ 그래도 실패하면 골프장명으로 키워드 검색(81번에서 만든 기존 폴백 유지). 인증/권한/네트워크류 실패("검색 결과 없음"이 아닌 사유)는 어느 단계든 즉시 반환(다음 후보로 안 넘어감) — `isHardFailure()` 헬퍼로 판별. `api/admin/golf-courses/geocode/route.ts`는 `select`에 `addressLotno` 추가하고 호출부만 `geocodeAddress(course.address!, course.addressLotno, course.name)`로 변경.
- **환경 이슈 해결책 발견(재사용 가능)**: `npx tsc --noEmit`이 처음엔 `addressLotno` 관련 타입 에러 2건 발생 — Prisma Client가 스키마 변경 전 상태로 캐시돼 있었음. `npx prisma generate`를 바로 실행하면 기존 세션들처럼 `EPERM: unlink 'node_modules/.prisma/client/index-browser.js'`로 실패(마운트 FUSE의 파일 삭제 권한 문제, 8~12번 항목에서 git lock 파일 삭제 불가 문제와 동일 원인). **해결**: git 워크어라운드와 같은 원리로, 삭제(unlink) 대신 이동(rename)은 허용됨 — `mv node_modules/.prisma/client node_modules/.prisma/client_old_<timestamp>` 로 기존 디렉터리를 비켜준 뒤 `npx prisma generate` 실행하면 정상적으로 새로 생성됨. 이번부터 **샌드박스에서도 스키마 변경 후 `prisma generate`로 타입까지 검증 가능** — 기존에 "Prisma client 미생성은 샌드박스 환경 자체의 기존 이슈"로 넘어가던 관행(예: 563번 항목)을 이 방법으로 개선 가능. 이후 `npx tsc --noEmit` EXIT_CODE=0 확인.
- **문서 갱신**: `doc/개발리스트.md` "좌표 결측 지오코딩 배치" 행 갱신.

### 사용자 로컬 후속 조치 필요 (중요 — 순서대로)

1. `git pull` 후 `npx prisma migrate deploy` + `npx prisma generate` 실행 (스키마에 `addressLotno` 반영).
2. 11번(골프장 Par 관리) 화면에서 **"골프장 공공 데이터 업로드"(sync) 재실행** — 기존 652개 골프장은 `addressLotno`가 아직 null이라, 재동기화해야 지번 주소가 채워짐(재실행해도 기존 데이터는 upsert라 안전).
3. 그 다음 "좌표 지오코딩 실행" 재실행 — 이전에 "검색 결과 없음"이었던 건들이 지번 재시도/키워드 폴백으로 해결되는지 확인.

### 다음 세션 시작 시

- 위 3단계(마이그레이션 → 재동기화 → 지오코딩 재실행) 결과를 사용자에게 확인. 여전히 실패하는 골프장이 있으면 사유(errors 배열) 확인 후 추가 대응. 남은 화면 밖 작업(README 동기화/카카오 로그인 테스트/하이원CC 자료)은 계속 사용자 지정 대기.
