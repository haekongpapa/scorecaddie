# ScoreCaddie 디렉터리 구조 & 코딩 스타일 가이드

작성일: 2026-07-27
적용 범위: `app/` (Next.js 15 App Router + TypeScript + Prisma + NextAuth)

이 문서는 재홍님이 제시한 Express/레이어드 아키텍처 기준 초안을 ScoreCaddie가 실제로 쓰고 있는 Next.js App Router 구조에 맞게 재정리한 것입니다. Express는 이 프로젝트에서 사용하지 않으며, 프론트엔드와 백엔드(API)는 하나의 Next.js 프로젝트로 통합 운영합니다(기술 스택 결정사항 참고).

---

## 1. 기본 원칙

- 라우팅과 컨트롤러 역할은 Next.js App Router의 파일 기반 구조가 대신합니다. 별도의 `routes/`, `controllers/` 폴더는 두지 않습니다.
- 데이터 모델은 `prisma/schema.prisma`가 단일 진실 공급원(source of truth)입니다. 별도의 `models/`, `entities/` 폴더는 두지 않습니다(중복 정의 방지).
- 인증/권한 체크는 Next.js 컨벤션에 따라 루트의 `middleware.ts` 하나로 관리합니다(Express처럼 여러 미들웨어 파일을 체이닝하는 구조가 아닙니다).

## 2. 디렉터리 구조 규칙

```
app/
├─ prisma/
│  ├─ schema.prisma         # DB 스키마 (models/entities 역할 겸용)
│  └─ migrations/
├─ src/
│  ├─ app/                  # Next.js App Router — 파일 경로 자체가 라우팅
│  │  ├─ (화면 경로)/page.tsx
│  │  └─ api/.../route.ts   # API 엔드포인트. 얇게 유지하고 로직은 lib/로 위임
│  ├─ components/           # 재사용 클라이언트 컴포넌트
│  ├─ lib/                  # 서비스 + 유틸리티 (구 controllers/services/utils 통합 위치)
│  │  ├─ config/            # 환경 변수 접근 창구 (신규 도입 권장)
│  │  ├─ weather/           # 기상청 API 연동 등 외부 API 서비스
│  │  ├─ geocoding/         # 카카오 지오코딩 등 외부 API 서비스
│  │  └─ utils/             # 순수 유틸 함수 (포맷팅, 중복 검사 등)
│  ├─ types/                # 공용 타입 정의
│  ├─ auth.ts, auth.config.ts, middleware.ts   # 인증 · 미들웨어 (루트 고정 위치)
│  └─ *.test.ts / __tests__/, e2e/             # 테스트 (§5 참고)
```

### 원안 대비 변경 사항

| 원안 항목 | 처리 | 사유 |
|---|---|---|
| `src/routes/` | 도입 안 함 | App Router의 파일 경로가 라우팅 정의를 대신함 |
| `src/controllers/` | 도입 안 함 | `api/*/route.ts`가 컨트롤러 역할을 겸함 |
| `src/models/`, `entities/` | 도입 안 함 | `prisma/schema.prisma`가 이미 이 역할 |
| `src/services/` | `src/lib/`로 대체 | Next.js 생태계 관례상 `lib` 사용, 기존 코드와도 일치 |
| `src/middlewares/` | `middleware.ts` 단일 파일로 대체 | Next.js는 미들웨어를 여러 파일로 체이닝하지 않음 |
| `src/config/` | 신규 도입 | 지금은 각 파일이 `process.env`를 직접 참조 중 — 한 곳으로 모으기 권장 |
| `src/utils/`, `helpers/` | `lib/utils/`로 편입 | 기존 `lib/` 구조와 자연스럽게 통합 |
| `tests/` | 도입 (§5) | 아직 프로젝트에 테스트 코드 없음, 착수 전 규칙만 선제 확정 |

## 3. TypeScript 규칙

