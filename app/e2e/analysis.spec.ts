import { test, expect } from "@playwright/test";

// 15. 기록 분석 (신규, 2026-07-30) — 대시보드 5번째 메뉴 카드 진입 + 4개 탭(추이/홀 상세/
// 골프장/날씨) 전환 검증. "chromium" 프로젝트의 storageState(e2e/.auth/user.json)로 이미
// 로그인된 상태에서 시작한다.
//
// 이 spec은 테스트 계정에 라운드가 몇 건 있는지에 의존하지 않는다(파일 실행 순서상 다른
// spec보다 먼저 돌면 라운드 0건일 수 있음) — 빈 상태 안내문 또는 실제 집계 수치 중
// 어느 쪽이 보여도 통과하도록 유연하게 검증한다(courses.spec.ts의 빈 상태 처리 방식과 동일).
test.describe("기록 분석", () => {
  test("대시보드에서 진입하고, 4개 탭이 전환된다", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "기록 분석" }).click();

    await page.waitForURL("/analysis");
    await expect(page.getByRole("heading", { name: "기록 분석" })).toBeVisible();

    const emptyNote = page.getByText("아직 등록된 라운드가 없습니다");
    const trendTabButton = page.getByRole("button", { name: "추이" });

    // 라운드가 0건이면 탭 자체가 렌더링되지 않고 빈 상태 안내만 보인다(AnalysisTabs.tsx).
    await expect(emptyNote.or(trendTabButton)).toBeVisible();

    if (await trendTabButton.isVisible()) {
      await expect(page.getByText("총 라운드")).toBeVisible();

      await page.getByRole("button", { name: "홀 상세" }).click();
      await expect(
        page
          .getByText("페어웨이 안착률")
          .or(page.getByText("스코어카드 상세 입력"))
      ).toBeVisible();

      await page.getByRole("button", { name: "골프장" }).click();
      await expect(page.getByText("골프장별 방문")).toBeVisible();

      await page.getByRole("button", { name: "날씨" }).click();
      await expect(
        page
          .getByText("하늘 상태별 평균 타수")
          .or(page.getByText("날씨 정보가 기록된 라운드가 아직 없습니다"))
      ).toBeVisible();

      // 다시 첫 탭으로 — 전환이 양방향으로 잘 동작하는지 확인.
      await trendTabButton.click();
      await expect(page.getByText("총 라운드")).toBeVisible();
    }
  });
});
