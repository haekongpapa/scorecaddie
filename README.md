# ScoreCaddie

개인(또는 소규모 그룹)의 골프 라운드 스코어를 골프장·일자·홀 단위로 기록하고 조회하는 웹 서비스입니다. Next.js + Prisma + PostgreSQL(Supabase) 기반으로 개발했고, 현재 [Vercel](https://scorecaddie.vercel.app/)에 배포되어 실사용 가능한 상태입니다.

- **배포 주소**: https://scorecaddie.vercel.app/
- **저장소**: https://github.com/haekongpapa/scorecaddie
- **기술 스택**: Next.js 15(App Router) + TypeScript + Tailwind CSS + Prisma ORM 7 + PostgreSQL(Supabase) + NextAuth.js v5, 배포는 Vercel
- **진행 상태**: 기획 → 설계 → 구현 → 테스트 → 배포 1주기 완료(MVP). 화면 14개(사용자 10 + 관리자 4) 전부 실구현, Playwright e2e 8개 시나리오 전체 통과.

세부 진행 이력은 `memory.md`에 시간순으로 전부 기록되어 있습니다. 아래는 단계별 요약과 각 단계의 산출물(PPT/MD 문서) 안내입니다.

---

## 1. 프로젝트 개요

개방형 회원가입(이메일/비밀번호 + 구글/네이버 소셜 로그인), 공공데이터포털 연동 골프장 목록, 기상청 날씨 연동, 2-Step 스코어 등록, 스코어 조회, 관리자용 골프장 관리/회원 관리까지 총 8가지 핵심 기능으로 구성됩니다. 골프장은 9홀 단위 "루프"로 구성해 18/27/36홀 등 다양한 코스 구조를 지원합니다.

**산출물**

| 파일                                 | 설명                                                               |
| ------------------------------------ | ------------------------------------------------------------------ |
| `doc/ScoreCaddie_분석설계_요약.pptx` | 프로젝트 개요·핵심기능·기술스택을 포함한 전체 요약(1~5번 슬라이드) |

## 2. 분석 / 설계

핵심 기능 확정 → DB 스키마 설계(User/GolfCourse/GolfCourseLoop/GolfCourseHole/Round/HoleScore/GolfCourseSyncLog + NextAuth 3테이블) → 화면 14개 설계 및 HTML 목업 작성 → 정책 결정사항(로그인 방식, 관리자 권한, 데이터 소스 등) 확정 순으로 진행했습니다.

**산출물**

| 파일                                 | 설명                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------- |
| `doc/ScoreCaddie_분석설계_요약.pptx` | DB 스키마·컬럼 정의·화면 설계 상세(6~10번 슬라이드), v5(2026-07-29 최신화) |
| `doc/pages.md`                       | 화면 14개 상세 설계 문서(경로/레이아웃/컴포넌트/데이터 의존성)             |
| `doc/mockups/*.html`                 | 화면별 HTML 목업 19개                                                      |

## 3. 구현

사용자 화면 10개(랜딩~라운드 상세)와 관리자 화면 4개(Par 관리~회원 관리)를 전부 실구현했습니다. 골프장 공공데이터 실시간 연동(증분 동기화 포함), 좌표 지오코딩 배치, 기상청 날씨 연동, CSV 일괄 업로드 등 배치성 기능도 포함됩니다. 단위 테스트(Vitest)와 Playwright e2e(8개 시나리오)로 핵심 플로우와 관리자 기능을 전부 검증했습니다.

**산출물**

| 파일                                 | 설명                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `doc/ScoreCaddie_분석설계_요약.pptx` | 관리자 화면 4종·공공데이터 연동/지오코딩·테스트 현황(11~16번 슬라이드) |
| `doc/coding-guidelines.md`           | 디렉터리 구조·TypeScript 규칙·코딩 스타일 가이드                       |
| `doc/admin-golfcourse-sync.md`       | 골프장 공공데이터 동기화 설계(API 스펙, 페이지네이션, 증분 조회 조건)  |
| `doc/admin-csv-upload.md`            | 관리자 CSV 일괄 업로드 처리 로직 설계                                  |
| `doc/ScoreCaddie_테스트계획서.pptx`  | Vitest/Playwright 테스트 계획 및 시나리오 8개 결과                     |
| `doc/ScoreCaddie_지침관리방안.pptx`  | 코딩 가이드 문서 운영 방침(자동로드 vs 별도문서 검토)                  |
| `doc/개발리스트.md`                  | 화면·기능 단위 구현 상태 체크리스트                                    |

## 4. 배포

배포 스택 비교 검토(Vercel+Neon vs Vercel+Supabase) 후 Vercel + Supabase로 최종 결정했습니다. Supabase에 PostgreSQL을 구성하고(로컬 개발·Preview·Production이 동일 DB를 공유), Vercel에 프로젝트를 연결해 첫 배포까지 완료했습니다. 배포 중 발견된 Next.js 취약점(CVE-2025-66478) 대응 등 이슈 해결 이력도 문서에 포함되어 있습니다.

**산출물**

| 파일                                    | 설명                                                          |
| --------------------------------------- | ------------------------------------------------------------- |
| `doc/ScoreCaddie_배포방안_검토_v2.pptx` | 배포 플랫폼 비교 검토 및 PM 추천안(Vercel+Supabase 결정 근거) |
| `doc/supabase-deploy-guide.md`          | Supabase 프로젝트 생성·연결 문자열 설정 가이드                |
| `doc/vercel-deploy-guide.md`            | Vercel 프로젝트 생성·환경변수·배포 완료 체크리스트            |
| `doc/ScoreCaddie_분석설계_요약.pptx`    | 테스트&배포 현황(13번 슬라이드)                               |

---

## 개발 환경 빠른 시작

```
cd app
npm install
npx prisma generate
npm run dev
```

로컬 개발도 Supabase DB를 공유하므로 별도 로컬 DB 기동이 필요 없습니다(`app/.env`의 `DATABASE_URL` 참고). VS Code 워크스페이스 설정은 `.vscode/`에 준비되어 있습니다(추천 확장: Prisma, ESLint, Prettier, Tailwind CSS IntelliSense).

## 디렉터리 구조

- `doc/` — 분석/설계/배포 문서 및 목업 (PPT, MD, HTML)
- `app/` — 개발 소스 (Next.js + Prisma + NextAuth)
- `db/` — 초기 로컬 PostgreSQL 설정(Docker Compose, 현재는 Supabase로 전환되어 미사용)
- `.vscode/` — VS Code 워크스페이스 설정
- `memory.md` — 프로젝트 진행 이력 전체(시간순 작업 로그, 세션 간 컨텍스트 유지용)
