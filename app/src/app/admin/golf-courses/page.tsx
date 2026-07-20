import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TopBar from "@/components/TopBar";
import NavBar from "@/components/NavBar";
import PublicDataSyncCard from "@/components/PublicDataSyncCard";
import GolfCourseAdminList, {
  type AdminCourseRow,
} from "@/components/GolfCourseAdminList";

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AdminGolfCoursesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  // 미들웨어에서도 role 검사를 하지만(2026-07-20 수정), 서버 컴포넌트 자체에서도
  // 한 번 더 방어적으로 확인한다(마이페이지 등 다른 화면과 동일한 패턴).
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // "최종 업데이트"(공공 데이터 업로드 최종 실행 시각)는 별도 이력 테이블 없이,
  // 공공데이터 출처(externalOrgCd 존재)로 생성/수정된 골프장의 최신 updatedAt으로 추정한다.
  // (이 값을 변경하는 다른 관리 기능이 아직 없어 근사치가 아니라 실제 값과 일치함)
  const latestSynced = await prisma.golfCourse.findFirst({
    where: { externalOrgCd: { not: null } },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });

  const courses = await prisma.golfCourse.findMany({
    orderBy: { name: "asc" },
    include: {
      loops: {
        orderBy: { sortOrder: "asc" },
        include: { holes: true },
      },
    },
  });

  const rows: AdminCourseRow[] = courses.map((course) => {
    const loopNames = course.loops.map((l) => l.name);
    const filledHoles = course.loops.reduce((sum, l) => sum + l.holes.length, 0);
    const expectedHoles = course.loops.length * 9;
    const latestLoopUpdate = course.loops.reduce<Date | null>((latest, l) => {
      if (!latest || l.updatedAt > latest) return l.updatedAt;
      return latest;
    }, null);

    return {
      id: course.id,
      name: course.name,
      address: course.address,
      loopNames,
      filledHoles,
      expectedHoles,
      lastModified: latestLoopUpdate ? formatDate(latestLoopUpdate) : null,
    };
  });

  return (
    <main className="mx-auto min-h-screen max-w-md p-5 pb-24">
      <TopBar title="골프장 Par 관리" backHref="/dashboard" />

      <span className="mb-3 inline-block rounded-md bg-accent px-2 py-1 text-[11px] font-semibold text-white">
        관리자 전용
      </span>

      <PublicDataSyncCard
        initialLastUpdatedAt={
          latestSynced ? formatDateTime(latestSynced.updatedAt) : null
        }
      />

      <a
        href="/admin/golf-courses/upload"
        className="mb-3 block w-full rounded-lg border border-primary bg-white py-3 text-center text-sm font-semibold text-primary"
      >
        ⇪ CSV 일괄 업로드
      </a>

      <GolfCourseAdminList courses={rows} />

      <NavBar />
    </main>
  );
}
