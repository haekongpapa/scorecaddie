import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";

// 전체 설정(Credentials provider + PrismaAdapter 포함, Node.js 런타임 전용).
// 미들웨어(Edge 런타임)에서는 이 파일을 직접 쓰지 않고 auth.config.ts 기반의
// 별도 가벼운 인스턴스를 사용한다(src/middleware.ts 참고).
//
// PrismaAdapter는 세션 저장 방식을 바꾸지 않는다(session.strategy는 여전히
// authConfig의 "jwt"를 그대로 따름) — 다만 구글 같은 OAuth 로그인 시
// User/Account 레코드를 자동으로 생성·연결해줘서, session.user.id가 실제
// 우리 DB의 User.id(cuid)와 일치하도록 만들어준다. 어댑터가 없으면 OAuth
// 로그인은 "인증"은 되어도 우리 User 테이블과 연결되지 않아 대시보드/마이페이지 등
// prisma.user.findUnique(session.user.id) 조회가 전부 빈 값이 됨.
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
    ...authConfig.providers,
  ],
});
