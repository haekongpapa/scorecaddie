import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// global-setup/global-teardown, 그리고 DB 상태를 직접 확인·시딩해야 하는 일부 spec에서
// 공용으로 쓰는 PrismaClient 생성 헬퍼.
//
// src/lib/prisma.ts의 싱글턴 패턴을 그대로 따르지 않는 이유: 이 파일은 Next.js 런타임이
// 아니라 Playwright의 Node 프로세스(globalSetup/globalTeardown/테스트 파일)에서 실행되므로
// globalThis 캐싱이 의미가 없고, 오히려 매 호출마다 명시적으로 connect/disconnect 하는 편이
// 테스트 실행 후 커넥션이 남아 프로세스가 안 끝나는 문제를 피하기 좋다.
//
// Prisma 7 WASM 엔진은 datasource.url을 자동으로 읽지 않으므로 src/lib/prisma.ts와 동일하게
// @prisma/adapter-pg를 통해 DATABASE_URL을 명시적으로 넘긴다.
export function createTestPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL이 설정되어 있지 않습니다. app/.env를 확인해주세요 (e2e 테스트는 실제 DB가 필요합니다)."
    );
  }
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}
