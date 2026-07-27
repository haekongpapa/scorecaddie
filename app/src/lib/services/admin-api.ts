import { NextResponse } from "next/server";
import { auth } from "@/auth";

// 12번(루프·Par 입력) API 라우트가 3개(loops/[id]/route, loops/[id]/holes/route, loops/route)로
// 나뉘면서 세션+ADMIN role 체크가 반복되므로 공용 헬퍼로 분리.
// (11번 sync/route.ts는 라우트가 1개뿐이라 인라인으로 남겨둠 — 나중에 admin API가 더 늘어나면 그쪽도 통합 고려)
export async function requireAdminSession() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      session: null,
      errorResponse: NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      ),
    };
  }
  if (session.user.role !== "ADMIN") {
    return {
      session: null,
      errorResponse: NextResponse.json(
        { error: "관리자만 이용할 수 있습니다." },
        { status: 403 }
      ),
    };
  }
  return { session, errorResponse: null };
}
