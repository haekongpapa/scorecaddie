import { prisma } from "@/lib/prisma";

// 스코어 등록(7-1/7-2) 중복 방지 — 같은 사용자가 같은 골프장·같은 일자·같은 출발 시간으로
// 이미 등록해둔 라운드가 있는지 확인한다. 시간대가 다르면 같은 날 두 번 라운드한 정상 케이스로
// 간주해 중복으로 취급하지 않는다.
export async function findDuplicateRound({
  userId,
  golfCourseId,
  playedAt,
  startTime,
}: {
  userId: string;
  golfCourseId: string;
  playedAt: Date;
  startTime: string | null;
}) {
  return prisma.round.findFirst({
    where: { userId, golfCourseId, playedAt, startTime },
    select: { id: true },
  });
}

export const DUPLICATE_ROUND_MESSAGE =
  "동일한 골프장에 같은 일자·같은 출발 시간으로 등록된 스코어가 이미 있습니다.";
