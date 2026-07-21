"use client";

import { useState } from "react";

export type HoleRow = {
  holeNumber: number;
  local: number;
  half: "전반" | "후반";
  par: number | null;
  strokes: number | null;
  teeShotResult: "FAIRWAY" | "MISS" | "PENALTY" | "OB" | null;
  onGreenStrokes: number | null;
  puttStrokes: number | null;
  bunkerUsed: boolean;
  memo: string | null;
  saved: boolean;
};

const TEE_CODE: Record<string, [string, string]> = {
  FAIRWAY: ["FW", "bg-[#E4F2E4] text-primary"],
  MISS: ["MS", "bg-card-bg2 text-muted"],
  PENALTY: ["PN", "bg-[#FBE7E3] text-[#B85042]"],
  OB: ["OB", "bg-[#FBE7E3] text-[#B85042]"],
};

function relClass(rel: number) {
  if (rel <= -2) return "text-accent font-extrabold underline";
  if (rel === -1) return "text-accent font-extrabold";
  if (rel === 0) return "text-ink font-bold";
  if (rel === 1) return "text-[#B85042] font-bold";
  return "text-[#B85042] font-extrabold underline";
}

function scShapeClass(rel: number) {
  if (rel <= -2) return "rounded-full border-[1.4px] border-current shadow-[0_0_0_2px_#E9F0E9,0_0_0_3.4px_currentColor]";
  if (rel === -1) return "rounded-full border-[1.4px] border-current";
  if (rel === 1) return "rounded-[3px] border-[1.4px] border-current";
  if (rel >= 2) return "rounded-[3px] border-[1.4px] border-current shadow-[0_0_0_2px_#E9F0E9,0_0_0_3.4px_currentColor]";
  return "";
}

function computeStats(h: HoleRow) {
  if (h.par === null || h.strokes === null) {
    return { rel: null as number | null, gir: false, scramble: null as boolean | null, sand: null as "save" | "fail" | null };
  }
  const rel = h.strokes - h.par;
  const gir = h.onGreenStrokes !== null && h.onGreenStrokes <= h.par - 2;
  const scramble = gir ? null : h.strokes <= h.par;
  const sand = h.bunkerUsed ? (h.strokes <= h.par ? "save" : "fail") : null;
  return { rel, gir, scramble, sand };
}

