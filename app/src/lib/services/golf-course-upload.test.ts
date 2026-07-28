import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";

// golf-course-upload.ts는 한 함수 안에서 prisma를 여러 모델·여러 메서드로 호출하므로
// (golfCourse.findMany, golfCourseLoop.findUnique/count/create, golfCourseHole.upsert),
// 손으로 하나씩 vi.fn()을 만드는 대신 vitest-mock-extended의 mockDeep을 쓴다 —
// round-duplicate.test.ts(호출 1개)와 대비되는 방식.
//
// 주의(2026-07-28): mockDeep<PrismaClient>()로 실제 @prisma/client의 PrismaClient 타입을
// 그대로 넘기면 Prisma 7이 생성하는 groupBy/aggregate의 "...ScalarWhereWithAggregatesInput"
// 타입이 워낙 복잡해 TS가 "circularly references itself"(TS2615)로 컴파일 실패한다(실사용
// 확인됨). 이 함수가 실제로 쓰는 메서드만 담은 좁은 타입을 대신 mockDeep 대상으로 삼아
// Prisma의 방대한 생성 타입 자체를 아예 안 건드리는 방식으로 회피 — jest-mock-extended/
// vitest-mock-extended + Prisma 조합에서 흔히 쓰는 우회법이다.
type PrismaLike = {
  golfCourse: {
    findMany: (args: { where: { name: string }; select: { id: true } }) => Promise<{ id: string }[]>;
  };
  golfCourseLoop: {
    findUnique: (args: unknown) => Promise<{ id: string } | null>;
    count: (args: unknown) => Promise<number>;
    create: (args: unknown) => Promise<{ id: string }>;
  };
  golfCourseHole: {
    upsert: (args: unknown) => Promise<unknown>;
  };
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockDeep<PrismaLike>(),
}));

import { prisma } from "@/lib/prisma";
import { processGolfCourseCsvRows } from "./golf-course-upload";

const prismaMock = prisma as unknown as DeepMockProxy<PrismaLike>;

beforeEach(() => {
  mockReset(prismaMock);
});

describe("processGolfCourseCsvRows", () => {
  it("필수값이 빠진 행은 DB 조회 없이 바로 오류로 처리한다", async () => {
    const rows = [
      ["", "루프A", "1", "4"], // 골프장명 누락
      ["서라벌", "", "1", "4"], // 루프명 누락
      ["서라벌", "루프A", "10", "4"], // 홀번호 범위 오류(1~9)
      ["서라벌", "루프A", "1", "6"], // Par 값 오류(3/4/5만 허용)
    ];

    const result = await processGolfCourseCsvRows(rows);

    expect(result.successCount).toBe(0);
    expect(result.errors).toHaveLength(4);
    expect(result.errors.map((e) => e.message)).toEqual([
      "골프장명 누락",
      "루프명 누락",
      "홀번호 범위 오류(10)",
      "Par 값 오류(6)",
    ]);
    expect(prismaMock.golfCourse.findMany).not.toHaveBeenCalled();
  });

  it("정상 행은 골프장/루프를 조회·생성하고 홀을 upsert해 성공 처리한다", async () => {
    prismaMock.golfCourse.findMany.mockResolvedValue([{ id: "course-1" }] as never);
    prismaMock.golfCourseLoop.findUnique.mockResolvedValue(null);
    prismaMock.golfCourseLoop.count.mockResolvedValue(0);
    prismaMock.golfCourseLoop.create.mockResolvedValue({ id: "loop-1" } as never);
    prismaMock.golfCourseHole.upsert.mockResolvedValue({} as never);

    const result = await processGolfCourseCsvRows([["서라벌", "루프A", "1", "4"]]);

    expect(result.successCount).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(prismaMock.golfCourseLoop.create).toHaveBeenCalledWith({
      data: { golfCourseId: "course-1", name: "루프A", sortOrder: 0 },
    });
    expect(prismaMock.golfCourseHole.upsert).toHaveBeenCalledWith({
      where: { loopId_holeNumber: { loopId: "loop-1", holeNumber: 1 } },
      create: { loopId: "loop-1", holeNumber: 1, par: 4 },
      update: { par: 4 },
    });
  });

  it("골프장명이 DB에 없으면 '골프장명 불일치' 오류를 남긴다", async () => {
    prismaMock.golfCourse.findMany.mockResolvedValue([]);

    const result = await processGolfCourseCsvRows([["없는골프장", "루프A", "1", "4"]]);

    expect(result.successCount).toBe(0);
    expect(result.errors[0].message).toBe("골프장명 불일치");
  });

  it("골프장명이 중복이면 '골프장명 중복, 특정 불가' 오류를 남긴다", async () => {
    prismaMock.golfCourse.findMany.mockResolvedValue([
      { id: "course-1" },
      { id: "course-2" },
    ] as never);

    const result = await processGolfCourseCsvRows([["중복골프장", "루프A", "1", "4"]]);

    expect(result.errors[0].message).toBe("골프장명 중복, 특정 불가");
  });

  it("같은 (골프장, 루프) 조합이 여러 행에 반복되면 루프 조회는 한 번만 한다(캐시)", async () => {
    prismaMock.golfCourse.findMany.mockResolvedValue([{ id: "course-1" }] as never);
    prismaMock.golfCourseLoop.findUnique.mockResolvedValue({ id: "loop-1" } as never);
    prismaMock.golfCourseHole.upsert.mockResolvedValue({} as never);

    const result = await processGolfCourseCsvRows([
      ["서라벌", "루프A", "1", "4"],
      ["서라벌", "루프A", "2", "5"],
    ]);

    expect(result.successCount).toBe(2);
    expect(prismaMock.golfCourseLoop.findUnique).toHaveBeenCalledTimes(1);
  });

  it("홀 저장(upsert) 중 오류가 나면 해당 행만 '저장 중 오류'로 처리한다", async () => {
    prismaMock.golfCourse.findMany.mockResolvedValue([{ id: "course-1" }] as never);
    prismaMock.golfCourseLoop.findUnique.mockResolvedValue({ id: "loop-1" } as never);
    prismaMock.golfCourseHole.upsert.mockRejectedValue(new Error("db down"));

    const result = await processGolfCourseCsvRows([["서라벌", "루프A", "1", "4"]]);

    expect(result.successCount).toBe(0);
    expect(result.errors[0].message).toBe("저장 중 오류");
  });
});
