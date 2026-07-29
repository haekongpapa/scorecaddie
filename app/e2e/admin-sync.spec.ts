import { test, expect } from "@playwright/test";
import { createTestPrismaClient } from "./fixtures/db";
import { SYNC_TEST_COURSE_NAME } from "./fixtures/test-golf-course";

// 7. 관리자: 공공데이터 동기화 — doc/ScoreCaddie_테스트계획서.pptx 우선 시나리오 7번.
// src/components/PublicDataSyncCard.tsx + src/app/api/admin/golf-courses/sync/route.ts +
// src/lib/services/golf-course-sync.ts 실제 구현 기준.
//
// golf-course-sync.ts는 Next.js 서버(API route) 안에서 apis.data.go.kr을 직접 fetch하므로
// Playwright의 page.route()로는 못 가로챈다. 대신 playwright.config.ts가
// e2e/mocks/external-api-mock-server.mjs를 별도 프로세스로 띄우고, golf-course-sync.ts의
// API_BASE_URL을 env(PUBLIC_DATA_API_BASE_URL)로 그 서버 주소로 바꿔치기한다(env.ts 참고).
//
// 목 서버는 정상 1건(E2ETESTORG/E2E001 — TM좌표 "230000"/"380000"은 lib/utils/geo.test.ts에
// 이미 검증된 샘플, WGS84 lat 36.921065/lng 127.337478로 변환됨) + 오류 유도용 1건(관리번호
// 누락 → "필수값 누락"으로 skip, DB에 아무것도 안 남음)을 고정 응답한다.
test.describe("관리자: 공공데이터 동기화", () => {
  test("동기화 실행 시 정상 건은 반영되고 오류 건은 스킵된다", async ({ page }) => {
    const prisma = createTestPrismaClient();
    // 이전 실행 잔여물 방어적 정리(이름 또는 externalOrgCd 기준 — updatedCount가 아니라
    // addedCount로 나오는 걸 보장하기 위해 실행 전 반드시 없어야 한다).
    await prisma.golfCourse.deleteMany({
      where: { OR: [{ name: SYNC_TEST_COURSE_NAME }, { externalOrgCd: "E2ETESTORG" }] },
    });
    await prisma.$disconnect();

    await page.goto("/admin/golf-courses");
    await expect(page.getByRole("heading", { name: "골프장 Par 관리" })).toBeVisible();

    await page.getByRole("button", { name: "업로드" }).click();
    await expect(
      page.getByText("신규 1개 추가 · 0개 갱신 완료 (오류 1건)")
    ).toBeVisible({ timeout: 15_000 });

    const verifyPrisma = createTestPrismaClient();
    try {
      const created = await verifyPrisma.golfCourse.findUnique({
        where: {
          externalOrgCd_externalMngNo: { externalOrgCd: "E2ETESTORG", externalMngNo: "E2E001" },
        },
      });
      expect(created?.name).toBe(SYNC_TEST_COURSE_NAME);
      expect(created?.address).toBe("테스트특별시 테스트구 테스트로 1");
      expect(created?.needsGeocoding).toBe(false);
      expect(created?.latitude).toBeCloseTo(36.921065, 4);
      expect(created?.longitude).toBeCloseTo(127.337478, 4);

      // 관리번호 누락 오류 행은 애초에 DB에 쓰기 자체가 일어나지 않아야 한다.
      const skipped = await verifyPrisma.golfCourse.findFirst({
        where: { name: "E2E_TEST_SYNC_오류행" },
      });
      expect(skipped).toBeNull();
    } finally {
      await verifyPrisma.$disconnect();
    }
  });
});
