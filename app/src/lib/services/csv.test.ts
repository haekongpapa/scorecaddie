import { describe, expect, it } from "vitest";
import { findColumnIndex, parseCsv } from "./csv";

describe("parseCsv", () => {
  it("기본 콤마 구분 행을 파싱한다", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("큰따옴표로 감싼 필드 안의 콤마를 값의 일부로 처리한다", () => {
    expect(parseCsv('이름,주소\n서라벌,"경주시, 외동읍"')).toEqual([
      ["이름", "주소"],
      ["서라벌", "경주시, 외동읍"],
    ]);
  });

  it("큰따옴표로 감싼 필드 안의 이스케이프된 큰따옴표(\"\")를 처리한다", () => {
    expect(parseCsv('메모\n"그가 ""좋다""고 함"')).toEqual([
      ["메모"],
      ['그가 "좋다"고 함'],
    ]);
  });

  it("CRLF 줄바꿈과 BOM을 정상 처리한다", () => {
    const withBom = "﻿a,b\r\n1,2\r\n";
    expect(parseCsv(withBom)).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("개행 없이 끝나는 마지막 줄도 포함한다", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("빈 행(모든 칸이 공백)은 결과에서 제외한다", () => {
    expect(parseCsv("a,b\n1,2\n,\n3,4")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });
});

describe("findColumnIndex", () => {
  it("공백을 제거하고 별칭 중 하나와 일치하는 컬럼 인덱스를 찾는다", () => {
    const header = ["골프장 명", "루프명", "홀 번호"];
    expect(findColumnIndex(header, ["골프장명"])).toBe(0);
    expect(findColumnIndex(header, ["홀번호", "홀 번호"])).toBe(2);
  });

  it("일치하는 컬럼이 없으면 -1을 반환한다", () => {
    expect(findColumnIndex(["a", "b"], ["c"])).toBe(-1);
  });
});
