import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TopBar from "@/components/TopBar";
import DeleteAccountForm from "@/components/DeleteAccountForm";

export default async function DeleteAccountPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto min-h-screen max-w-md p-5">
      <TopBar title="회원 탈퇴" backHref="/profile" />
      <DeleteAccountForm hasPassword={!!user.passwordHash} />
    </main>
  );
}
