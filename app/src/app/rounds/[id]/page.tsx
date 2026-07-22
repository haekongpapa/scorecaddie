import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatRoundDateLabel, formatStartTimeLabel } from "@/lib/round-format";
import TopBar from "@/components/TopBar";
import NavBar from "@/components/NavBar";
import RoundDetailMatrix, { type HoleRow } from "@/components/RoundDetailMatrix";
import RoundActions from "@/components/RoundActions";

export default async function RoundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const round = await prisma.round.findUnique({
    where: { id },
    include: {
      golfCourse: { select: { name: true } },
      user: { select: { id: true, name: true, thirdPartyConsent: true } },
      frontLoop: { include: { holes: true } },
      backLoop: { include: { holes: true } },
      holeScores: { orderBy: { holeNumber: "asc" } },
    },
  });

  if (!round) {
    notFound();
  }

  const isOwner = round.userId === session.user.id;
  const canView = isOwner || round.user.thirdPartyConsent;
  if (!canView) {
    // 정보제공 비동의 회원의 라운드 — 존재 여부 자체를 노출하지 않기 위해 404로 처리.
    notFound();
  }

  const holes: HoleRow[] = [];
  for (let n = 1; n <= round.holesPlayed; n++) {
    const isFront = n <= 9;
    const local = isFront ? n : n - 9;
    const existing = round.holeScores.find((hs) => hs.holeNumber === n);
    const loopPar = (isFront ? round.frontLoop : round.backLoop)?.holes.find(
      (h) => h.holeNumber === local
    )?.par;

    holes.push({
      holeNumber: n,
      local,
      half: isFront ? "전반" : "후반",
      par: existing?.par ?? loopPar ?? null,
      strokes: existing?.strokes ?? null,
      teeShotResult: (existing?.teeShotResult as HoleRow["teeShotResult"]) ?? null,
      onGreenStrokes: existing?.onGreenStrokes ?? null,
      puttStrokes: existing?.puttStrokes ?? null,
      bunkerUsed: existing?.bunkerUsed ?? false,
      memo: existing?.memo ?? null,
      saved: Boolean(existing),
    });
  }

  const frontHoles = holes.filter((h) => h.half === "전반");
  const backHoles = holes.filter((h) => h.half === "후반");
  const totalScore = round.holeScores.reduce((sum, hs) => sum + hs.strokes, 0);
  const hasAnyScore = round.holeScores.length > 0;

  const dateLabel = formatRoundDateLabel(round.playedAt);
  const weatherLabel = round.weatherSnapshot ?? "날씨 정보 없음";
  const startTimeBaseLabel = formatStartTimeLabel(round.startTime);
  const startTimeLabel = startTimeBaseLabel ? `${startTimeBaseLabel} 출발` : null;

  return (
    <main className="mx-auto min-h-screen max-w-md p-5 pb-24">
      <TopBar title="라운드 상세" backHref="/rounds" />

      <div className="mb-4 rounded-xl bg-primary p-4 text-white">
        <div className="mb-1 text-[15px] font-semibold">{round.golfCourse.name}</div>
        <div className="mb-2.5 text-xs text-white/70">
          {dateLabel}
          {startTimeLabel ? ` · ${startTimeLabel}` : ""} · {weatherLabel}
        </div>
        <div className="text-2xl font-bold">{hasAnyScore ? `${totalScore}타` : "기록 없음"}</div>
        {!isOwner && (
          <span className="mt-1.5 inline-block rounded-md bg-white/20 px-2 py-1 text-[10.5px] font-bold">
            {round.user.name ?? "이름 없음"}님의 라운드 · 읽기 전용
          </span>
        )}
      </div>

      <h2 className="mb-2.5 text-[13px] font-semibold text-muted">홀별 스코어</h2>

      {hasAnyScore ? (
        <RoundDetailMatrix courseName={round.golfCourse.name} frontHoles={frontHoles} backHoles={backHoles} />
      ) : (
        <div className="mb-4 rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
          아직 저장된 홀 스코어가 없습니다.
        </div>
      )}

      <RoundActions
        roundId={round.id}
        isOwner={isOwner}
        ownerName={round.user.name ?? "이름 없음"}
        canViewReadOnly={!isOwner && canView}
      />

      <NavBar />
    </main>
  );
}
