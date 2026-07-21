import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-api";

// 루프가 실제로 이 골프장 소속인지 방어적으로 확인(다른 골프장 id로 조작 접근 방지).
async function findOwnedLoop(golfCourseId: string, loopId: string) {
  const loop = await prisma.golfCourseLoop.findUnique({ where: { id: loopId } });
  if (!loop || loop.golfCourseId !== golfCourseId) return null;
  return loop;
}

// 12번 화면 루프 이름 인라인 편집 / 드래그(-> 실제 구현은 위아래 버튼) 재정렬.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; loopId: string }> }
) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { id: golfCourseId, loopId } = await params;
  const loop = await findOwnedLoop(golfCourseId, loopId);
  if (!loop) {
    return NextResponse.json({ error: "루프를 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const data: { name?: string; sortOrder?: number } = {};

  if (body?.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "루프 이름을 입력해주세요." },
        { status: 400 }
      );
    }
    data.name = name;
  }
  if (body?.sortOrder !== undefined) {
    if (typeof body.sortOrder !== "number") {
      return NextResponse.json(
        { error: "sortOrder 값이 올바르지 않습니다." },
        { status: 400 }
      );
    }
    data.sortOrder = body.sortOrder;
  }

  try {
    const updated = await prisma.golfCourseLoop.update({
      where: { id: loopId },
      data,
    });
    return NextResponse.json({ loop: updated });
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
      { error: "루프 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 12번 화면 루프 삭제(✕). Round.frontLoopId/backLoopId는 optional 관계라 Prisma 기본
// referential action이 SetNull이므로, 이 루프를 참조하던 과거 라운드는 에러 없이
// 참조만 해제된다(HoleScore.par 스냅샷은 별도 필드라 영향 없음). 참조 건수 경고는
// 클라이언트가 페이지 로드 시점 값(_count)으로 confirm 문구에 표시 — 이 라우트에서
// 다시 계산하지 않음(동시 편집 가능성 낮은 관리자 단독 툴이라 근사치 허용).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; loopId: string }> }
) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { id: golfCourseId, loopId } = await params;
  const loop = await findOwnedLoop(golfCourseId, loopId);
  if (!loop) {
    return NextResponse.json({ error: "루프를 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.golfCourseLoop.delete({ where: { id: loopId } });
  return NextResponse.json({ ok: true });
}
