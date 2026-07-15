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
      <body>{children}</body>
    </html>
  );
}
