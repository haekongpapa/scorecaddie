"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type TeeShotResult = "FAIRWAY" | "MISS" | "PENALTY" | "OB";
export type PinDistanceType = "NEAR" | "FAR";

export type HoleState = {
  holeNumber: number; // 1~holesPlayed (절대 번호)
  par: number;
  teeShotResult: TeeShotResult | null;
  penaltyStrokes: number;
  obStrokes: number;
  bunkerUsed: boolean;
  pinDistanceType: PinDistanceType | null;
  pinDistanceMeters: number | null;
  onGreenStrokes: number;
  puttStrokes: number;
  memo: string;
  strokes: number | null;
  saved: boolean;
  teeAutoAdjust: { penalty: number; ob: number; onGreen: number };
};

const ZERO_ADJUST = { penalty: 0, ob: 0, onGreen: 0 };
const TEE_ADJUST: Record<TeeShotResult, { penalty: number; ob: number; onGreen: number }> = {
  FAIRWAY: ZERO_ADJUST,
  MISS: ZERO_ADJUST,
  PENALTY: { penalty: 1, ob: 0, onGreen: 1 },
  OB: { penalty: 0, ob: 2, onGreen: 2 },
};

const TEE_OPTIONS: { value: TeeShotResult; label: string }[] = [
  { value: "FAIRWAY", label: "페어웨이" },
  { value: "MISS", label: "페어 실패" },
  { value: "PENALTY", label: "페널티" },
  { value: "OB", label: "OB" },
];

const PAR_OPTIONS = [3, 4, 5, 6];

function weekdayLabel(dateStr: string) {
  try {
    const d = new Date(dateStr + "T00:00:00");
    const wd = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
    return `${dateStr}(${wd})`;
  } catch {
    return dateStr;
  }
}

