import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatRoundDateTimeLabel } from "@/lib/round-format";
import TopBar from "@/components/TopBar";
import NavBar from "@/components/NavBar";
import RoundSearchList, {
  type RoundRow,
  type CourseOption,
} from "@/components/RoundSearchList";

export default async function RoundsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  // "내 기록만"/"전체 회원" 두 모드를 쿼리 한 번으로 커버: 본인 라운드는 동의 여부와 무관하게
  // 항상 포함하고, 그 외에는 thirdPartyConsent=true인 회원의 라운드만 포함(8번 조회조건 규칙).
  // scope 전환은 클라이언트에서 이 결과를 그대로 필터링해 즉시 반영한다.
  const rounds = await prisma.round.findMany({
    where: {
      OR: [{ userId }, { user: { thirdPartyConsent: true } }],
    },
    orderBy: { playedAt: "desc" },
    include: {
      golfCourse: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      holeScores: { select: { strokes: true } },
    },
  });

  const rows: RoundRow[] = rounds.map((r) => {
    const totalStrokes = r.holeScores.reduce((sum, hs) => sum + hs.strokes, 0);
    return {
      id: r.id,
      golfCourseId: r.golfCourse.id,
      golfCourseName: r.golfCourse.name,
      dateStr: r.playedAt.toISOString().slice(0, 10),
      dateTimeLabel: formatRoundDateTimeLabel(r.playedAt, r.startTime),
      weatherLabel: r.weatherSnapshot,
      totalStrokes,
      hasAnyScore: r.holeScores.length > 0,
      userId: r.user.id,
      userName: r.user.name ?? "이름 없음",
      isMine: r.user.id === userId,
    };
  });

  // 조회 가능한(본인 + 동의 회원) 라운드에 실제로 등장하는 골프장만 select 옵션으로 노출.
  // 05번(전체 골프장 목록, ~650건)을 그대로 쓰면 목록이 지나치게 길어져 실용성이 떨어지므로
  // 여기서는 "라운드 기록이 있는 골프장"으로 범위를 좁히는 설계 변경을 적용(목업 대비 변경점).
  const courseMap = new Map<string, string>();
  for (const r of rows) {
    courseMap.set(r.golfCourseId, r.golfCourseName);
  }
  const courseOptions: CourseOption[] = Array.from(
    courseMap,
    ([id, name]) => ({ id, name })
  ).sort((a, b) => a.name.localeCompare(b.name, "ko"));

  return (
    <main className="mx-auto min-h-screen max-w-md p-5 pb-24">
      <TopBar title="스코어 조회" backHref="/dashboard" />
      <RoundSearchList rounds={rows} courseOptions={courseOptions} />
      <NavBar />
    </main>
  );
}
