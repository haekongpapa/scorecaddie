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
  kakaoRestApiKey: process.env.KAKAO_REST_API_KEY,
  weatherApiKey: process.env.WEATHER_API_KEY,
  publicDataApiKey: process.env.PUBLIC_DATA_API_KEY,
} as const;
