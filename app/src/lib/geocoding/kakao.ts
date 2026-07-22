// 카카오 로컬 API "주소 검색"(https://dapi.kakao.com/v2/local/search/address.json)로
// 주소 문자열 -> WGS84 위경도를 조회. 11번 관리자 화면의 "좌표 지오코딩 실행" 배치에서 사용.
//
// 인증: REST API 키를 `Authorization: KakaoAK {키}` 헤더로 전달(카카오 개발자 문서 기준).
// 이 키는 NextAuth 카카오 로그인용 KAKAO_CLIENT_ID/SECRET과는 별개 — 로그인 앱이 아직
// 설정 전(둘 다 빈 값)이라도 이 배치는 독립적으로 동작할 수 있도록 전용 env
// KAKAO_REST_API_KEY를 따로 둔다. 카카오 개발자 콘솔에는 앱당 여러 키(JavaScript 키/
// REST API 키/Admin 키/Native 앱 키)가 있는데, 이 서버 호출에는 반드시 "REST API 키"를
// 써야 한다 — 다른 키를 넣으면 401로 실패한다(흔한 실수라 에러 메시지에 명시적으로 남김).
//
// 응답에서 x=경도(longitude), y=위도(latitude) — 카카오 특유의 순서라 헷갈리기 쉬우니 주의.
const API_URL = "https://dapi.kakao.com/v2/local/search/address.json";
const FETCH_TIMEOUT_MS = 8_000;

export type LatLng = { lat: number; lng: number };

type KakaoAddressResponse = {
  documents?: { x: string; y: string }[];
};

// 이 프로젝트 tsconfig가 strict:false라 boolean 판별자(ok:true/false) 기반 유니언은
// else 분기에서 제대로 좁혀지지 않는 게 실제로 확인됨(2026-07-22, GolfCourse 지오코딩
// 디버깅 중 발견) — kma.ts의 FetchResult와 동일하게 "in" 연산자로 판별 가능한 형태로 정의.
export type GeocodeResult = LatLng | { reason: string };

// 주소 검색 실패(키 미설정/검색결과 없음/네트워크 오류) 시 {reason} 형태로 반환한다.
// 호출부(배치 API)는 실패를 "이번엔 실패, needsGeocoding 유지"로 처리하되, reason을
// 관리자 화면 결과 리포트에 그대로 노출해 원인을 바로 알 수 있게 한다.
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return { reason: "KAKAO_REST_API_KEY 미설정" };
  if (!address.trim()) return { reason: "주소 값이 비어있음" };

  const url = new URL(API_URL);
  url.searchParams.set("query", address);

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
    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      return { reason: `HTTP ${res.status}${bodyText ? `: ${bodyText.slice(0, 200)}` : ""}` };
    }
    const data = (await res.json()) as KakaoAddressResponse;
    const doc = data.documents?.[0];
    if (!doc) return { reason: "검색 결과 없음(주소 형식을 카카오가 못 찾음)" };

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
