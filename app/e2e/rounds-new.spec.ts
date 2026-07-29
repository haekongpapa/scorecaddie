import { test, expect } from "@playwright/test";
import { createTestPrismaClient } from "./fixtures/db";

// 3. 라운드 등록 2-Step — doc/ScoreCaddie_테스트계획서.pptx 우선 시나리오 3번(가장 핵심 플로우).
// src/app/rounds/new/page.tsx + src/components/RoundStep1.tsx + RoundStep2.tsx 실제 구현 기준.
//
// Step1(코스/홀수/일자 선택)에는 "전반/후반 루프"가 등록된 골프장만 골라야 한다 — 루프가 없는
// 골프장을 선택하면 Step2로 못 넘어간다(RoundStep1 안내 문구 참고). GolfCourse/GolfCourseLoop는
// 공공데이터 기반 공용 참조 데이터라 이 테스트에서 새로 만들 수 없으므로, 이미 루프가 등록된
// 골프장을 DB에서 찾아 그 이름으로 Step1의 셀렉트를 선택한다.
test.describe("라운드 등록 2-Step", () => {
  test("코스 선택 → 스코어 입력 2단계를 거쳐 라운드가 생성된다", async ({ page }) => {
    const prisma = createTestPrismaClient();
    const course = await prisma.golfCourse.findFirst({
      where: { loops: { some: {} } },
      include: { loops: { orderBy: { sortOrder: "asc" } } },
    });
    await prisma.$disconnect();

    test.skip(
      !course,
      "전반/후반 루프가 등록된 골프장이 DB에 없어 라운드 등록 플로우를 진행할 수 없습니다. " +
        "관리자 화면에서 최소 한 골프장에 루프를 등록한 뒤 다시 실행해주세요."
    );
    if (!course) return;

    // ── Step1: 코스 선택 ────────────────────────────────────────────────
    await page.goto("/rounds/new");
    await expect(page.getByRole("heading", { name: "스코어 등록" })).toBeVisible();

    await page.getByLabel("골프장").selectOption({ label: course.name });
    // 9홀만 채우면 되도록 홀 수를 9로 선택 — 테스트를 짧고 안정적으로 유지하기 위함.
    await page.getByRole("button", { name: "9홀" }).click();

    await expect(
      page.getByText("루프(전반/후반 등)가 등록되지 않았어요")
    ).toHaveCount(0);

    await page.getByRole("button", { name: /스코어 카드/ }).click();

    // ── Step2: 스코어 입력 ──────────────────────────────────────────────
    await expect(page).toHaveURL(/\/rounds\/new\?.*step=2/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "스코어 입력" })).toBeVisible();

    // 첫 홀 저장 시점에 서버에서 Round가 실제로 생성된다(POST /api/rounds — 지연 생성).
    // 이 클릭은 POST /api/rounds + PUT .../holes/1 두 번의 실제 Supabase 왕복을 거친 뒤에야
    // router.replace로 URL이 바뀌므로, 기본 5s 타임아웃은 네트워크가 느릴 때 flaky할 수 있어
    // 넉넉히 늘려둔다(1차 접속 시 Next dev의 API route 최초 컴파일 지연도 겹칠 수 있음).
    await page.getByRole("button", { name: /전반 1번홀 입력/ }).click();
    await expect(page).toHaveURL(/\/rounds\/new\?step=2&edit=/, { timeout: 15_000 });

    // 두 번째 홀까지 저장해 스코어카드 흐름이 이어지는 것을 확인.
    await expect(page.getByRole("button", { name: /전반 2번홀 입력/ })).toBeVisible();
    await page.getByRole("button", { name: /전반 2번홀 입력/ }).click();
    await expect(page.getByRole("button", { name: /전반 3번홀 입력/ })).toBeVisible();

    // "라운드 상세" 링크로 이동해 실제로 생성된 라운드인지 확인.
    await page.getByRole("link", { name: "라운드 상세" }).click();
    await expect(page).toHaveURL(/\/rounds\/[^/]+$/);
    await expect(page.getByRole("heading", { name: "라운드 상세" })).toBeVisible();
    await expect(page.getByText(course.name).first()).toBeVisible();

    // 목록 화면(/rounds)에도 방금 만든 라운드가 나타나는지 확인.
    // course.name 텍스트는 필터용 <select><option>에도 존재해(hidden) getByText만으로는
    // strict mode 위반/hidden 매칭이 나므로, 실제 라운드 카드 링크(RoundListItem)로 좁혀서 확인한다.
    await page.goto("/rounds");
    await expect(page.getByRole("heading", { name: "스코어 조회" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: new RegExp(course.name) }).first()
    ).toBeVisible();
  });
});