1. **`any` 사용 지양, 명시적 타입 지정을 기본으로 합니다.** 이 원칙은 `tsconfig.json`의 strict 설정과 무관하게 지금 바로 적용합니다.
2. **`tsconfig.json`은 현재 `strict: false`로 유지합니다.** 이는 실수가 아니라 의도된 설정입니다 — non-strict 모드에서 boolean 판별 유니언(`{ok:true}|{ok:false}`)이 `if/else`에서 제대로 좁혀지지(narrowing) 않는 버그를 겪은 뒤 확인된 사항입니다. `strict: true` 전환은 기존 코드 전반에 영향이 커서 별도 논의 후 진행합니다.
3. **판별 유니언은 boolean 필드 대신 `"필드명" in 값` 형태로 설계합니다.**

   ```ts
   // 지양
   type Result = { ok: true; data: string } | { ok: false; reason: string };

   // 권장 — lib/weather/kma.ts(FetchResult), lib/geocoding/kakao.ts(GeocodeResult) 참고
   type Result = { data: string } | { reason: string };
   if ("data" in result) { /* 성공 */ }
   ```

## 4. 코딩 스타일

1. **모듈화**: 함수 하나는 역할 하나만 하도록 작게 쪼갭니다.
2. **API Route는 얇게 유지합니다.** `route.ts`는 요청 파싱 · 인증 확인 · 응답 반환까지만 담당하고, 실제 로직(DB 조회, 외부 API 호출, 계산)은 `lib/` 함수로 위임합니다.
3. **에러 처리**: Express의 전역 에러 핸들러(`app.use(errorHandler)`)에 대응하는 개념이 Next.js App Router에는 없습니다(각 route handler가 독립 함수). 대신:
   - 외부 API 연동(`lib/weather`, `lib/geocoding` 등)은 **fail-soft**로 작성합니다 — 예외를 던지는 대신 `{data}` 또는 `{reason}` 형태로 실패 사유를 반환해, 호출부가 화면을 깨뜨리지 않고 자연스럽게 처리하게 합니다.
   - `route.ts`에서 DB 쓰기 등 실패 시 사용자에게 알려야 하는 작업은 `try/catch`로 감싸고, 반복되는 패턴이 늘어나면 공통 래퍼 함수(`withApiHandler` 등)를 `lib/`에 만들어 통일합니다.
4. **로깅**: `winston` 대신 `console.error` / `console.warn` / `console.info`로 레벨을 구분해 사용합니다. ScoreCaddie는 Vercel 서버리스/엣지 배포를 전제로 하고 있어 파일 트랜스포트 기반의 winston은 잘 맞지 않고, Vercel이 stdout/stderr를 자동 수집하기 때문에 console 레벨 구분만으로 충분합니다. 로그를 외부 서비스로 모아야 할 필요가 생기면 그때 엣지 친화적인 `pino` 등을 검토합니다.
5. **스타일링은 Tailwind 유틸리티 클래스가 기본이며, inline `style`은 쓰지 않는 것이 원칙입니다.** 단, 서버에서 매번 다르게 계산되는 수치(막대 그래프 너비 등)처럼 값 자체가 런타임에 결정되는 경우는 예외입니다 — Tailwind는 빌드 시 소스 코드에 등장하는 클래스 문자열을 정적으로 스캔해 CSS를 생성하므로, `` `w-[${pct}%]` `` 같은 동적 템플릿은 애초에 CSS가 생성되지 않아 스타일이 적용되지 않습니다. 이런 경우에 한해 `style={{ width: `${pct}%` }}` 형태의 inline style을 사용합니다 (`components/AnalysisTabs.tsx`, 15번 화면 참고, 2026-07-30 신규 사례).

## 5. 테스트

- 아직 테스트 코드가 없는 상태이며, 실제 도입 시점은 이후 논의로 확정합니다. 아래는 착수 시 적용할 규칙입니다.
- 도구: 단위/컴포넌트 테스트는 **Vitest**(Next.js 공식 문서 권장, Jest 대비 설정 간단·속도 빠름), 화면 흐름이 많은 서비스 특성상 주요 사용자 플로우(스코어 등록 2-Step, 라운드 상세 등)는 **Playwright** e2e를 별도로 구성합니다.
- 위치: 단위 테스트는 대상 파일 옆에 `*.test.ts`로 co-locate, e2e는 `e2e/` 폴더에 모읍니다.

## 6. 이 문서의 성격

이 가이드는 고정된 규칙이 아니라 프로젝트가 커지면서 갱신될 수 있는 문서입니다. 구조나 스타일 변경이 필요해지면 이 문서를 먼저 갱신한 뒤 코드에 반영합니다.
