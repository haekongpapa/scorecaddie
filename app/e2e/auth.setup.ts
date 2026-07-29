import path from "node:path";
import { test as setup, expect } from "@playwright/test";
import { TEST_EMAIL, TEST_PASSWORD } from "./fixtures/test-account";

// Playwright 공식 권장 "인증 setup 프로젝트" 패턴(playwright.config.ts의 "setup" 프로젝트).
// /login 화면에서 id/pw(Credentials provider)로 실제 로그인 폼을 거쳐 로그인한 뒤,
// 세션 쿠키를 storageState 파일로 저장해둔다. courses/rounds-new/rounds-delete 세 spec은
// 이 storageState를 그대로 재사용해 매번 UI로 로그인하지 않고 바로 로그인된 상태로 시작한다
// (login.spec.ts만 예외 — 로그인 폼 자체를 검증해야 하므로 storageState를 빈 값으로 override).
const authFile = path.join(__dirname, ".auth/user.json");

setup("로그인 상태 준비", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(TEST_EMAIL);
  await page.getByLabel("비밀번호").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();

  await page.waitForURL("/dashboard");
  await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();

  await page.context().storageState({ path: authFile });
});
