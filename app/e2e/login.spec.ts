import { test, expect } from "@playwright/test";
import { TEST_EMAIL, TEST_PASSWORD } from "./fixtures/test-account";

// 1. 로그인 — doc/ScoreCaddie_테스트계획서.pptx 우선 시나리오 1번.
// "chromium" 프로젝트는 기본적으로 e2e/.auth/user.json(로그인된 상태)을 storageState로 쓰지만,
// 이 spec은 로그인 폼 자체를 검증해야 하므로 빈 storageState로 override해서 완전히
// 로그아웃된 상태에서 시작한다.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("로그인", () => {
  test("올바른 id/pw로 로그인하면 /dashboard로 이동한다", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("이메일").fill(TEST_EMAIL);
    await page.getByLabel("비밀번호").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "로그인" }).click();

    await page.waitForURL("/dashboard");
    await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();
  });

  test("비밀번호가 틀리면 에러 메시지를 보여주고 /login에 머무른다", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("이메일").fill(TEST_EMAIL);
    await page.getByLabel("비밀번호").fill("wrong-password-1234");
    await page.getByRole("button", { name: "로그인" }).click();

    await expect(
      page.getByText("이메일 또는 비밀번호가 올바르지 않습니다.")
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
