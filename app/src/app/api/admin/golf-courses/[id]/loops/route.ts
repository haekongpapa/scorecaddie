import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-api";

// 12번 화면 "+ 루프 추가" — 새 루프를 해당 골프장의 마지막 sortOrder 다음 순번으로 생성.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { id: golfCourseId } = await params;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "루프 이름을 입력해주세요." },
      { status: 400 }
    );
  }

  const course = await prisma.golfCourse.findUnique({
    where: { id: golfCourseId },
    select: { id: true },
  });
  if (!course) {
    return NextResponse.json(
      { error: "골프장을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const maxSort = await prisma.golfCourseLoop.aggregate({
    where: { golfCourseId },
    _max: { sortOrder: true },
  });

  try {
    const loop = await prisma.golfCourseLoop.create({
      data: {
        golfCourseId,
        name,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });
    return NextResponse.json({ loop });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "이미 존재하는 루프 이름입니다." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "루프 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
