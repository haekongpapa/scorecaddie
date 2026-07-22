// 카카오 로컬 API "주소 검색"(https://dapi.kakao.com/v2/local/search/address.json)로
// 주소 문자열 -> WGS84 위경도를 조회. 11번 관리자 화면의 "좌표 지오코딩 실행" 배치에서 사용.
//
// 인증: REST API 키를 `Authorization: KakaoAK {키}` 헤더로 전달(카카오 개발자 문서 기준).
// 이 키는 NextAuth 카카오 로그인용 KAKAO_CLIENT_ID/SECRET과는 별개 — 로그인 앱이 아직
// 설정 전(둘 다 빈 값)이라도 이 배치는 독립적으로 동작할 수 있도록 전용 env
// KAKAO_REST_API_KEY를 따로 둔다.
//
// 응답에서 x=경도(longitude), y=위도(latitude) — 카카오 특유의 순서라 헷갈리기 쉬우니 주의.
const API_URL = "https://dapi.kakao.com/v2/local/search/address.json";
const FETCH_TIMEOUT_MS = 8_000;

export type LatLng = { lat: number; lng: number };

type KakaoAddressResponse = {
  documents?: { x: string; y: string }[];
};

// 주소 검색 실패(키 미설정/검색결과 없음/네트워크 오류) 시 전부 null 반환(fail-soft) —
// 호출부(배치 API)는 이를 "이번엔 실패, needsGeocoding 유지"로 처리하면 된다.
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key || !address.trim()) return null;

  const url = new URL(API_URL);
  url.searchParams.set("query", address);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${key}` },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as KakaoAddressResponse;
    const doc = data.documents?.[0];
    if (!doc) return null;

    const lng = Number(doc.x);
    const lat = Number(doc.y);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
