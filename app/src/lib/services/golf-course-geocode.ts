import { prisma } from "@/lib/prisma";
import { geocodeAddress } from "@/lib/geocoding/kakao";

// 좌표 지오코딩 배치 처리 로직 본체 — 대상 조회 + 카카오 API 순회 호출 + DB 갱신을 담당.
// (route.ts에서 분리, coding-guidelines.md §4-2 "API route는 얇게" 적용, 2026-07-28)
// app/api/admin/golf-courses/geocode/route.ts는 인증 확인/응답 포맷팅만 담당하고 이 파일을
// 호출한다. 로직은 원래 route.ts에 있던 것을 그대로 옮긴 것이라 동작 변화 없음.
//
// 안전장치: 한 번 호출에 최대 BATCH_LIMIT건만 처리(서버리스 함수 실행시간 제한 대비).
// 처리 못 한 나머지는 needsGeocoding=true로 그대로 남아있으니 버튼을 다시 누르면 이어서 처리됨
// (별도 페이지네이션 상태를 둘 필요 없음 — DB 플래그 자체가 진행 상태).
const BATCH_LIMIT = 150;
const DELAY_MS = 150; // 카카오 로컬 API 순간 QPS 제한 여유를 위해 호출 사이 최소 간격
const MAX_ERRORS_RETURNED = 200;

export type GeocodeRowError = {
  id: string;
  name: string;
  message: string;
  address: string;
  addressLotno: string | null;
};

export type GeocodeBatchResult = {
  totalTargeted: number;
  processedCount: number;
  successCount: number;
  failCount: number;
  remainingCount: number; // 다음 실행에서 이어서 처리될 건수(0이면 전부 처리됨)
  noAddressCount: number; // 주소 자체가 없어 이번 배치 대상에서 애초에 제외된 건수
  stoppedEarly: string | null; // 인증 실패 등으로 배치를 조기 중단했으면 그 사유(null이면 정상 진행)
  errors: GeocodeRowError[];
};

export async function runGeocodingBatch(): Promise<GeocodeBatchResult> {
  const needsGeocoding = await prisma.golfCourse.findMany({
    where: { needsGeocoding: true },
    select: { id: true, name: true, address: true, addressLotno: true },
    orderBy: { name: "asc" },
  });

  const noAddressCount = needsGeocoding.filter((c) => !c.address).length;
  const targets = needsGeocoding.filter((c) => c.address).slice(0, BATCH_LIMIT);

  let successCount = 0;
  let failCount = 0;
  let processedCount = 0;
  let stoppedEarly: string | null = null;
  // address/addressLotno도 함께 반환 — DB에 직접 접근하지 않고도 어떤 문자열이 카카오로
  // 전달됐는지 바로 확인할 수 있어야 잔여 실패 건 진단이 빠름.
  const errors: GeocodeRowError[] = [];

  for (const course of targets) {
    // address(도로명 우선, 없으면 지번) -> 실패 시 addressLotno(지번 원본, address와 다를 때만)
    // -> 그래도 실패 시 골프장명 키워드 검색, 순서로 폴백한다.
    const result = await geocodeAddress(course.address!, course.addressLotno, course.name);
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
        errors.push({
          id: course.id,
          name: course.name,
          message: result.reason,
          address: course.address!,
          addressLotno: course.addressLotno,
        });
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

  return {
    totalTargeted: targets.length,
    processedCount,
    successCount,
    failCount,
    remainingCount,
    noAddressCount,
    stoppedEarly,
    errors,
  };
}
