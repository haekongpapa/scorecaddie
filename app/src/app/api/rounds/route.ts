import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DUPLICATE_ROUND_MESSAGE, findDuplicateRound } from "@/lib/round-duplicate";
import { getWeatherSnapshot } from "@/lib/weather/kma";

const START_TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

// 7-2번 화면에서 첫 홀을 저장하는 시점에 호출 — Round를 지연 생성한다.
// (Step1에서 미리 만들지 않는 이유: 사용자가 Step2까지 왔다가 아무 홀도 저장하지 않고
// 이탈하는 경우 빈 Round가 남는 것을 피하기 위함)
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const golfCourseId = body?.golfCourseId;
  const playedAt = body?.playedAt;
  const holesPlayed = body?.holesPlayed;
  const frontLoopId = body?.frontLoopId ?? null;
  const backLoopId = body?.backLoopId ?? null;
  const startTime = body?.startTime ?? null;

  if (typeof golfCourseId !== "string" || !golfCourseId) {
    return NextResponse.json({ error: "골프장을 선택해주세요." }, { status: 400 });
  }
  if (typeof playedAt !== "string" || Number.isNaN(Date.parse(playedAt))) {
    return NextResponse.json({ error: "라운드 일자가 올바르지 않습니다." }, { status: 400 });
  }
  if (holesPlayed !== 9 && holesPlayed !== 18) {
    return NextResponse.json({ error: "홀 수는 9 또는 18이어야 합니다." }, { status: 400 });
  }
  if (frontLoopId !== null && typeof frontLoopId !== "string") {
    return NextResponse.json({ error: "전반 루프 값이 올바르지 않습니다." }, { status: 400 });
  }
  if (backLoopId !== null && typeof backLoopId !== "string") {
    return NextResponse.json({ error: "후반 루프 값이 올바르지 않습니다." }, { status: 400 });
  }
  if (startTime !== null && (typeof startTime !== "string" || !START_TIME_RE.test(startTime))) {
    return NextResponse.json({ error: "출발 시간 값이 올바르지 않습니다." }, { status: 400 });
  }

  const course = await prisma.golfCourse.findUnique({ where: { id: golfCourseId } });
  if (!course) {
    return NextResponse.json({ error: "골프장을 찾을 수 없습니다." }, { status: 404 });
  }

  const playedAtDate = new Date(playedAt);

  const duplicate = await findDuplicateRound({
    userId: session.user.id,
    golfCourseId,
    playedAt: playedAtDate,
    startTime,
  });
  if (duplicate) {
    return NextResponse.json({ error: DUPLICATE_ROUND_MESSAGE, duplicateRoundId: duplicate.id }, { status: 409 });
  }

  // 라운드 등록 시점에 골프장 좌표 기반 날씨 스냅샷을 한 번 캡처해 고정 기록으로 남긴다
  // (이후 실제 날씨가 바뀌어도 등록 당시 예보 그대로 유지). 좌표가 없거나(needsGeocoding),
  // 예보 제공 범위(오늘~+3일) 밖이거나, API 호출 자체가 실패해도 라운드 생성은 막지 않고
  // weatherSnapshot만 null로 남긴다(fail-soft) — getWeatherSnapshot이 이미 그렇게 동작함.
  let weatherSnapshot: string | null = null;
  if (course.latitude !== null && course.longitude !== null) {
    weatherSnapshot = await getWeatherSnapshot({
      lat: course.latitude,
      lng: course.longitude,
      targetDate: playedAtDate,
      targetTimeHHMM: startTime,
    });
  }

  const round = await prisma.round.create({
    data: {
      userId: session.user.id,
      golfCourseId,
      playedAt: playedAtDate,
      startTime,
      holesPlayed,
      frontLoopId,
      backLoopId: holesPlayed === 18 ? backLoopId : null,
      weatherSnapshot,
    },
  });

  return NextResponse.json({ roundId: round.id });
}
