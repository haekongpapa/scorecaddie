// 위경도(WGS84) <-> 기상청 단기예보 격자좌표(nx, ny) 변환.
//
// 기상청이 공식 배포하는 LCC(Lambert Conformal Conic) 도법 변환 공식/상수를 그대로 옮긴 것
// (기상청 API 활용가이드에 실린 convertGRID_GPS 샘플과 동일한 상수·로직). 위경도 자체는
// GolfCourse.latitude/longitude(WGS84, lib/geo.ts에서 TM 좌표를 변환해 저장한 값)를 그대로 쓰면 되고,
// 별도의 좌표계 변환 라이브러리(proj4 등)는 필요 없다 — 이 파일 안의 삼각함수 계산만으로 충분하다.

const RE = 6371.00877; // 지구 반경(km)
const GRID = 5.0; // 격자 간격(km)
const SLAT1 = 30.0; // 투영 표준위도1(degree)
const SLAT2 = 60.0; // 투영 표준위도2(degree)
const OLON = 126.0; // 기준점 경도(degree)
const OLAT = 38.0; // 기준점 위도(degree)
const XO = 43; // 기준점 X좌표(GRID 단위)
const YO = 136; // 기준점 Y좌표(GRID 단위)
const DEGRAD = Math.PI / 180.0;

export type Grid = { nx: number; ny: number };

export function latLngToGrid(lat: number, lng: number): Grid {
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn =
    Math.tan(Math.PI * 0.25 + slat2 * 0.5) /
    Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);

  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;

  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);

  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);

  return { nx, ny };
}
