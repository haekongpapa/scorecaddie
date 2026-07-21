import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TopBar from "@/components/TopBar";
import NavBar from "@/components/NavBar";
import AdminUserGrid, { type AdminUserRow } from "@/components/AdminUserGrid";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, createdAt: true, role: true },
  });

  const rows: AdminUserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    createdAt: u.createdAt.toISOString().slice(0, 10),
    role: u.role,
  }));

  return (
    <main className="mx-auto min-h-screen max-w-md p-5 pb-24">
      <TopBar title="회원 관리" backHref="/dashboard" />

      <span className="mb-3 inline-block rounded-md bg-accent px-2 py-1 text-[11px] font-semibold text-white">
        관리자 전용
      </span>

      <AdminUserGrid initialUsers={rows} currentUserId={session.user.id} />

      <NavBar />
    </main>
  );
}
