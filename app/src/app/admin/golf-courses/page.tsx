import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TopBar from "@/components/TopBar";
import NavBar from "@/components/NavBar";
import PublicDataSyncCard from "@/components/PublicDataSyncCard";
import GeocodeBatchCard from "@/components/GeocodeBatchCard";
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

  // "최종 업데이트"(공공 데이터 업로드 최종 실행 시각)는 GolfCourseSyncLog(전용 체크포인트)의
  // 최신 startedAt을 그대로 쓴다. (2026-07-29 변경) 예전에는 별도 이력 테이블 없이
  // "externalOrgCd가 있는 GolfCourse의 최신 updatedAt"으로 근사했으나, 지오코딩 배치도 같은
  // 행의 updatedAt을 갱신해서 실제 마지막 동기화 시각보다 미래로 밀릴 수 있는 문제가 있었다
  // (golf-course-sync.ts 상단 주석/스키마 주석 참고).
  const lastSyncLog = await prisma.golfCourseSyncLog.findFirst({
    orderBy: { startedAt: "desc" },
    select: { startedAt: true },
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

  const needsGeocodingCount = await prisma.golfCourse.count({
    where: { needsGeocoding: true },
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
          lastSyncLog ? formatDateTime(lastSyncLog.startedAt) : null
        }
      />

      <GeocodeBatchCard initialNeedsGeocodingCount={needsGeocodingCount} />

      <a
        href="/admin/golf-courses/upload"
        className="mb-2 block w-full rounded-lg border border-primary bg-white py-3 text-center text-sm font-semibold text-primary"
      >
        ⇪ CSV 일괄 업로드
      </a>

      <a
        href="/api/admin/golf-courses/export"
        className="mb-3 block w-full rounded-lg border border-line bg-white py-3 text-center text-sm font-semibold text-muted"
      >
        ⇩ CSV 내보내기 (현재 등록된 Par 데이터)
      </a>

      <GolfCourseAdminList courses={rows} />

      <NavBar />
    </main>
  );
}
