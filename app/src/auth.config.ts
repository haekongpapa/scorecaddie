import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Edge 런타임(미들웨어)에서도 안전하게 쓸 수 있는 최소 설정.
// Credentials provider(bcrypt+Prisma 사용)는 여기 포함하지 않는다 —
// bcryptjs/@prisma/adapter-pg는 Node.js 전용 모듈(crypto 등)을 사용하므로
// Edge 런타임에 번들되면 "The edge runtime does not support Node.js 'crypto' module" 에러가 남.
// 전체 설정(Credentials 포함)은 src/auth.ts에서 이 설정을 확장해서 만든다.
export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string | undefined) ?? "";
        session.user.role =
          (token.role as "USER" | "ADMIN" | undefined) ?? "USER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
