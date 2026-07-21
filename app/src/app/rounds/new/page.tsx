import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TopBar from "@/components/TopBar";
import RoundStep1 from "@/components/RoundStep1";
import RoundStep2, { type HoleState, type TeeShotResult, type PinDistanceType } from "@/components/RoundStep2";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildHoles(
  holesPlayed: number,
  frontLoop: { holes: { holeNumber: number; par: number }[] } | null,
  backLoop: { holes: { holeNumber: number; par: number }[] } | null
): HoleState[] {
  const list: HoleState[] = [];
  for (let i = 1; i <= holesPlayed; i++) {
    const isFront = i <= 9;
    const loop = isFront ? frontLoop : backLoop;
    const localHoleNumber = isFront ? i : i - 9;
    const par = loop?.holes.find((h) => h.holeNumber === localHoleNumber)?.par ?? 4;
    list.push({
      holeNumber: i,
      par,
      teeShotResult: null,
      penaltyStrokes: 0,
      obStrokes: 0,
      bunkerUsed: false,
      pinDistanceType: null,
      pinDistanceMeters: null,
      onGreenStrokes: Math.max(par - 2, 1),
      puttStrokes: 2,
      memo: "",
      strokes: null,
      saved: false,
      teeAutoAdjust: { penalty: 0, ob: 0, onGreen: 0 },
    });
  }
  return list;
}

export default async function RoundNewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const step = sp.step;

  // ---------------------------------------------------------------------
  // Step 1: 코스/홀수/일자 선택
  // ---------------------------------------------------------------------
  if (step !== "2") {
    const courses = await prisma.golfCourse.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        loops: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } },
      },
    });
    const initialCourseId = typeof sp.courseId === "string" ? sp.courseId : undefined;

    return (
      <main className="mx-auto min-h-screen max-w-md p-5 pb-24">
        <TopBar title="스코어 등록" backHref="/dashboard" />
        <RoundStep1 courses={courses} initialCourseId={initialCourseId} />
      </main>
    );
  }

  // ---------------------------------------------------------------------
  // Step 2: 수정 모드 — 기존 라운드를 roundId 기준으로 서버에서 조회
  // ---------------------------------------------------------------------
  const editRoundId = typeof sp.edit === "string" ? sp.edit : undefined;

  if (editRoundId) {
    const round = await prisma.round.findUnique({
      where: { id: editRoundId },
      include: {
        golfCourse: { select: { id: true, name: true } },
        frontLoop: { include: { holes: true } },
        backLoop: { include: { holes: true } },
        holeScores: true,
      },
    });

    if (!round || round.userId !== session.user.id) {
      redirect("/rounds/new");
    }

    const base = buildHoles(round.holesPlayed, round.frontLoop, round.backLoop);
    const initialHoles: HoleState[] = base.map((h) => {
      const existing = round.holeScores.find((hs) => hs.holeNumber === h.holeNumber);
      if (!existing) return h;
      const teeShotResult = existing.teeShotResult as TeeShotResult | null;
      const teeAutoAdjust = teeShotResult
        ? teeShotResult === "PENALTY"
          ? { penalty: 1, ob: 0, onGreen: 1 }
          : teeShotResult === "OB"
            ? { penalty: 0, ob: 2, onGreen: 2 }
            : { penalty: 0, ob: 0, onGreen: 0 }
        : { penalty: 0, ob: 0, onGreen: 0 };
      return {
        holeNumber: h.holeNumber,
        par: existing.par ?? h.par,
        teeShotResult,
        penaltyStrokes: existing.penaltyStrokes,
        obStrokes: existing.obStrokes,
        bunkerUsed: existing.bunkerUsed,
        pinDistanceType: existing.pinDistanceType as PinDistanceType | null,
        pinDistanceMeters: existing.pinDistanceMeters,
        onGreenStrokes: existing.onGreenStrokes ?? h.onGreenStrokes,
        puttStrokes: existing.puttStrokes ?? h.puttStrokes,
        memo: existing.memo ?? "",
        strokes: existing.strokes,
        saved: true,
        teeAutoAdjust,
      };
    });

    return (
      <main className="mx-auto min-h-screen max-w-md p-5 pb-24">
        <TopBar title="스코어 입력" backHref={`/rounds/new?courseId=${round.golfCourseId}`} />
        <RoundStep2
          roundId={round.id}
          courseId={round.golfCourseId}
          courseName={round.golfCourse.name}
          holesPlayed={round.holesPlayed === 9 ? 9 : 18}
          date={round.playedAt.toISOString().slice(0, 10)}
          startTime={round.startTime}
          isEdit
          initialHoles={initialHoles}
        />
      </main>
    );
  }

  // ---------------------------------------------------------------------
  // Step 2: 신규 라운드 — Step1에서 넘어온 쿼리 파라미터로 초기 상태 구성
  // ---------------------------------------------------------------------
  const courseId = typeof sp.courseId === "string" ? sp.courseId : undefined;
  if (!courseId) {
    redirect("/rounds/new");
  }

  const course = await prisma.golfCourse.findUnique({
    where: { id: courseId },
    select: { id: true, name: true },
  });
  if (!course) {
    redirect("/rounds/new");
  }

  const holesPlayed = sp.holesPlayed === "9" ? 9 : 18;
  const date = typeof sp.date === "string" ? sp.date : todayStr();
  const startTime = typeof sp.startTime === "string" ? sp.startTime : null;
  const frontLoopId = typeof sp.frontLoopId === "string" ? sp.frontLoopId : undefined;
  const backLoopId = typeof sp.backLoopId === "string" ? sp.backLoopId : undefined;

  const loopIds = [frontLoopId, backLoopId].filter((v): v is string => Boolean(v));
  const loops = loopIds.length
    ? await prisma.golfCourseLoop.findMany({
        where: { id: { in: loopIds } },
        include: { holes: true },
      })
    : [];
  const frontLoop = loops.find((l) => l.id === frontLoopId) ?? null;
  const backLoop = loops.find((l) => l.id === backLoopId) ?? null;

  const initialHoles = buildHoles(holesPlayed, frontLoop, backLoop);

  return (
    <main className="mx-auto min-h-screen max-w-md p-5 pb-24">
      <TopBar title="스코어 입력" backHref={`/rounds/new?courseId=${course.id}`} />
      <RoundStep2
        roundId={null}
        courseId={course.id}
        courseName={course.name}
        holesPlayed={holesPlayed}
        date={date}
        startTime={startTime}
        isEdit={false}
        initialHoles={initialHoles}
      />
    </main>
  );
}