// "HH:MM" 24시간제 → "오전/오후 HH:MM" 12시간제 표시로 변환.
function startTimeLabel(startTime: string | null) {
  if (!startTime) return null;
  const [hStr, mStr] = startTime.split(":");
  let h = Number(hStr);
  const ampm = h < 12 ? "오전" : "오후";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${ampm} ${String(h).padStart(2, "0")}:${mStr}`;
}

export default function RoundStep2({
  roundId: initialRoundId,
  courseId,
  courseName,
  holesPlayed,
  date,
  startTime,
  isEdit,
  initialHoles,
}: {
  roundId: string | null;
  courseId: string;
  courseName: string;
  holesPlayed: 9 | 18;
  date: string;
  startTime: string | null;
  isEdit: boolean;
  initialHoles: HoleState[];
}) {
  const router = useRouter();
  const [roundId, setRoundId] = useState<string | null>(initialRoundId);
  const [holes, setHoles] = useState<HoleState[]>(initialHoles);
  const [currentHoleNumber, setCurrentHoleNumber] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = holes[currentHoleNumber - 1];
  const half = currentHoleNumber <= 9 ? "전반" : "후반";
  const localNum = currentHoleNumber <= 9 ? currentHoleNumber : currentHoleNumber - 9;

  function updateCurrent(patch: Partial<HoleState>) {
    setHoles((prev) =>
      prev.map((h) => (h.holeNumber === currentHoleNumber ? { ...h, ...patch } : h))
    );
  }

  function handleTeeResult(value: TeeShotResult) {
    const prevAdj = current.teeAutoAdjust;
    const newAdj = TEE_ADJUST[value];
    updateCurrent({
      teeShotResult: value,
      penaltyStrokes: Math.max(0, current.penaltyStrokes - prevAdj.penalty + newAdj.penalty),
      obStrokes: Math.max(0, current.obStrokes - prevAdj.ob + newAdj.ob),
      onGreenStrokes: Math.max(0, current.onGreenStrokes - prevAdj.onGreen + newAdj.onGreen),
      teeAutoAdjust: newAdj,
    });
  }

  function stepField(field: "penaltyStrokes" | "obStrokes" | "onGreenStrokes" | "puttStrokes", dir: 1 | -1) {
    updateCurrent({ [field]: Math.max(0, current[field] + dir) } as Partial<HoleState>);
  }

  function resetCurrent() {
    updateCurrent({
      par: current.par,
      teeShotResult: null,
      penaltyStrokes: 0,
      obStrokes: 0,
      bunkerUsed: false,
      pinDistanceType: null,
      pinDistanceMeters: null,
      onGreenStrokes: Math.max(current.par - 2, 1),
      puttStrokes: 2,
      memo: "",
      strokes: null,
      saved: false,
      teeAutoAdjust: ZERO_ADJUST,
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      let activeRoundId = roundId;
      if (!activeRoundId) {
        const res = await fetch("/api/rounds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            golfCourseId: courseId,
            playedAt: date,
            holesPlayed,
            startTime,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "라운드 생성에 실패했습니다.");
          return;
        }
        activeRoundId = data.roundId;
        setRoundId(activeRoundId);
        router.replace(`/rounds/new?step=2&edit=${activeRoundId}`);
      }

      const holeRes = await fetch(`/api/rounds/${activeRoundId}/holes/${currentHoleNumber}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          par: current.par,
          teeShotResult: current.teeShotResult,
          penaltyStrokes: current.penaltyStrokes,
          obStrokes: current.obStrokes,
          bunkerUsed: current.bunkerUsed,
          pinDistanceType: current.pinDistanceType,
          pinDistanceMeters: current.pinDistanceMeters,
          onGreenStrokes: current.onGreenStrokes,
          puttStrokes: current.puttStrokes,
          memo: current.memo || null,
        }),
      });
      const holeData = await holeRes.json();
      if (!holeRes.ok) {
        setError(holeData.error ?? "홀 저장에 실패했습니다.");
        return;
      }

      updateCurrent({ strokes: current.onGreenStrokes + current.puttStrokes, saved: true });
      if (currentHoleNumber < holesPlayed) {
        setCurrentHoleNumber((n) => n + 1);
      }
    } catch {
      setError("네트워크 오류로 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const diff = current.onGreenStrokes + current.puttStrokes - current.par;
  const scoreLabel = diff === 0 ? "E" : diff > 0 ? `+${diff}` : String(diff);

  const frontHoles = holes.slice(0, 9);
  const backHoles = holes.slice(9, 18);

  function renderTable(list: HoleState[], label: string, startOffset: number) {
    const parSum = list.reduce((s, h) => s + h.par, 0);
    const savedList = list.filter((h) => h.saved);
    const scSum = savedList.reduce((s, h) => s + (h.strokes ?? 0), 0);
    return (
      <table className="mb-1.5 w-full table-fixed border-collapse text-center text-[10.5px]">
        <thead>
          <tr>
            <th className="border border-line bg-card-bg2 p-1 text-[10px] font-bold text-primary">
              {label}
            </th>
            {list.map((h) => (
              <th
                key={h.holeNumber}
                onClick={() => setCurrentHoleNumber(h.holeNumber)}
                className={
                  "cursor-pointer border border-line p-1 font-bold " +
                  (h.holeNumber === currentHoleNumber ? "bg-accent text-white" : "bg-white")
                }
              >
                {h.holeNumber - startOffset}번
              </th>
            ))}
            <th className="border border-line bg-card-bg2 p-1 text-[10px] font-bold text-primary">
              합계
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-line bg-card-bg p-1 font-medium text-muted">파</td>
            {list.map((h) => (
              <td
                key={h.holeNumber}
                className={
                  "border border-line p-1 font-medium text-muted " +
                  (h.holeNumber === currentHoleNumber ? "bg-accent text-white" : "bg-card-bg")
                }
              >
                {h.par}
              </td>
            ))}
            <td className="border border-line bg-card-bg2 p-1 font-bold text-primary">{parSum}</td>
          </tr>
          <tr>
            <td className="border border-line bg-card-bg2 p-1 font-bold text-primary">Sc.</td>
            {list.map((h) => (
              <td
                key={h.holeNumber}
                onClick={() => setCurrentHoleNumber(h.holeNumber)}
                className={
                  "cursor-pointer border border-line bg-primary p-1 font-bold text-white " +
                  (h.holeNumber === currentHoleNumber ? "outline outline-2 -outline-offset-2 outline-accent" : "")
                }
              >
                {h.saved ? h.strokes : ""}
              </td>
            ))}
            <td className="border border-line bg-card-bg2 p-1 font-bold text-primary">
              {savedList.length ? scSum : "-"}
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-center gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-card-bg2 text-[11px] font-bold text-muted">
            1
          </span>
          <span className="text-[11px] font-semibold text-muted">코스 선택</span>
        </div>
        <span className="h-px w-7 bg-line" />
        <div className="flex items-center gap-1.5">
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
            2
          </span>
          <span className="text-[11px] font-semibold text-primary">스코어 입력</span>
        </div>
      </div>

      <div className="mb-3.5 rounded-lg bg-card-bg p-2 text-center text-[11.5px] font-bold text-primary">
        [ {weekdayLabel(date)} {courseName} {holesPlayed}H{startTimeLabel(startTime) ? ` · ${startTimeLabel(startTime)} 출발` : ""} ]
      </div>

      {isEdit && (
        <div className="-mt-2 mb-3.5 rounded-md bg-[#B85042] p-1 text-center text-[10px] font-bold text-white">
          ✏️ 기존 라운드 수정 중
        </div>
      )}

      {renderTable(frontHoles, "전반", 0)}
      {holesPlayed === 18 && renderTable(backHoles, "후반", 9)}

      <p className="mb-4 mt-2 text-center text-[10px] text-muted">
        스코어카드에서 홀을 탭하면 이동, PAR은 아래 PAR 버튼으로 변경
      </p>

      <div className="mb-3.5 grid grid-cols-4 gap-1.5">
        {PAR_OPTIONS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => updateCurrent({ par: p })}
            className={
              "rounded-lg border py-2.5 text-[13px] font-bold " +
              (current.par === p
                ? "border-[#8A7A1E] bg-[#8A7A1E] text-white"
                : "border-line bg-white text-ink")
            }
          >
            PAR {p}
          </button>
        ))}
      </div>

      <div className="mb-3.5 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-line p-2.5">
          <div className="mb-2 text-[11px] font-bold text-[#B85042]">1. 티샷 결과</div>
          <div className="grid grid-cols-2 gap-1.5">
            {TEE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleTeeResult(opt.value)}
                className={
                  "rounded-lg border py-2.5 text-[11.5px] font-bold leading-tight " +
                  (current.teeShotResult === opt.value
                    ? "border-primary bg-primary text-white"
                    : "border-line bg-white text-ink")
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[9.5px] leading-tight text-[#B85042]">
            페널티: 페널티+1·온그린+1 / OB: OB+2·온그린+2 자동반영
          </p>
        </div>

        <div className="rounded-xl border border-line p-2.5">
          <div className="mb-2 text-[11px] font-bold text-[#B85042]">2. 페널티/OB</div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11.5px] font-semibold">페널티</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => stepField("penaltyStrokes", -1)}
                className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-card-bg text-primary"
              >
                ◀
              </button>
              <span
                className={
                  "min-w-[18px] text-center text-[13px] font-bold " +
                  (current.teeAutoAdjust.penalty > 0 ? "text-[#B85042]" : "text-ink")
                }
              >
                {current.penaltyStrokes}
              </span>
              <button
                type="button"
                onClick={() => stepField("penaltyStrokes", 1)}
                className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-card-bg text-primary"
              >
                ▶
              </button>
            </div>
          </div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11.5px] font-semibold">OB</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => stepField("obStrokes", -1)}
                className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-card-bg text-primary"
              >
                ◀
              </button>
              <span
                className={
                  "min-w-[18px] text-center text-[13px] font-bold " +
                  (current.teeAutoAdjust.ob > 0 ? "text-[#B85042]" : "text-ink")
                }
              >
                {current.obStrokes}
              </span>
              <button
                type="button"
                onClick={() => stepField("obStrokes", 1)}
                className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-card-bg text-primary"
              >
                ▶
              </button>
            </div>
          </div>
          <label className="mt-2.5 flex items-center gap-1.5 text-[11.5px]">
            <input
              type="checkbox"
              checked={current.bunkerUsed}
              onChange={(e) => updateCurrent({ bunkerUsed: e.target.checked })}
            />
            그린주변벙커
          </label>
        </div>

        <div className="rounded-xl border border-line p-2.5">
          <div className="mb-2 text-[11px] font-bold text-[#B85042]">3. 온그린 핀거리</div>
          <div className="flex flex-col gap-1.5">
            <select
              value={current.pinDistanceType === "NEAR" ? String(current.pinDistanceMeters ?? "") : ""}
              onChange={(e) => {
                if (e.target.value === "") {
                  updateCurrent({ pinDistanceType: null, pinDistanceMeters: null });
                } else {
                  updateCurrent({ pinDistanceType: "NEAR", pinDistanceMeters: Number(e.target.value) });
                }
              }}
              className={
                "w-full rounded-lg border px-2 py-2 text-xs " +
                (current.pinDistanceType === "NEAR"
                  ? "border-2 border-primary bg-card-bg2 font-bold text-primary"
                  : "border-line bg-white text-ink")
              }
            >
              <option value="">0~20m 선택</option>
              {Array.from({ length: 21 }, (_, m) => (
                <option key={m} value={m}>
                  {m}m
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => updateCurrent({ pinDistanceType: "FAR", pinDistanceMeters: null })}
              className={
                "rounded-lg border py-2.5 text-[11.5px] font-bold " +
                (current.pinDistanceType === "FAR"
                  ? "border-primary bg-primary text-white"
                  : "border-line bg-white text-ink")
              }
            >
              20m 이상
            </button>
          </div>
        </div>

        <div className="rounded-xl border-2 border-accent p-2.5">
          <div className="mb-2 text-[11px] font-bold text-[#B85042]">4. 스코어</div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11.5px] font-semibold">온그린</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => stepField("onGreenStrokes", -1)}
                className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-card-bg text-primary"
              >
                ◀
              </button>
              <span
                className={
                  "min-w-[18px] text-center text-[13px] font-bold " +
                  (current.teeAutoAdjust.penalty > 0 || current.teeAutoAdjust.ob > 0
                    ? "text-[#B85042]"
                    : "text-ink")
                }
              >
                {current.onGreenStrokes}
              </span>
              <button
                type="button"
                onClick={() => stepField("onGreenStrokes", 1)}
                className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-card-bg text-primary"
              >
                ▶
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold">퍼트</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => stepField("puttStrokes", -1)}
                className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-card-bg text-primary"
              >
                ◀
              </button>
              <span className="min-w-[18px] text-center text-[13px] font-bold text-ink">
                {current.puttStrokes}
              </span>
              <button
                type="button"
                onClick={() => stepField("puttStrokes", 1)}
                className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-card-bg text-primary"
              >
                ▶
              </button>
            </div>
          </div>
          <div className="mt-2 rounded-lg bg-primary py-1.5 text-center text-[15px] font-bold text-white">
            {scoreLabel}
          </div>
        </div>
      </div>

      <input
        type="text"
        maxLength={100}
        value={current.memo}
        onChange={(e) => updateCurrent({ memo: e.target.value })}
        placeholder="홀메모"
        className="mb-1 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm"
      />
      <div className="mb-3.5 text-right text-[10px] text-muted">{current.memo.length}/100</div>

      {error && <div className="mb-2 text-[12px] font-semibold text-red-600">{error}</div>}

      <div className="mb-1 flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="flex-[2] rounded-lg bg-[#C7509B] py-3 text-center text-sm font-semibold text-white disabled:opacity-60"
        >
          {half} {localNum}번홀 입력
        </button>
        {roundId ? (
          <Link
            href={`/rounds/${roundId}`}
            className="flex-1 rounded-lg border border-line py-3 text-center text-sm font-semibold text-primary"
          >
            라운드 상세
          </Link>
        ) : (
          <span className="flex-1 rounded-lg border border-line py-3 text-center text-sm font-semibold text-muted opacity-45">
            라운드 상세
          </span>
        )}
      </div>

      <div className="mt-3 flex gap-2 border-t border-line pt-3">
        <button
          type="button"
          disabled={currentHoleNumber <= 1}
          onClick={() => setCurrentHoleNumber((n) => Math.max(1, n - 1))}
          className="h-[42px] flex-1 rounded-lg border border-line bg-white text-base text-primary disabled:opacity-40"
        >
          ◀
        </button>
        <button
          type="button"
          disabled={currentHoleNumber >= holesPlayed}
          onClick={() => setCurrentHoleNumber((n) => Math.min(holesPlayed, n + 1))}
          className="h-[42px] flex-1 rounded-lg border border-line bg-white text-base text-primary disabled:opacity-40"
        >
          ▶
        </button>
        <button
          type="button"
          onClick={resetCurrent}
          className="h-[42px] flex-1 rounded-lg border border-line bg-white text-base text-primary"
        >
          🔄
        </button>
      </div>
    </div>
  );
}
