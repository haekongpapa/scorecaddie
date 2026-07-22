"use client";

import { useMemo, useState } from "react";
import RoundListItem from "@/components/RoundListItem";

export type RoundRow = {
  id: string;
  golfCourseId: string;
  golfCourseName: string;
  dateStr: string; // "YYYY-MM-DD" — 기간 필터 비교용
  dateTimeLabel: string; // 표시용, 날짜(+출발시간)
  weatherLabel: string | null;
  totalStrokes: number;
  hasAnyScore: boolean;
  userId: string;
  userName: string;
  isMine: boolean;
};

export type CourseOption = { id: string; name: string };

type Scope = "me" | "all";
type AppliedFilter = { from: string; to: string; courseId: string };

const EMPTY_FILTER: AppliedFilter = { from: "", to: "", courseId: "ALL" };

export default function RoundSearchList({
  rounds,
  courseOptions,
}: {
  rounds: RoundRow[];
  courseOptions: CourseOption[];
}) {
  const [scope, setScope] = useState<Scope>("me");
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [courseInput, setCourseInput] = useState("ALL");
  const [appliedFilter, setAppliedFilter] = useState<AppliedFilter>(EMPTY_FILTER);

  const filtered = useMemo(() => {
    return rounds.filter((r) => {
      if (scope === "me" && !r.isMine) return false;
      if (appliedFilter.from && r.dateStr < appliedFilter.from) return false;
      if (appliedFilter.to && r.dateStr > appliedFilter.to) return false;
      if (appliedFilter.courseId !== "ALL" && r.golfCourseId !== appliedFilter.courseId) {
        return false;
      }
      return true;
    });
  }, [rounds, scope, appliedFilter]);

  // "내 기록만" 모드에서 필터를 하나도 안 걸었는데 결과가 0건이면 진짜 "기록 없음" 상태,
  // 그 외(필터를 걸었거나 전체 회원 모드)의 0건은 "조건에 맞는 라운드가 없습니다"로 구분.
  const hasAnyFilter =
    appliedFilter.from !== "" || appliedFilter.to !== "" || appliedFilter.courseId !== "ALL";
  const noRoundsAtAll =
    scope === "me" && !hasAnyFilter && rounds.filter((r) => r.isMine).length === 0;

  function handleSearch() {
    setAppliedFilter({ from: fromInput, to: toInput, courseId: courseInput });
  }

  function handleReset() {
    setFromInput("");
    setToInput("");
    setCourseInput("ALL");
    setAppliedFilter(EMPTY_FILTER);
    setScope("me");
  }

  function handleScopeChange(next: Scope) {
    // 사용자 범위 전환은 검색 버튼 없이 즉시 반영 (doc/pages.md 8번 스펙)
    setScope(next);
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-muted">조회 기간</label>
      <div className="mb-3.5 flex items-center gap-2">
        <input
          type="date"
          value={fromInput}
          onChange={(e) => setFromInput(e.target.value)}
          className="w-full rounded-lg border border-line bg-white px-2.5 py-2 text-xs"
        />
        <span className="text-xs text-muted">~</span>
        <input
          type="date"
          value={toInput}
          onChange={(e) => setToInput(e.target.value)}
          className="w-full rounded-lg border border-line bg-white px-2.5 py-2 text-xs"
        />
      </div>

      <label className="mb-1 block text-xs font-semibold text-muted">골프장</label>
      <select
        value={courseInput}
        onChange={(e) => setCourseInput(e.target.value)}
        className="mb-3.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm"
      >
        <option value="ALL">전체 골프장</option>
        {courseOptions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <label className="mb-1 block text-xs font-semibold text-muted">사용자</label>
      <div className="mb-3.5 flex gap-0.5 rounded-lg bg-card-bg p-0.5">
        {(
          [
            { key: "me", label: "내 기록만" },
            { key: "all", label: "전체 회원" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => handleScopeChange(opt.key)}
            className={
              "flex-1 rounded-md py-2 text-[12.5px] font-semibold " +
              (scope === opt.key ? "bg-primary text-white" : "text-muted")
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mb-3.5 flex gap-2">
        <button
          type="button"
          onClick={handleSearch}
          className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white"
        >
          검색
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-muted"
        >
          초기화
        </button>
      </div>

      <div className="mb-2 text-xs text-muted">전체 {filtered.length}건</div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
          {noRoundsAtAll
            ? "아직 등록된 라운드가 없어요. 스코어 등록에서 첫 라운드를 기록해보세요."
            : "조건에 맞는 라운드가 없습니다"}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((r) => {
            const subParts = [r.dateTimeLabel];
            if (r.weatherLabel) subParts.push(r.weatherLabel);
            if (scope === "all") subParts.push(r.userName);
            return (
              <RoundListItem
                key={r.id}
                href={`/rounds/${r.id}`}
                title={r.golfCourseName}
                sub={subParts.join(" · ")}
                value={r.hasAnyScore ? `${r.totalStrokes}타` : "기록 없음"}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
