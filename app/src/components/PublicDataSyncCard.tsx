"use client";

import { useState } from "react";

type PublicDataSyncCardProps = {
  initialLastUpdatedAt: string | null; // "YYYY-MM-DD HH:mm" 형태(서버에서 포맷 완료) 또는 null(이력 없음)
};

type SyncResult = {
  totalCount: number;
  addedCount: number;
  updatedCount: number;
  skippedCount: number;
  lastUpdatedAt: string;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function PublicDataSyncCard({
  initialLastUpdatedAt,
}: PublicDataSyncCardProps) {
  const [uploading, setUploading] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(initialLastUpdatedAt);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setUploading(true);
    setError(null);
    setToast(null);

    try {
      const res = await fetch("/api/admin/golf-courses/sync", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "동기화에 실패했습니다.");
        return;
      }

      const result = data as SyncResult;
      setLastUpdatedAt(formatDateTime(result.lastUpdatedAt));
      setToast(
        `신규 ${result.addedCount}개 추가 · ${result.updatedCount}개 갱신 완료` +
          (result.skippedCount > 0 ? ` (오류 ${result.skippedCount}건)` : "")
      );
      setTimeout(() => setToast(null), 3000);
    } catch {
      setError("네트워크 오류로 동기화에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative">
      <div className="mb-3 flex items-center justify-between gap-2.5 rounded-xl bg-card-bg p-3.5">
        <div>
          <div className="text-[13.5px] font-semibold">
            🌐 골프장 공공 데이터 업로드
          </div>
          <div className="mt-0.5 text-[11px] text-muted">
            공공데이터포털 실시간 API에서 최신 골프장 목록을 가져와요
          </div>
          <div className="mt-0.5 text-[11px] text-muted">
            최종 업데이트:{" "}
            {lastUpdatedAt ? lastUpdatedAt : "업로드 이력 없음"}
          </div>
          {error && (
            <div className="mt-1 text-[11px] font-semibold text-red-600">
              {error}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={uploading}
          className="shrink-0 whitespace-nowrap rounded-lg border border-primary bg-white px-3.5 py-2 text-[12.5px] font-semibold text-primary disabled:opacity-60"
        >
          {uploading ? "동기화 중..." : "업로드"}
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
