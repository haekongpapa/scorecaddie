import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

const FEATURES = [
  { title: "골프장 검색", desc: "전국 골프장 정보" },
  { title: "스코어 기록", desc: "홀별 타수 관리" },
  { title: "날씨 연동", desc: "라운드 당시 날씨" },
  { title: "통계 확인", desc: "평균 타수 등" },
];

export default async function Home() {
  const session = await auth();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 text-center">
      <div>
        <div className="mb-2 text-4xl">⛳</div>
        <h1 className="text-3xl font-bold text-primary">ScoreCaddie</h1>
        <p className="mt-2 text-gray-600">개인 골프 스코어 관리 서비스</p>
      </div>

      <div className="grid w-full max-w-sm grid-cols-2 gap-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-lg border border-gray-200 p-4 text-left">
            <div className="text-sm font-semibold">{f.title}</div>
            <div className="text-xs text-gray-500">{f.desc}</div>
          </div>
        ))}
      </div>

      <div className="flex w-full max-w-sm flex-col gap-2">
        <Link
          href="/login"
          className="rounded-lg bg-primary px-4 py-3 text-center font-semibold text-white"
        >
          로그인
        </Link>
        <Link
          href="/signup"
          className="rounded-lg border border-primary px-4 py-3 text-center font-semibold text-primary"
        >
          회원가입
        </Link>
      </div>
    </main>
  );
}
