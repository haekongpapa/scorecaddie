import { describe, expect, it, vi } from "vitest";
import { findDuplicateRound } from "./round-duplicate";
import { prisma } from "@/lib/prisma";

// prisma.round.findFirst 호출이 이 함수 안에 딱 하나뿐이라, 별도 mock 라이브러리 없이
// vi.mock으로 prisma 모듈 자체를 손으로 대체한다(coding-guidelines.md §5, mock 대상이
// 단순할 때의 방식 — golf-course-upload.test.ts는 호출이 여러 개라 vitest-mock-extended 사용).
vi.mock("@/lib/prisma", () => ({
  prisma: { round: { findFirst: vi.fn() } },
}));

const findFirstMock = prisma.round.findFirst as unknown as ReturnType<typeof vi.fn>;

describe("findDuplicateRound", () => {
  it("동일 유저·골프장·일자·출발시간 라운드가 있으면 그 결과를 반환한다", async () => {
    findFirstMock.mockResolvedValue({ id: "round-1" });

    const result = await findDuplicateRound({
      userId: "user-1",
      golfCourseId: "course-1",
      playedAt: new Date("2026-07-28T00:00:00.000Z"),
      startTime: "09:00",
    });

    expect(result).toEqual({ id: "round-1" });
    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        golfCourseId: "course-1",
        playedAt: new Date("2026-07-28T00:00:00.000Z"),
        startTime: "09:00",
      },
      select: { id: true },
    });
  });

  it("중복이 없으면 null을 반환한다", async () => {
    findFirstMock.mockResolvedValue(null);

    const result = await findDuplicateRound({
      userId: "user-1",
      golfCourseId: "course-1",
      playedAt: new Date("2026-07-28T00:00:00.000Z"),
      startTime: null,
    });

    expect(result).toBeNull();
  });
});
