"use client";

import { useState } from "react";

export type LoopData = {
  id: string;
  name: string;
  sortOrder: number;
  pars: number[]; // 항상 length 9, 값은 3/4/5 (미저장 홀은 4로 기본 표시 — page.tsx 참고)
  referencedRoundCount: number; // 이 루프를 참조 중인 Round(frontLoop+backLoop) 수 — 페이지 로드 시점 값
};

const VALID_PARS = [3, 4, 5] as const;

function parsEqual(a: number[], b: number[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export default function GolfCourseParEditor({
  courseId,
  initialLoops,
}: {
  courseId: string;
  initialLoops: LoopData[];
}) {
  const [loops, setLoops] = useState(initialLoops);
  const [activeId, setActiveId] = useState<string | null>(
    initialLoops[0]?.id ?? null
  );
  const [pars, setPars] = useState<number[]>(
    initialLoops[0]?.pars ?? Array(9).fill(4)
  );
  const [savedPars, setSavedPars] = useState<number[]>(
    initialLoops[0]?.pars ?? Array(9).fill(4)
  );
  const [busy, setBusy] = useState(false); // 루프 추가/이름변경/삭제/재정렬 중
  const [saving, setSaving] = useState(false); // Par 저장 중
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const activeLoop = loops.find((l) => l.id === activeId) ?? null;
  const isDirty = !parsEqual(pars, savedPars);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }

  function selectLoop(loop: LoopData) {
    if (loop.id === activeId) return;
    if (isDirty) {
      const ok = window.confirm(
        "저장하지 않은 Par 변경사항이 있습니다. 이동하면 변경사항이 사라집니다. 계속할까요?"
      );
      if (!ok) return;
    }
    setActiveId(loop.id);
    setPars(loop.pars);
    setSavedPars(loop.pars);
    setError(null);
  }

  async function handleAddLoop() {
    const name = window.prompt("새 루프 이름 (예: 남코스)");
    if (!name || !name.trim()) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/golf-courses/${courseId}/loops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "루프 추가에 실패했습니다.");
        return;
      }
      const newLoop: LoopData = {
        id: data.loop.id,
        name: data.loop.name,
        sortOrder: data.loop.sortOrder,
        pars: Array(9).fill(4),
        referencedRoundCount: 0,
      };
      setLoops((prev) => [...prev, newLoop]);
      setActiveId(newLoop.id);
      setPars(newLoop.pars);
      setSavedPars(newLoop.pars);
      showToast(`"${newLoop.name}" 루프를 추가했습니다.`);
    } catch {
      setError("네트워크 오류로 루프 추가에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRenameLoop(loop: LoopData) {
    const name = window.prompt("루프 이름 변경", loop.name);
    if (!name || !name.trim() || name.trim() === loop.name) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/golf-courses/${courseId}/loops/${loop.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "루프 이름 변경에 실패했습니다.");
        return;
      }
      setLoops((prev) =>
        prev.map((l) => (l.id === loop.id ? { ...l, name: data.loop.name } : l))
      );
    } catch {
      setError("네트워크 오류로 루프 이름 변경에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteLoop(loop: LoopData) {
    const warning =
      loop.referencedRoundCount > 0
        ? ` 이 루프를 참조 중인 라운드가 ${loop.referencedRoundCount}건 있습니다. 삭제해도 해당 라운드 기록 자체는 유지되며, 루프 연결만 해제됩니다.`
        : "";
    const ok = window.confirm(`"${loop.name}" 루프를 삭제할까요?${warning}`);
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/golf-courses/${courseId}/loops/${loop.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "루프 삭제에 실패했습니다.");
        return;
      }
      setLoops((prev) => {
        const next = prev.filter((l) => l.id !== loop.id);
        if (activeId === loop.id) {
          const fallback = next[0] ?? null;
          setActiveId(fallback?.id ?? null);
          setPars(fallback?.pars ?? Array(9).fill(4));
          setSavedPars(fallback?.pars ?? Array(9).fill(4));
        }
        return next;
      });
      showToast(`"${loop.name}" 루프를 삭제했습니다.`);
    } catch {
      setError("네트워크 오류로 루프 삭제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleMoveLoop(loop: LoopData, direction: -1 | 1) {
    const sorted = [...loops].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((l) => l.id === loop.id);
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    const target = sorted[targetIdx];

    setBusy(true);
    setError(null);
    try {
      const [res1, res2] = await Promise.all([
        fetch(`/api/admin/golf-courses/${courseId}/loops/${loop.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: target.sortOrder }),
        }),
        fetch(`/api/admin/golf-courses/${courseId}/loops/${target.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: loop.sortOrder }),
        }),
      ]);
      if (!res1.ok || !res2.ok) {
        setError("루프 순서 변경에 실패했습니다.");
        return;
      }
      setLoops((prev) =>
        prev.map((l) => {
          if (l.id === loop.id) return { ...l, sortOrder: target.sortOrder };
          if (l.id === target.id) return { ...l, sortOrder: loop.sortOrder };
          return l;
        })
      );
    } catch {
      setError("네트워크 오류로 루프 순서 변경에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function handleParChange(holeIdx: number, value: number) {
    setPars((prev) => {
      const next = [...prev];
      next[holeIdx] = value;
      return next;
    });
  }

  async function handleSave() {
    if (!activeLoop) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/golf-courses/${courseId}/loops/${activeLoop.id}/holes`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pars }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }
      setSavedPars(pars);
      setLoops((prev) =>
        prev.map((l) => (l.id === activeLoop.id ? { ...l, pars } : l))
      );
      showToast("저장되었습니다.");
    } catch {
      setError("네트워크 오류로 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const sortedLoops = [...loops].sort((a, b) => a.sortOrder - b.sortOrder);
  const parTotal = pars.reduce((sum, p) => sum + p, 0);

  return (
    <div className="relative">
      <h2 className="mb-2.5 text-[13px] font-semibold text-muted">
        루프(코스) 선택
      </h2>
      <div className="mb-1.5 flex flex-wrap gap-1.5">
        {sortedLoops.map((loop, idx) => (
          <div
            key={loop.id}
            className={
              "flex items-center gap-1 rounded-lg border px-2.5 py-2 text-[13px] " +
              (loop.id === activeId
                ? "border-primary bg-primary font-semibold text-white"
                : "border-line bg-white")
            }
          >
            <button
              type="button"
              onClick={() => selectLoop(loop)}
              onDoubleClick={() => handleRenameLoop(loop)}
              disabled={busy}
              className="disabled:opacity-60"
            >
              {loop.name}
            </button>
            <button
              type="button"
              aria-label="위로 이동"
              onClick={() => handleMoveLoop(loop, -1)}
              disabled={busy || idx === 0}
              className="text-[10px] opacity-70 disabled:opacity-30"
            >
              ▲
            </button>
            <button
              type="button"
              aria-label="아래로 이동"
              onClick={() => handleMoveLoop(loop, 1)}
              disabled={busy || idx === sortedLoops.length - 1}
              className="text-[10px] opacity-70 disabled:opacity-30"
            >
              ▼
            </button>
            <button
              type="button"
              aria-label="삭제"
              onClick={() => handleDeleteLoop(loop)}
              disabled={busy}
              className="ml-0.5 text-[11px] opacity-70 disabled:opacity-30"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={handleAddLoop}
          disabled={busy}
          className="rounded-lg border border-dashed border-primary px-2.5 py-2 text-[13px] font-semibold text-primary disabled:opacity-60"
        >
          + 루프 추가
        </button>
      </div>
      <p className="mb-3.5 text-[11px] text-muted">
        루프 이름 더블탭으로 변경 · ▲▼로 순서 변경 · ✕로 삭제
      </p>

      {error && (
        <div className="mb-3 text-[12px] font-semibold text-red-600">
          {error}
        </div>
      )}

      {!activeLoop ? (
        <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
          루프를 먼저 추가해주세요.
        </div>
      ) : (
        <>
          <h2 className="mb-2.5 text-[13px] font-semibold text-muted">
            홀별 Par (규정타수) — {activeLoop.name}
          </h2>
          <div className="mb-3.5 grid grid-cols-3 gap-2">
            {pars.map((par, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center gap-1 rounded-lg bg-card-bg px-2 py-2.5"
              >
                <span className="text-[11px] text-muted">{idx + 1}홀</span>
                <select
                  value={par}
                  onChange={(e) =>
                    handleParChange(idx, Number(e.target.value))
                  }
                  className="w-full rounded-md border border-line bg-white py-1 text-center text-sm font-semibold"
                >
                  {VALID_PARS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="mb-3.5 flex items-center justify-between border-t border-line pt-2.5">
            <span className="text-sm text-muted">이 루프 합계 Par</span>
            <span className="text-base font-bold">{parTotal}</span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="block w-full rounded-lg bg-primary py-3 text-center text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "저장 중..." : isDirty ? "저장" : "저장됨"}
          </button>
          {isDirty && (
            <p className="mt-1.5 text-center text-[11px] text-accent">
              저장하지 않은 변경사항이 있습니다.
            </p>
          )}
        </>
      )}

      {toast && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg bg-primary px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
