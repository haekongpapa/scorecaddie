import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { DUPLICATE_ROUND_MESSAGE, findDuplicateRound } from "@/lib/round-duplicate";

// 7-1번 화면 "스코어 카드" 버튼 클릭 시 Step2로 넘어가기 전에 미리 확인 — 이미 동일한
// 골프장·일자·출발 시간으로 등록된 라운드가 있으면 Step2 진입 자체를 막아 더블 등록을 방지한다.
// (POST /api/rounds에도 동일한 검증이 한 번 더 있음 — 여기는 조기 안내용, 그쪽이 최종 방어선)
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const url = new URL(req.url);
  const golfCourseId = url.searchParams.get("courseId");
  const date = url.searchParams.get("date");
  const startTime = url.searchParams.get("startTime");

  if (!golfCourseId || !date) {
    return NextResponse.json({ error: "골프장과 일자가 필요합니다." }, { status: 400 });
  }
  if (Number.isNaN(Date.parse(date))) {
    return NextResponse.json({ error: "일자 값이 올바르지 않습니다." }, { status: 400 });
  }

  const duplicate = await findDuplicateRound({
    userId: session.user.id,
    golfCourseId,
    playedAt: new Date(date),
    startTime: startTime || null,
  });

  return NextResponse.json({
    duplicate: Boolean(duplicate),
    message: duplicate ? DUPLICATE_ROUND_MESSAGE : null,
  });
}
