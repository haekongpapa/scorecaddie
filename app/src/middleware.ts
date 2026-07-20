import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";

// 미들웨어는 Edge 런타임에서 실행되므로, Credentials(bcrypt)/Prisma가 포함된
// 전체 auth.ts 대신 Edge에 안전한 auth.config.ts만으로 만든 별도 인스턴스를 사용한다.
const { auth } = NextAuth(authConfig);

const PROTECTED_PATHS = ["/dashboard", "/rounds", "/courses", "/profile", "/admin"];
const ADMIN_PATHS = ["/admin"];

export default auth((req) => {
  const isProtected = PROTECTED_PATHS.some((p) =>
    req.nextUrl.pathname.startsWith(p)
  );
  if (isProtected && !req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  // 관리자 전용 경로: 로그인은 했지만 role !== "ADMIN"이면 대시보드로 리다이렉트.
  // (2026-07-20 수정: 기존에는 로그인 여부만 검사해서, 일반 회원도 URL을 직접 입력하면
  //  /admin/* 화면에 그대로 진입할 수 있었던 버그. session.user.role은 auth.config.ts의
  //  jwt/session 콜백에서 이미 JWT에 실어두므로 Edge 런타임에서도 Prisma 없이 확인 가능.)
  const isAdminPath = ADMIN_PATHS.some((p) =>
    req.nextUrl.pathname.startsWith(p)
  );
  if (isAdminPath && req.auth && req.auth.user?.role !== "ADMIN") {
    const dashboardUrl = new URL("/dashboard", req.nextUrl.origin);
    return NextResponse.redirect(dashboardUrl);
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/rounds/:path*",
    "/courses/:path*",
    "/profile/:path*",
    "/admin/:path*",
  ],
};
