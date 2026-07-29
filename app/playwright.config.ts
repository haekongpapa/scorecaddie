import { defineConfig, devices } from "@playwright/test";

// ScoreCaddie e2e 설정 — doc/ScoreCaddie_테스트계획서.pptx 03절(Playwright 진행 방식) 기준.
//
// - globalSetup/globalTeardown: id/pw 테스트 전용 계정을 실제 Supabase DB에 만들고
//   (e2e/global-setup.ts) 전체 실행이 끝나면 지운다(e2e/global-teardown.ts). Round 등
//   테스트 중 생성되는 데이터는 User cascade 삭제로 함께 정리된다.
// - "setup" 프로젝트(e2e/auth.setup.ts): 로그인 폼을 한 번 거쳐 storageState를 저장해두고,
//   "chromium" 프로젝트는 이를 재사용해 매 테스트마다 로그인하지 않는다.
//   login.spec.ts만 로그인 폼 자체를 검증해야 하므로 파일 내에서 storageState를 override한다.
// - webServer: 이 설정으로 `npx playwright test`를 실행하면 Next dev 서버를 직접 띄우고
//   종료까지 관리해준다 — 별도로 `npm run dev`를 미리 켜둘 필요 없음.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",

  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },

  projects: [
    {
      // "admin-auth.setup.ts"도 문자열 안에 "auth.setup.ts"를 포함하므로, 경로 구분자나
      // 문자열 시작 바로 뒤에 오는 경우만 매칭되게 anchor(주의: testMatch는 testDir 기준
      // 상대경로 전체(예: "e2e/auth.setup.ts")와 비교되므로 앞에 "^"만 붙이면 안 됨).
      name: "setup",
      testMatch: /(^|\/)auth\.setup\.ts$/,
    },
    {
      name: "admin-setup",
      testMatch: /admin-auth\.setup\.ts$/,
    },
    {
      // 시나리오 1~4 (일반 USER 계정) — admin-*.spec.ts는 이 프로젝트에서 제외.
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
      testIgnore: /admin-.*\.spec\.ts/,
    },
    {
      // 시나리오 5~8 (ADMIN 계정) — admin-*.spec.ts만 이 프로젝트에서 실행.
      name: "admin-chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["admin-setup"],
      testMatch: /admin-.*\.spec\.ts/,
    },
  ],

  // 배열로 두 서버를 순서대로 띄운다: (1) 외부 API 목 서버를 먼저 준비시키고,
  // (2) 그 다음 Next dev 서버를 "그 목 서버 주소를 바라보도록" env를 얹어서 띄운다.
  // (관리자: 공공데이터 동기화/지오코딩 시나리오 — golf-course-sync.ts/kakao.ts가 서버
  // 사이드에서 직접 fetch하므로 page.route()로 못 가로채 이 방식을 씀. env.ts 참고.)
  webServer: [
    {
      command: "node e2e/mocks/external-api-mock-server.mjs",
      url: "http://127.0.0.1:4310/health",
      reuseExistingServer: true,
      timeout: 15_000,
    },
    {
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        PUBLIC_DATA_API_BASE_URL: "http://127.0.0.1:4310/public-data/1741000/golf_courses/info",
        // 목 서버는 serviceKey/REST API 키 값을 검증하지 않지만, 두 route 다 이 값이
        // 비어있으면 아예 에러를 반환하므로(sync/geocode route.ts) 항상 채워둔다.
        PUBLIC_DATA_API_KEY: "e2e-mock-key",
        KAKAO_ADDRESS_API_BASE_URL: "http://127.0.0.1:4310/kakao/address",
        KAKAO_KEYWORD_API_BASE_URL: "http://127.0.0.1:4310/kakao/keyword",
        KAKAO_REST_API_KEY: "e2e-mock-key",
      },
    },
  ],
});
