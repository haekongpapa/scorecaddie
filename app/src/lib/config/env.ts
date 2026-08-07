// 환경 변수 접근 창구 (doc/coding-guidelines.md §2).
// 이 프로젝트의 다른 파일에서는 process.env를 직접 참조하지 않고 이 파일을 통해서만 읽는다.
//
// 주의: auth.config.ts(Edge 런타임에서 로드됨)가 이 파일을 import한다. 그래서 이 파일은
// 순수하게 process.env 값을 읽어 재노출만 하고, 다른 모듈(prisma, bcryptjs 등 Node 전용
// 패키지를 포함하는 모듈)은 절대 import하지 않는다 — Edge 런타임이 Node.js 전용 모듈을
// 지원하지 않아 번들 시점에 에러가 나기 때문(auth.config.ts 상단 주석 참고).
export const env = {
  nodeEnv: process.env.NODE_ENV,
  databaseUrl: process.env.DATABASE_URL,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  naverClientId: process.env.NAVER_CLIENT_ID,
  naverClientSecret: process.env.NAVER_CLIENT_SECRET,
  // 카카오 "로그인" 앱 키(REST API 키를 Client ID로 사용) — 아래 kakaoRestApiKey(주소 검색용)와는
  // 완전히 별개 용도. 2026-08-07 재추가(86번 항목에서 삭제됐다가 사용자 요청으로 부활).
  kakaoClientId: process.env.KAKAO_CLIENT_ID,
  kakaoClientSecret: process.env.KAKAO_CLIENT_SECRET,
  kakaoRestApiKey: process.env.KAKAO_REST_API_KEY,
  weatherApiKey: process.env.WEATHER_API_KEY,
  publicDataApiKey: process.env.PUBLIC_DATA_API_KEY,
  // 아래 값들은 평소엔 비어있고, e2e 테스트(playwright.config.ts webServer.env)에서만
  // 로컬 목 서버 주소로 채워진다 — golf-course-sync.ts/kakao.ts가 실제 외부 API 대신
  // e2e/mocks/external-api-mock-server.mjs를 바라보게 하기 위함(둘 다 서버 사이드 fetch라
  // Playwright의 page.route()로는 가로챌 수 없어서 이 방식을 씀).
  publicDataApiBaseUrl: process.env.PUBLIC_DATA_API_BASE_URL,
  kakaoAddressApiBaseUrl: process.env.KAKAO_ADDRESS_API_BASE_URL,
  kakaoKeywordApiBaseUrl: process.env.KAKAO_KEYWORD_API_BASE_URL,
} as const;
