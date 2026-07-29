import { prisma } from "@/lib/prisma";
import { convertTmToWgs84 } from "@/lib/utils/geo";
import { env } from "@/lib/config/env";

// 골프장 공공 데이터 동기화 로직 본체 — API 페이지네이션 호출 + upsert 처리를 담당.
// (route.ts에서 분리, coding-guidelines.md §4-2 "API route는 얇게" 적용, 2026-07-28)
// app/api/admin/golf-courses/sync/route.ts는 인증/응답 포맷팅만 담당하고 이 파일을 호출한다.
// 로직은 원래 route.ts에 있던 것을 그대로 옮긴 것이라 동작 변화 없음.
//
// 페이지네이션 전략(설계 근거는 doc/admin-golfcourse-sync.md 참고):
// - numOfRows=100 고정. 1페이지 응답에 이미 totalCount가 포함되므로, count 확인용
//   별도 호출을 만들지 않고 1페이지 응답에서 바로 totalPages를 계산해 이어서 순회한다.
// - 페이지마다 즉시 upsert 처리(전체를 메모리에 모았다가 한 번에 쓰지 않음) — 중간에
//   실패해도 이미 처리한 페이지는 DB에 반영된 상태로 남는다.
// - 한 페이지 요청 실패 시 그 시점까지의 결과를 그대로 반환(전체 재시도 대신 부분 성공 허용).
//
// 매칭 키: GolfCourse.@@unique([externalOrgCd, externalMngNo]) — API의
// OPN_ATMY_GRP_CD(개방자치단체코드) + MNG_NO(관리번호) 조합과 동일한 개념.
// 좌표 변환(TM 중부원점 EPSG:5174 -> WGS84)은 lib/utils/geo.ts의 convertTmToWgs84()로 upsert
// 시점에 바로 처리한다. rawCoordX/Y가 없거나 변환 결과가 대한민국 범위를 벗어나면
// latitude/longitude를 null로 두고 needsGeocoding=true로 표시(주소 기반 지오코딩은 후속 과제).

// 평소엔 실제 공공데이터포털 API를 호출하고, e2e 테스트 때만 env로 로컬 목 서버 주소로
// 바꿔치기된다(env.ts 주석 참고) — 운영 코드 경로는 변화 없음.
const API_BASE_URL =
  env.publicDataApiBaseUrl || "https://apis.data.go.kr/1741000/golf_courses/info";
const PAGE_SIZE = 100;
const MAX_PAGES = 200; // 안전장치: totalCount 이상치로 인한 무한/과도 호출 방지 (최대 20,000건)
const FETCH_TIMEOUT_MS = 10_000;

type ApiItem = {
  BPLC_NM?: string; // 사업장명(골프장명)
  ROAD_NM_ADDR?: string; // 도로명전체주소
  LOTNO_ADDR?: string; // 지번주소
  SALS_STTS_NM?: string; // 영업상태명 (예: "영업/정상")
  DTIL_TPBIZ_NM?: string; // 세부업종명 (예: "정규대중")
  PBP_SE_NM?: string; // 공공/민간 구분명 (예: "사립")
  OPN_ATMY_GRP_CD?: string; // 개방자치단체코드
  MNG_NO?: string; // 관리번호
  CRD_INFO_X?: string; // 좌표정보 X (TM 중부원점)
  CRD_INFO_Y?: string; // 좌표정보 Y (TM 중부원점)
};

type ApiResponse = {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: {
      items?: { item?: ApiItem | ApiItem[] } | "";
      totalCount?: number;
      numOfRows?: number;
      pageNo?: number;
    };
  };
};

export type SyncRowError = { page: number; message: string };

// field 존재 여부로 판별하는 유니언(이 프로젝트 strict:false 하에서 boolean 판별자가
// 제대로 안 좁혀지는 문제 회피 — coding-guidelines.md §3 패턴).
export type SyncResult =
  | { totalCount: number; addedCount: number; updatedCount: number; errors: SyncRowError[] }
  | { fetchError: string };

