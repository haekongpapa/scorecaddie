import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import NavBar from "@/components/NavBar";
import TopBar from "@/components/TopBar";
import ConsentToggle from "@/components/ConsentToggle";
import LogoutListItem from "@/components/LogoutListItem";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    redirect("/login");
  }

  const roundsForStats = await prisma.round.findMany({
    where: { userId: session.user.id },
    select: { holeScores: { select: { strokes: true } } },
  });

  const roundTotals = roundsForStats
    .map((r) => r.holeScores.reduce((sum, hs) => sum + hs.strokes, 0))
    .filter((total) => total > 0);

  const totalRounds = roundTotals.length;
  const avgStrokes =
    totalRounds > 0
      ? (roundTotals.reduce((a, b) => a + b, 0) / totalRounds).toFixed(1)
      : "-";
  const bestScore: number | string =
    totalRounds > 0 ? Math.min(...roundTotals) : "-";

  const displayName = user.name ?? user.email;
  const initials = displayName.slice(0, 2);
  const canChangePassword = !!user.passwordHash;
  const joinedAt = user.createdAt
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, ".");

  return (
    <main className="mx-auto min-h-screen max-w-md p-5 pb-24">
      <TopBar title="마이페이지" backHref="/dashboard" />

      <div className="mb-[18px] flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-moss text-sm font-bold text-white">
          {initials}
        </div>
        <div>
          <div className="text-[15px] font-semibold">{displayName}</div>
          <div className="text-sm text-muted">{user.email}</div>
          <div className="mt-0.5 text-[11px] text-muted">
            {joinedAt} 가입
          </div>
        </div>
      </div>

      <div className="mb-3.5 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-card-bg px-1.5 py-3 text-center">
          <div className="text-xl font-bold text-primary">{totalRounds}</div>
          <div className="mt-0.5 text-[11px] text-muted">총 라운드</div>
        </div>
        <div className="rounded-lg bg-card-bg px-1.5 py-3 text-center">
          <div className="text-xl font-bold text-primary">{avgStrokes}</div>
          <div className="mt-0.5 text-[11px] text-muted">평균 타수</div>
        </div>
        <div className="rounded-lg bg-card-bg px-1.5 py-3 text-center">
          <div className="text-xl font-bold text-primary">{bestScore}</div>
          <div className="mt-0.5 text-[11px] text-muted">베스트 스코어</div>
        </div>
      </div>

      <h2 className="mb-2.5 text-[13px] font-semibold text-muted">
        개인정보
      </h2>
      <ConsentToggle initialConsent={user.thirdPartyConsent} />

      <h2 className="mb-2.5 mt-4 text-[13px] font-semibold text-muted">
        설정
      </h2>
      <div className="flex flex-col gap-2">
        {canChangePassword && (
          <Link
            href="/profile/change-password"
            className="flex items-center justify-between rounded-lg bg-card-bg px-3.5 py-3"
          >
            <span className="text-[13.5px] font-semibold">
              비밀번호 변경
            </span>
            <span className="text-muted">›</span>
          </Link>
        )}
        <div className="flex items-center justify-between rounded-lg bg-card-bg px-3.5 py-3 opacity-60">
          <span className="text-[13.5px] font-semibold">알림 설정</span>
          <span className="text-[11px] text-muted">준비 중</span>
        </div>
        <LogoutListItem />
      </div>

      <NavBar />
    </main>
  );
}
