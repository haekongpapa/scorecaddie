import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/services/admin-api";
import { env } from "@/lib/config/env";
import { withApiHandler } from "@/lib/services/with-api-handler";
import { runGeocodingBatch } from "@/lib/services/golf-course-geocode";

// 11번 관리자 화면 "좌표 지오코딩 실행" 버튼 — 공공데이터에 원본 좌표가 아예 없었던(rawCoordX/Y
// 없음 또는 변환 결과 이상치) 골프장(GolfCourse.needsGeocoding=true)을 대상으로 주소 기반
// 좌표를 채운다. lib/utils/geo.ts의 TM->WGS84 좌표 "변환"과는 별개로, 이쪽은 주소 문자열로 새
// 좌표를 "검색"하는 완전히 다른 경로(카카오 로컬 API).
//
// 2026-07-28: 배치 처리 로직은 lib/services/golf-course-geocode.ts로 분리
// (coding-guidelines.md §4-2) — 이 파일은 인증/설정값 확인과 응답 반환만 담당.

export const POST = withApiHandler(async () => {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  if (!env.kakaoRestApiKey) {
    return NextResponse.json(
      {
        error:
          "KAKAO_REST_API_KEY가 설정되지 않았습니다. .env에 카카오 REST API 키를 추가한 뒤 다시 시도해주세요.",
      },
      { status: 400 }
    );
  }

  const result = await runGeocodingBatch();
  return NextResponse.json(result);
});