async function fetchPage(pageNo: number, serviceKey: string): Promise<ApiResponse> {
  const url = new URL(API_BASE_URL);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(PAGE_SIZE));
  url.searchParams.set("returnType", "json");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return (await res.json()) as ApiResponse;
  } finally {
    clearTimeout(timeout);
  }
}

// 결과가 1건일 때 item이 배열이 아니라 단일 객체로 오는 경우가 흔함(XML->JSON 변환 API 공통 함정).
function normalizeItems(
  items: { item?: ApiItem | ApiItem[] } | "" | undefined
): ApiItem[] {
  if (!items) return []; // ""(빈 문자열)와 undefined 모두 falsy라 이 한 번의 체크로 방어됨
  const item = items.item;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

export async function runGolfCourseSync(serviceKey: string): Promise<SyncResult> {
  let addedCount = 0;
  let updatedCount = 0;
  const errors: SyncRowError[] = [];
  let totalCount = 0;

  async function processPage(pageNo: number, page: ApiResponse) {
    const resultCode = page.response?.header?.resultCode;
    if (resultCode !== "0") {
      errors.push({
        page: pageNo,
        message: page.response?.header?.resultMsg ?? "알 수 없는 API 오류",
      });
      return;
    }

    const items = normalizeItems(page.response?.body?.items);

    for (const item of items) {
      const name = item.BPLC_NM?.trim();
      const externalMngNo = item.MNG_NO?.trim();
      const externalOrgCd = item.OPN_ATMY_GRP_CD?.trim();

      if (!name || !externalMngNo || !externalOrgCd) {
        errors.push({
          page: pageNo,
          message: `필수값 누락(사업장명/관리번호/개방자치단체코드) — ${name ?? "(이름없음)"}`,
        });
        continue;
      }

      const rawCoordX = item.CRD_INFO_X?.trim() || null;
      const rawCoordY = item.CRD_INFO_Y?.trim() || null;
      const latLng = convertTmToWgs84(rawCoordX, rawCoordY);

      const data = {
        name,
        // 도로명 우선, 없으면 지번 — 화면 노출용 대표 주소(기존 그대로 유지).
        address: item.ROAD_NM_ADDR?.trim() || item.LOTNO_ADDR?.trim() || null,
        // 지번 주소 원본은 별도 보관 — 지오코딩 실패 시 재시도용 폴백.
        addressLotno: item.LOTNO_ADDR?.trim() || null,
        businessStatus: item.SALS_STTS_NM?.trim() || null,
        subCategory: item.DTIL_TPBIZ_NM?.trim() || null,
        publicPrivate: item.PBP_SE_NM?.trim() || null,
        rawCoordX,
        rawCoordY,
        latitude: latLng?.lat ?? null,
        longitude: latLng?.lng ?? null,
        needsGeocoding: latLng === null,
      };

      try {
        const existing = await prisma.golfCourse.findUnique({
          where: {
            externalOrgCd_externalMngNo: { externalOrgCd, externalMngNo },
          },
        });

        if (existing) {
          await prisma.golfCourse.update({ where: { id: existing.id }, data });
          updatedCount++;
        } else {
          await prisma.golfCourse.create({
            data: { ...data, externalOrgCd, externalMngNo },
          });
          addedCount++;
        }
      } catch {
        errors.push({ page: pageNo, message: `저장 중 오류(${name})` });
      }
    }
  }

  try {
    const firstPage = await fetchPage(1, serviceKey);
    totalCount = firstPage.response?.body?.totalCount ?? 0;
    await processPage(1, firstPage);

    const totalPages = Math.min(Math.ceil(totalCount / PAGE_SIZE), MAX_PAGES);

    for (let pageNo = 2; pageNo <= totalPages; pageNo++) {
      try {
        const page = await fetchPage(pageNo, serviceKey);
        await processPage(pageNo, page);
      } catch (err) {
        errors.push({
          page: pageNo,
          message: err instanceof Error ? err.message : "페이지 요청 실패",
        });
        break; // 연속 페이지 요청 실패 시 중단하고 그때까지의 결과 반환(부분 성공 허용)
      }
    }
  } catch (err) {
    return { fetchError: err instanceof Error ? err.message : String(err) };
  }

  return { totalCount, addedCount, updatedCount, errors };
}
