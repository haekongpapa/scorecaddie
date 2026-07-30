// 15번(기록 분석) 화면의 4개 탭(추이/홀 상세/골프장/날씨) 집계 로직.
// DB 접근 없는 순수 함수로 분리해 유닛 테스트 가능하게 함(coding-guidelines.md §4 —
// route/page는 얇게, 계산 로직은 lib/로). 호출부(app/analysis/page.tsx)가 Prisma로
// 조회한 라운드 목록(playedAt 오름차순)을 그대로 넘기면 된다.
import { parseWeatherSnapshot, temperatureBucketLabel } from "@/lib/weather/parse-snapshot";
import { formatRoundDateLabel } from "@/lib/utils/round-format";
import type { PinDistanceType, TeeShotResult } from "@prisma/client";

// 표본이 이 값 미만이면 화면에서 "참고용"으로 표시 (재홍님 확정, 2026-07-30).
export const MIN_RELIABLE_SAMPLE = 3;

export type AnalysisHoleInput = {
  strokes: number;
  par: number | null;
  teeShotResult: TeeShotResult | null;
  pinDistanceType: PinDistanceType | null;
  onGreenStrokes: number | null;
  puttStrokes: number | null;
};

export type AnalysisRoundInput = {
  id: string;
  playedAt: Date;
  weatherSnapshot: string | null;
  golfCourseId: string;
  golfCourseName: string;
  holeScores: AnalysisHoleInput[];
};

export type TrendPoint = {
  roundId: string;
  dateLabel: string;
  strokes: number;
  isBest: boolean;
};

export type MonthlyPoint = { monthLabel: string; avgStrokes: number; count: number };

export type CourseStat = {
  golfCourseId: string;
  name: string;
  visits: number;
  avgStrokes: number;
  bestScore: number;
  lowSample: boolean;
};

export type ParStat = {
  par: number;
  avgStrokes: number;
  avgOverPar: number;
  holeCount: number;
};

export type WeatherBucketStat = {
  label: string;
  avgStrokes: number;
  count: number;
  lowSample: boolean;
};

