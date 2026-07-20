import proj4 from "proj4";

// TM 중부원점(EPSG:5174, Bessel 타원체) — 행정안전부 골프장 공공데이터 API(CRD_INFO_X/Y)가
// 제공하는 원본 좌표계. towgs84는 Bessel(도쿄 측지계 기반) -> WGS84 측지계 이동을 위한
// 7-parameter 값(국내에서 널리 쓰이는 표준값).
const TM_MID_ORIGIN =
  "+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 " +
  "+ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43";

const WGS84 = "+proj=longlat +datum=WGS84 +no_defs";

// 대한민국 대략적 위경도 범위(변환 결과가 이 범위를 벗어나면 원본 좌표 이상치로 간주해 버림)
const KOREA_LAT_RANGE = { min: 32, max: 39.5 };
const KOREA_LNG_RANGE = { min: 124, max: 132 };

export type LatLng = { lat: number; lng: number };

// TM 중부원점(EPSG:5174) X/Y 문자열 좌표를 WGS84 위경도로 변환.
// 입력이 없거나 숫자로 파싱 안 되거나, 변환 결과가 대한민국 범위를 크게 벗어나면 null 반환.
export function convertTmToWgs84(
  rawX: string | null | undefined,
  rawY: string | null | undefined
): LatLng | null {
  if (!rawX || !rawY) return null;

  const x = Number(rawX);
  const y = Number(rawY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  try {
    const [lng, lat] = proj4(TM_MID_ORIGIN, WGS84, [x, y]);

    if (
      lat < KOREA_LAT_RANGE.min ||
      lat > KOREA_LAT_RANGE.max ||
      lng < KOREA_LNG_RANGE.min ||
      lng > KOREA_LNG_RANGE.max
    ) {
      return null;
    }

    return { lat, lng };
  } catch {
    return null;
  }
}
