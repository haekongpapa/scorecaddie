import { redirect } from "next/navigation";
import { auth } from "@/auth";
import TopBar from "@/components/TopBar";
import NavBar from "@/components/NavBar";
import CsvUploadForm from "@/components/CsvUploadForm";

export default async function AdminGolfCoursesUploadPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto min-h-screen max-w-md p-5 pb-24">
      <TopBar title="CSV 일괄 업로드" backHref="/admin/golf-courses" />
      <CsvUploadForm />
      <NavBar />
    </main>
  );
}
