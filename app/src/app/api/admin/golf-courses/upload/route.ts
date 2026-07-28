import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/services/admin-api";
import { parseCsv } from "@/lib/services/csv";
import { withApiHandler } from "@/lib/services/with-api-handler";
import { processGolfCourseCsvRows } from "@/lib/services/golf-course-upload";

// 13번 화면 "업로드 및 처리" — 로직 상세는 doc/admin-csv-upload.md 참고.
// CSV 포맷: 골프장명,루프명,홀번호,Par (첫 행 헤더, 홀번호 1~9, Par 3/4/5)
//
// 2026-07-28: 행 단위 검증/upsert 로직은 lib/services/golf-course-upload.ts로 분리
// (coding-guidelines.md §4-2) — 이 파일은 파일 검증/파싱/응답 포맷팅만 담당.

const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const MAX_ROWS = 2000;

export const POST = withApiHandler(async (req: Request) => {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "CSV 파일을 첨부해주세요." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "파일 크기는 1MB를 초과할 수 없습니다." },
      { status: 400 }
    );
  }

  const text = await file.text();
  const rows = parseCsv(text);
  // 첫 행은 헤더로 간주하고 파싱에서 제외 (admin-csv-upload.md)
  const dataRows = rows.slice(1);

  if (dataRows.length === 0) {
    return NextResponse.json(
      { error: "업로드할 데이터 행이 없습니다." },
      { status: 400 }
    );
  }
  if (dataRows.length > MAX_ROWS) {
    return NextResponse.json(
      {
        error: `한 번에 최대 ${MAX_ROWS}행까지 업로드할 수 있습니다 (${dataRows.length}행 감지).`,
      },
      { status: 400 }
    );
  }

  const { successCount, errors } = await processGolfCourseCsvRows(dataRows);

  return NextResponse.json({
    totalRows: dataRows.length,
    successCount,
    failCount: errors.length,
    // 응답 과다 방지 — 최대 2000행 처리하지만 오류 목록은 상위 200건만 반환
    errors: errors.slice(0, 200),
  });
});
