import NavBar from "@/components/NavBar";
import TopBar from "@/components/TopBar";

export default function CoursesPage() {
  return (
    <main className="mx-auto min-h-screen max-w-md p-5 pb-24">
      <TopBar title="골프장" backHref="/dashboard" />
      <p className="text-sm text-muted">
        공공데이터 연동 골프장 목록 (구현 예정)
      </p>
      <NavBar />
    </main>
  );
}
