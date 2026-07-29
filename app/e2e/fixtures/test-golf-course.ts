// 관리자 시나리오(루프·Par 관리/CSV 업로드/공공데이터 동기화/지오코딩) 전용 골프장 마커.
//
// GolfCourse/GolfCourseLoop/GolfCourseHole은 공공데이터 기반 공용 참조 데이터(실제 652건)라서
// User cascade 삭제에 걸리지 않는다 — 그래서 각 관리자 시나리오는 이 접두사가 붙은 전용
// 골프장을 스스로 만들어서만 조작하고, global-teardown이 이 접두사로 시작하는 GolfCourse를
// 전부 쓸어 지운다(cascade로 GolfCourseLoop/GolfCourseHole까지 함께 정리). 실 데이터는
// 이름이 이 접두사로 시작할 리 없으니 절대 섞이지 않는다.
//
// 시나리오마다 별도 이름을 쓰는 이유: 여러 admin-*.spec.ts가 같은 골프장 레코드를 공유하면
// 한 시나리오(예: CSV 업로드)가 만든 루프를 다른 시나리오(예: 루프 CRUD)가 지우거나 바꿔서
// 실행 순서에 따라 결과가 달라지는 테스트 간 오염이 생긴다 — 각자 자기 골프장을 직접 만들고
// 쓰게 해서 순서 무관하게(order-independent) 만든다.
export const E2E_COURSE_PREFIX = "E2E_TEST_";

export const CSV_UPLOAD_TEST_COURSE_NAME = `${E2E_COURSE_PREFIX}CSV_골프장`;
export const PAR_EDITOR_TEST_COURSE_NAME = `${E2E_COURSE_PREFIX}PAR_골프장`;

// 공공데이터 동기화 목 서버(e2e/mocks/external-api-mock-server.mjs)가 응답에 그대로 박아서
// 반환하는 이름 — 이 파일이 TS라 목 서버(.mjs, 별도 Node 프로세스)에서 직접 import는 못 하니
// 문자열 리터럴을 그대로 복제해뒀다. 바꾸면 두 곳 다 같이 바꿔야 한다.
export const SYNC_TEST_COURSE_NAME = `${E2E_COURSE_PREFIX}SYNC_골프장`;

// 지오코딩 배치 시나리오 전용. 이 골프장의 address 값을 목 카카오 서버가 알아보고 고정
// 좌표로 응답한다(admin-geocode.spec.ts + external-api-mock-server.mjs 양쪽에서 동일 문자열
// 사용 — 여기도 .mjs에서 직접 import 못 해 리터럴 복제, 바꾸면 두 곳 다 같이 바꿀 것).
// 실제 652건 골프장 주소와 절대 겹치지 않도록 눈에 띄는 가짜 문자열을 씀.
export const GEOCODE_TEST_COURSE_NAME = `${E2E_COURSE_PREFIX}GEOCODE_골프장`;
export const GEOCODE_TEST_ADDRESS = "E2E_TEST_지오코딩_가짜주소_12345";
