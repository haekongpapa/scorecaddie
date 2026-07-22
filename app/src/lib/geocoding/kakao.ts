// 카카오 로컬 API로 주소/장소명 문자열 -> WGS84 위경도를 조회.
// 11번(골프장 Par 관리) 관리자 화면의 "좌표 지오코딩 실행" 배치에서 사용.
//
// 최대 세 단계까지 순서대로 시도한다(2026-07-22, 도로명/지번 분리 보관 후 개편):
//   1) 주소 검색(search/address.json) — GolfCourse.address(도로명 우선, 없으면 지번).
//   2) 주소 검색(search/address.json) — GolfCourse.addressLotno(지번 원본). 단, 1번과 값이
//      같으면(= 애초에 도로명이 없어서 address가 이미 지번이었던 경우) 똑같은 값을 또 조회할
//      필요가 없으므로 이 단계는 건너뛴다.
//   3) 키워드(장소) 검색(search/keyword.json) — 위 주소 검색이 전부 "검색 결과 없음"일 때만
//      보조로 시도. 골프연습장/컨트리클럽처럼 주소 자체가 비정형인 경우, 카카오맵에 등록된
//      장소명으로는 오히려 잘 찾히는 경우가 많음.
//
// 인증/권한 관련 실패(401/403/네트워크 오류)는 재시도해도 똑같이 실패할 게 뻔하므로,
// 그 단계에서 즉시 중단하고 다음 후보로 넘어가지 않는다 — "검색 결과 없음"일 때만 다음
// 후보로 이어간다.
//
// 인증: REST API 키를 `Authorization: KakaoAK {키}` 헤더로 전달. 이 키는 NextAuth 카카오
// 로그인용 KAKAO_CLIENT_ID/SECRET과는 별개 — 로그인 앱이 아직 설정 전(둘 다 빈 값)이라도
// 이 배치는 독립적으로 동작할 수 있도록 전용 env KAKAO_REST_API_KEY를 따로 둔다. 카카오
// 개발자 콘솔에는 앱당 여러 키(JavaScript 키/REST API 키/Admin 키/Native 앱 키)가 있는데
// 반드시 "REST API 키"를 써야 한다(다른 키는 401). 또한 앱의 [제품 설정] > [카카오맵]이
// "활성화"로 켜져있어야 한다 — 꺼져있으면 403 "disabled OPEN_MAP_AND_LOCAL service"로
// 실패한다(2026-07-22 실사용 중 발견, 흔한 최초 설정 누락 포인트).
//
// 응답에서 x=경도(longitude), y=위도(latitude) — 카카오 특유의 순서라 헷갈리기 쉬우니 주의.
const ADDRESS_API_URL = "https://dapi.kakao.com/v2/local/search/address.json";
const KEYWORD_API_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";
const FETCH_TIMEOUT_MS = 8_000;
const BETWEEN_ATTEMPT_DELAY_MS = 120; // 같은 골프장에 대해 API를 연달아 호출하므로 QPS 여유를 위해 대기

export type LatLng = { lat: number; lng: number };

// 이 프로젝트 tsconfig가 strict: false라 boolean 판별자(ok:true/false) 기반 유니언은
// else 분기에서 제대로 좁혀지지 않는 게 실제로 확인됨(2026-07-22, GolfCourse 지오코딩
// 디버깅 중 발견) — kma.ts의 FetchResult와 동일하게 "in" 연산자로 판별 가능한 형태로 정의.
export type GeocodeResult = LatLng | { reason: string };

type KakaoDoc = { x: string; y: string };
type KakaoResponse = { documents?: KakaoDoc[] };

async function callKakaoLocal(
  apiUrl: string,
  query: string,
  key: string
): Promise<GeocodeResult> {
  const url = new URL(apiUrl);
  url.searchParams.set("query", query);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${key}` },
      signal: controller.signal,
    });
    if (res.status === 401) {
      return { reason: "인증 실패(401) — REST API 키가 아니거나 키 값이 잘못됨" };
    }
    if (res.status === 403) {
      const bodyText = await res.text().catch(() => "");
      return {
        reason: `권한 없음(403) — Kakao Developers 앱의 [제품 설정] > [카카오맵]이 비활성화 상태일 수 있음${bodyText ? `: ${bodyText.slice(0, 200)}` : ""}`,
      };
    }
    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      return { reason: `HTTP ${res.status}${bodyText ? `: ${bodyText.slice(0, 200)}` : ""}` };
    }
    const data = (await res.json()) as KakaoResponse;
    const doc = data.documents?.[0];
    if (!doc) return { reason: "검색 결과 없음" };

    const lng = Number(doc.x);
    const lat = Number(doc.y);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { reason: "응답 좌표값이 숫자가 아님" };
    }
    return { lat, lng };
  } catch (e) {
    return {
      reason: e instanceof Error ? `요청 실패: ${e.message}` : "요청 실패(알 수 없는 오류)",
    };
  } finally {
    clearTimeout(timeout);
  }
}

// 인증/권한/네트워크류 실패인지 판별 — 이 경우 다른 후보로 넘어가봤자 똑같이 실패한다.
function isHardFailure(reason: string): boolean {
  return reason !== "검색 결과 없음";
}

// address: GolfCourse.address(도로명 우선, 없으면 지번). addressLotno: GolfCourse.addressLotno
// (지번 원본, address와 같은 값이면 재조회를 건너뜀). fallbackKeyword: 위 주소 검색이 전부
// 결과 없음일 때만 시도하는 장소명(보통 GolfCourse.name).
export async function geocodeAddress(
  address: string,
  addressLotno?: string | null,
  fallbackKeyword?: string
): Promise<GeocodeResult> {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return { reason: "KAKAO_REST_API_KEY 미설정" };
  if (!address.trim()) return { reason: "주소 값이 비어있음" };

  const primaryResult = await callKakaoLocal(ADDRESS_API_URL, address, key);
  if ("lat" in primaryResult) return primaryResult;
  if (isHardFailure(primaryResult.reason)) return primaryResult;

  let lastAddressReason = "주소 검색 결과 없음(주소 형식을 카카오가 못 찾음)";

  const lotno = addressLotno?.trim();
  const shouldTryLotno = lotno && lotno !== address.trim();
  if (shouldTryLotno) {
    await new Promise((resolve) => setTimeout(resolve, BETWEEN_ATTEMPT_DELAY_MS));
    const lotnoResult = await callKakaoLocal(ADDRESS_API_URL, lotno, key);
    if ("lat" in lotnoResult) return lotnoResult;
    if (isHardFailure(lotnoResult.reason)) return lotnoResult;
    lastAddressReason = "도로명·지번 주소 검색 모두 결과 없음(주소 형식을 카카오가 못 찾음)";
  }

  if (!fallbackKeyword?.trim()) return { reason: lastAddressReason };

  await new Promise((resolve) => setTimeout(resolve, BETWEEN_ATTEMPT_DELAY_MS));
  const keywordResult = await callKakaoLocal(KEYWORD_API_URL, fallbackKeyword, key);
  if ("lat" in keywordResult) return keywordResult;
  return {
    reason:
      keywordResult.reason === "검색 결과 없음"
        ? `${lastAddressReason}, 키워드(장소명) 검색도 결과 없음`
        : `${lastAddressReason}, 키워드 검색도 실패(${keywordResult.reason})`,
  };
}
