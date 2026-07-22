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
// 주소 검색(①②) 단계에는 실제로 쿼리를 보내기 직전에 normalizeForKakao()로 두 가지 알려진
// 패턴을 교정한다(2026-07-22, 잔여 실패 9건 중 7건이 "산 " 공백, 2건이 "전남광주통합특별시"
// 신설 지명 문제로 확인됨 — 상세 사유는 normalizeForKakao() 주석 참고).
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

// 카카오 주소 검색으로 보내기 전 주소 문자열을 정규화한다. 82번 개편 후에도 남아있던 9건의
// 잔여 실패를 실제 address/addressLotno 값으로 확인해 찾아낸 두 가지 패턴을 교정(2026-07-22):
//
// 1) "산 5" -> "산5": 지번주소 표기법상 "산"은 번지 앞에 붙는 접두사이지 별도 단어가
//    아님(공식 표기는 공백 없이 "산5-1"). 공공데이터 원본엔 공백이 섞여 들어오는 경우가
//    있고("경상북도 경주시 신평동 산 5"), 카카오 주소 검색은 이 공백이 있으면 매칭을
//    못 하는 것으로 보임(잔여 실패 9건 중 7건이 이 패턴).
// 2) "전남광주통합특별시" -> "광주광역시"/"전라남도": 2026-07-01 광주광역시+전라남도 통합으로
//    신설된 광역자치단체명. 공공데이터는 이미 새 지명을 쓰지만, 카카오 로컬 API의 주소
//    인덱스는 아직(2026-07-22 기준) 갱신 전이라 새 지명으로는 검색이 안 됨(웹 검색으로
//    통합 시점 확인) — 카카오가 인식하는 옛 지명으로 되돌려서 질의한다. 광주 5개
//    구(동/서/남/북/광산구)는 "광주광역시", 그 외 시/군은 "전라남도"였던 지역.
//    ※ 카카오가 자체 인덱스를 갱신하면 이 보정은 불필요해짐 — 향후 재실패 시 가장 먼저
//    의심할 부분.
function normalizeForKakao(raw: string): string {
  let s = raw.trim();

  s = s.replace(/산\s+(\d)/g, "산$1");

  if (s.startsWith("전남광주통합특별시")) {
    const rest = s.slice("전남광주통합특별시".length).trim();
    const isGwangjuGu = /^(동구|서구|남구|북구|광산구)/.test(rest);
    s = `${isGwangjuGu ? "광주광역시" : "전라남도"} ${rest}`;
  }

  return s;
}

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

  const primaryResult = await callKakaoLocal(ADDRESS_API_URL, normalizeForKakao(address), key);
  if ("lat" in primaryResult) return primaryResult;
  if (isHardFailure(primaryResult.reason)) return primaryResult;

  let lastAddressReason = "주소 검색 결과 없음(주소 형식을 카카오가 못 찾음)";

  const lotno = addressLotno?.trim();
  const shouldTryLotno = lotno && lotno !== address.trim();
  if (shouldTryLotno) {
    await new Promise((resolve) => setTimeout(resolve, BETWEEN_ATTEMPT_DELAY_MS));
    const lotnoResult = await callKakaoLocal(ADDRESS_API_URL, normalizeForKakao(lotno), key);
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
