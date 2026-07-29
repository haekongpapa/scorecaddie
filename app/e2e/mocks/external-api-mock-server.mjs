// 관리자 시나리오(공공데이터 동기화/지오코딩)가 실제로 외부 API를 부르지 않도록 대신 세워두는
// 로컬 목 서버. golf-course-sync.ts/kakao.ts는 둘 다 Next.js 서버(API route) 안에서 직접
// fetch를 호출하므로 Playwright의 page.route()로는 못 잡는다 — 그래서 두 파일의 API_BASE_URL을
// env로 오버라이드 가능하게 고치고(src/lib/config/env.ts, golf-course-sync.ts 참고),
// playwright.config.ts가 이 서버를 Next dev 서버보다 먼저 띄운 뒤 그 주소를 env로 넘겨준다.
//
// 별도 패키지(express 등) 없이 Node 내장 http 모듈만 사용 — 이 목적엔 라우팅 몇 개면 충분하고,
// 이 프로젝트는 새 의존성 추가를 최소화하는 컨벤션(vitest.config.ts의 vite-tsconfig-paths
// 미사용 사례 참고)을 따른다.
//
// 이름/식별자는 전부 "E2E_TEST_" 접두사를 써서(fixtures/test-golf-course.ts와 동일 규칙)
// global-teardown의 접두사 sweep으로 자연스럽게 정리되게 한다.
import http from "node:http";

const PORT = Number(process.env.E2E_MOCK_API_PORT ?? 4310);

// ── 공공데이터포털 골프장 정보 API 목 ────────────────────────────────────
// 정상 1건(TM 좌표 포함 — lib/utils/geo.test.ts에 이미 검증된 샘플 좌표 재사용:
// "230000"/"380000" -> lat 36.921065, lng 127.337478) + 오류 유도용 1건(관리번호 누락).
function publicDataResponse(pageNo) {
  if (pageNo !== 1) {
    return {
      response: {
        header: { resultCode: "0", resultMsg: "OK" },
        body: { items: "", totalCount: 2, numOfRows: 100, pageNo },
      },
    };
  }
  return {
    response: {
      header: { resultCode: "0", resultMsg: "OK" },
      body: {
        totalCount: 2,
        numOfRows: 100,
        pageNo: 1,
        items: {
          item: [
            {
              BPLC_NM: "E2E_TEST_SYNC_골프장",
              ROAD_NM_ADDR: "테스트특별시 테스트구 테스트로 1",
              LOTNO_ADDR: "테스트특별시 테스트구 테스트동 1번지",
              SALS_STTS_NM: "영업/정상",
              DTIL_TPBIZ_NM: "정규대중",
              PBP_SE_NM: "사립",
              OPN_ATMY_GRP_CD: "E2ETESTORG",
              MNG_NO: "E2E001",
              CRD_INFO_X: "230000",
              CRD_INFO_Y: "380000",
            },
            {
              // MNG_NO(관리번호) 누락 -> golf-course-sync.ts가 "필수값 누락"으로 skip.
              // DB에 아무것도 안 남기므로 별도 정리가 필요 없다.
              BPLC_NM: "E2E_TEST_SYNC_오류행",
              ROAD_NM_ADDR: "테스트특별시 테스트구 테스트로 2",
              SALS_STTS_NM: "영업/정상",
              DTIL_TPBIZ_NM: "정규대중",
              PBP_SE_NM: "사립",
              OPN_ATMY_GRP_CD: "E2ETESTORG",
              CRD_INFO_X: "230100",
              CRD_INFO_Y: "380100",
            },
          ],
        },
      },
    },
  };
}

// ── 카카오 로컬 API(주소/키워드 검색) 목 ─────────────────────────────────
// GEOCODE_TEST_ADDRESS(fixtures/test-golf-course.ts와 동일 문자열, 아래 참고)로 검색할 때만
// 고정 좌표를 반환하고, 그 외(실제 652건 골프장의 진짜 주소 등)는 전부 "검색 결과 없음"
// (documents: [])으로 응답한다 — 이 배치는 needsGeocoding=true인 골프장 전체를 대상으로
// 돌기 때문에(golf-course-geocode.ts, 필터 없음), 실제 데이터가 섞여 들어와도 좌표를
// 잘못 채우거나 망가뜨리는 일이 없도록 하기 위함(안전한 no-op).
const GEOCODE_TEST_ADDRESS = "E2E_TEST_지오코딩_가짜주소_12345";

function kakaoResponse(query) {
  if (query === GEOCODE_TEST_ADDRESS) {
    return { documents: [{ x: "127.111111", y: "36.222222" }] };
  }
  return { documents: [] };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);

  if (url.pathname === "/health") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }

  if (url.pathname === "/public-data/1741000/golf_courses/info") {
    const pageNo = Number(url.searchParams.get("pageNo") ?? "1");
    const body = JSON.stringify(publicDataResponse(pageNo));
    res.writeHead(200, { "content-type": "application/json" });
    res.end(body);
    return;
  }

  if (url.pathname === "/kakao/address" || url.pathname === "/kakao/keyword") {
    const query = url.searchParams.get("query") ?? "";
    const body = JSON.stringify(kakaoResponse(query));
    res.writeHead(200, { "content-type": "application/json" });
    res.end(body);
    return;
  }

  res.writeHead(404, { "content-type": "text/plain" });
  res.end("not found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[e2e mock] external API mock server listening on http://127.0.0.1:${PORT}`);
});
