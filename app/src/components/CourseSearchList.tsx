"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type CourseRow = {
  id: string;
  name: string;
  addressSummary: string | null;
  holeCount: number | null; // 루프 등록된 경우만 계산(루프수 * 9), 없으면 null
  hasLocation: boolean; // latitude/longitude 존재 여부
  publicPrivateGroup: "공공" | "민간" | null; // publicPrivate 원문 기반 추정치(아래 페이지 컴포넌트에서 분류)
};

type FilterKey = "전체" | "공공" | "민간";

const PAGE_SIZE = 20;

export default function CourseSearchList({ courses }: { courses: CourseRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("전체");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    let result = courses;

    if (filter !== "전체") {
      result = result.filter((c) => c.publicPrivateGroup === filter);
    }

    const q = query.trim();
    if (q) {
      result = result.filter(
        (c) =>
          c.name.includes(q) || (c.addressSummary ?? "").includes(q)
      );
    }

    return result;
  }, [courses, query, filter]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  function handleFilterChange(next: FilterKey) {
    setFilter(next);
    setVisibleCount(PAGE_SIZE);
  }

  function handleQueryChange(next: string) {
    setQuery(next);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <div>
      <input
        type="search"
        placeholder="골프장 이름 또는 지역 검색"
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        className="mb-3 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm"
      />

      <div className="mb-3.5 flex gap-1.5">
        {(["전체", "공공", "민간"] as FilterKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handleFilterChange(key)}
            className={
              filter === key
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
          검색 결과가 없습니다.
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {visible.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="flex items-center justify-between rounded-lg bg-card-bg px-3.5 py-3"
              >
                <div>
                  <div className="text-[13.5px] font-semibold">
                    {course.name}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {course.addressSummary ?? "주소 정보 없음"}
                    {course.holeCount ? ` · ${course.holeCount}홀` : ""}
                  </div>
                </div>
                {course.hasLocation ? (
                  <div>📍</div>
                ) : (
                  <div className="text-[11px] text-muted">위치 확인 중</div>
                )}
              </Link>
            ))}
          </div>

          {hasMore && (
            <button
              type="button"
              onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
              className="mt-3 w-full rounded-lg border border-line py-2.5 text-sm font-medium text-muted"
            >
              더 보기 ({filtered.length - visibleCount}개 더 있음)
            </button>
          )}
        </>
      )}
    </div>
  );
}
