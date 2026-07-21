import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-api";

// DB에 실제로 저장된 골프장별 루프·홀 Par 데이터를 13번(CSV 일괄 업로드)과 동일한
// 포맷(골프장명,루프명,홀번호,Par — doc/admin-csv-upload.md 참고)으로 내보낸다.
// UI(GolfCourseParEditor)는 미저장 홀을 Par 4로 기본 표시하지만, 이 내보내기는
// 실제 DB에 저장된 GolfCourseHole 행만 사용한다 — 즉 아직 Par를 등록하지 않은 홀은
// 결과에서 제외된다("조사" 목적이므로 UI 표시용 기본값을 섞지 않음).
function csvField(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export async function GET() {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const courses = await prisma.golfCourse.findMany({
    orderBy: { name: "asc" },
    include: {
      loops: {
        orderBy: { sortOrder: "asc" },
        include: { holes: { orderBy: { holeNumber: "asc" } } },
      },
    },
  });

  const lines = ["골프장명,루프명,홀번호,Par"];
  for (const course of courses) {
    for (const loop of course.loops) {
      for (const hole of loop.holes) {
        lines.push(
          [
            csvField(course.name),
            csvField(loop.name),
            hole.holeNumber,
            hole.par,
          ].join(",")
        );
      }
    }
  }

  // BOM 추가 — 엑셀에서 한글 깨짐 방지(admin-csv-upload.md도 "BOM 포함/미포함 모두 허용"로
  // 명시하고 있어 업로드 쪽 파서와도 호환됨).
  const csv = "﻿" + lines.join("\n") + "\n";
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="golf-course-par-export_${today}.csv"`,
    },
  });
}
