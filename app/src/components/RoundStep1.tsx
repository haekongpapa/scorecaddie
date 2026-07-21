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
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM");
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [checking, setChecking] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const course = useMemo(() => courses.find((c) => c.id === courseId), [courses, courseId]);
  const loops = course?.loops ?? [];

  const [frontLoopId, setFrontLoopId] = useState<string>(loops[0]?.id ?? "");
  const [backLoopId, setBackLoopId] = useState<string>(loops[1]?.id ?? loops[0]?.id ?? "");

  function handleCourseChange(nextId: string) {
    setCourseId(nextId);
    setDuplicateError(null);
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

  // 오전/오후 12시간제 입력값을 저장/전달용 24시간제 "HH:MM"로 변환.
  function startTime24() {
    let h = Number(hour);
    if (ampm === "AM") {
      if (h === 12) h = 0;
    } else if (h !== 12) {
      h += 12;
    }
    return `${String(h).padStart(2, "0")}:${minute}`;
  }

  async function goNext() {
    if (!courseId) return;
    setDuplicateError(null);
    setChecking(true);
    try {
      const time = startTime24();
      const checkParams = new URLSearchParams({ courseId, date, startTime: time });
      const res = await fetch(`/api/rounds/check-duplicate?${checkParams.toString()}`);
      const data = await res.json();
      if (res.ok && data.duplicate) {
        setDuplicateError(data.message ?? "동일한 조건으로 이미 등록된 스코어가 있습니다.");
        return;
      }

      const params = new URLSearchParams();
      params.set("step", "2");
      params.set("courseId", courseId);
      params.set("holesPlayed", String(holesPlayed));
      params.set("date", date);
      params.set("startTime", time);
      if (frontLoopId) params.set("frontLoopId", frontLoopId);
      if (holesPlayed === 18 && backLoopId) params.set("backLoopId", backLoopId);
      router.push(`/rounds/new?${params.toString()}`);
    } catch {
      // 중복 확인 실패 시에도 등록 자체는 막지 않는다 — 최종 방어선은 POST /api/rounds에도 있음.
      const params = new URLSearchParams();
      params.set("step", "2");
      params.set("courseId", courseId);
      params.set("holesPlayed", String(holesPlayed));
      params.set("date", date);
      params.set("startTime", startTime24());
      if (frontLoopId) params.set("frontLoopId", frontLoopId);
      if (holesPlayed === 18 && backLoopId) params.set("backLoopId", backLoopId);
      router.push(`/rounds/new?${params.toString()}`);
    } finally {
      setChecking(false);
    }
  }

  const canProceed = Boolean(courseId) && !checking;

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
        onChange={(e) => {
          setDate(e.target.value);
          setDuplicateError(null);
        }}
        className="mb-3.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm"
      />

      <label className="mb-1 block text-xs font-semibold text-muted">출발 시간 (Starting Time)</label>
      <div className="mb-3.5 flex items-center gap-1.5">
        <div className="flex shrink-0 gap-0.5 rounded-lg bg-card-bg p-0.5">
          {(["AM", "PM"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setAmpm(v);
                setDuplicateError(null);
              }}
              className={
                "rounded-md px-2.5 py-2 text-xs font-semibold " +
                (ampm === v ? "bg-primary text-white" : "text-muted")
              }
            >
              {v === "AM" ? "오전" : "오후"}
            </button>
          ))}
        </div>
        <select
          value={hour}
          onChange={(e) => {
            setHour(e.target.value);
            setDuplicateError(null);
          }}
          className="flex-1 rounded-lg border border-line bg-white px-2 py-2.5 text-sm"
        >
          {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((h) => (
            <option key={h} value={h}>
              {h}시
            </option>
          ))}
        </select>
        <span className="text-sm font-bold text-muted">:</span>
        <select
          value={minute}
          onChange={(e) => {
            setMinute(e.target.value);
            setDuplicateError(null);
          }}
          className="flex-1 rounded-lg border border-line bg-white px-2 py-2.5 text-sm"
        >
          {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map((m) => (
            <option key={m} value={m}>
              {m}분
            </option>
          ))}
        </select>
      </div>

      {duplicateError && (
        <p className="mb-3.5 -mt-1 text-[11.5px] font-semibold text-[#B85042]">{duplicateError}</p>
      )}

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
        {checking ? "확인 중..." : "스코어 카드 ›"}
      </button>
    </div>
  );
}
