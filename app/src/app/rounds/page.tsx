import NavBar from "@/components/NavBar";
import TopBar from "@/components/TopBar";

export default function RoundsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-md p-5 pb-24">
      <TopBar title="스코어 조회" backHref="/dashboard" />
      <p className="text-sm text-muted">
        일자별/회원별 라운드 조회 (구현 예정)
      </p>
      <NavBar />
    </main>
  );
}
