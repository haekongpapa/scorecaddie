"use client";

import { useState } from "react";

type GeocodeBatchCardProps = {
  initialNeedsGeocodingCount: number;
};

type GeocodeResult = {
  totalTargeted: number;
  successCount: number;
  failCount: number;
  remainingCount: number;
  noAddressCount: number;
};

export default function GeocodeBatchCard({
  initialNeedsGeocodingCount,
}: GeocodeBatchCardProps) {
  const [running, setRunning] = useState(false);
  const [pendingCount, setPendingCount] = useState(initialNeedsGeocodingCount);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setError(null);
    setToast(null);

    try {
      const res = await fetch("/api/admin/golf-courses/geocode", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "지오코딩 실행에 실패했습니다.");
        return;
      }

      const result = data as GeocodeResult;
      setPendingCount(result.remainingCount + result.noAddressCount);
      setToast(
        `성공 ${result.successCount}건 · 실패 ${result.failCount}건` +
          (result.remainingCount > 0
            ? ` (남은 ${result.remainingCount}건은 버튼을 다시 눌러 이어서 처리)`
            : "") +
          (result.noAddressCount > 0
            ? ` · 주소 없음 ${result.noAddressCount}건은 대상 제외`
            : "")
      );
      setTimeout(() => setToast(null), 5000);
    } catch {
      setError("네트워크 오류로 지오코딩 실행에 실패했습니다.");
    } finally {
      setRunning(false);
    }
  }

  if (pendingCount === 0) return null;

  return (
    <div className="relative">
      <div className="mb-3 flex items-center justify-between gap-2.5 rounded-xl bg-card-bg p-3.5">
        <div>
          <div className="text-[13.5px] font-semibold">📍 좌표 지오코딩 실행</div>
          <div className="mt-0.5 text-[11px] text-muted">
            주소만 있고 좌표가 없는 골프장을 카카오 주소 검색으로 채워요
          </div>
          <div className="mt-0.5 text-[11px] text-muted">
            좌표 미확인: {pendingCount}개
          </div>
          {error && (
            <div className="mt-1 text-[11px] font-semibold text-red-600">{error}</div>
          )}
        </div>
        <button
          type="button"
          onClick={handleRun}
          disabled={running}
          className="shrink-0 whitespace-nowrap rounded-lg border border-primary bg-white px-3.5 py-2 text-[12.5px] font-semibold text-primary disabled:opacity-60"
        >
          {running ? "실행 중..." : "실행"}
        </button>
      </div>

      {toast && (
        <div className="pointer-events-none absolute left-1/2 top-full z-20 -translate-x-1/2 whitespace-nowrap rounded-lg bg-primary px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
