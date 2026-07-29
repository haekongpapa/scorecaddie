"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

  // 6번(골프장 상세) "이 골프장에서 스코어 등록"에서 넘어온 initialCourseId가 필터링된
  // courses 목록에 없을 수 있다(루프 미등록/비영업 상태 골프장 — 2026-07-29 서버 조회 조건
  // 추가로 courses 자체가 이미 걸러져서 내려옴). 이 경우 courses[0]으로 조용히 대체해버리면
  // 사용자가 의도한 것과 다른 골프장으로 스코어가 등록될 위험이 있어, 아무 것도 선택하지 않은
  // 상태로 두고 안내 문구를 보여준다(아래 initialCourseUnavailable 참고).
  const initialCourseUnavailable = Boolean(initialCourseId) && !courses.some((c) => c.id === initialCourseId);
  const [courseId, setCourseId] = useState<string>(
    initialCourseId && !initialCourseUnavailable
      ? initialCourseId
      : initialCourseId
        ? ""
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

  // 골프장 검색형 콤보박스(2026-07-29 신규 — 기존 <select> 대체) ────────────────────────
  // 인풋에 타이핑한 글자로 실시간 필터링되고, 목록에서 클릭/엔터로 확정 선택하는 구조.
  // courses가 이미 수백 개 규모라 클라이언트 필터링만으로 충분(서버 재조회 불필요,
  // CourseSearchList.tsx의 클라이언트 필터링 패턴과 동일한 전제).
  const [courseQuery, setCourseQuery] = useState(course?.name ?? "");
  const [comboOpen, setComboOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const comboWrapRef = useRef<HTMLDivElement>(null);

  const filteredCourses = useMemo(() => {
    const q = courseQuery.trim();
    if (!q) return courses;
    return courses.filter((c) => c.name.includes(q));
  }, [courses, courseQuery]);

  function selectCourse(next: Step1Course) {
    handleCourseChange(next.id);
    setCourseQuery(next.name);
    setComboOpen(false);
  }

  function handleComboKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!comboOpen) {
        setComboOpen(true);
        return;
      }
      setHighlightIndex((i) => Math.min(i + 1, filteredCourses.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filteredCourses[highlightIndex];
      if (target) selectCourse(target);
    } else if (e.key === "Escape") {
      setComboOpen(false);
      setCourseQuery(course?.name ?? "");
    }
  }

  // 목록 밖 클릭 시 닫기 + 확정되지 않은 입력값은 마지막으로 선택된 골프장 이름으로 되돌림.
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (!comboWrapRef.current?.contains(e.target as Node)) {
        setComboOpen(false);
        setCourseQuery(course?.name ?? "");
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [course]);

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

  // "라운드 당시 날씨" 카드 — 골프장/일자/출발시간이 바뀔 때마다(400ms 디바운스) 미리보기 재조회.
  const [weather, setWeather] = useState<{ loading: boolean; label: string | null }>({
    loading: false,
    label: null,
  });

  useEffect(() => {
    if (!courseId) {
      setWeather({ loading: false, label: null });
      return;
    }
    let cancelled = false;
    setWeather((w) => ({ ...w, loading: true }));
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ courseId, date, time: startTime24() });
        const res = await fetch(`/api/weather/preview?${params.toString()}`);
        const data = await res.json();
        if (!cancelled) setWeather({ loading: false, label: data.label ?? null });
      } catch {
        if (!cancelled) setWeather({ loading: false, label: null });
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // courseId/date/ampm/hour/minute 변경 시에만 재조회하면 충분(startTime24는 이 값들의 파생값).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, date, ampm, hour, minute]);

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

      {initialCourseUnavailable && (
        <p className="mb-2 -mt-1 text-[11.5px] font-semibold text-[#B85042]">
          선택하신 골프장은 현재 라운드 등록이 불가능합니다(루프 미등록 또는 비영업 상태). 아래에서
          다른 골프장을 검색해 선택해주세요.
        </p>
      )}
      <label htmlFor="round-course" className="mb-1 block text-xs font-semibold text-muted">골프장</label>
      <div ref={comboWrapRef} className="relative mb-3.5">
        <input
          id="round-course"
          type="text"
          role="combobox"
          aria-expanded={comboOpen}
          aria-controls="round-course-listbox"
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={courses.length === 0 ? "등록된 골프장이 없습니다" : "골프장 이름 검색"}
          disabled={courses.length === 0}
          value={courseQuery}
          onChange={(e) => {
            setCourseQuery(e.target.value);
            setComboOpen(true);
            setHighlightIndex(0);
          }}
          onFocus={() => setComboOpen(true)}
          onKeyDown={handleComboKeyDown}
          className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm disabled:bg-card-bg disabled:text-muted"
        />
        {comboOpen && (
          <ul
            id="round-course-listbox"
            role="listbox"
            className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-lg"
          >
            {filteredCourses.length === 0 ? (
              <li className="px-3 py-2 text-[12.5px] text-muted">검색 결과가 없습니다.</li>
            ) : (
              filteredCourses.map((c, i) => (
                <li key={c.id} role="option" aria-selected={c.id === courseId}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectCourse(c)}
                    className={
                      "block w-full px-3 py-2 text-left text-sm " +
                      (i === highlightIndex ? "bg-card-bg2" : "bg-white") +
                      (c.id === courseId ? " font-semibold text-primary" : "")
                    }
                  >
                    {c.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

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
          <div
            className={
              weather.label
                ? "mt-0.5 text-[13px] font-semibold"
                : "mt-0.5 text-[11px] text-muted"
            }
          >
            {weather.loading
              ? "확인 중..."
              : weather.label ?? "날씨 정보 없음 (오늘~+3일만 제공)"}
          </div>
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