function MatrixHalf({ label, courseName, holes }: { label: string; courseName: string; holes: HoleRow[] }) {
  const parSum = holes.reduce((s, h) => s + (h.par ?? 0), 0);
  const scSum = holes.reduce((s, h) => s + (h.strokes ?? 0), 0);
  const anySaved = holes.some((h) => h.saved);
  const sideClass = label === "전반" ? "border-l-[3px] border-l-primary" : "border-l-[3px] border-l-accent";

  return (
    <div className={`mb-3.5 rounded-xl border border-line bg-white p-2.5 pb-0.5 shadow-sm ${sideClass}`}>
      <div className="mb-1.5 text-[11px] font-semibold text-muted">
        {label} · {courseName}
      </div>
      <table className="mb-2 w-full table-fixed border-collapse text-[11px]">
        <tbody>
          <tr className="border-b border-line">
            <td className="py-1 pb-1.5 text-left text-[10px] text-muted">홀</td>
            {holes.map((h) => (
              <td key={h.holeNumber} className="py-1 pb-1.5 text-center text-[9.5px] text-muted">
                {h.local}
              </td>
            ))}
            <td className="py-1 pb-1.5 text-center text-[9.5px] text-muted">합계</td>
          </tr>
          <tr>
            <td className="py-1 text-left text-muted">파</td>
            {holes.map((h) => (
              <td key={h.holeNumber} className="bg-card-bg py-1 text-center font-semibold text-muted">
                {h.par ?? "-"}
              </td>
            ))}
            <td className="text-center font-bold text-primary">{parSum}</td>
          </tr>
          <tr>
            <td className="pt-0.5 text-left text-muted">스코어</td>
            {holes.map((h) => {
              const st = computeStats(h);
              return (
                <td key={h.holeNumber} className="bg-card-bg2 py-1.5 text-center text-[12.5px] font-extrabold">
                  {h.strokes !== null && st.rel !== null ? (
                    <span
                      className={`mx-auto inline-flex h-[19px] min-w-[19px] items-center justify-center px-px ${relClass(
                        st.rel
                      )} ${scShapeClass(st.rel)}`}
                    >
                      {h.strokes}
                    </span>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </td>
              );
            })}
            <td className="text-center font-bold text-primary">{anySaved ? scSum : "-"}</td>
          </tr>
          <tr>
            <td className="pt-1 text-left text-muted">티샷</td>
            {holes.map((h) => {
              const code = h.teeShotResult ? TEE_CODE[h.teeShotResult] : null;
              return (
                <td key={h.holeNumber} className="pt-1 text-center">
                  {code ? (
                    <span className={`rounded px-1 py-px text-[9px] font-extrabold ${code[1]}`}>{code[0]}</span>
                  ) : (
                    <span className="text-[9px] text-muted">-</span>
                  )}
                </td>
              );
            })}
            <td />
          </tr>
          <tr>
            <td className="pt-1 text-left text-muted">특이사항</td>
            {holes.map((h) => {
              const st = computeStats(h);
              return (
                <td key={h.holeNumber} className="pt-1 text-center">
                  <div className="flex flex-wrap items-center justify-center gap-0.5">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        h.strokes !== null ? (st.gir ? "bg-primary" : "bg-line") : "bg-transparent"
                      }`}
                    />
                    {st.scramble === true && (
                      <span className="rounded bg-[#FDF1DC] px-1 text-[8.5px] font-extrabold text-accent">S</span>
                    )}
                    {st.sand === "save" && (
                      <span className="rounded bg-[#E4F2E4] px-1 text-[8.5px] font-extrabold text-primary">✓</span>
                    )}
                    {st.sand === "fail" && (
                      <span className="rounded bg-[#FBE7E3] px-1 text-[8.5px] font-extrabold text-[#B85042]">✗</span>
                    )}
                  </div>
                </td>
              );
            })}
            <td />
          </tr>
          <tr>
            <td className="pt-1 text-left text-muted">퍼트</td>
            {holes.map((h) => (
              <td key={h.holeNumber} className="pt-1 text-center text-muted">
                {h.puttStrokes ?? "-"}
              </td>
            ))}
            <td />
          </tr>
          <tr>
            <td className="py-1 text-left text-muted">메모</td>
            {holes.map((h) => (
              <td key={h.holeNumber} className="py-1 text-center">
                {h.memo ? (
                  <MemoButton hole={h} />
                ) : null}
              </td>
            ))}
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function MemoButton({ hole }: { hole: HoleRow }) {
  return (
    <button
      type="button"
      data-memo-half={hole.half}
      data-memo-local={hole.local}
      data-memo-text={hole.memo ?? ""}
      className="memo-icon-btn rounded px-0.5 text-[12px]"
    >
      📝
    </button>
  );
}

export default function RoundDetailMatrix({
  courseName,
  frontHoles,
  backHoles,
}: {
  courseName: string;
  frontHoles: HoleRow[];
  backHoles: HoleRow[];
}) {
  const [activeMemo, setActiveMemo] = useState<{ half: string; local: number; text: string } | null>(null);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".memo-icon-btn");
    if (!btn) return;
    setActiveMemo({
      half: btn.dataset.memoHalf ?? "",
      local: Number(btn.dataset.memoLocal ?? 0),
      text: btn.dataset.memoText ?? "",
    });
  }

  return (
    <div onClick={handleClick}>
      <div className="mb-2.5 flex flex-wrap gap-1.5 rounded-lg bg-card-bg2 px-2.5 py-2 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="rounded bg-[#E4F2E4] px-1 py-px font-extrabold text-primary">FW</span>페어웨이
        </span>
        <span className="flex items-center gap-1">
          <span className="rounded bg-card-bg2 px-1 py-px font-extrabold text-muted">MS</span>미스
        </span>
        <span className="flex items-center gap-1">
          <span className="rounded bg-[#FBE7E3] px-1 py-px font-extrabold text-[#B85042]">PN</span>페널티
        </span>
        <span className="flex items-center gap-1">
          <span className="rounded bg-[#FBE7E3] px-1 py-px font-extrabold text-[#B85042]">OB</span>OB
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          GIR 성공
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-line" />
          GIR 실패
        </span>
        <span className="flex items-center gap-1">
          <span className="rounded bg-[#FDF1DC] px-1 py-px font-extrabold text-accent">S</span>스크램블링 성공
        </span>
        <span className="flex items-center gap-1">
          <span className="rounded bg-[#E4F2E4] px-1 py-px font-extrabold text-primary">✓</span>/
          <span className="rounded bg-[#FBE7E3] px-1 py-px font-extrabold text-[#B85042]">✗</span>샌드세이브
        </span>
      </div>

      {frontHoles.length > 0 && <MatrixHalf label="전반" courseName={courseName} holes={frontHoles} />}
      {backHoles.length > 0 && <MatrixHalf label="후반" courseName={courseName} holes={backHoles} />}

      <div
        className={
          "mb-3.5 rounded-lg bg-card-bg p-2.5 text-[12px] leading-relaxed " +
          (activeMemo ? "text-ink" : "text-muted")
        }
      >
        {activeMemo ? (
          <>
            <strong className="text-primary">
              {activeMemo.half} {activeMemo.local}번 홀 메모
            </strong>
            <br />
            {activeMemo.text}
          </>
        ) : (
          "📝 아이콘을 탭하면 해당 홀 메모가 여기에 표시돼요."
        )}
      </div>
    </div>
  );
}
