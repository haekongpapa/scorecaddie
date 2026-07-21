import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { PinDistanceType, TeeShotResult } from "@prisma/client";

const VALID_PAR = [3, 4, 5, 6];
const VALID_TEE: (TeeShotResult | null)[] = ["FAIRWAY", "MISS", "PENALTY", "OB", null];
const VALID_PIN: (PinDistanceType | null)[] = ["NEAR", "FAR", null];

// 7-2번 화면 "OO번홀 입력" 버튼 — 홀 하나의 스코어카드 상세 입력값을 upsert한다.
// (roundId + holeNumber 조합은 @@unique 이므로 홀을 다시 저장하면 그대로 덮어쓴다 — 수정모드도 동일 API 재사용)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; holeNumber: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id: roundId, holeNumber: holeNumberRaw } = await params;
  const holeNumber = Number(holeNumberRaw);
  if (!Number.isInteger(holeNumber) || holeNumber < 1 || holeNumber > 18) {
    return NextResponse.json({ error: "홀 번호가 올바르지 않습니다." }, { status: 400 });
  }

  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round || round.userId !== session.user.id) {
    return NextResponse.json({ error: "라운드를 찾을 수 없습니다." }, { status: 404 });
  }
  if (holeNumber > round.holesPlayed) {
    return NextResponse.json({ error: "이 라운드의 홀 수를 초과했습니다." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const par = body?.par;
  const onGreenStrokes = body?.onGreenStrokes;
  const puttStrokes = body?.puttStrokes;
  const teeShotResult = body?.teeShotResult ?? null;
  const penaltyStrokes = body?.penaltyStrokes ?? 0;
  const obStrokes = body?.obStrokes ?? 0;
  const bunkerUsed = body?.bunkerUsed ?? false;
  const pinDistanceType = body?.pinDistanceType ?? null;
  const pinDistanceMeters = body?.pinDistanceMeters ?? null;
  const memo = body?.memo ?? null;

  if (!VALID_PAR.includes(par)) {
    return NextResponse.json({ error: "PAR 값이 올바르지 않습니다." }, { status: 400 });
  }
  if (!Number.isInteger(onGreenStrokes) || onGreenStrokes < 0) {
    return NextResponse.json({ error: "온그린 타수 값이 올바르지 않습니다." }, { status: 400 });
  }
  if (!Number.isInteger(puttStrokes) || puttStrokes < 0) {
    return NextResponse.json({ error: "퍼트 수 값이 올바르지 않습니다." }, { status: 400 });
  }
  if (!VALID_TEE.includes(teeShotResult)) {
    return NextResponse.json({ error: "티샷 결과 값이 올바르지 않습니다." }, { status: 400 });
  }
  if (!Number.isInteger(penaltyStrokes) || penaltyStrokes < 0) {
    return NextResponse.json({ error: "페널티 값이 올바르지 않습니다." }, { status: 400 });
  }
  if (!Number.isInteger(obStrokes) || obStrokes < 0) {
    return NextResponse.json({ error: "OB 값이 올바르지 않습니다." }, { status: 400 });
  }
  if (typeof bunkerUsed !== "boolean") {
    return NextResponse.json({ error: "벙커 사용 값이 올바르지 않습니다." }, { status: 400 });
  }
  if (!VALID_PIN.includes(pinDistanceType)) {
    return NextResponse.json({ error: "핀거리 구분 값이 올바르지 않습니다." }, { status: 400 });
  }
  if (
    pinDistanceMeters !== null &&
    (!Number.isInteger(pinDistanceMeters) || pinDistanceMeters < 0 || pinDistanceMeters > 20)
  ) {
    return NextResponse.json({ error: "핀거리(m) 값이 올바르지 않습니다." }, { status: 400 });
  }
  if (memo !== null && typeof memo !== "string") {
    return NextResponse.json({ error: "메모 값이 올바르지 않습니다." }, { status: 400 });
  }
  if (typeof memo === "string" && memo.length > 100) {
    return NextResponse.json({ error: "메모는 100자 이내로 입력해주세요." }, { status: 400 });
  }

  const strokes = onGreenStrokes + puttStrokes;

  const data = {
    strokes,
    par,
    teeShotResult: teeShotResult as TeeShotResult | null,
    penaltyStrokes,
    obStrokes,
    bunkerUsed,
    pinDistanceType: pinDistanceType as PinDistanceType | null,
    pinDistanceMeters,
    onGreenStrokes,
    puttStrokes,
    memo,
  };

  const holeScore = await prisma.holeScore.upsert({
    where: { roundId_holeNumber: { roundId, holeNumber } },
    create: { roundId, holeNumber, ...data },
    update: data,
  });

  return NextResponse.json({ holeScore });
}
