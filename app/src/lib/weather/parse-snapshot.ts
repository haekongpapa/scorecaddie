// Round.weatherSnapshot은 lib/weather/kma.ts의 getWeatherSnapshot()이 만든
// "{아이콘} {하늘상태} {기온}°C" 형태의 표시용 라벨 문자열이 그대로 저장된다(schema.prisma
// 주석의 "JSON 텍스트"는 실제 구현과 다름 — api/rounds/route.ts에서 getWeatherSnapshot()의
// 반환값을 가공 없이 그대로 저장하는 걸 확인함). 15번(기록 분석) 화면의 "날씨 조건별 비교"
// 탭에서 이 라벨을 다시 하늘상태/기온으로 분리해 집계하기 위한 파서. (2026-07-30 신규)
export type ParsedWeatherSnapshot = {
  condition: string; // "맑음" | "구름많음" | "흐림" | "비" | "비/눈" | "눈" | "기타"
  tempC: number | null;
};

// describeSkyPty()(kma.ts)가 만들 수 있는 하늘상태 텍스트 전부 — 우선순위 순서로 검사해야
// 한다("비/눈"이 "비"를 부분 문자열로 포함하므로 반드시 먼저 검사).
const KNOWN_CONDITIONS = ["비/눈", "비", "눈", "맑음", "구름많음", "흐림"] as const;

export function parseWeatherSnapshot(
  snapshot: string | null | undefined
): ParsedWeatherSnapshot | null {
  if (!snapshot) return null;

  const tempMatch = snapshot.match(/(-?\d+(?:\.\d+)?)°C/);
  const tempC = tempMatch ? Number(tempMatch[1]) : null;

  const condition = KNOWN_CONDITIONS.find((c) => snapshot.includes(c)) ?? "기타";

  return { condition, tempC };
}

// 기록 분석 화면의 "기온 구간별 비교"에서 쓰는 4구간 분류.
export function temperatureBucketLabel(tempC: number): string {
  if (tempC < 20) return "20°C 미만";
  if (tempC < 25) return "20~25°C";
  if (tempC < 30) return "25~30°C";
  return "30°C 이상";
}
