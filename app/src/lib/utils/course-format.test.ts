import { describe, expect, it } from "vitest";
import { groupPublicPrivate, summarizeAddress } from "./course-format";

describe("summarizeAddress", () => {
  it("주소 앞 2토큰(시/도 + 시/군/구)만 요약해 반환한다", () => {
    expect(summarizeAddress("경상북도 경주시 외동읍 석계리 1번지 0호 서라벌골프클럽")).toBe(
      "경상북도 경주시"
    );
  });

  it("null이면 null을 반환한다", () => {
    expect(summarizeAddress(null)).toBeNull();
  });

  it("빈 문자열이면 null을 반환한다", () => {
    expect(summarizeAddress("")).toBeNull();
  });
});

describe("groupPublicPrivate", () => {
  it("값에 '공공'이 포함되면 공공으로 분류한다", () => {
    expect(groupPublicPrivate("공공법인")).toBe("공공");
  });

  it("'공공'이 없는 값은 민간으로 분류한다", () => {
    expect(groupPublicPrivate("사립")).toBe("민간");
  });

  it("null이면 null을 반환한다", () => {
    expect(groupPublicPrivate(null)).toBeNull();
  });
});
