"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RoundActions({
  roundId,
  isOwner,
  ownerName,
  canViewReadOnly,
}: {
  roundId: string;
  isOwner: boolean;
  ownerName: string;
  canViewReadOnly: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm("이 라운드를 삭제하시겠어요? 삭제하면 되돌릴 수 없습니다.")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/rounds/${roundId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "삭제에 실패했습니다.");
        return;
      }
      router.push("/rounds");
    } catch {
      setError("네트워크 오류로 삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  if (!isOwner) {
    return (
      <div className="rounded-lg bg-card-bg p-2.5 text-center text-[11.5px] text-muted">
        {canViewReadOnly
          ? "다른 회원의 라운드는 읽기 전용으로 열람할 수 있어요"
          : `${ownerName}님의 라운드입니다`}
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <Link
          href={`/rounds/new?step=2&edit=${roundId}`}
          className="flex-1 rounded-lg border border-line py-2.5 text-center text-sm font-semibold text-primary"
        >
          수정
        </Link>
        <button
          type="button"
          disabled={deleting}
          onClick={handleDelete}
          className="flex-1 rounded-lg border border-[#D85A30] py-2.5 text-center text-sm font-semibold text-[#D85A30] disabled:opacity-60"
        >
          삭제
        </button>
      </div>
      {error && <div className="mt-2 text-[12px] font-semibold text-red-600">{error}</div>}
    </div>
  );
}
