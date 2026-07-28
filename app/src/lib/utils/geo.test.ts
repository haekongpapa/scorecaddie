import { describe, expect, it } from "vitest";
import { convertTmToWgs84 } from "./geo";

describe("convertTmToWgs84", () => {
  it("TM 중부원점 좌표를 대한민국 범위 내 WGS84 위경도로 변환한다", () => {
    const result = convertTmToWgs84("230000", "380000");
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(36.921065, 5);
    expect(result!.lng).toBeCloseTo(127.337478, 5);
  });

  it("rawX 또는 rawY가 없으면 null을 반환한다", () => {
    expect(convertTmToWgs84(null, "380000")).toBeNull();
    expect(convertTmToWgs84("230000", undefined)).toBeNull();
    expect(convertTmToWgs84(null, null)).toBeNull();
  });

  it("숫자로 파싱되지 않는 좌표는 null을 반환한다", () => {
    expect(convertTmToWgs84("abc", "380000")).toBeNull();
    expect(convertTmToWgs84("230000", "xyz")).toBeNull();
  });

  it("변환 결과가 대한민국 위경도 범위를 벗어나면 null을 반환한다(이상치 방어)", () => {
    expect(convertTmToWgs84("9000000", "9000000")).toBeNull();
  });
});
