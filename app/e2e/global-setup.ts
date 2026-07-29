import bcrypt from "bcryptjs";
import { createTestPrismaClient } from "./fixtures/db";
import {
  TEST_EMAIL,
  TEST_PASSWORD,
  TEST_NAME,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_NAME,
} from "./fixtures/test-account";
import { E2E_COURSE_PREFIX } from "./fixtures/test-golf-course";

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

    // 관리자 시나리오(5~8) 전용 계정 — role만 다르고 나머지는 위와 동일한 패턴.
    await prisma.user.deleteMany({ where: { email: ADMIN_EMAIL } });
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash: bcrypt.hashSync(ADMIN_PASSWORD, 10),
        name: ADMIN_NAME,
        role: "ADMIN",
      },
    });

    // 관리자 시나리오 전용 골프장은 각 admin-*.spec.ts가 스스로 만든다(테스트 간 순서 의존성을
    // 피하기 위해 시나리오마다 별도 이름 — fixtures/test-golf-course.ts 참고). 여기서는 이전
    // 실행이 teardown 없이 끊긴 경우를 대비해 이 접두사로 시작하는 골프장을 방어적으로만 정리.
    await prisma.golfCourse.deleteMany({
      where: { name: { startsWith: E2E_COURSE_PREFIX } },
    });
  } finally {
    await prisma.$disconnect();
  }
}
