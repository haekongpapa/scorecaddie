import bcrypt from "bcryptjs";
import { createTestPrismaClient } from "./fixtures/db";
import { TEST_EMAIL, TEST_PASSWORD, TEST_NAME } from "./fixtures/test-account";

// Playwright globalSetup — 전체 e2e 실행 전에 딱 한 번 호출된다.
// id/pw(Credentials provider) 로그인용 테스트 전용 계정을 실제 DB에 만들어둔다
// (구글 OAuth는 자동화가 어려워 이 방식을 씀 — doc/ScoreCaddie_테스트계획서.pptx 03절 참고).
export default async function globalSetup() {
  const prisma = createTestPrismaClient();
  try {
    // 이전 실행이 teardown 없이 중간에 끊긴 경우를 대비한 방어적 삭제.
    // User 삭제는 Account/Session/Round(→HoleScore)까지 cascade로 함께 정리된다
    // (prisma/schema.prisma의 onDelete: Cascade 참고).
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });

    await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        passwordHash: bcrypt.hashSync(TEST_PASSWORD, 10),
        name: TEST_NAME,
        role: "USER",
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
