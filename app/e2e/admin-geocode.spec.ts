import { test, expect } from "@playwright/test";
import { createTestPrismaClient } from "./fixtures/db";
import { GEOCODE_TEST_COURSE_NAME, GEOCODE_TEST_ADDRESS } from "./fixtures/test-golf-course";

// 8. 관리자: 지오코딩 실행 — doc/ScoreCaddie_테스트계획서.pptx 우선 시나리오 8번.
// src/components/GeocodeBatchCard.tsx + src/app/api/admin/golf-courses/geocode/route.ts +
// src/lib/services/golf-course-geocode.ts + src/lib/geocoding/kakao.ts 실제 구현 기준.
//
// kakao.ts도 golf-course-sync.ts와 마찬가지로 서버 사이드에서 카카오 API를 직접 fetch하므로
// e2e/mocks/external-api-mock-server.mjs를 같은 방식으로 재사용한다(env.ts/kakao.ts 참고).
//
// **주의(다른 admin-*.spec.ts와의 차이점)**: runGeocodingBatch()는 needsGeocoding=true인
// 골프장 "전체"를 대상으로 돈다(대상 필터링 옵션이 없음) — 즉 실제 652건 중 아직 지오코딩 안 된
// 레코드가 있다면 그것도 같이 처리 대상에 포함된다. 목 서버는 GEOCODE_TEST_ADDRESS로 검색할
// 때만 좌표를 반환하고 그 외(실제 주소 포함)는 전부 "검색 결과 없음"으로 응답하므로, 실제
// 데이터는 안전하게 그대로 남는다(좌표가 잘못 채워지는 부작용 없음 — 처리 실패로 끝날 뿐).
// 그래서 이 테스트는 토스트에 찍히는 집계 숫자(성공/실패 건수)는 확인하지 않고, 우리가 만든
// 테스트 전용 골프장 하나의 상태 변화만 DB로 직접 확인한다 — 실제 데이터 건수와 무관하게
// 항상 같은 결과를 내는 유일한 방법. 이름이 "E2E_TEST_"로 시작해 정렬상 앞쪽에 오긴 하지만
// (name asc 정렬, 공공데이터는 전부 한글명), 만에 하나 실제 미지오코딩 건이 150건(BATCH_LIMIT)을
// 넘으면 이번 실행에서 우리 골프장이 처리 안 될 수도 있음 — 그 경우 재실행하면 된다.
test.describe("관리자: 지오코딩 실행", () => {
  test("needsGeocoding 대상에 좌표가 채워진다", async ({ page }) => {
    test.setTimeout(180_000); // 실제 미지오코딩 건이 섞여 있으면 배치가 오래 걸릴 수 있음.

    const prisma = createTestPrismaClient();
    await prisma.golfCourse.deleteMany({ where: { name: GEOCODE_TEST_COURSE_NAME } });
    const course = await prisma.golfCourse.create({
      data: {
        name: GEOCODE_TEST_COURSE_NAME,
        address: GEOCODE_TEST_ADDRESS,
        needsGeocoding: true,
      },
    });
    await prisma.$disconnect();

    await page.goto("/admin/golf-courses");
    await expect(page.getByRole("heading", { name: "골프장 관리" })).toBeVisible();
    // pendingCount === 0이면 카드 자체가 안 뜨는데(GeocodeBatchCard.tsx), 방금 만든 우리
    // 골프장이 항상 하나는 잡혀있어 이 시점엔 반드시 렌더링된다.
    await expect(page.getByRole("button", { name: "실행" })).toBeVisible();

    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/admin/golf-courses/geocode") && r.request().method() === "POST",
        { timeout: 120_000 }
      ),
      page.getByRole("button", { name: "실행" }).click(),
    ]);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.stoppedEarly).toBeNull();

    const verifyPrisma = createTestPrismaClient();
    try {
      const updated = await verifyPrisma.golfCourse.findUniqueOrThrow({
        where: { id: course.id },
      });
      test.skip(
        updated.needsGeocoding,
        "실제 미지오코딩 골프장이 BATCH_LIMIT(150건)을 넘어 이번 실행에서 테스트 골프장까지 " +
          "처리되지 못했습니다. 다시 실행하면(버튼을 한 번 더 누르면) 이어서 처리됩니다."
      );
      expect(updated.needsGeocoding).toBe(false);
      expect(updated.latitude).toBeCloseTo(36.222222, 5);
      expect(updated.longitude).toBeCloseTo(127.111111, 5);
    } finally {
      await verifyPrisma.$disconnect();
    }
  });
});
