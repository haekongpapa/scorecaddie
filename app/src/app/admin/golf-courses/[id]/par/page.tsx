import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { summarizeAddress } from "@/lib/course-format";
import TopBar from "@/components/TopBar";
import NavBar from "@/components/NavBar";
import GolfCourseParEditor, {
  type LoopData,
} from "@/components/GolfCourseParEditor";

export default async function AdminGolfCourseParPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const course = await prisma.golfCourse.findUnique({
    where: { id },
    include: {
      loops: {
        orderBy: { sortOrder: "asc" },
        include: {
          holes: true,
          _count: { select: { roundsFront: true, roundsBack: true } },
        },
      },
    },
  });

  if (!course) {
    notFound();
  }

  const loops: LoopData[] = course.loops.map((loop) => {
    // 9칸 Par 배열로 정규화 — 아직 저장 안 된 홀은 4로 기본값 표시(저장 전까지는
    // 실제 DB 값이 아님. 12-admin-course-par.html의 "+ 루프 추가" 기본값 4와 동일).
    const pars = Array.from({ length: 9 }, (_, i) => {
      const hole = loop.holes.find((h) => h.holeNumber === i + 1);
      return hole?.par ?? 4;
    });

    return {
      id: loop.id,
      name: loop.name,
      sortOrder: loop.sortOrder,
      pars,
      referencedRoundCount: loop._count.roundsFront + loop._count.roundsBack,
    };
  });

  return (
    <main className="mx-auto min-h-screen max-w-md p-5 pb-24">
      <TopBar title="루프·Par 입력" backHref="/admin/golf-courses" />

      <div className="mb-3.5 rounded-xl bg-card-bg p-3.5">
        <div className="text-[15px] font-bold">{course.name}</div>
        <div className="mt-0.5 text-xs text-muted">
          {summarizeAddress(course.address) ?? "주소 정보 없음"} · 루프{" "}
          {loops.length}개
        </div>
      </div>

      <GolfCourseParEditor courseId={course.id} initialLoops={loops} />

      <NavBar />
    </main>
  );
}
