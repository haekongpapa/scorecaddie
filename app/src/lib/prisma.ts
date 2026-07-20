import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7의 기본(WASM 기반) 클라이언트 엔진은 datasource.url / DATABASE_URL을
// 런타임에 자동으로 읽지 않는다. 반드시 adapter를 통해 명시적으로 전달해야 하며,
// 이를 빠뜨리면 new PrismaClient() 호출 시점에 즉시 크래시한다.
// 주의: new PrismaPg(pool) 처럼 pg Pool 인스턴스를 직접 넘기는 방식은 현재 설치된
// @prisma/adapter-pg + pg 조합에서 실제 쿼리 실행 시 ERR_INVALID_ARG_TYPE 오류로 깨짐
// (검증 완료, 재현됨). 반드시 connectionString 객체를 넘기는 방식을 사용한다.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
