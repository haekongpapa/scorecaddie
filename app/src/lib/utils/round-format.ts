/**
 * 라운드 목록/상세 화면에서 공통으로 쓰는 날짜·출발시간 포맷 유틸.
 * - formatRoundDateLabel: Round.playedAt(Date) -> "YYYY.MM.DD"
 * - formatStartTimeLabel: Round.startTime("HH:MM" 24시간제, nullable) -> "오전 09:00" 형식(suffix 없음)
 */

export function formatRoundDateLabel(playedAt: Date): string {
  return playedAt.toISOString().slice(0, 10).replace(/-/g, ".");
}

export function formatStartTimeLabel(
  startTime: string | null | undefined
): string | null {
  if (!startTime) return null;
  const [hStr, mStr] = startTime.split(":");
  let h = Number(hStr);
  const ampm = h < 12 ? "오전" : "오후";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${ampm} ${String(h).padStart(2, "0")}:${mStr}`;
}

/** 날짜와 출발시간을 " · "로 이어붙인 표시용 문자열. startTime이 없으면 날짜만 반환. */
export function formatRoundDateTimeLabel(
  playedAt: Date,
  startTime: string | null | undefined
): string {
  const dateLabel = formatRoundDateLabel(playedAt);
  const timeLabel = formatStartTimeLabel(startTime);
  return timeLabel ? `${dateLabel} · ${timeLabel}` : dateLabel;
}
