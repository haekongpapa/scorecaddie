"use client";

import { useState } from "react";

type ConsentToggleProps = {
  initialConsent: boolean;
};

export default function ConsentToggle({ initialConsent }: ConsentToggleProps) {
  const [consent, setConsent] = useState(initialConsent);
  const [saving, setSaving] = useState(false);

  async function handleChange(checked: boolean) {
    setConsent(checked);
    setSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thirdPartyConsent: checked }),
      });
      if (!res.ok) {
        setConsent(!checked);
      }
    } catch {
      setConsent(!checked);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-2 flex items-center justify-between rounded-lg bg-card-bg px-3.5 py-3">
      <div>
        <div className="text-[13.5px] font-semibold">
          타인에게 정보 제공 동의
        </div>
        <div className="mt-0.5 max-w-[250px] text-[11px] leading-snug text-muted">
          골프장 동반자 등 타인에게 일부 정보(이름·라운드 기록 등)가 공유될
          수 있어요
        </div>
        <div
          className={`mt-0.5 text-[10.5px] font-bold ${
            consent ? "text-primary" : "text-muted"
          }`}
        >
          {saving ? "저장 중..." : consent ? "동의함" : "동의 안 함"}
        </div>
      </div>
      <label className="relative inline-flex h-[22px] w-[38px] shrink-0 items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={consent}
          disabled={saving}
          onChange={(e) => handleChange(e.target.checked)}
        />
        <span className="absolute inset-0 rounded-full bg-line transition-colors peer-checked:bg-primary" />
        <span className="absolute left-[3px] h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
      </label>
    </div>
  );
}
