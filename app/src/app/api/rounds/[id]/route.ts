import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// 9번 화면 "삭제" 버튼 — 본인 소유 라운드만 삭제 가능. HoleScore는
// Round→HoleScore가 onDelete: Cascade 이므로 별도 삭제 없이 함께 정리된다.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const round = await prisma.round.findUnique({ where: { id } });
  if (!round || round.userId !== session.user.id) {
    return NextResponse.json({ error: "라운드를 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.round.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
