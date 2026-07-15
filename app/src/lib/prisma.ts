import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Prisma 7의 기본(WASM 기반) 클라이언트 엔진은 datasource.url / DATABASE_URL을
// 런타임에 자동으로 읽지 않는다. 반드시 adapter를 통해 명시적으로 전달해야 하며,
// 이를 빠뜨리면 new PrismaClient() 호출 시점에 즉시 크래시한다.
// 단일 Client 대신 Pool을 넘겨야 동시 요청(nested write 등)에서 경고/오류가 없다.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
