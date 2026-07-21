import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-api";

// 14번 화면 일괄 액션 바("어드민 권한 부여"/"어드민 권한 해제").
// 정책(2026-07-21 확정): 본인 계정의 어드민 권한 자가 해제는 서버에서 차단한다 —
// 요청 대상 목록에 본인 id가 포함돼 있고 role이 USER(해제)면 그 id만 조용히 제외하고
// 나머지는 정상 처리(전체 요청을 거부하지 않음, 부분 성공 허용). 응답의 `skippedSelf`로
// 클라이언트가 "본인 권한은 해제되지 않았습니다" 안내를 띄울 수 있게 한다.
export async function PATCH(req: Request) {
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => null);
  const userIds = Array.isArray(body?.userIds)
    ? body.userIds.filter((id: unknown): id is string => typeof id === "string")
    : [];
  const role = body?.role;

  if (userIds.length === 0) {
    return NextResponse.json(
      { error: "변경할 회원을 선택해주세요." },
      { status: 400 }
    );
  }
  if (role !== "ADMIN" && role !== "USER") {
    return NextResponse.json(
      { error: "role은 ADMIN 또는 USER여야 합니다." },
      { status: 400 }
    );
  }

  let targetIds = userIds;
  let skippedSelf = false;
  if (role === "USER" && session!.user.id && userIds.includes(session!.user.id)) {
    targetIds = userIds.filter((id) => id !== session!.user.id);
    skippedSelf = true;
  }

  const result =
    targetIds.length > 0
      ? await prisma.user.updateMany({
          where: { id: { in: targetIds } },
          data: { role },
        })
      : { count: 0 };

  return NextResponse.json({ updatedCount: result.count, skippedSelf });
}
