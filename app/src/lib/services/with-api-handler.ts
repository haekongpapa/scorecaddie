import { NextResponse } from "next/server";

// API route 공통 에러 처리 래퍼 (doc/coding-guidelines.md §4-3).
// Next.js App Router의 route handler는 각자 독립 함수라 Express의 app.use(errorHandler) 같은
// 전역 에러 핸들러가 없다. 대신 각 route.ts의 export를 이 함수로 감싸서, 처리하지 못한 예외가
// 던져지면 Next.js 기본 500 HTML 에러 페이지 대신 일관된 JSON 에러 응답을 반환하게 한다.
//
// 주의: 이미 자체적으로 부분 성공을 처리하는 내부 try/catch(예: sync/upload route의 행 단위
// 처리 루프)는 그대로 둔다 — 이 래퍼는 "그 바깥에서 예상 못 한 예외가 났을 때"의 최후 방어선이지,
// 기존의 부분 성공/실패 리포팅 로직을 대체하지 않는다.
export function withApiHandler<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error("[API Error]", err);
      return NextResponse.json(
        { error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
        { status: 500 }
      );
    }
  };
}
