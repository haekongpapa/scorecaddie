"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type AdminCourseRow = {
  id: string;
  name: string;
  address: string | null;
  loopNames: string[];
  filledHoles: number;
  expectedHoles: number;
  lastModified: string | null; // "YYYY-MM-DD" 또는 null
};

type GolfCourseAdminListProps = {
  courses: AdminCourseRow[];
};

function statusBadge(row: AdminCourseRow) {
  if (row.loopNames.length === 0) {
    return (
      <span className="rounded-md bg-[#F3E4E0] px-2 py-0.5 text-[11px] font-semibold text-[#C1552F]">
        미등록
      </span>
    );
  }
  if (row.filledHoles === row.expectedHoles) {
    return (
      <span className="rounded-md bg-card-bg2 px-2 py-0.5 text-[11px] font-semibold text-primary">
        완료 {row.filledHoles}/{row.expectedHoles}
      </span>
    );
  }
  if (row.filledHoles === 0) {
    return (
      <span className="rounded-md bg-[#F3E4E0] px-2 py-0.5 text-[11px] font-semibold text-[#C1552F]">
        미등록 0/{row.expectedHoles}
      </span>
    );
  }
  return (
    <span className="rounded-md bg-[#FBEFD9] px-2 py-0.5 text-[11px] font-semibold text-accent">
      부분 {row.filledHoles}/{row.expectedHoles}
    </span>
  );
}

export default function GolfCourseAdminList({
  courses,
}: GolfCourseAdminListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return courses;
    return courses.filter(
      (c) => c.name.includes(q) || (c.address ?? "").includes(q)
    );
  }, [courses, query]);

  return (
    <div>
      <input
        type="search"
        placeholder="골프장 이름 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-3 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm"
      />

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
          {courses.length === 0
            ? "등록된 골프장이 없습니다. 공공 데이터를 업로드해보세요."
            : "검색 결과가 없습니다."}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((row) => (
            <Link
              key={row.id}
              href={`/admin/golf-courses/${row.id}/par`}
              className="flex items-center justify-between rounded-lg bg-card-bg px-3.5 py-3"
            >
              <div>
                <div className="text-[13.5px] font-semibold">
                  {row.name}{" "}
                  {row.loopNames.length > 0 ? (
                    <span className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-primary bg-card-bg2">
                      루프 {row.loopNames.length}개
                    </span>
                  ) : (
                    <span className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-[#C1552F] bg-[#F3E4E0]">
                      루프 미등록
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-muted">
                  {row.address ?? "주소 정보 없음"}
                  {row.loopNames.length === 0
                    ? " · 루프를 먼저 등록해주세요"
                    : ` · ${row.loopNames.join("·")}` +
                      (row.lastModified ? ` · ${row.lastModified} 수정` : "")}
                </div>
              </div>
              {statusBadge(row)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
