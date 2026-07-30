import { describe, expect, it } from "vitest";
import { parseWeatherSnapshot, temperatureBucketLabel } from "./parse-snapshot";

describe("parseWeatherSnapshot", () => {
  it("null/undefined는 null을 반환한다", () => {
    expect(parseWeatherSnapshot(null)).toBeNull();
    expect(parseWeatherSnapshot(undefined)).toBeNull();
  });

  it("하늘상태+기온 라벨을 분리한다", () => {
    expect(parseWeatherSnapshot("☀️ 맑음 27°C")).toEqual({ condition: "맑음", tempC: 27 });
  });

  it("'비/눈'을 '비'보다 우선 매칭한다", () => {
    expect(parseWeatherSnapshot("🌨️ 비/눈 3°C")).toEqual({ condition: "비/눈", tempC: 3 });
  });

  it("기온 없이 하늘상태만 있는 경우 tempC는 null", () => {
    expect(parseWeatherSnapshot("☁️ 흐림")).toEqual({ condition: "흐림", tempC: null });
  });

  it("알 수 없는 형식은 '기타'로 분류한다", () => {
    expect(parseWeatherSnapshot("🌡️ 날씨 정보")).toEqual({ condition: "기타", tempC: null });
  });

  it("음수 기온도 파싱한다", () => {
    expect(parseWeatherSnapshot("☀️ 맑음 -2°C")).toEqual({ condition: "맑음", tempC: -2 });
  });
});

describe("temperatureBucketLabel", () => {
  it("20도 미만", () => expect(temperatureBucketLabel(19.9)).toBe("20°C 미만"));
  it("20~25도", () => expect(temperatureBucketLabel(20)).toBe("20~25°C"));
  it("25~30도", () => expect(temperatureBucketLabel(29.9)).toBe("25~30°C"));
  it("30도 이상", () => expect(temperatureBucketLabel(30)).toBe("30°C 이상"));
});
