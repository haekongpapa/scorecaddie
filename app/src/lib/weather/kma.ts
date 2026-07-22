// 기상청 단기예보((구)동네예보) 조회 — data.go.kr "기상청_단기예보 조회서비스"의
// getVilageFcst 엔드포인트. 요청/응답 스펙은 서비스 상세 페이지(활용가이드) 기준
// (https://www.data.go.kr/data/15084084/openapi.do). 서비스 URL 하위경로는
// 11번 화면의 골프장 API(1741000)와 마찬가지로 apis.data.go.kr 아래에 있으며,
// 이 API는 1360000/VilageFcstInfoService_2.0 경로를 쓴다.
//
// 단기예보는 오늘부터 모레(글피)까지, 최대 3일 뒤까지만 제공한다(그 이전/이후 날짜는
// 애초에 조회 대상이 아님) — 과거 라운드를 나중에 등록하는 경우가 많은 이 앱 특성상
// weatherSnapshot은 "오늘~+3일" 범위를 벗어난 라운드에서는 항상 null로 남는 것이 정상 동작.
//
// 타임존 처리: 발표시각 스케줄(02/05/08/11/14/17/20/23시)은 KST 기준이라, 서버 프로세스의
// 로컬 타임존(배포 환경에 따라 UTC일 수 있음)에 의존하지 않도록 모든 "지금"/"오늘" 계산은
// UTC+9(KST)로 명시 변환한 뒤 getUTC*() 게터로만 읽는다. Round.playedAt처럼 "YYYY-MM-DD"
// 문자열을 new Date()로 만든 값(UTC 자정)도 이 앱 전역 관례상 UTC 컴포넌트가 곧 의도한
// 달력 날짜이므로(다른 화면의 toISOString().slice(0,10) 표시 로직과 동일 전제) 그대로
// getUTC*()로 읽으면 된다.
import { latLngToGrid } from "./grid";

const API_BASE_URL =
  "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";
const FETCH_TIMEOUT_MS = 8_000;
const FORECAST_MAX_DAYS_AHEAD = 3; // 오늘(0) ~ 글피(+3)까지 제공
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 단기예보 발표시각(정시, 3시간 간격, KST). 실제 API 반영은 발표시각 약 +10분 이후로 알려져 있음.
const BASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23];

type ForecastItem = {
  baseDate: string;
  baseTime: string;
  category: string;
  fcstDate: string;
  fcstTime: string;
  fcstValue: string;
};

type ApiResponse = {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: {
      items?: { item?: ForecastItem[] | ForecastItem } | "";
    };
  };
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// 실제 시각(now)을 KST 벽시계 값으로 변환한 Date를 반환 — 이후 getUTC*()로 읽으면
// 서버 프로세스의 로컬 타임존과 무관하게 KST 연/월/일/시/분을 얻을 수 있다.
function toKstWallClock(now: Date): Date {
  return new Date(now.getTime() + KST_OFFSET_MS);
}

