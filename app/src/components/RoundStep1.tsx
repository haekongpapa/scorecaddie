"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type Step1Loop = { id: string; name: string };
export type Step1Course = { id: string; name: string; loops: Step1Loop[] };

function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function RoundStep1({
  courses,
  initialCourseId,
}: {
  courses: Step1Course[];
  initialCourseId?: string;
}) {
  const router = useRouter();

  const [courseId, setCourseId] = useState<string>(
    initialCourseId && courses.some((c) => c.id === initialCourseId)
      ? initialCourseId
      : courses[0]?.id ?? ""
  );
  const [holesPlayed, setHolesPlayed] = useState<9 | 18>(18);
  const [date, setDate] = useState(todayStr());

  const course = useMemo(() => courses.find((c) => c.id === courseId), [courses, courseId]);
  const loops = course?.loops ?? [];

  const [frontLoopId, setFrontLoopId] = useState<string>(loops[0]?.id ?? "");
  const [backLoopId, setBackLoopId] = useState<string>(loops[1]?.id ?? loops[0]?.id ?? "");

  function handleCourseChange(nextId: string) {
    setCourseId(nextId);
    const nextLoops = courses.find((c) => c.id === nextId)?.loops ?? [];
    setFrontLoopId(nextLoops[0]?.id ?? "");
    setBackLoopId(nextLoops[1]?.id ?? nextLoops[0]?.id ?? "");
  }

  function handleFrontChange(nextId: string) {
    setFrontLoopId(nextId);
    if (nextId === backLoopId) {
      const alt = loops.find((l) => l.id !== nextId);
      if (alt) setBackLoopId(alt.id);
    }
  }

  function handleBackChange(nextId: string) {
    setBackLoopId(nextId);
    if (nextId === frontLoopId) {
      const alt = loops.find((l) => l.id !== nextId);
      if (alt) setFrontLoopId(alt.id);
    }
  }

  function goNext() {
    if (!courseId) return;
    const params = new URLSearchParams();
    params.set("step", "2");
    params.set("courseId", courseId);
    params.set("holesPlayed", String(holesPlayed));
    params.set("date", date);
    if (frontLoopId) params.set("frontLoopId", frontLoopId);
    if (holesPlayed === 18 && backLoopId) params.set("backLoopId", backLoopId);
    router.push(`/rounds/new?${params.toString()}`);
  }

  const canProceed = Boolean(courseId);

  return (
    <div>
      <div className="mb-4 flex items-center justify-center gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
            1
          </span>
          <span className="text-[11px] font-semibold text-primary">코스 선택</span>
        </div>
        <span className="h-px w-7 bg-line" />
        <div className="flex items-center gap-1.5">
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-card-bg2 text-[11px] font-bold text-muted">
            2
          </span>
          <span className="text-[11px] font-semibold text-muted">스코어 입력</span>
        </div>
      </div>

      <label className="mb-1 block text-xs font-semibold text-muted">골프장</label>
      <select
        value={courseId}
        onChange={(e) => handleCourseChange(e.target.value)}
        className="mb-3.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm"
      >
        {courses.length === 0 && <option value="">등록된 골프장이 없습니다</option>}
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <label className="mb-1 block text-xs font-semibold text-muted">홀 수</label>
      <div className="mb-3.5 flex gap-0.5 rounded-lg bg-card-bg p-0.5">
        {([18, 9] as const).map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => setHolesPlayed(h)}
            className={
              "flex-1 rounded-md py-2 text-[13px] font-semibold " +
              (holesPlayed === h ? "bg-primary text-white" : "text-muted")
            }
          >
            {h}홀
          </button>
        ))}
      </div>

      {loops.length === 0 ? (
        <p className="mb-3.5 -mt-1 text-[10.5px] text-[#B85042]">
          이 골프장은 아직 루프(전반/후반 등)가 등록되지 않았어요. 관리자 화면에서 먼저 등록해주세요.
        </p>
      ) : (
        <>
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted">
            <span className="rounded bg-card-bg2 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              전반
            </span>
            1~9홀 루프
          </div>
          <select
            value={frontLoopId}
            onChange={(e) => handleFrontChange(e.target.value)}
            className="mb-3.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm"
          >
            {loops.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          {holesPlayed === 18 && (
            <>
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted">
                <span className="rounded bg-card-bg2 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  후반
                </span>
                10~18홀 루프
              </div>
              <select
                value={backLoopId}
                onChange={(e) => handleBackChange(e.target.value)}
                className="mb-3.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm"
              >
                {loops.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </>
      )}

      <label className="mb-1 block text-xs font-semibold text-muted">라운드 일자</label>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="mb-3.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm"
      />

      <div className="mb-5 flex items-center justify-between rounded-xl bg-card-bg p-3.5">
        <div>
          <div className="text-xs text-muted">라운드 당시 날씨</div>
          <div className="mt-0.5 text-[10px] text-muted">날씨 연동 준비 중</div>
        </div>
      </div>

      <button
        type="button"
        disabled={!canProceed}
        onClick={goNext}
        className="block w-full rounded-lg bg-primary py-3 text-center text-sm font-semibold text-white disabled:opacity-50"
      >
        스코어 카드 ›
      </button>
    </div>
  );
}
