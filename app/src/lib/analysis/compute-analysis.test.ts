import { describe, expect, it } from "vitest";
import {
  computeAnalysis,
  MIN_RELIABLE_SAMPLE,
  type AnalysisHoleInput,
  type AnalysisRoundInput,
} from "./compute-analysis";

function hole(over: Partial<AnalysisHoleInput> & { strokes: number }): AnalysisHoleInput {
  return {
    par: null,
    teeShotResult: null,
    pinDistanceType: null,
    onGreenStrokes: null,
    puttStrokes: null,
    ...over,
  };
}

function round(over: Partial<AnalysisRoundInput> & { id: string }): AnalysisRoundInput {
  return {
    playedAt: new Date("2026-01-01T00:00:00.000Z"),
    weatherSnapshot: null,
    golfCourseId: "c1",
    golfCourseName: "A",
    holeScores: [],
    ...over,
  };
}

describe("MIN_RELIABLE_SAMPLE", () => {
  it("재홍님 확정값(3회 미만 = 참고용)을 그대로 유지한다", () => {
    expect(MIN_RELIABLE_SAMPLE).toBe(3);
  });
});

describe("computeAnalysis", () => {
  it("빈 배열이면 모두 null/빈 배열로 안전하게 반환한다", () => {
    const result = computeAnalysis([]);
    expect(result.totalRounds).toBe(0);
    expect(result.trend.avgStrokes).toBeNull();
    expect(result.trend.bestScore).toBeNull();
    expect(result.trend.recent).toEqual([]);
    expect(result.course).toEqual([]);
    expect(result.hole.teeShotDistribution).toBeNull();
    expect(result.hole.girRate).toBeNull();
    expect(result.weather.bySky).toEqual([]);
  });

  it("홀을 하나도 저장하지 않은 빈 라운드(총타수 0)는 집계에서 제외한다", () => {
    const rounds: AnalysisRoundInput[] = [
      round({ id: "empty", holeScores: [] }),
      round({ id: "r1", holeScores: [hole({ strokes: 5 })] }),
    ];
    const result = computeAnalysis(rounds);
    expect(result.totalRounds).toBe(1);
  });

  const rounds: AnalysisRoundInput[] = [
    round({
      id: "r1",
      playedAt: new Date("2026-05-10T00:00:00.000Z"),
      golfCourseId: "c1",
      golfCourseName: "A",
      weatherSnapshot: "☀️ 맑음 25°C",
      holeScores: [
        hole({ strokes: 5, par: 4, teeShotResult: "FAIRWAY", onGreenStrokes: 3, puttStrokes: 2, pinDistanceType: "NEAR" }),
        hole({ strokes: 4, par: 3, teeShotResult: "MISS", onGreenStrokes: 2, puttStrokes: 2, pinDistanceType: "FAR" }),
      ],
    }),
    round({
      id: "r2",
      playedAt: new Date("2026-06-01T00:00:00.000Z"),
      golfCourseId: "c1",
      golfCourseName: "A",
      weatherSnapshot: "☁️ 흐림 18°C",
      holeScores: [
        hole({ strokes: 6, par: 4, teeShotResult: "OB", onGreenStrokes: 4, puttStrokes: 2, pinDistanceType: "FAR" }),
        hole({ strokes: 7, par: 5, teeShotResult: "FAIRWAY", onGreenStrokes: 4, puttStrokes: 3, pinDistanceType: "NEAR" }),
      ],
    }),
    round({
      id: "r3",
      playedAt: new Date("2026-06-15T00:00:00.000Z"),
      golfCourseId: "c1",
      golfCourseName: "A",
      weatherSnapshot: null,
      holeScores: [
        hole({ strokes: 4, par: 4, teeShotResult: "FAIRWAY", onGreenStrokes: 2, puttStrokes: 2, pinDistanceType: "NEAR" }),
        hole({ strokes: 3, par: 3, teeShotResult: "FAIRWAY", onGreenStrokes: 1, puttStrokes: 2, pinDistanceType: "NEAR" }),
      ],
    }),
    round({
      id: "r4",
      playedAt: new Date("2026-07-01T00:00:00.000Z"),
      golfCourseId: "c1",
      golfCourseName: "A",
      weatherSnapshot: "☀️ 맑음 30°C",
      holeScores: [
        hole({ strokes: 8, par: 5, teeShotResult: "PENALTY", onGreenStrokes: 5, puttStrokes: 3, pinDistanceType: "FAR" }),
        hole({ strokes: 5, par: 4, teeShotResult: "FAIRWAY", onGreenStrokes: 3, puttStrokes: 2, pinDistanceType: "NEAR" }),
      ],
    }),
    round({
      id: "r5",
      playedAt: new Date("2026-07-10T00:00:00.000Z"),
      golfCourseId: "c2",
      golfCourseName: "B",
      weatherSnapshot: "☀️ 맑음 20°C",
      holeScores: [
        hole({ strokes: 5, par: 4, teeShotResult: "FAIRWAY", onGreenStrokes: 3, puttStrokes: 2, pinDistanceType: "NEAR" }),
        hole({ strokes: 6, par: 4, teeShotResult: "MISS", onGreenStrokes: 4, puttStrokes: 2, pinDistanceType: "FAR" }),
      ],
    }),
  ];

  const result = computeAnalysis(rounds);

  it("① 추이: 총 라운드/평균/베스트를 계산한다", () => {
    // 총타수: r1=9, r2=13, r3=7, r4=13, r5=11
    expect(result.totalRounds).toBe(5);
    expect(result.trend.avgStrokes).toBe(10.6);
    expect(result.trend.bestScore).toBe(7);
  });

  it("① 추이: 최근 라운드 목록에 베스트 스코어 플래그가 정확히 하나만 선다", () => {
    expect(result.trend.recent).toHaveLength(5);
    const bestFlags = result.trend.recent.filter((p) => p.isBest);
    expect(bestFlags).toHaveLength(1);
    expect(bestFlags[0].roundId).toBe("r3");
  });

  it("① 추이: 월별 평균이 오름차순으로 집계된다", () => {
    expect(result.trend.monthly).toEqual([
      { monthLabel: "2026년 5월", avgStrokes: 9, count: 1 },
      { monthLabel: "2026년 6월", avgStrokes: 10, count: 2 },
      { monthLabel: "2026년 7월", avgStrokes: 12, count: 2 },
    ]);
  });

  it("③ 골프장별: 방문 횟수 내림차순 + 표본부족 플래그", () => {
    expect(result.course).toEqual([
      { golfCourseId: "c1", name: "A", visits: 4, avgStrokes: 10.5, bestScore: 7, lowSample: false },
      { golfCourseId: "c2", name: "B", visits: 1, avgStrokes: 11, bestScore: 11, lowSample: true },
    ]);
  });

  it("② 홀 상세: 티샷결과 분포와 페어웨이 안착률", () => {
    expect(result.hole.detailedHoleCount).toBe(10);
    expect(result.hole.teeShotDistribution).toEqual({ fairway: 60, miss: 20, penalty: 10, ob: 10 });
    expect(result.hole.fairwayHitRate).toBe(60);
  });

  it("② 홀 상세: GIR 근사치(onGreenStrokes <= par-2)", () => {
    expect(result.hole.girRate).toBe(20);
  });

  it("② 홀 상세: 라운드당 평균 퍼트 수 / 3퍼트 비율", () => {
    // 라운드별 퍼트합: r1=4, r2=5, r3=4, r4=5, r5=4 -> 평균 4.4
    expect(result.hole.avgPuttsPerRound).toBe(4.4);
    // 3퍼트 이상 홀: r2의 par5(putt3), r4의 par5(putt3) = 2/10
    expect(result.hole.threePuttRate).toBe(20);
  });

  it("② 홀 상세: Par 유형별 평균 스코어", () => {
    expect(result.hole.byPar).toEqual([
      { par: 3, avgStrokes: 3.5, avgOverPar: 0.5, holeCount: 2 },
      { par: 4, avgStrokes: 5.2, avgOverPar: 1.2, holeCount: 6 },
      { par: 5, avgStrokes: 7.5, avgOverPar: 2.5, holeCount: 2 },
    ]);
  });

  it("② 홀 상세: 온그린 핀거리별 평균 퍼트 수", () => {
    expect(result.hole.pinDistance.near).toEqual({ avgPutts: 2.2, count: 6 });
    expect(result.hole.pinDistance.far).toEqual({ avgPutts: 2.3, count: 4 });
  });

  it("④ 날씨: 하늘상태별 평균타수 + 표본부족 플래그(weatherSnapshot 없는 라운드는 제외)", () => {
    expect(result.weather.bySky).toEqual([
      { label: "맑음", avgStrokes: 11, count: 3, lowSample: false },
      { label: "흐림", avgStrokes: 13, count: 1, lowSample: true },
    ]);
  });

  it("④ 날씨: 기온 구간별 평균타수", () => {
    expect(result.weather.byTemp).toEqual([
      { label: "20°C 미만", avgStrokes: 13, count: 1, lowSample: true },
      { label: "20~25°C", avgStrokes: 10, count: 2, lowSample: true },
      { label: "30°C 이상", avgStrokes: 13, count: 1, lowSample: true },
    ]);
  });
});
