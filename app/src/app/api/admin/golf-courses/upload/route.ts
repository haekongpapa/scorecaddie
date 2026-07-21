import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-api";
import { parseCsv } from "@/lib/csv";

// 13번 화면 "업로드 및 처리" — 로직 상세는 doc/admin-csv-upload.md 참고.
// CSV 포맷: 골프장명,루프명,홀번호,Par (첫 행 헤더, 홀번호 1~9, Par 3/4/5)

const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const MAX_ROWS = 2000;
const VALID_PARS = [3, 4, 5];

type RowError = {
  row: number;
  courseName: string;
  loopName: string;
  message: string;
};

export async function POST(req: Request) {
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

  let successCount = 0;
  const errors: RowError[] = [];
  // 같은 업로드 안에서 (골프장, 루프명) 조합이 홀 수만큼(최대 9번) 반복 등장하므로,
  // 매번 다시 조회/생성하지 않도록 요청 단위로 캐시. 실패한 조합(null)도 캐시해
  // 같은 오류가 9번 반복 조회되는 것을 방지.
  const loopCache = new Map<string, string | null>();

  for (let i = 0; i < dataRows.length; i++) {
    const rowNum = i + 2; // 헤더가 1행이므로 파일 기준 실제 행 번호
    const [rawCourseName, rawLoopName, rawHoleNumber, rawPar] = dataRows[i];
    const courseName = (rawCourseName ?? "").trim();
    const loopName = (rawLoopName ?? "").trim();

    if (!courseName) {
      errors.push({ row: rowNum, courseName, loopName, message: "골프장명 누락" });
      continue;
    }
    if (!loopName) {
      errors.push({ row: rowNum, courseName, loopName, message: "루프명 누락" });
      continue;
    }

    const holeNumber = Number(rawHoleNumber);
    if (!Number.isInteger(holeNumber) || holeNumber < 1 || holeNumber > 9) {
      errors.push({
        row: rowNum,
        courseName,
        loopName,
        message: `홀번호 범위 오류(${rawHoleNumber ?? ""})`,
      });
      continue;
    }

    const par = Number(rawPar);
    if (!VALID_PARS.includes(par)) {
      errors.push({
        row: rowNum,
        courseName,
        loopName,
        message: `Par 값 오류(${rawPar ?? ""})`,
      });
      continue;
    }

    const courses = await prisma.golfCourse.findMany({
      where: { name: courseName },
      select: { id: true },
    });
    if (courses.length === 0) {
      errors.push({ row: rowNum, courseName, loopName, message: "골프장명 불일치" });
      continue;
    }
    if (courses.length > 1) {
      errors.push({
        row: rowNum,
        courseName,
        loopName,
        message: "골프장명 중복, 특정 불가",
      });
      continue;
    }
    const golfCourseId = courses[0].id;

    const cacheKey = `${golfCourseId}::${loopName}`;
    let loopId = loopCache.get(cacheKey);
    if (loopId === undefined) {
      try {
        let loop = await prisma.golfCourseLoop.findUnique({
          where: { golfCourseId_name: { golfCourseId, name: loopName } },
        });
        if (!loop) {
          const existingCount = await prisma.golfCourseLoop.count({
            where: { golfCourseId },
          });
          loop = await prisma.golfCourseLoop.create({
            data: { golfCourseId, name: loopName, sortOrder: existingCount },
          });
        }
        loopId = loop.id;
      } catch {
        loopId = null;
      }
      loopCache.set(cacheKey, loopId);
    }

    if (!loopId) {
      errors.push({
        row: rowNum,
        courseName,
        loopName,
        message: "루프 생성/조회 실패",
      });
      continue;
    }

    try {
      await prisma.golfCourseHole.upsert({
        where: { loopId_holeNumber: { loopId, holeNumber } },
        create: { loopId, holeNumber, par },
        update: { par },
      });
      successCount++;
    } catch {
      errors.push({ row: rowNum, courseName, loopName, message: "저장 중 오류" });
    }
  }

  return NextResponse.json({
    totalRows: dataRows.length,
    successCount,
    failCount: errors.length,
    // 응답 과다 방지 — 최대 2000행 처리하지만 오류 목록은 상위 200건만 반환
    errors: errors.slice(0, 200),
  });
}
