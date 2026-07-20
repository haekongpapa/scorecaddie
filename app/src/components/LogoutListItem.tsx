"use client";

import { signOut } from "next-auth/react";

export default function LogoutListItem() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="flex w-full items-center justify-between rounded-lg bg-card-bg px-3.5 py-3 text-left"
    >
      <span className="text-[13.5px] font-semibold text-[#D85A30]">
        로그아웃
      </span>
      <span className="text-muted">›</span>
    </button>
  );
}
