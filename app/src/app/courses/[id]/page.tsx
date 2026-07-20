import TopBar from "@/components/TopBar";
import NavBar from "@/components/NavBar";

export default function CourseDetailPage() {
  return (
    <main className="mx-auto min-h-screen max-w-md p-5 pb-24">
      <TopBar title="골프장 상세" backHref="/courses" />
      <p className="text-sm text-muted">구현 예정 (6번 화면)</p>
      <NavBar />
    </main>
  );
}
