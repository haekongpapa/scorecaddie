import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Naver from "next-auth/providers/naver";
import Kakao from "next-auth/providers/kakao";
import { env } from "@/lib/config/env";

// Edge 런타임(미들웨어)에서도 안전하게 쓸 수 있는 최소 설정.
// Credentials provider(bcrypt+Prisma 사용)는 여기 포함하지 않는다 —
// bcryptjs/@prisma/adapter-pg는 Node.js 전용 모듈(crypto 등)을 사용하므로
// Edge 런타임에 번들되면 "The edge runtime does not support Node.js 'crypto' module" 에러가 남.
// 전체 설정(Credentials 포함)은 src/auth.ts에서 이 설정을 확장해서 만든다.
//
// allowDangerousEmailAccountLinking: true — 같은 이메일로 이미 가입된 계정(이메일/비밀번호
// 또는 다른 소셜 provider)이 있어도 자동으로 계정을 연결한다. Auth.js 기본값은 이걸 막아서
// "OAuthAccountNotLinked" 에러를 낸다(계정 탈취 방지 목적: provider가 이메일 소유를 검증
// 안 했을 경우의 위험 때문). 구글/네이버 둘 다 자체적으로 이메일 인증을 거친 계정만 이메일을
// 내려주므로 이 프로젝트(개인용 골프 스코어 앱) 규모에서는 위험도가 낮다고 판단해 켜기로
// 결정(2026-08-07, memory.md 134번, 사용자 확인).
export default {
  providers: [
    Google({
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
      allowDangerousEmailAccountLinking: true,
    }),
    Naver({
      clientId: env.naverClientId,
      clientSecret: env.naverClientSecret,
      allowDangerousEmailAccountLinking: true,
      // next-auth 기본 profile()은 name을 response.nickname(별명)에서만 가져온다 —
      // 네이버 개발자센터 앱의 "제공 정보 선택"에서 별명 항목을 동의하지 않은 계정은
      // nickname이 안 내려와 User.name이 null로 저장되는 문제가 있었음(2026-08-07 확인).
      // response.name(실명)을 우선하고 nickname을 폴백으로 사용하도록 재정의.
      profile(profile) {
        return {
          id: profile.response.id,
          name: profile.response.name ?? profile.response.nickname ?? null,
          email: profile.response.email,
          image: profile.response.profile_image,
        };
      },
    }),
    // 2026-08-07 재추가 — 86번 항목(2026-07-22)에서 사용자 요청으로 한 번 삭제했다가
    // 다시 요청받아 부활. 카카오는 네이버와 달리 API가 "실명" 필드 자체를 제공하지 않고
    // 닉네임만 제공하므로(카카오 정책), 기본 profile()이 이미 kakao_account.profile.nickname을
    // 쓰는 게 최선 — 네이버 때와 달리 profile() 재정의 불필요.
    Kakao({
      clientId: env.kakaoClientId,
      clientSecret: env.kakaoClientSecret,
      allowDangerousEmailAccountLinking: true,
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
