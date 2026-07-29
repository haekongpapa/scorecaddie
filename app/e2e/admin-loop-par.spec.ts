import { test, expect } from "@playwright/test";
import { createTestPrismaClient } from "./fixtures/db";
import { PAR_EDITOR_TEST_COURSE_NAME } from "./fixtures/test-golf-course";

// 5. 관리자: 루프·Par 관리 — doc/ScoreCaddie_테스트계획서.pptx 우선 시나리오 5번(CRUD 전반).
// src/app/admin/golf-courses/[id]/par/page.tsx + src/components/GolfCourseParEditor.tsx +
// src/app/api/admin/golf-courses/[id]/loops/{route,[loopId]/route,[loopId]/holes/route}.ts 기준.
//
// 이 시나리오 전용 골프장(PAR_EDITOR_TEST_COURSE_NAME, 루프 0개)을 테스트 시작 시 직접
// 만든다 — admin-upload.spec.ts와 골프장을 공유하면 실행 순서에 따라 서로의 루프를 건드리게
// 되므로(테스트 간 오염), 시나리오마다 이름을 분리했다(fixtures/test-golf-course.ts 참고).
//
// 루프 추가/이름변경/삭제는 window.prompt/confirm 네이티브 다이얼로그를 쓰므로, 각 액션
// 직전에 page.once("dialog", ...)로 응답을 미리 걸어둔다(rounds-delete.spec.ts와 동일 패턴).
// Par select에는 GolfCourseParEditor.tsx에 aria-label(`${idx+1}홀 Par`)을 추가해 getByLabel로
// 안정적으로 선택한다(RoundStep1과 동일하게, label-input 연결이 없던 걸 이번에 개선).
test.describe("관리자: 루프·Par 관리", () => {
  test("루프를 추가하고 Par를 저장한 뒤 이름을 바꾸고 삭제한다", async ({ page }) => {
    const prisma = createTestPrismaClient();
    await prisma.golfCourse.deleteMany({ where: { name: PAR_EDITOR_TEST_COURSE_NAME } });
    const course = await prisma.golfCourse.create({
      data: { name: PAR_EDITOR_TEST_COURSE_NAME },
    });
    await prisma.$disconnect();

    await page.goto(`/admin/golf-courses/${course.id}/par`);
    await expect(page.getByText(PAR_EDITOR_TEST_COURSE_NAME)).toBeVisible();
    await expect(page.getByText("루프를 먼저 추가해주세요.")).toBeVisible();

    // ── 루프 추가 (window.prompt) ────────────────────────────────────────
    page.once("dialog", (dialog) => dialog.accept("전반"));
    await page.getByRole("button", { name: "+ 루프 추가" }).click();

    await expect(page.getByText('"전반" 루프를 추가했습니다.')).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "홀별 Par (규정타수) — 전반" })
    ).toBeVisible();

    // ── Par 변경 · 저장 ──────────────────────────────────────────────────
    await expect(page.getByRole("button", { name: "저장됨" })).toBeVisible();
    await page.getByLabel("1홀 Par").selectOption("5");
    await expect(page.getByText("저장하지 않은 변경사항이 있습니다.")).toBeVisible();

    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("저장되었습니다.")).toBeVisible();
    await expect(page.getByRole("button", { name: "저장됨" })).toBeVisible();

    const checkPrisma = createTestPrismaClient();
    try {
      const afterSave = await checkPrisma.golfCourseHole.findFirst({
        where: { loop: { golfCourseId: course.id }, holeNumber: 1 },
      });
      expect(afterSave?.par).toBe(5);
    } finally {
      await checkPrisma.$disconnect();
    }

    // ── 루프 이름 변경 (더블탭 → window.prompt) ─────────────────────────
    // isDirty가 false인 상태(방금 저장 완료)에서 더블클릭해야 selectLoop의 "저장 안 한
    // 변경사항" confirm이 끼어들지 않는다.
    page.once("dialog", (dialog) => dialog.accept("전반(수정)"));
    await page.getByRole("button", { name: "전반" }).dblclick();
    await expect(page.getByRole("button", { name: "전반(수정)" })).toBeVisible();

    // ── 루프 삭제 (✕ → window.confirm) ──────────────────────────────────
    // 토스트가 2.5초 후 자동으로 사라지므로(GolfCourseParEditor.tsx showToast), 실제
    // 네트워크 왕복이 느릴 때 기본 5초 타임아웃이 빠듯할 수 있어 넉넉히 늘려둔다
    // (rounds-new.spec.ts에서도 같은 이유로 타임아웃을 늘린 전례 참고).
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "삭제" }).click();

    // 성공 토스트/실패 에러 메시지 중 뭐가 뜨는지로 갈라서 확인 — 삭제 API가 실제로
    // 실패하는 경우와 단순 타이밍(토스트 놓침) 문제를 구분하기 위한 진단용 분기.
    const successToast = page.getByText('"전반(수정)" 루프를 삭제했습니다.');
    const errorMessage = page.locator("div.text-red-600");
    await expect(successToast.or(errorMessage)).toBeVisible({ timeout: 15_000 });
    if (await errorMessage.isVisible()) {
      throw new Error(`루프 삭제가 실패로 응답했습니다: "${await errorMessage.textContent()}"`);
    }

    await expect(page.getByText("루프를 먼저 추가해주세요.")).toBeVisible();
    await expect(page.getByRole("button", { name: "전반(수정)" })).toHaveCount(0);

    // ── DB 최종 상태 확인 ────────────────────────────────────────────────
    const verifyPrisma = createTestPrismaClient();
    try {
      const loops = await verifyPrisma.golfCourseLoop.findMany({
        where: { golfCourseId: course.id },
      });
      expect(loops).toHaveLength(0);
    } finally {
      await verifyPrisma.$disconnect();
    }
  });
});
