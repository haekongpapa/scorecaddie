import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { env } from "@/lib/config/env";
import { withApiHandler } from "@/lib/services/with-api-handler";
import { runGolfCourseSync } from "@/lib/services/golf-course-sync";

// 골프장 공공 데이터 업로드 (11번 화면 "골프장 공공 데이터 업로드" 버튼)
//
// 2026-07-20 재구현: 처음엔 data.go.kr이 파일데이터만 제공한다고 판단해 CSV 업로드
// 방식으로 만들었으나, 사용자가 실제 API 스펙(요청/응답 예시)을 제공해 **실시간 Open
// API**임이 확인됨. 이에 따라 파일 업로드 없이 서버가 직접 apis.data.go.kr을 호출해
// 전체 골프장 목록을 가져와 upsert하는 방식으로 전면 교체.
//
// 2026-07-28: 실제 페이지네이션/upsert 로직은 lib/services/golf-course-sync.ts로 분리
// (coding-guidelines.md §4-2) — 이 파일은 인증 확인과 응답 포맷팅만 담당. 인증 체크를
// requireAdminSession() 공용 헬퍼로 통합하지 않고 인라인으로 남겨둔 것도 그대로 유지
// (이 admin API는 라우트가 1개뿐이라 굳이 통합할 실익이 적음, 기존 설계 그대로).
//
// 2026-07-29: "전체" 옵션 추가 — 요청 바디의 fullSync(boolean)를 그대로
// runGolfCourseSync에 전달한다. 기본(전체 미선택/바디 없음)은 증분 동기화.

export const POST = withApiHandler(async (req: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자만 이용할 수 있습니다." }, { status: 403 });
  }

  const serviceKey = env.publicDataApiKey;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "PUBLIC_DATA_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const fullSync = body?.fullSync === true;

  const result = await runGolfCourseSync(serviceKey, { fullSync });

  if ("fetchError" in result) {
    return NextResponse.json(
      {
        error: "공공데이터 API 첫 페이지 호출에 실패했습니다: " + result.fetchError,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    totalCount: result.totalCount,
    addedCount: result.addedCount,
    updatedCount: result.updatedCount,
    skippedCount: result.errors.length,
    errors: result.errors.slice(0, 50),
    incomplete: result.incomplete,
    usedIncremental: result.usedIncremental,
    lastUpdatedAt: new Date().toISOString(),
  });
});
