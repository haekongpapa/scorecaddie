"use client";

import { useMemo, useState } from "react";

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string; // "YYYY-MM-DD"
  role: "ADMIN" | "USER";
};

type AppliedFilter = { name: string; from: string; to: string; adminOnly: boolean };

const EMPTY_FILTER: AppliedFilter = { name: "", from: "", to: "", adminOnly: false };

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
  const [adminOnlyInput, setAdminOnlyInput] = useState(false);
  const [appliedFilter, setAppliedFilter] = useState<AppliedFilter>(EMPTY_FILTER);

  // 2026-07-21: 다중선택(Set) → 단일선택(단일 id)으로 변경 — 목업(14번) UX 개편 반영.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (appliedFilter.name && (!u.name || !u.name.includes(appliedFilter.name))) {
        return false;
      }
      if (appliedFilter.from && u.createdAt < appliedFilter.from) return false;
      if (appliedFilter.to && u.createdAt > appliedFilter.to) return false;
      if (appliedFilter.adminOnly && u.role !== "ADMIN") return false;
      return true;
    });
  }, [users, appliedFilter]);

  const selectedUser = selectedId ? users.find((u) => u.id === selectedId) ?? null : null;

  function handleSearch() {
    setAppliedFilter({
      name: nameInput.trim(),
      from: fromInput,
      to: toInput,
      adminOnly: adminOnlyInput,
    });
    setSelectedId(null);
  }

  function handleReset() {
    setNameInput("");
    setFromInput("");
    setToInput("");
    setAdminOnlyInput(false);
    setAppliedFilter(EMPTY_FILTER);
    setSelectedId(null);
  }

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  async function setRole(id: string, role: "ADMIN" | "USER") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [id], role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "권한 변경에 실패했습니다.");
        return;
      }

      if (!data.skippedSelf) {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
      }
      setSelectedId(null);

      const label = role === "ADMIN" ? "어드민 권한 부여" : "어드민 권한 해제";
      showToast(
        data.skippedSelf
          ? "본인 계정은 어드민 권한을 스스로 해제할 수 없습니다."
          : `${label} 완료`
      );
    } catch {
      setError("네트워크 오류로 권한 변경에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const isSelfAdminRevoke =
    selectedUser?.id === currentUserId && selectedUser.role === "ADMIN";

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

      <label className="mb-3.5 flex items-center gap-1.5 text-xs text-muted">
        <input
          type="checkbox"
          checked={adminOnlyInput}
          onChange={(e) => setAdminOnlyInput(e.target.checked)}
        />
        관리자만 보기
      </label>

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
                <th className="px-1 py-2 font-bold"></th>
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
                    "border-b border-line" + (selectedId === u.id ? " bg-card-bg" : "")
                  }
                >
                  <td className="px-1 py-2">
                    <input
                      type="radio"
                      name="member-select"
                      checked={selectedId === u.id}
                      onChange={() => setSelectedId(u.id)}
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

      {selectedUser && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-card-bg p-2.5">
          <span className="truncate whitespace-nowrap text-xs font-bold text-primary">
            {selectedUser.name ?? "이름 없음"} 선택됨
          </span>
          {selectedUser.role === "ADMIN" ? (
            isSelfAdminRevoke ? (
              <span
                title="본인 계정의 어드민 권한은 스스로 해제할 수 없습니다."
                className="whitespace-nowrap rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-bold text-muted"
              >
                본인 계정은 해제 불가
              </span>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => setRole(selectedUser.id, "USER")}
                className="whitespace-nowrap rounded-lg border border-[#C1552F] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#C1552F] disabled:opacity-60"
              >
                어드민 권한 해제
              </button>
            )
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => setRole(selectedUser.id, "ADMIN")}
              className="whitespace-nowrap rounded-lg border border-primary bg-white px-2.5 py-1.5 text-[11px] font-bold text-primary disabled:opacity-60"
            >
              어드민 권한 부여
            </button>
          )}
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
