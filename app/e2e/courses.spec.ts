import { test, expect } from "@playwright/test";

// 2. 골프장 목록 조회 — doc/ScoreCaddie_테스트계획서.pptx 우선 시나리오 2번.
// "chromium" 프로젝트의 기본 storageState(e2e/.auth/user.json)로 이미 로그인된 상태에서 시작한다.
//
// 실제 골프장 데이터는 공공데이터포털에서 이관된 ~650건이 이미 DB에 들어있어(건드리지 않음),
// 특정 골프장 이름을 하드코딩하지 않고 화면에 실제로 렌더링된 첫 번째 카드를 그대로 활용해
// 검색 동작을 검증한다 — src/components/CourseSearchList.tsx 실제 구현 기준.
test.describe("골프장 목록 조회", () => {
  test("목록이 보이고, 이름 검색으로 결과가 좁혀지며, 필터 탭이 동작한다", async ({ page }) => {
    await page.goto("/courses");
    await expect(page.getByRole("heading", { name: "골프장" })).toBeVisible();

    const courseLinks = page.locator('a[href^="/courses/"]');
    await expect(courseLinks.first()).toBeVisible();

    const initialCount = await courseLinks.count();
    expect(initialCount).toBeGreaterThan(0);

    // 실제 렌더링된 첫 카드의 골프장 이름을 그대로 검색어로 사용 — 자기 자신은 반드시 남아야 한다.
    const firstCardText = await courseLinks.first().innerText();
    const courseName = firstCardText.split("\n")[0].trim();

    const searchInput = page.getByPlaceholder("골프장 이름 또는 지역 검색");
    await searchInput.fill(courseName);

    await expect(courseLinks.first()).toBeVisible();
    await expect(page.getByRole("link", { name: courseName })).toBeVisible();

    // 존재할 리 없는 검색어 — "검색 결과가 없습니다" 빈 상태 메시지를 확인.
    await searchInput.fill("존재하지않는골프장이름-XYZ123");
    await expect(page.getByText("검색 결과가 없습니다")).toBeVisible();
    await expect(courseLinks).toHaveCount(0);

    // 검색어 초기화 후 공공/민간 필터 탭 동작 확인 — 클릭 시 에러 없이 목록 또는 빈 상태가 갱신된다.
    await searchInput.fill("");
    await expect(courseLinks.first()).toBeVisible();

    await page.getByRole("button", { name: "공공", exact: true }).click();
    await expect(
      courseLinks.first().or(page.getByText("검색 결과가 없습니다"))
    ).toBeVisible();

    await page.getByRole("button", { name: "전체", exact: true }).click();
    await expect(courseLinks).toHaveCount(initialCount);
  });
});
