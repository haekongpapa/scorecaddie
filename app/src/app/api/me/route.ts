import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
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
}
