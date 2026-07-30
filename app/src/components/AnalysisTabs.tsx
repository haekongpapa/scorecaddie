"use client";

import { useState } from "react";
import {
  MIN_RELIABLE_SAMPLE,
  type AnalysisResult,
} from "@/lib/analysis/compute-analysis";

const TABS = [
  { key: "trend", label: "추이" },
  { key: "hole", label: "홀 상세" },
  { key: "course", label: "골프장" },
  { key: "weather", label: "날씨" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// 골프장 상세(06)/기록 분석(15) 공용이 아니라 이 화면 전용 표시 컴포넌트 — 다른 화면에
// 재사용할 일이 생기면 그때 components/ 상위로 승격.
function StatBox({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-lg bg-card-bg px-1.5 py-3 text-center">
      <div className="text-xl font-bold text-primary">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted">{label}</div>
    </div>
  );
}

// 퍼센트 값(pct)은 서버에서 계산돼 매번 달라지는 값이라 Tailwind의 정적 클래스 스캔으로는
// 표현할 수 없다(w-[${pct}%] 같은 동적 템플릿은 빌드 시 CSS가 생성되지 않음) — 이 막대의
// 너비만 예외적으로 inline style을 쓴다.
function HBar({
  label,
  valueLabel,
  pct,
  color = "moss",
  lowSample,
}: {
  label: string;
  valueLabel: string;
  pct: number;
  color?: "moss" | "accent" | "red";
  lowSample?: boolean;
}) {
  const barColorClass =
    color === "red" ? "bg-[#B85042]" : color === "accent" ? "bg-accent" : "bg-moss";
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold">
          {label}
          {lowSample && (
            <span className="ml-1.5 rounded bg-card-bg2 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              참고용
            </span>
          )}
        </span>
        <span className="text-muted">{valueLabel}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-md bg-card-bg">
        <div
          className={`h-full rounded-md ${barColorClass}`}
          style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
        />
      </div>
    </div>
  );
}

function Legend({ colorClass, text }: { colorClass: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-full ${colorClass}`} />
      {text}
    </span>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
      {children}
    </div>
  );
}

function TrendPanel({ data }: { data: AnalysisResult }) {
  const { avgStrokes, bestScore, recent, monthly } = data.trend;
  const strokesList = recent.map((p) => p.strokes);
  const min = Math.min(...strokesList);
  const max = Math.max(...strokesList);
  const range = max - min || 1;

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <StatBox value={data.totalRounds} label="총 라운드" />
        <StatBox value={avgStrokes ?? "-"} label="평균타수" />
        <StatBox value={bestScore ?? "-"} label="베스트" />
      </div>

      <h2 className="mb-2.5 text-[13px] font-semibold text-muted">
        최근 {recent.length}라운드 추이
      </h2>
      <div className="mb-1 flex h-32 gap-1.5 px-0.5">
        {recent.map((p) => {
          // 25~90% 범위로 정규화 — 실제 값 차이가 작아도 막대 높이 차이가 눈에 보이게.
          const heightPct = 25 + ((p.strokes - min) / range) * 65;
          return (
            // 부모(h-32)에 items-end를 주면 각 열이 내용 높이만큼만 차지해 stretch가 안 되고,
            // 그 상태에서 막대에 height:%를 줘도 기준이 될 "정해진 높이"가 없어 0으로
            // 접혀버린다(막대가 안 보이던 원인, 2026-07-30 발견). 부모는 기본 stretch로 두고
            // 각 열이 h-32를 그대로 채우게 한 다음, 라벨 두 줄을 뺀 나머지 공간을 flex-1
            // "트랙"으로 따로 잡아 그 트랙 안에서만 height:%가 정해진 높이를 기준으로
            // 계산되게 한다.
            <div key={p.roundId} className="flex flex-1 flex-col items-center">
              <span className="mb-0.5 text-[9px] text-muted">{p.strokes}</span>
              <div className="flex w-full flex-1 items-end justify-center">
                <div
                  className={`w-full max-w-[20px] rounded-t ${p.isBest ? "bg-accent" : "bg-primary"}`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="mt-1 whitespace-nowrap text-[8.5px] text-muted">
                {p.dateLabel.slice(5)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mb-4 text-[10.5px] text-muted">금색 막대 = 베스트 스코어</p>

      {monthly.length > 0 && (
        <>
          <h2 className="mb-2.5 text-[13px] font-semibold text-muted">월별 평균 타수</h2>
          {monthly.map((m) => (
            <HBar
              key={m.monthLabel}
              label={m.monthLabel}
              valueLabel={`${m.avgStrokes}타 · ${m.count}회`}
              pct={Math.min(100, Math.max(8, ((m.avgStrokes - 70) / 50) * 100))}
            />
          ))}
        </>
      )}
    </div>
  );
}

function HolePanel({ data }: { data: AnalysisResult }) {
  const {
    fairwayHitRate,
    girRate,
    avgPuttsPerRound,
    teeShotDistribution,
    byPar,
    pinDistance,
    detailedHoleCount,
  } = data.hole;

  if (detailedHoleCount === 0) {
    return (
      <EmptyNote>
        스코어카드 상세 입력(티샷결과·온그린 핀거리 등)이 있는 라운드가 아직 없습니다.
      </EmptyNote>
    );
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <StatBox
          value={fairwayHitRate !== null ? `${fairwayHitRate}%` : "-"}
          label="페어웨이 안착률"
        />
        <StatBox value={girRate !== null ? `${girRate}%` : "-"} label="그린적중률(GIR)" />
        <StatBox value={avgPuttsPerRound ?? "-"} label="평균 퍼트(라운드)" />
      </div>

      {teeShotDistribution && (
        <>
          <h2 className="mb-2 text-[13px] font-semibold text-muted">
            티샷 결과 분포 (전체 {detailedHoleCount}홀)
          </h2>
          <div className="mb-2 flex h-[22px] overflow-hidden rounded-md">
            <div className="h-full bg-moss" style={{ width: `${teeShotDistribution.fairway}%` }} />
            <div className="h-full bg-accent" style={{ width: `${teeShotDistribution.miss}%` }} />
            <div className="h-full bg-[#C7509B]" style={{ width: `${teeShotDistribution.penalty}%` }} />
            <div className="h-full bg-[#B85042]" style={{ width: `${teeShotDistribution.ob}%` }} />
          </div>
          <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-muted">
            <Legend colorClass="bg-moss" text={`페어웨이 ${teeShotDistribution.fairway}%`} />
            <Legend colorClass="bg-accent" text={`미스 ${teeShotDistribution.miss}%`} />
            <Legend colorClass="bg-[#C7509B]" text={`페널티 ${teeShotDistribution.penalty}%`} />
            <Legend colorClass="bg-[#B85042]" text={`OB ${teeShotDistribution.ob}%`} />
          </div>
        </>
      )}

      {byPar.length > 0 && (
        <>
          <h2 className="mb-2.5 text-[13px] font-semibold text-muted">Par 유형별 평균 스코어</h2>
          {byPar.map((p) => (
            <HBar
              key={p.par}
              label={`Par ${p.par}`}
              valueLabel={`${p.avgStrokes}타 (+${p.avgOverPar})`}
              pct={Math.min(100, Math.max(8, (p.avgOverPar / 3) * 100))}
              color="accent"
            />
          ))}
        </>
      )}

      <h2 className="mb-2.5 mt-5 text-[13px] font-semibold text-muted">
        온그린 핀거리별 평균 퍼트 수
      </h2>
      <div className="grid grid-cols-2 gap-2">
        <StatBox
          value={pinDistance.near.avgPutts ?? "-"}
          label={`NEAR(0~20m) · ${pinDistance.near.count}홀`}
        />
        <StatBox
          value={pinDistance.far.avgPutts ?? "-"}
          label={`FAR(20m+) · ${pinDistance.far.count}홀`}
        />
      </div>
      <p className="mt-2 text-[10.5px] text-muted">
        스코어카드 상세 입력(티샷결과·핀거리 등)이 있는 라운드만 집계됩니다.
      </p>
    </div>
  );
}

function CoursePanel({ data }: { data: AnalysisResult }) {
  if (data.course.length === 0) {
    return <EmptyNote>골프장별 기록이 아직 없습니다.</EmptyNote>;
  }
  const maxVisits = Math.max(...data.course.map((c) => c.visits));

  return (
    <div>
      <h2 className="mb-2.5 text-[13px] font-semibold text-muted">
        골프장별 방문 · 평균타수 (자주 가는 순)
      </h2>
      {data.course.map((c) => (
        <HBar
          key={c.golfCourseId}
          label={c.name}
          valueLabel={`${c.visits}회 · 평균 ${c.avgStrokes}타`}
          pct={(c.visits / maxVisits) * 100}
          lowSample={c.lowSample}
        />
      ))}

      <h2 className="mb-2.5 mt-5 text-[13px] font-semibold text-muted">골프장별 베스트 스코어</h2>
      <div className="flex flex-col gap-2">
        {data.course.map((c) => (
          <div
            key={c.golfCourseId}
            className="flex items-center justify-between rounded-lg bg-card-bg px-3.5 py-3"
          >
            <div className="text-[13.5px] font-semibold">{c.name}</div>
            <div className="text-sm font-semibold">{c.bestScore}타</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeatherPanel({ data }: { data: AnalysisResult }) {
  const { bySky, byTemp } = data.weather;

  if (bySky.length === 0 && byTemp.length === 0) {
    return (
      <EmptyNote>
        날씨 정보가 기록된 라운드가 아직 없습니다 (예보 제공 범위 밖에서 등록한 라운드는
        날씨가 기록되지 않습니다).
      </EmptyNote>
    );
  }

  const maxSky = Math.max(...bySky.map((b) => b.avgStrokes), 1);
  const maxTemp = Math.max(...byTemp.map((b) => b.avgStrokes), 1);

  return (
    <div>
      <div className="mb-4 rounded-lg bg-card-bg2 px-3 py-2 text-[10.5px] text-muted">
        📊 표본이 적은 조건은 참고용으로만 봐주세요 ({MIN_RELIABLE_SAMPLE}회 미만).
      </div>

      {bySky.length > 0 && (
        <>
          <h2 className="mb-2.5 text-[13px] font-semibold text-muted">하늘 상태별 평균 타수</h2>
          {bySky.map((b) => (
            <HBar
              key={b.label}
              label={b.label}
              valueLabel={`${b.avgStrokes}타 · ${b.count}회`}
              pct={(b.avgStrokes / maxSky) * 100}
              lowSample={b.lowSample}
            />
          ))}
        </>
      )}

      {byTemp.length > 0 && (
        <>
          <h2 className="mb-2.5 mt-5 text-[13px] font-semibold text-muted">기온 구간별 평균 타수</h2>
          {byTemp.map((b) => (
            <HBar
              key={b.label}
              label={b.label}
              valueLabel={`${b.avgStrokes}타 · ${b.count}회`}
              pct={(b.avgStrokes / maxTemp) * 100}
              lowSample={b.lowSample}
            />
          ))}
        </>
      )}
    </div>
  );
}

export default function AnalysisTabs({ data }: { data: AnalysisResult }) {
  const [tab, setTab] = useState<TabKey>("trend");

  if (data.totalRounds === 0) {
    return (
      <EmptyNote>아직 등록된 라운드가 없습니다 — 스코어를 등록하면 분석이 시작됩니다.</EmptyNote>
    );
  }

  return (
    <div>
      <div className="mb-4 flex rounded-lg bg-card-bg p-[3px]">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md py-2 text-[11.5px] font-semibold ${
              tab === t.key ? "bg-primary text-white" : "text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "trend" && <TrendPanel data={data} />}
      {tab === "hole" && <HolePanel data={data} />}
      {tab === "course" && <CoursePanel data={data} />}
      {tab === "weather" && <WeatherPanel data={data} />}
    </div>
  );
}
