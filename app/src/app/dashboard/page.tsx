import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatRoundDateTimeLabel } from "@/lib/round-format";
import NavBar from "@/components/NavBar";
import RoundListItem from "@/components/RoundListItem";
import TopBar from "@/components/TopBar";

const MENU_CARDS = [
  { href: "/courses", icon: "⛳", label: "골프장" },
  { href: "/rounds/new", icon: "✏️", label: "스코어 등록" },
  { href: "/rounds", icon: "📋", label: "스코어 조회" },
  { href: "/profile", icon: "👤", label: "마이페이지" },
];

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const rounds = await prisma.round.findMany({
    where: { userId: session.user.id },
    orderBy: { playedAt: "desc" },
    take: 3,
    include: {
      golfCourse: true,
      holeScores: true,
    },
  });

  const isAdmin = session.user.role === "ADMIN";
  const displayName = session.user.name ?? session.user.email ?? "회원";

  return (
    <main className="mx-auto min-h-screen max-w-md p-5 pb-24">
      <TopBar title="대시보드" rightHref="/profile" rightIcon="👤" />

      <p className="mb-3.5 text-[15px] font-semibold">
        안녕하세요, {displayName}님
      </p>

      <div className="mb-4 grid grid-cols-4 gap-2.5">
        {MENU_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="block rounded-xl bg-card-bg px-2 py-3.5 text-center"
          >
            <div className="text-xl">{card.icon}</div>
            <div className="mt-1.5 text-xs font-medium">{card.label}</div>
          </Link>
        ))}
      </div>

      {isAdmin && (
        <div className="mb-2 flex flex-col gap-2">
          <Link
            href="/admin/golf-courses"
            className="flex items-center justify-between rounded-lg border border-dashed border-accent bg-card-bg2 px-3.5 py-3"
          >
            <div>
              <div className="text-[13.5px] font-semibold">
                ⚙️ 관리자 - 골프장 Par 관리
              </div>
              <div className="mt-0.5 text-xs text-muted">
                골프장 Par 등록/CSV 업로드로 이동
              </div>
            </div>
            <span className="rounded-md bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">
              ADMIN
            </span>
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center justify-between rounded-lg border border-dashed border-accent bg-card-bg2 px-3.5 py-3"
          >
            <div>
              <div className="text-[13.5px] font-semibold">
                👥 관리자 - 회원 관리
              </div>
              <div className="mt-0.5 text-xs text-muted">
                회원 목록 조회, 어드민 권한 부여/해제
              </div>
            </div>
            <span className="rounded-md bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">
              ADMIN
            </span>
          </Link>
        </div>
      )}

      <h2 className="mb-2.5 mt-4 text-[13px] font-semibold text-muted">
        최근 라운드
      </h2>
      {rounds.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
          첫 라운드를 등록해보세요
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
                title={round.golfCourse.name}
                sub={formatRoundDateTimeLabel(round.playedAt, round.startTime)}
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
