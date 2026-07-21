"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string; // "YYYY-MM-DD"
  role: "ADMIN" | "USER";
};

type AppliedFilter = { name: string; from: string; to: string };

const EMPTY_FILTER: AppliedFilter = { name: "", from: "", to: "" };

export default function AdminUserGrid({
  initialUsers,
  currentUserId,
}: {
  initialUsers: AdminUserRow[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);

  const [nameInput, setNameInput] = useState("");
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [appliedFilter, setAppliedFilter] = useState<AppliedFilter>(EMPTY_FILTER);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const selectAllRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (appliedFilter.name && (!u.name || !u.name.includes(appliedFilter.name))) {
        return false;
      }
      if (appliedFilter.from && u.createdAt < appliedFilter.from) return false;
      if (appliedFilter.to && u.createdAt > appliedFilter.to) return false;
      return true;
    });
  }, [users, appliedFilter]);

  useEffect(() => {
    const idsOnScreen = filtered.map((u) => u.id);
    const selectedOnScreen = idsOnScreen.filter((id) => selected.has(id));
    if (!selectAllRef.current) return;
    if (selectedOnScreen.length === 0) {
      selectAllRef.current.checked = false;
      selectAllRef.current.indeterminate = false;
    } else if (selectedOnScreen.length === idsOnScreen.length) {
      selectAllRef.current.checked = true;
      selectAllRef.current.indeterminate = false;
    } else {
      selectAllRef.current.checked = false;
      selectAllRef.current.indeterminate = true;
    }
  }, [filtered, selected]);

  function handleSearch() {
    setAppliedFilter({ name: nameInput.trim(), from: fromInput, to: toInput });
    setSelected(new Set());
  }

  function handleReset() {
    setNameInput("");
    setFromInput("");
    setToInput("");
    setAppliedFilter(EMPTY_FILTER);
    setSelected(new Set());
  }

  function toggleRow(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const u of filtered) {
        if (checked) next.add(u.id);
        else next.delete(u.id);
      }
      return next;
    });
  }

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  async function bulkSetRole(role: "ADMIN" | "USER") {
    if (selected.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: Array.from(selected), role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "권한 변경에 실패했습니다.");
        return;
      }

      setUsers((prev) =>
        prev.map((u) => {
          if (!selected.has(u.id)) return u;
          if (role === "USER" && u.id === currentUserId) return u; // 서버에서 스킵된 본인 계정
          return { ...u, role };
        })
      );
      setSelected(new Set());

      const label = role === "ADMIN" ? "어드민 권한 부여" : "어드민 권한 해제";
      if (data.skippedSelf) {
        showToast(`${label} 완료 (${data.updatedCount}명) · 본인 계정은 제외됐습니다`);
      } else {
        showToast(`${label} 완료 (${data.updatedCount}명)`);
      }
    } catch {
      setError("네트워크 오류로 권한 변경에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <label className="mb-1 block text-xs font-semibold text-muted">이름</label>
      <input
        type="text"
        placeholder="이름으로 검색"
        value={nameInput}
        onChange={(e) => setNameInput(e.target.value)}
        className="mb-3 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm"
      />

      <label className="mb-1 block text-xs font-semibold text-muted">가입 일자</label>
      <div className="mb-3 flex items-center gap-2">
        <input
          type="date"
          value={fromInput}
          onChange={(e) => setFromInput(e.target.value)}
          className="w-full rounded-lg border border-line bg-white px-2.5 py-2 text-xs"
        />
        <span className="text-xs text-muted">~</span>
        <input
          type="date"
          value={toInput}
          onChange={(e) => setToInput(e.target.value)}
          className="w-full rounded-lg border border-line bg-white px-2.5 py-2 text-xs"
        />
      </div>

      <div className="mb-3.5 flex gap-2">
        <button
          type="button"
          onClick={handleSearch}
          className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white"
        >
          검색
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-muted"
        >
          초기화
        </button>
      </div>

      <div className="mb-2 text-xs text-muted">전체 {filtered.length}명</div>

      {error && (
        <div className="mb-2 text-[12px] font-semibold text-red-600">{error}</div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
          검색 조건에 맞는 회원이 없습니다
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-center text-[10.5px]">
            <thead>
              <tr className="bg-card-bg2 text-primary">
                <th className="px-1 py-2 font-bold">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                  />
                </th>
                <th className="px-1 py-2 font-bold">이름</th>
                <th className="px-1 py-2 font-bold">이메일</th>
                <th className="px-1 py-2 font-bold">가입일</th>
                <th className="px-1 py-2 font-bold">어드민</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  className={
                    "border-b border-line" + (selected.has(u.id) ? " bg-card-bg" : "")
                  }
                >
                  <td className="px-1 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={(e) => toggleRow(u.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-1 py-2 text-left font-semibold">
                    {u.name ?? <span className="italic text-muted">이름 없음</span>}
                    {u.id === currentUserId && (
                      <span className="ml-1 text-[9px] font-normal text-muted">(나)</span>
                    )}
                  </td>
                  <td className="max-w-[90px] truncate px-1 py-2 text-left text-muted">
                    {u.email}
                  </td>
                  <td className="px-1 py-2">{u.createdAt}</td>
                  <td className="px-1 py-2">
                    <input type="checkbox" checked={u.role === "ADMIN"} disabled readOnly />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected.size > 0 && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-card-bg p-2.5">
          <span className="whitespace-nowrap text-xs font-bold text-primary">
            {selected.size}명 선택됨
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => bulkSetRole("ADMIN")}
              className="whitespace-nowrap rounded-lg border border-primary bg-white px-2.5 py-1.5 text-[11px] font-bold text-primary disabled:opacity-60"
            >
              어드민 권한 부여
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => bulkSetRole("USER")}
              className="whitespace-nowrap rounded-lg border border-[#C1552F] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#C1552F] disabled:opacity-60"
            >
              어드민 권한 해제
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg bg-primary px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