// "YYYY-MM-DD" 문자열을 new Date()로 만든 UTC 자정 값(앱 전역 관례) 또는 KST 벽시계 Date에서
// YYYYMMDD 문자열을 뽑는다. 두 경우 모두 UTC 게터로 읽는 게 맞다(위 타임존 처리 설명 참고).
function ymdOf(d: Date): string {
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}`;
}

function daysSinceEpoch(ymd: string): number {
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(4, 6));
  const d = Number(ymd.slice(6, 8));
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

// "지금(now)" 기준으로 조회 가능한 가장 최근 발표시각을 KST로 계산.
// 발표 직후엔 아직 API에 반영 안 됐을 수 있어 10분 여유를 두고, 그마저도 이르면
// (예: KST 자정 직후) 전날 23시 발표를 사용한다.
export function getLatestBaseDateTime(
  now: Date = new Date()
): { baseDate: string; baseTime: string } {
  const kst = toKstWallClock(now);
  const readyMinutes = kst.getUTCHours() * 60 + kst.getUTCMinutes() - 10;
  const readyHour = Math.floor(readyMinutes / 60);

  const candidate = [...BASE_HOURS].reverse().find((h) => h <= readyHour);

  if (candidate === undefined) {
    const prevDay = new Date(kst.getTime() - 24 * 60 * 60 * 1000);
    return { baseDate: ymdOf(prevDay), baseTime: "2300" };
  }

  return { baseDate: ymdOf(kst), baseTime: `${pad2(candidate)}00` };
}

// 대상 날짜(KST 기준 달력 날짜)가 단기예보 제공 범위(오늘 ~ +3일) 안에 있는지 확인.
export function isWithinForecastRange(
  targetDate: Date,
  now: Date = new Date()
): boolean {
  const todayYmd = ymdOf(toKstWallClock(now));
  const targetYmd = ymdOf(targetDate);
  const diffDays = daysSinceEpoch(targetYmd) - daysSinceEpoch(todayYmd);
  return diffDays >= 0 && diffDays <= FORECAST_MAX_DAYS_AHEAD;
}

type FetchResult = { items: ForecastItem[] } | { error: string };

async function fetchOnce(url: URL): Promise<FetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return { error: `http_${res.status}` };
    const data = (await res.json()) as ApiResponse;
    const resultCode = data.response?.header?.resultCode;
    if (resultCode !== "00") return { error: `resultCode_${resultCode ?? "unknown"}` };
    const items = data.response?.body?.items;
    if (!items) return { items: [] };
    const item = items.item;
    if (!item) return { items: [] };
    return { items: Array.isArray(item) ? item : [item] };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknown_error" };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchForecastItems(
  nx: number,
  ny: number,
  baseDate: string,
  baseTime: string
): Promise<ForecastItem[]> {
  const serviceKey = process.env.WEATHER_API_KEY;
  if (!serviceKey) return [];

  const url = new URL(API_BASE_URL);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "1000");
  url.searchParams.set("dataType", "JSON");
  url.searchParams.set("base_date", baseDate);
  url.searchParams.set("base_time", baseTime);
  url.searchParams.set("nx", String(nx));
  url.searchParams.set("ny", String(ny));

  // 실사용 확인 결과(2026-07-22) data.go.kr 쪽에서 간헐적으로 일시 오류/빈 응답이 오는 경우가
  // 있어(동일 입력을 잠시 후 재요청하면 정상 성공) 짧게 대기 후 1회만 재시도한다. 그래도
  // 실패하면 포기(fail-soft — 상위 getWeatherSnapshot이 null로 처리).
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await fetchOnce(url);
    if ("items" in result) return result.items;
    console.warn(`[weather] getVilageFcst 호출 실패(시도 ${attempt + 1}/2): ${result.error}`);
    if (attempt === 0) await new Promise((r) => setTimeout(r, 500));
  }
  return [];
}

// PTY(강수형태)/SKY(하늘상태) 코드를 사람이 읽는 아이콘+텍스트로 변환.
// 강수 중이면(PTY != 0) 하늘상태보다 강수 표시를 우선한다.
function describeSkyPty(sky: string | undefined, pty: string | undefined): string {
  switch (pty) {
    case "1":
    case "4":
    case "5":
      return "🌧️ 비";
    case "2":
    case "6":
      return "🌨️ 비/눈";
    case "3":
    case "7":
      return "🌨️ 눈";
    default:
      break;
  }
  switch (sky) {
    case "1":
      return "☀️ 맑음";
    case "3":
      return "⛅ 구름많음";
    case "4":
      return "☁️ 흐림";
    default:
      return "🌡️ 날씨 정보";
  }
}

function formatLabel(
  sky: string | undefined,
  pty: string | undefined,
  tmp: string | undefined
): string {
  const skyLabel = describeSkyPty(sky, pty);
  return tmp ? `${skyLabel} ${tmp}°C` : skyLabel;
}

export type WeatherSnapshotInput = {
  lat: number;
  lng: number;
  targetDate: Date;
  // "HH:MM"(24시간제). 주어지면 그 시각과 가장 가까운 예보 시간대를 사용, 없으면 정오 기준.
  targetTimeHHMM?: string | null;
};

// 골프장 좌표 + 라운드 일자(+선택적 시각)로 날씨 라벨 문자열을 만든다.
// 예보 범위 밖(과거이거나 오늘+3일 초과)이거나, API 키 미설정/호출 실패/데이터 없음이면
// 전부 null을 반환 — 호출부는 null을 "날씨 정보 없음"으로 처리하면 된다(fail-soft).
export async function getWeatherSnapshot(
  input: WeatherSnapshotInput
): Promise<string | null> {
  const { lat, lng, targetDate, targetTimeHHMM } = input;

  if (!isWithinForecastRange(targetDate)) return null;

  const { nx, ny } = latLngToGrid(lat, lng);
  const { baseDate, baseTime } = getLatestBaseDateTime();

  const items = await fetchForecastItems(nx, ny, baseDate, baseTime);
  if (items.length === 0) return null;

  const targetYmd = ymdOf(targetDate);
  const dayItems = items.filter((it) => it.fcstDate === targetYmd);
  if (dayItems.length === 0) return null;

  // "HH:MM" -> "HHMM"(fcstTime과 동일 포맷)로 정규화, 없으면 정오를 기준으로 가장 가까운 예보 시각을 찾는다.
  const normalizedTargetTime = targetTimeHHMM
    ? targetTimeHHMM.replace(":", "").padEnd(4, "0")
    : "1200";

  const fcstTimes = Array.from(new Set(dayItems.map((it) => it.fcstTime))).sort();
  const closestTime = fcstTimes.reduce((closest, t) => {
    const diff = Math.abs(Number(t) - Number(normalizedTargetTime));
    const closestDiff = Math.abs(Number(closest) - Number(normalizedTargetTime));
    return diff < closestDiff ? t : closest;
  }, fcstTimes[0]);

  const atTime = dayItems.filter((it) => it.fcstTime === closestTime);
  const sky = atTime.find((it) => it.category === "SKY")?.fcstValue;
  const pty = atTime.find((it) => it.category === "PTY")?.fcstValue;
  const tmp = atTime.find((it) => it.category === "TMP")?.fcstValue;

  if (!sky && !pty && !tmp) return null;
  return formatLabel(sky, pty, tmp);
}
