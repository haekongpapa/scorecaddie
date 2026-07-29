import { createTestPrismaClient } from "./fixtures/db";
import { TEST_EMAIL, ADMIN_EMAIL } from "./fixtures/test-account";
import { E2E_COURSE_PREFIX } from "./fixtures/test-golf-course";

// Playwright globalTeardown — 테스트가 통과하든 실패하든(Playwright 기본 동작) 전체 실행이
// 끝난 뒤 한 번 호출된다. 이 테스트 세션에서 만든 데이터를 실제로 정리하는 지점.
//
// User를 지우면 onDelete: Cascade로 Account/Session/Round(→HoleScore)까지 전부 함께
// 정리되므로, 테스트 중 생성된 라운드/홀스코어를 따로 지울 필요가 없다.
// GolfCourse/GolfCourseLoop/GolfCourseHole은 공공데이터 기반 공용 참조 데이터라 User cascade에
// 안 걸리므로, 관리자 시나리오들이 각자 만든 "E2E_TEST_" 접두사 골프장을 전부 이름으로
// 쓸어 지운다(cascade로 그 밑의 GolfCourseLoop/GolfCourseHole도 함께 정리됨) — 실제 652건은
// 이 접두사를 쓸 리 없으므로 손대지 않는다.
export default async function globalTeardown() {
  const prisma = createTestPrismaClient();
  try {
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    await prisma.user.deleteMany({ where: { email: ADMIN_EMAIL } });
    await prisma.golfCourse.deleteMany({
      where: { name: { startsWith: E2E_COURSE_PREFIX } },
    });
  } finally {
    await prisma.$disconnect();
  }
}
