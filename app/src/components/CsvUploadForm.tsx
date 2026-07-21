"use client";

import { useRef, useState } from "react";

type RowError = {
  row: number;
  courseName: string;
  loopName: string;
  message: string;
};

type UploadResult = {
  totalRows: number;
  successCount: number;
  failCount: number;
  errors: RowError[];
};

export default function CsvUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile(next: File | null) {
    setFile(next);
    setResult(null);
    setError(null);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) pickFile(dropped);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/golf-courses/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "업로드 처리에 실패했습니다.");
        return;
      }
      setResult(data as UploadResult);
    } catch {
      setError("네트워크 오류로 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="mb-3.5 rounded-xl bg-card-bg p-3.5">
        <div className="mb-1.5 text-[13px] font-semibold">CSV 포맷</div>
        <pre className="whitespace-pre-wrap break-all rounded-lg bg-white p-2.5 font-mono text-[11px] leading-relaxed text-muted">
          {"골프장명,루프명,홀번호,Par\n레이크사이드 CC,전반,1,4\n레이크사이드 CC,전반,2,5\n레이크사이드 CC,후반,1,4\n..."}
        </pre>
        <p className="mt-1.5 text-[11px] text-muted">
          홀번호는 루프 내부 기준 1~9 · 루프명이 해당 골프장에 없으면 자동
          생성됩니다
        </p>
        <a
          href="/sample-golfcourse-par.csv"
          download
          className="mt-2 inline-block text-xs font-semibold text-primary"
        >
          ⬇ 샘플 CSV 다운로드
        </a>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={
          "mb-3.5 cursor-pointer rounded-xl border-2 border-dashed p-7 text-center text-sm " +
          (dragOver ? "border-primary bg-card-bg2" : "border-line bg-card-bg text-muted")
        }
      >
        <div className="mb-1.5 text-2xl">📄</div>
        {file ? (
          <span className="font-semibold">{file.name}</span>
        ) : (
          <>
            파일을 여기로 끌어놓거나
            <br />
            탭하여 선택하세요
          </>
        )}
      </div>

      <button
        type="button"
        onClick={handleUpload}
        disabled={!file || uploading}
        className="mb-4 block w-full rounded-lg bg-primary py-3 text-center text-sm font-semibold text-white disabled:opacity-60"
      >
        {uploading ? "처리 중..." : "업로드 및 처리"}
      </button>

      {error && (
        <div className="mb-4 text-[12px] font-semibold text-red-600">{error}</div>
      )}

      {result && (
        <div>
          <h2 className="mb-2.5 text-[13px] font-semibold text-muted">
            처리 결과 ({result.totalRows}건 중 {result.successCount}건 성공)
          </h2>

          {result.failCount === 0 ? (
            <div className="rounded-lg bg-card-bg2 p-4 text-center text-sm text-primary">
              전부 정상 처리됐습니다.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg bg-card-bg p-2.5">
              <table className="w-full text-left text-[11.5px]">
                <thead>
                  <tr className="text-muted">
                    <th className="px-1.5 py-1 font-semibold">행</th>
                    <th className="px-1.5 py-1 font-semibold">골프장명</th>
                    <th className="px-1.5 py-1 font-semibold">루프</th>
                    <th className="px-1.5 py-1 font-semibold">오류</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((err, idx) => (
                    <tr key={idx} className="border-t border-line">
                      <td className="px-1.5 py-1.5">{err.row}</td>
                      <td className="px-1.5 py-1.5">
                        {err.courseName || <span className="text-muted">-</span>}
                      </td>
                      <td className="px-1.5 py-1.5">
                        {err.loopName || <span className="text-muted">-</span>}
                      </td>
                      <td className="px-1.5 py-1.5 font-semibold text-[#C1552F]">
                        {err.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.failCount > result.errors.length && (
                <p className="mt-2 text-[11px] text-muted">
                  오류가 {result.failCount}건이라 상위 {result.errors.length}건만
                  표시했습니다.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