export type AnalysisResult = {
  totalRounds: number;
  trend: {
    avgStrokes: number | null;
    bestScore: number | null;
    recent: TrendPoint[];
    monthly: MonthlyPoint[];
  };
  hole: {
    detailedHoleCount: number;
    fairwayHitRate: number | null;
    girRate: number | null;
    avgPuttsPerRound: number | null;
    threePuttRate: number | null;
    teeShotDistribution: { fairway: number; miss: number; penalty: number; ob: number } | null;
    byPar: ParStat[];
    pinDistance: {
      near: { avgPutts: number | null; count: number };
      far: { avgPutts: number | null; count: number };
    };
  };
  course: CourseStat[];
  weather: {
    bySky: WeatherBucketStat[];
    byTemp: WeatherBucketStat[];
  };
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeAnalysis(roundsAsc: AnalysisRoundInput[]): AnalysisResult {
  // roundsAsc는 playedAt 오름차순(과거 -> 최근) 전제 — 호출부에서 정렬해 전달할 것.
  const withTotals = roundsAsc
    .map((r) => ({
      ...r,
      totalStrokes: r.holeScores.reduce((sum, h) => sum + h.strokes, 0),
    }))
    // 홀을 하나도 저장하지 않은 빈 라운드는 집계에서 제외 (마이페이지/10번과 동일 관례)
    .filter((r) => r.totalStrokes > 0);

  const totalRounds = withTotals.length;
  const allTotals = withTotals.map((r) => r.totalStrokes);
  const avgStrokes =
    totalRounds > 0 ? round1(allTotals.reduce((a, b) => a + b, 0) / totalRounds) : null;
  const bestScore = totalRounds > 0 ? Math.min(...allTotals) : null;

  const recent: TrendPoint[] = withTotals.slice(-10).map((r) => ({
    roundId: r.id,
    dateLabel: formatRoundDateLabel(r.playedAt),
    strokes: r.totalStrokes,
    isBest: bestScore !== null && r.totalStrokes === bestScore,
  }));

  const monthlyMap = new Map<string, { sum: number; count: number }>();
  for (const r of withTotals) {
    const key = r.playedAt.toISOString().slice(0, 7); // "YYYY-MM"
    const bucket = monthlyMap.get(key) ?? { sum: 0, count: 0 };
    bucket.sum += r.totalStrokes;
    bucket.count += 1;
    monthlyMap.set(key, bucket);
  }
  const monthly: MonthlyPoint[] = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .slice(-12) // 최근 12개월까지만 (화면이 무한정 길어지지 않도록)
    .map(([key, v]) => {
      const [y, m] = key.split("-");
      return {
        monthLabel: `${y}년 ${Number(m)}월`,
        avgStrokes: round1(v.sum / v.count),
        count: v.count,
      };
    });

  // --- 골프장별 비교 ---
  const courseMap = new Map<string, { name: string; totals: number[] }>();
  for (const r of withTotals) {
    const entry = courseMap.get(r.golfCourseId) ?? { name: r.golfCourseName, totals: [] };
    entry.totals.push(r.totalStrokes);
    courseMap.set(r.golfCourseId, entry);
  }
  const course: CourseStat[] = Array.from(courseMap.entries())
    .map(([golfCourseId, v]) => ({
      golfCourseId,
      name: v.name,
      visits: v.totals.length,
      avgStrokes: round1(v.totals.reduce((a, b) => a + b, 0) / v.totals.length),
      bestScore: Math.min(...v.totals),
      lowSample: v.totals.length < MIN_RELIABLE_SAMPLE,
    }))
    .sort((a, b) => b.visits - a.visits);

  // --- 홀 유형별 상세 ---
  // 구버전 단순 입력 라운드(teeShotResult 등 상세 필드가 비어있음)는 아래 지표들에서
  // 자연스럽게 제외된다(각 필드 존재 여부로 필터링) — 기획서 2.6절에서 확정한 방식.
  const allHoles = withTotals.flatMap((r) => r.holeScores);
  const teeHoles = allHoles.filter((h) => h.teeShotResult !== null);
  const detailedHoleCount = teeHoles.length;

  let teeShotDistribution: AnalysisResult["hole"]["teeShotDistribution"] = null;
  let fairwayHitRate: number | null = null;
  if (teeHoles.length > 0) {
    const counts = { fairway: 0, miss: 0, penalty: 0, ob: 0 };
    for (const h of teeHoles) {
      if (h.teeShotResult === "FAIRWAY") counts.fairway += 1;
      else if (h.teeShotResult === "MISS") counts.miss += 1;
      else if (h.teeShotResult === "PENALTY") counts.penalty += 1;
      else if (h.teeShotResult === "OB") counts.ob += 1;
    }
    const total = teeHoles.length;
    teeShotDistribution = {
      fairway: round1((counts.fairway / total) * 100),
      miss: round1((counts.miss / total) * 100),
      penalty: round1((counts.penalty / total) * 100),
      ob: round1((counts.ob / total) * 100),
    };
    fairwayHitRate = teeShotDistribution.fairway;
  }

  // GIR(그린 적중률) 근사치: 온그린 타수가 (Par - 2) 이내인 홀의 비율.
  // 정식 GIR 정의(Par-2 이내 온그린)를 onGreenStrokes 필드로 근사한 것 — 기획서 2.3절 참고.
  const girHoles = allHoles.filter((h) => h.onGreenStrokes !== null && h.par !== null);
  const girRate =
    girHoles.length > 0
      ? round1(
          (girHoles.filter((h) => (h.onGreenStrokes as number) <= (h.par as number) - 2).length /
            girHoles.length) *
            100
        )
      : null;

  // 라운드당 평균 퍼트 수: 퍼트 기록이 있는 홀만 모아 "라운드별 합"을 낸 뒤 라운드 간 평균.
  const puttRoundTotals: number[] = [];
  for (const r of withTotals) {
    const withPutt = r.holeScores.filter((h) => h.puttStrokes !== null);
    if (withPutt.length > 0) {
      puttRoundTotals.push(withPutt.reduce((s, h) => s + (h.puttStrokes as number), 0));
    }
  }
  const avgPuttsPerRound =
    puttRoundTotals.length > 0
      ? round1(puttRoundTotals.reduce((a, b) => a + b, 0) / puttRoundTotals.length)
      : null;

  const puttHoles = allHoles.filter((h) => h.puttStrokes !== null);
  const threePuttRate =
    puttHoles.length > 0
      ? round1(
          (puttHoles.filter((h) => (h.puttStrokes as number) >= 3).length / puttHoles.length) * 100
        )
      : null;

  const parMap = new Map<number, { strokes: number; over: number; count: number }>();
  for (const h of allHoles) {
    if (h.par !== 3 && h.par !== 4 && h.par !== 5) continue;
    const entry = parMap.get(h.par) ?? { strokes: 0, over: 0, count: 0 };
    entry.strokes += h.strokes;
    entry.over += h.strokes - h.par;
    entry.count += 1;
    parMap.set(h.par, entry);
  }
  const byPar: ParStat[] = Array.from(parMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([par, v]) => ({
      par,
      avgStrokes: round1(v.strokes / v.count),
      avgOverPar: round1(v.over / v.count),
      holeCount: v.count,
    }));

  function pinBucket(type: Extract<PinDistanceType, "NEAR" | "FAR">) {
    const holes = allHoles.filter((h) => h.pinDistanceType === type && h.puttStrokes !== null);
    return {
      avgPutts:
        holes.length > 0
          ? round1(holes.reduce((s, h) => s + (h.puttStrokes as number), 0) / holes.length)
          : null,
      count: holes.length,
    };
  }

  // --- 날씨 조건별 비교 ---
  // weatherSnapshot이 없는 라운드(예보범위 밖 등록 등)는 자연스럽게 제외된다.
  const skyMap = new Map<string, number[]>();
  const tempMap = new Map<string, number[]>();
  for (const r of withTotals) {
    const parsed = parseWeatherSnapshot(r.weatherSnapshot);
    if (!parsed) continue;

    const skyList = skyMap.get(parsed.condition) ?? [];
    skyList.push(r.totalStrokes);
    skyMap.set(parsed.condition, skyList);

    if (parsed.tempC !== null) {
      const bucketLabel = temperatureBucketLabel(parsed.tempC);
      const tempList = tempMap.get(bucketLabel) ?? [];
      tempList.push(r.totalStrokes);
      tempMap.set(bucketLabel, tempList);
    }
  }

  function toWeatherStats(map: Map<string, number[]>, order: string[]): WeatherBucketStat[] {
    return Array.from(map.entries())
      .map(([label, totals]) => ({
        label,
        avgStrokes: round1(totals.reduce((a, b) => a + b, 0) / totals.length),
        count: totals.length,
        lowSample: totals.length < MIN_RELIABLE_SAMPLE,
      }))
      .sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
  }

  return {
    totalRounds,
    trend: { avgStrokes, bestScore, recent, monthly },
    hole: {
      detailedHoleCount,
      fairwayHitRate,
      girRate,
      avgPuttsPerRound,
      threePuttRate,
      teeShotDistribution,
      byPar,
      pinDistance: { near: pinBucket("NEAR"), far: pinBucket("FAR") },
    },
    course,
    weather: {
      bySky: toWeatherStats(skyMap, ["맑음", "구름많음", "흐림", "비", "비/눈", "눈", "기타"]),
      byTemp: toWeatherStats(tempMap, ["20°C 미만", "20~25°C", "25~30°C", "30°C 이상"]),
    },
  };
}
