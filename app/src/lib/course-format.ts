// 골프장 표시용 공통 포맷 유틸.
// 05번(골프장 목록)과 06번(골프장 상세) 화면이 동일한 GolfCourse 원본 필드(address,
// publicPrivate)를 같은 방식으로 가공해야 화면 간 표시가 어긋나지 않으므로 공용화한다.
// (courses/page.tsx에 있던 로컬 함수를 이동 — 06번 구현 시 분리)

// 주소 전문(예: "경상북도 경주시 외동읍 석계리 1번지 0호 서라벌골프클럽")에서
// 목업처럼 "시/도 + 시/군/구" 요약만 뽑아낸다. 형식이 다른 주소는 앞 2토큰만 사용하는
// 근사치임 — 정교한 행정구역 파싱은 범위 밖.
export function summarizeAddress(address: string | null): string | null {
  if (!address) return null;
  const tokens = address.trim().split(/\s+/);
  return tokens.slice(0, 2).join(" ") || null;
}

// publicPrivate 원문 값이 실제 데이터에서 어떻게 분포하는지 아직 검증 못함
// (샌드박스가 사용자 로컬 DB에 접근 불가). "공공"이 포함되면 공공, 비어있지 않은 나머지는
// 전부 민간으로 취급하는 보수적 추정치 — 실제 데이터로 검증 필요(TODO).
export function groupPublicPrivate(
  value: string | null
): "공공" | "민간" | null {
  if (!value) return null;
  return value.includes("공공") ? "공공" : "민간";
}
