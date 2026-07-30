import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeAnalysis, type AnalysisRoundInput } from "@/lib/analysis/compute-analysis";
import AnalysisTabs from "@/components/AnalysisTabs";
import NavBar from "@/components/NavBar";
import TopBar from "@/components/TopBar";

export default async function AnalysisPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const rounds = await prisma.round.findMany({
    where: { userId: session.user.id },
    orderBy: { playedAt: "asc" },
    select: {
      id: true,
      playedAt: true,
      weatherSnapshot: true,
      golfCourse: { select: { id: true, name: true } },
      holeScores: {
        select: {
          strokes: true,
          par: true,
          teeShotResult: true,
          pinDistanceType: true,
          onGreenStrokes: true,
          puttStrokes: true,
        },
      },
    },
  });

  const input: AnalysisRoundInput[] = rounds.map((r) => ({
    id: r.id,
    playedAt: r.playedAt,
    weatherSnapshot: r.weatherSnapshot,
    golfCourseId: r.golfCourse.id,
    golfCourseName: r.golfCourse.name,
    holeScores: r.holeScores,
  }));

  const analysis = computeAnalysis(input);

  return (
    <main className="mx-auto min-h-screen max-w-md p-5 pb-24">
      <TopBar title="기록 분석" backHref="/dashboard" />
      <AnalysisTabs data={analysis} />
      <NavBar />
    </main>
  );
}
