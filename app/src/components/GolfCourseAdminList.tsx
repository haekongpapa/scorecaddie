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

type RegisteredFilter = "전체" | "코스 등록됨";

export default function GolfCourseAdminList({
  courses,
}: GolfCourseAdminListProps) {
  const [query, setQuery] = useState("");
  const [registeredFilter, setRegisteredFilter] =
    useState<RegisteredFilter>("전체");

  const filtered = useMemo(() => {
    let result = courses;

    // "코스 등록됨" 기준은 루프(GolfCourseLoop)가 1개 이상 있는지만 본다.
    // Par 값이 다 채워졌는지(완료/부분)와는 무관 — 11번 목업(2026-07-21) 설계 그대로.
    if (registeredFilter === "코스 등록됨") {
      result = result.filter((c) => c.loopNames.length > 0);
    }

    const q = query.trim();
    if (q) {
      result = result.filter(
        (c) => c.name.includes(q) || (c.address ?? "").includes(q)
      );
    }

    return result;
  }, [courses, query, registeredFilter]);

  return (
    <div>
      <input
        type="search"
        placeholder="골프장 이름 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-3 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm"
      />

      <div className="mb-3.5 flex gap-1.5">
        {(["전체", "코스 등록됨"] as RegisteredFilter[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setRegisteredFilter(key)}
            className={
              registeredFilter === key
                ? "rounded-md bg-card-bg2 px-2.5 py-1 text-[11px] font-semibold text-primary"
                : "rounded-md border border-line px-2.5 py-1 text-[11px] font-semibold text-muted"
            }
          >
            {key}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
          {courses.length === 0
            ? "등록된 골프장이 없습니다. 공공 데이터를 업로드해보세요."
            : registeredFilter === "코스 등록됨"
              ? "코스가 등록된 골프장이 없습니다."
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
