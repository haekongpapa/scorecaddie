import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";

// 미들웨어는 Edge 런타임에서 실행되므로, Credentials(bcrypt)/Prisma가 포함된
// 전체 auth.ts 대신 Edge에 안전한 auth.config.ts만으로 만든 별도 인스턴스를 사용한다.
const { auth } = NextAuth(authConfig);

const PROTECTED_PATHS = ["/dashboard", "/rounds", "/courses", "/profile", "/admin"];

export default auth((req) => {
  const isProtected = PROTECTED_PATHS.some((p) =>
    req.nextUrl.pathname.startsWith(p)
  );
  if (isProtected && !req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
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
