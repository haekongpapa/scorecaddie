import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-api";
import { geocodeAddress } from "@/lib/geocoding/kakao";

// 11번 관리자 화면 "좌표 지오코딩 실행" 버튼 — 공공데이터에 원본 좌표가 아예 없었던(rawCoordX/Y
// 없음 또는 변환 결과 이상치) 골프장(GolfCourse.needsGeocoding=true)을 대상으로 주소 기반
// 좌표를 채운다. lib/geo.ts의 TM->WGS84 좌표 "변환"과는 별개로, 이쪽은 주소 문자열로 새
// 좌표를 "검색"하는 완전히 다른 경로(카카오 로컬 API).
//
// 안전장치: 한 번 호출에 최대 BATCH_LIMIT건만 처리(서버리스 함수 실행시간 제한 대비).
// 처리 못 한 나머지는 needsGeocoding=true로 그대로 남아있으니 버튼을 다시 누르면 이어서 처리됨
// (별도 페이지네이션 상태를 둘 필요 없음 — DB 플래그 자체가 진행 상태).
const BATCH_LIMIT = 150;
const DELAY_MS = 150; // 카카오 로컬 API 순간 QPS 제한 여유를 위해 호출 사이 최소 간격
const MAX_ERRORS_RETURNED = 200;

export async function POST() {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  if (!process.env.KAKAO_REST_API_KEY) {
    return NextResponse.json(
      {
        error:
          "KAKAO_REST_API_KEY가 설정되지 않았습니다. .env에 카카오 REST API 키를 추가한 뒤 다시 시도해주세요.",
      },
      { status: 400 }
    );
  }

  const needsGeocoding = await prisma.golfCourse.findMany({
    where: { needsGeocoding: true },
    select: { id: true, name: true, address: true },
    orderBy: { name: "asc" },
  });

  const noAddressCount = needsGeocoding.filter((c) => !c.address).length;
  const targets = needsGeocoding.filter((c) => c.address).slice(0, BATCH_LIMIT);

  let successCount = 0;
  let failCount = 0;
  let processedCount = 0;
  let stoppedEarly: string | null = null;
  const errors: { id: string; name: string; message: string }[] = [];

  for (const course of targets) {
    const result = await geocodeAddress(course.address!, course.name);
    processedCount++;

    if ("lat" in result) {
      await prisma.golfCourse.update({
        where: { id: course.id },
        data: { latitude: result.lat, longitude: result.lng, needsGeocoding: false },
      });
      successCount++;
    } else {
      failCount++;
      if (errors.length < MAX_ERRORS_RETURNED) {
        errors.push({ id: course.id, name: course.name, message: result.reason });
      }
      // 첫 건부터 인증/권한 실패면 키·앱 설정 자체가 잘못된 것 — 나머지 전부 시도해봐야
      // 똑같이 실패할 게 뻔하니 배치를 조기 중단하고 원인을 명확히 알려준다.
      if (
        processedCount === 1 &&
        (result.reason.includes("인증 실패") || result.reason.includes("권한 없음"))
      ) {
        stoppedEarly = result.reason;
        break;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }

  const remainingCount = needsGeocoding.filter((c) => c.address).length - processedCount;

  return NextResponse.json({
    totalTargeted: targets.length,
    processedCount,
    successCount,
    failCount,
    remainingCount, // 다음 실행에서 이어서 처리될 건수(0이면 전부 처리됨)
    noAddressCount, // 주소 자체가 없어 이번 배치 대상에서 애초에 제외된 건수
    stoppedEarly, // 인증 실패 등으로 배치를 조기 중단했으면 그 사유(null이면 정상 진행)
    errors,
  });
}
