// e2e 전용 테스트 계정 정보 — 단일 소스.
// global-setup(계정 생성)/global-teardown(계정 삭제)/auth.setup(로그인)/각 spec에서
// 전부 이 값만 import해서 쓴다 (계정 정보를 파일 여러 곳에 중복 기재하지 않기 위함).
//
// 실제 값은 process.env.E2E_TEST_EMAIL / E2E_TEST_PASSWORD로 덮어쓸 수 있다
// (CI 등에서 다른 계정을 쓰고 싶을 때 대비).
export const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? "e2e-tester@scorecaddie.test";
export const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? "E2eTest!2026";
export const TEST_NAME = "E2E 테스트 계정";
