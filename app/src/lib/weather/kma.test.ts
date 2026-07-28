import { describe, expect, it } from "vitest";
import { isWithinForecastRange } from "./kma";

// KST 기준 "오늘" 2026-07-28 12:00을 고정 now로 사용(UTC 03:00 = KST 12:00).
const FIXED_NOW = new Date("2026-07-28T03:00:00.000Z");

describe("isWithinForecastRange", () => {
  it("오늘 날짜는 범위 안이다", () => {
    expect(isWithinForecastRange(new Date("2026-07-28T00:00:00.000Z"), FIXED_NOW)).toBe(true);
  });

  it("+3일(글피 다음날) 경계는 범위 안이다", () => {
    expect(isWithinForecastRange(new Date("2026-07-31T00:00:00.000Z"), FIXED_NOW)).toBe(true);
  });

  it("+4일은 범위를 벗어난다", () => {
    expect(isWithinForecastRange(new Date("2026-08-01T00:00:00.000Z"), FIXED_NOW)).toBe(false);
  });

  it("어제(과거) 날짜는 범위를 벗어난다", () => {
    expect(isWithinForecastRange(new Date("2026-07-27T00:00:00.000Z"), FIXED_NOW)).toBe(false);
  });
});
