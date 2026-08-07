import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/services/with-api-handler";
import { DELETE_ACCOUNT_CONFIRM_PHRASE } from "@/lib/constants/account";

export const PATCH = withApiHandler(async (req: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { thirdPartyConsent } = await req.json();
  if (typeof thirdPartyConsent !== "boolean") {
    return NextResponse.json(
      { error: "thirdPartyConsent 값이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { thirdPartyConsent },
  });

  return NextResponse.json({ thirdPartyConsent: user.thirdPartyConsent });
});

// 회원 탈퇴. schema.prisma에서 Account/Session/Round(→HoleScore)가 전부
// User에 onDelete: Cascade로 연결돼 있어, prisma.user.delete() 한 번으로
// 회원과 관련된 모든 데이터(연동 계정, 세션, 라운드/홀스코어 기록)가 함께
// 삭제된다. GolfCourse류(공용 골프장 데이터)는 User와 무관하므로 영향 없음.
// (2026-08-07 신규)
export const DELETE = withApiHandler(async (req: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) {
    return NextResponse.json(
      { error: "사용자를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (user.passwordHash) {
    // 이메일/비밀번호 계정: 비밀번호로 본인 확인
    const password = body.password;
    if (typeof password !== "string" || !password) {
      return NextResponse.json(
        { error: "비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "비밀번호가 올바르지 않습니다." },
        { status: 400 }
      );
    }
  } else {
    // 소셜 전용 계정: 비밀번호가 없으므로 확인 문구 입력으로 대체
    const confirmText = body.confirmText;
    if (confirmText !== DELETE_ACCOUNT_CONFIRM_PHRASE) {
      return NextResponse.json(
        { error: "확인 문구가 일치하지 않습니다." },
        { status: 400 }
      );
    }
  }

  await prisma.user.delete({ where: { id: user.id } });

  return NextResponse.json({ success: true });
});
