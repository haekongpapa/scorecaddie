import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-api";

const VALID_PARS = [3, 4, 5];

// 12번 화면 "저장" 버튼 — 활성 루프의 9홀 Par를 한 번에 upsert.
// (루프 CRUD와 달리 Par 값 변경은 즉시 반영하지 않고 이 API로 배치 저장 —
// "미저장 변경사항 안내" 요구사항과 맞물려, 홀마다 API 호출하지 않기 위함)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; loopId: string }> }
) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { id: golfCourseId, loopId } = await params;
  const loop = await prisma.golfCourseLoop.findUnique({ where: { id: loopId } });
  if (!loop || loop.golfCourseId !== golfCourseId) {
    return NextResponse.json({ error: "루프를 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const pars = body?.pars;
  if (
    !Array.isArray(pars) ||
    pars.length !== 9 ||
    pars.some((p) => !VALID_PARS.includes(p))
  ) {
    return NextResponse.json(
      { error: "pars는 3/4/5로 구성된 9개 배열이어야 합니다." },
      { status: 400 }
    );
  }

  await prisma.$transaction(
    (pars as number[]).map((par, idx) =>
      prisma.golfCourseHole.upsert({
        where: { loopId_holeNumber: { loopId, holeNumber: idx + 1 } },
        create: { loopId, holeNumber: idx + 1, par },
        update: { par },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
