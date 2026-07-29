import { test, expect } from "@playwright/test";
import { createTestPrismaClient } from "./fixtures/db";
import { TEST_EMAIL } from "./fixtures/test-account";

// 4. 라운드 상세·삭제 — doc/ScoreCaddie_테스트계획서.pptx 우선 시나리오 4번.
// src/app/rounds/[id]/page.tsx + src/components/RoundActions.tsx + src/app/api/rounds/[id]/route.ts 기준.
//
// 등록 플로우 자체는 rounds-new.spec.ts에서 이미 UI로 검증했으므로, 여기서는 "삭제" 동작만
// 독립적으로 검증하기 위해 대상 라운드를 Prisma로 직접 시딩한다(어차피 테스트 종료 후
// global-teardown이 테스트 계정과 함께 cascade로 정리한다).
test.describe("라운드 상세·삭제", () => {
  test("라운드 상세를 열고 삭제하면 /rounds 목록에서 사라진다", async ({ page }) => {
    const prisma = createTestPrismaClient();
    const user = await prisma.user.findUniqueOrThrow({ where: { email: TEST_EMAIL } });
    const course = await prisma.golfCourse.findFirstOrThrow({
      orderBy: { name: "asc" },
    });
    const round = await prisma.round.create({
      data: {
        userId: user.id,
        golfCourseId: course.id,
        playedAt: new Date(),
        holesPlayed: 9,
      },
    });

    // ── 라운드 상세 ─────────────────────────────────────────────────────
    await page.goto(`/rounds/${round.id}`);
    await expect(page.getByRole("heading", { name: "라운드 상세" })).toBeVisible();
    await expect(page.getByText(course.name)).toBeVisible();
    await expect(page.getByText("아직 저장된 홀 스코어가 없습니다.")).toBeVisible();

    // ── 삭제 (RoundActions의 confirm() 다이얼로그를 자동 수락) ─────────────
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "삭제" }).click();

    // DELETE /api/rounds/[id] 성공 후 /rounds로 리다이렉트된다.
    await page.waitForURL("/rounds");
    await expect(page.getByRole("heading", { name: "스코어 조회" })).toBeVisible();

    // 목록에도, 상세 페이지 직접 접근에도 더 이상 나타나지 않아야 한다(notFound → 404).
    const remaining = await prisma.round.findUnique({ where: { id: round.id } });
    expect(remaining).toBeNull();

    const detailResponse = await page.request.get(`/rounds/${round.id}`);
    expect(detailResponse.status()).toBe(404);

    await prisma.$disconnect();
  });
});
