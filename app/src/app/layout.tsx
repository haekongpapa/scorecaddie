import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScoreCaddie",
  description: "개인 골프 스코어 관리 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      {/* suppressHydrationWarning: Grammarly 같은 브라우저 확장이 React 하이드레이션 전에
          <body>에 data-gr-ext-installed/data-new-gr-c-s-check-loaded 속성을 주입해
          서버/클라이언트 HTML이 달라 보이는 것뿐 — 실제 렌더링 내용 불일치가 아니므로
          이 태그의 속성 불일치 경고만 무시하도록 처리 (Next.js 공식 권장 대응, 2026-08-07) */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
