import path from "node:path";
import { test as setup, expect } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "./fixtures/test-account";

// auth.setup.ts와 동일한 패턴이지만 ADMIN role 계정으로 로그인해 별도 storageState
// (e2e/.auth/admin.json)에 저장한다. admin-*.spec.ts(시나리오 5~8)는 이 상태를 재사용하고,
// 그 외 시나리오(1~4)는 기존 auth.setup.ts/user.json(일반 USER 계정)을 그대로 쓴다.
const adminAuthFile = path.join(__dirname, ".auth/admin.json");

setup("관리자 로그인 상태 준비", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(ADMIN_EMAIL);
  await page.getByLabel("비밀번호").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();

  await page.waitForURL("/dashboard");
  await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();

  await page.context().storageState({ path: adminAuthFile });
});
