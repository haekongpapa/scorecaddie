import { prisma } from "@/lib/prisma";

// CSV 업로드(골프장 루프/Par) 처리 로직 본체 — 행 단위 검증 + 루프/홀 upsert를 담당.
// (route.ts에서 분리, coding-guidelines.md §4-2 "API route는 얇게" 적용, 2026-07-28)
// app/api/admin/golf-courses/upload/route.ts는 파일 파싱/응답 포맷팅만 담당하고 이 파일을
// 호출한다. 로직은 원래 route.ts에 있던 것을 그대로 옮긴 것이라 동작 변화 없음.
// CSV 포맷 상세는 doc/admin-csv-upload.md 참고.

const VALID_PARS = [3, 4, 5];

export type UploadRowError = {
  row: number;
  courseName: string;
  loopName: string;
  message: string;
};

export type UploadResult = {
  successCount: number;
  errors: UploadRowError[];
};

// dataRows: 헤더를 제외한 CSV 행들(각 행 = [골프장명, 루프명, 홀번호, Par]).
export async function processGolfCourseCsvRows(dataRows: string[][]): Promise<UploadResult> {
  let successCount = 0;
  const errors: UploadRowError[] = [];
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

  return { successCount, errors };
}
