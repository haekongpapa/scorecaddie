import { createTestPrismaClient } from "./fixtures/db";
import { TEST_EMAIL } from "./fixtures/test-account";

// Playwright globalTeardown — 테스트가 통과하든 실패하든(Playwright 기본 동작) 전체 실행이
// 끝난 뒤 한 번 호출된다. 이 테스트 세션에서 만든 데이터를 실제로 정리하는 지점.
//
// User를 지우면 onDelete: Cascade로 Account/Session/Round(→HoleScore)까지 전부 함께
// 정리되므로, 테스트 중 생성된 라운드/홀스코어를 따로 지울 필요가 없다.
// GolfCourse/GolfCourseLoop/GolfCourseHole은 공공데이터 기반 공용 참조 데이터이므로 건드리지 않는다.
export default async function globalTeardown() {
  const prisma = createTestPrismaClient();
  try {
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  } finally {
    await prisma.$disconnect();
  }
}
