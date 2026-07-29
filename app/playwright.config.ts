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
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
