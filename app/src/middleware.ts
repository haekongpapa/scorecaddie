import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PROTECTED_PATHS = ["/dashboard", "/rounds", "/courses", "/profile"];

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
  matcher: ["/dashboard/:path*", "/rounds/:path*", "/courses/:path*", "/profile/:path*"],
};
