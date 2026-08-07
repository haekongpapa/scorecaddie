"use client";

import { useState, type FormEvent } from "react";
import { signOut } from "next-auth/react";
import { DELETE_ACCOUNT_CONFIRM_PHRASE } from "@/lib/constants/account";

type DeleteAccountFormProps = {
  hasPassword: boolean;
};

export default function DeleteAccountForm({
  hasPassword,
}: DeleteAccountFormProps) {
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (hasPassword && !password) {
      setError("비밀번호를 입력해주세요.");
      return;
    }
    if (!hasPassword && confirmText !== DELETE_ACCOUNT_CONFIRM_PHRASE) {
      setError(
        `확인을 위해 "${DELETE_ACCOUNT_CONFIRM_PHRASE}"를 정확히 입력해주세요.`
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hasPassword ? { password } : { confirmText }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "회원 탈퇴 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      // 탈퇴 완료 — DB의 User가 이미 삭제됐으므로, 남아있는 세션 쿠키도 즉시 정리한다.
      await signOut({ callbackUrl: "/" });
    } catch {
      setError("회원 탈퇴 중 오류가 발생했습니다. 다시 시도해주세요.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="rounded-lg bg-card-bg px-3.5 py-3 text-[13px] leading-relaxed text-muted">
        회원 탈퇴 시 라운드 기록, 홀별 스코어 등 회원님과 관련된 모든 데이터가
        영구적으로 삭제되며 복구할 수 없습니다.
      </div>

      {hasPassword ? (
        <label className="text-sm font-medium">
          비밀번호 확인
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 입력"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
      ) : (
        <label className="text-sm font-medium">
          확인을 위해 &quot;{DELETE_ACCOUNT_CONFIRM_PHRASE}&quot;를 입력해주세요
          <input
            type="text"
            required
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={DELETE_ACCOUNT_CONFIRM_PHRASE}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded-lg bg-[#D85A30] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? "탈퇴 처리 중..." : "회원 탈퇴"}
      </button>
    </form>
  );
}
