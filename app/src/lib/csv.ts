// 간단한 CSV 파서 (외부 라이브러리 의존 없이 admin 업로드 기능들에서 공용으로 사용).
// 큰따옴표로 감싼 필드 안의 쉼표/줄바꿈/이스케이프된 큰따옴표("")를 처리한다.
// 국내 공공데이터/자체 CSV 규모(수백~수천 행)를 전제로 하며, 스트리밍 파싱은 하지 않는다.
export function parseCsv(text: string): string[][] {
  // BOM 제거
  const normalized = text.replace(/^﻿/, "").replace(/\r\n/g, "\n");

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];

    if (inQuotes) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  // 마지막 줄 처리 (개행으로 끝나지 않는 파일 대비)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

// 헤더 행에서 별칭 목록 중 하나와 일치하는 컬럼의 인덱스를 찾는다.
// (공백 제거 후 비교, 대소문자는 한글이라 무의미하므로 그대로 비교)
export function findColumnIndex(header: string[], aliases: string[]): number {
  const normalizedHeader = header.map((h) => h.trim().replace(/\s+/g, ""));
  for (const alias of aliases) {
    const normalizedAlias = alias.trim().replace(/\s+/g, "");
    const idx = normalizedHeader.indexOf(normalizedAlias);
    if (idx !== -1) return idx;
  }
  return -1;
}
