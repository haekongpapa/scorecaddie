import { test, expect } from "@playwright/test";
import { createTestPrismaClient } from "./fixtures/db";
import { CSV_UPLOAD_TEST_COURSE_NAME } from "./fixtures/test-golf-course";

// 6. 관리자: CSV 업로드 — doc/ScoreCaddie_테스트계획서.pptx 우선 시나리오 6번(부분 성공 처리 확인).
// src/components/CsvUploadForm.tsx + src/app/api/admin/golf-courses/upload/route.ts +
// src/lib/services/golf-course-upload.ts 실제 구현 기준.
//
// 외부 API 호출이 없는 시나리오라 mock 서버가 필요 없다 — CSV 파서가 요구하는 조건
// (골프장명은 이미 DB에 존재해야 함, 홀번호 1~9, Par는 3/4/5만 허용)에 맞춰 정상 행 2개 +
// 오류 유형 3가지(홀번호 범위/Par 값/골프장명 불일치)를 섞은 CSV를 그 자리에서 만들어 업로드한다.
// 실제 파일을 저장소에 두지 않고 buffer로 즉석 생성 — 정리할 fixture 파일이 남지 않는다.
//
// 이 시나리오 전용 골프장(CSV_UPLOAD_TEST_COURSE_NAME, 루프 0개)을 테스트 시작 시 직접
// 만든다 — admin-loop-par.spec.ts 등 다른 관리자 시나리오와 골프장을 공유하면 실행 순서에
// 따라 서로의 루프를 건드려 결과가 달라질 수 있어(테스트 간 오염), 시나리오마다 이름을
// 분리했다(fixtures/test-golf-course.ts 참고). 실제 652건 골프장 데이터는 전혀 건드리지
// 않는다. 생성된 루프/홀은 global-teardown이 "E2E_TEST_" 접두사 골프장을 전부 지울 때
// cascade로 함께 정리된다.
test.describe("관리자: CSV 업로드", () => {
  test("정상 행은 반영되고, 오류 행은 부분 실패로 보고된다", async ({ page }) => {
    const prisma = createTestPrismaClient();
    await prisma.golfCourse.deleteMany({ where: { name: CSV_UPLOAD_TEST_COURSE_NAME } });
    await prisma.golfCourse.create({ data: { name: CSV_UPLOAD_TEST_COURSE_NAME } });
    await prisma.$disconnect();

    await page.goto("/admin/golf-courses/upload");
    await expect(page.getByRole("heading", { name: "CSV 일괄 업로드" })).toBeVisible();

    const csv = [
      "골프장명,루프명,홀번호,Par",
      `${CSV_UPLOAD_TEST_COURSE_NAME},전반,1,4`, // 성공
      `${CSV_UPLOAD_TEST_COURSE_NAME},전반,2,5`, // 성공
      `${CSV_UPLOAD_TEST_COURSE_NAME},전반,99,4`, // 홀번호 범위 오류
      `${CSV_UPLOAD_TEST_COURSE_NAME},전반,3,6`, // Par 값 오류
      "존재하지않는_테스트_골프장,전반,1,4", // 골프장명 불일치
    ].join("\n");

    await page.locator('input[type="file"]').setInputFiles({
      name: "e2e-upload.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv, "utf-8"),
    });

    await page.getByRole("button", { name: "업로드 및 처리" }).click();

    await expect(page.getByText("5건 중 2건 성공")).toBeVisible();
    await expect(page.getByText("홀번호 범위 오류")).toBeVisible();
    await expect(page.getByText("Par 값 오류")).toBeVisible();
    await expect(page.getByText("골프장명 불일치")).toBeVisible();

    // 화면 표시뿐 아니라 실제 DB에도 반영됐는지 확인.
    const verifyPrisma = createTestPrismaClient();
    try {
      const course = await verifyPrisma.golfCourse.findFirst({
        where: { name: CSV_UPLOAD_TEST_COURSE_NAME },
        include: { loops: { include: { holes: { orderBy: { holeNumber: "asc" } } } } },
      });
      expect(course?.loops).toHaveLength(1);
      expect(course?.loops[0]?.name).toBe("전반");
      expect(course?.loops[0]?.holes).toHaveLength(2);
      expect(course?.loops[0]?.holes.map((h) => h.par)).toEqual([4, 5]);
    } finally {
      await verifyPrisma.$disconnect();
    }
  });
});
