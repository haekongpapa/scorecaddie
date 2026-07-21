import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { summarizeAddress, groupPublicPrivate } from "@/lib/course-format";
import TopBar from "@/components/TopBar";
import NavBar from "@/components/NavBar";
import RoundListItem from "@/components/RoundListItem";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const course = await prisma.golfCourse.findUnique({
    where: { id },
    include: {
      loops: { select: { id: true } },
    },
  });

  // id가 잘못됐거나(직접 URL 조작 등) 삭제된 골프장인 경우. 05번 목록에서 정상적으로
  // 넘어온 id는 항상 존재하므로, 여기 도달하는 건 비정상 접근 케이스로만 취급.
  if (!course) {
    notFound();
  }

  const addressSummary = summarizeAddress(course.address);
  const holeCount = course.loops.length > 0 ? course.loops.length * 9 : null;
  const publicPrivateGroup = groupPublicPrivate(course.publicPrivate);
  const hasLocation = course.latitude !== null && course.longitude !== null;

  const metaParts = [
    addressSummary ?? "주소 정보 없음",
    holeCount ? `${holeCount}홀` : null,
    publicPrivateGroup,
  ].filter(Boolean);

  const rounds = await prisma.round.findMany({
    where: { userId: session.user.id, golfCourseId: course.id },
    orderBy: { playedAt: "desc" },
    include: { holeScores: true },
  });

  return (
    <main className="mx-auto min-h-screen max-w-md p-5 pb-24">
      <TopBar title="골프장 상세" backHref="/courses" />

      <div className="mb-3.5 flex h-[120px] items-center justify-center rounded-xl bg-card-bg2 text-xs text-muted">
        {hasLocation
          ? `📍 ${course.latitude!.toFixed(5)}, ${course.longitude!.toFixed(5)}`
          : "위치 확인 중"}
      </div>

      <h2 className="mb-1 text-lg font-semibold">{course.name}</h2>
      <p className="mb-5 text-sm text-muted">{metaParts.join(" · ")}</p>

      <Link
        href={`/rounds/new?courseId=${course.id}`}
        className="mb-5 block rounded-lg bg-primary py-3 text-center text-sm font-semibold text-white"
      >
        이 골프장에서 스코어 등록
      </Link>

      <h2 className="mb-2.5 text-[13px] font-semibold text-muted">
        내 라운드 이력
      </h2>
      {rounds.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
          이 골프장에서의 라운드 기록이 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rounds.map((round) => {
            const totalStrokes = round.holeScores.reduce(
              (sum, hs) => sum + hs.strokes,
              0
            );
            return (
              <RoundListItem
                key={round.id}
                href={`/rounds/${round.id}`}
                title={round.playedAt
                  .toISOString()
                  .slice(0, 10)
                  .replace(/-/g, ".")}
                value={`${totalStrokes}타`}
              />
            );
          })}
        </div>
      )}

      <NavBar />
    </main>
  );
}
