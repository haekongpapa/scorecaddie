import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getWeatherSnapshot, isWithinForecastRange } from "@/lib/weather/kma";

// 7-1번 화면 "라운드 당시 날씨" 카드 — 골프장/일자/(선택)출발시간이 정해질 때마다 호출해
// 미리보기를 보여준다. 실제 저장은 POST /api/rounds가 별도로 캡처(이 라우트는 조회 전용,
// Round를 만들지 않음). 예보 범위(오늘~+3일) 밖이거나 WEATHER_API_KEY 미설정/호출 실패 시엔
// available=false로 응답 — 화면은 이를 "날씨 정보 없음"으로 표시하면 된다(fail-soft).
//
// available=false일 때 왜 안 되는지 화면에서 바로 원인을 알 수 있도록 reason을 함께 내려준다
// (디버깅용, 2026-07-22 추가). 화면(RoundStep1)은 reason을 쓰지 않고 그냥 "날씨 정보 없음"만
// 보여주면 되지만, API를 직접 호출해 확인할 때는 이 값으로 원인을 바로 알 수 있다.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const url = new URL(req.url);
  const courseId = url.searchParams.get("courseId");
  const date = url.searchParams.get("date");
  const time = url.searchParams.get("time"); // "HH:MM", 선택

  if (!courseId || !date) {
    return NextResponse.json({ error: "골프장과 일자가 필요합니다." }, { status: 400 });
  }
  if (Number.isNaN(Date.parse(date))) {
    return NextResponse.json({ error: "일자 값이 올바르지 않습니다." }, { status: 400 });
  }

  const course = await prisma.golfCourse.findUnique({
    where: { id: courseId },
    select: { latitude: true, longitude: true },
  });

  if (!course) {
    return NextResponse.json({ available: false, label: null, reason: "course_not_found" });
  }
  if (course.latitude === null || course.longitude === null) {
    return NextResponse.json({ available: false, label: null, reason: "course_no_coordinates" });
  }
  if (!process.env.WEATHER_API_KEY) {
    return NextResponse.json({ available: false, label: null, reason: "missing_api_key" });
  }
  if (!isWithinForecastRange(new Date(date))) {
    return NextResponse.json({ available: false, label: null, reason: "out_of_forecast_range" });
  }

  const label = await getWeatherSnapshot({
    lat: course.latitude,
    lng: course.longitude,
    targetDate: new Date(date),
    targetTimeHHMM: time,
  });

  return NextResponse.json({
    available: label !== null,
    label,
    reason: label === null ? "api_call_failed_or_no_data" : undefined,
  });
}
