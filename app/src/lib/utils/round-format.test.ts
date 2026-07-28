import { describe, expect, it } from "vitest";
import {
  formatRoundDateLabel,
  formatRoundDateTimeLabel,
  formatStartTimeLabel,
} from "./round-format";

describe("formatRoundDateLabel", () => {
  it("Date를 YYYY.MM.DD 형식으로 바꾼다", () => {
    expect(formatRoundDateLabel(new Date("2026-07-28T00:00:00.000Z"))).toBe("2026.07.28");
  });
});

describe("formatStartTimeLabel", () => {
  it("0시는 오전 12:00으로 표기한다(12시간제 규칙)", () => {
    expect(formatStartTimeLabel("00:30")).toBe("오전 12:30");
  });

  it("정오 이전은 오전으로 표기한다", () => {
    expect(formatStartTimeLabel("09:05")).toBe("오전 09:05");
  });

  it("정오는 오후 12:00으로 표기한다", () => {
    expect(formatStartTimeLabel("12:00")).toBe("오후 12:00");
  });

  it("정오 이후는 오후 + 12시간을 뺀 시각으로 표기한다", () => {
    expect(formatStartTimeLabel("14:15")).toBe("오후 02:15");
  });

  it("null/undefined는 null을 반환한다", () => {
    expect(formatStartTimeLabel(null)).toBeNull();
    expect(formatStartTimeLabel(undefined)).toBeNull();
  });
});

describe("formatRoundDateTimeLabel", () => {
  it("출발시간이 있으면 날짜와 시간을 · 로 잇는다", () => {
    expect(
      formatRoundDateTimeLabel(new Date("2026-07-28T00:00:00.000Z"), "09:00")
    ).toBe("2026.07.28 · 오전 09:00");
  });

  it("출발시간이 없으면 날짜만 반환한다", () => {
    expect(formatRoundDateTimeLabel(new Date("2026-07-28T00:00:00.000Z"), null)).toBe(
      "2026.07.28"
    );
  });
});
