import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TopBar from "@/components/TopBar";
import NavBar from "@/components/NavBar";
import CourseSearchList, {
  type CourseRow,
} from "@/components/CourseSearchList";

// 주소 전문(예: "경상북도 경주시 외동읍 석계리 1번지 0호 서라벌골프클럽")에서
// 목업처럼 "시/도 + 시/군/구" 요약만 뽑아낸다. 형식이 다른 주소는 앞 2토큰만 사용하는
// 근사치임 — 정교한 행정구역 파싱은 범위 밖.
function summarizeAddress(address: string | null): string | null {
  if (!address) return null;
  const tokens = address.trim().split(/\s+/);
  return tokens.slice(0, 2).join(" ") || null;
}

// publicPrivate 원문 값이 실제 데이터에서 어떻게 분포하는지 이번 구현 시점엔 확인 못함
// (샌드박스가 사용자 로컬 DB에 접근 불가). "공공"이 포함되면 공공, 비어있지 않은 나머지는
// 전부 민간으로 취급하는 보수적 추정치 — 실제 데이터로 검증 필요(TODO).
function groupPublicPrivate(value: string | null): "공공" | "민간" | null {
  if (!value) return null;
  return value.includes("공공") ? "공공" : "민간";
}

export default async function CoursesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const courses = await prisma.golfCourse.findMany({
    orderBy: { name: "asc" },
    include: {
      loops: { select: { id: true } },
    },
  });

  const rows: CourseRow[] = courses.map((course) => ({
    id: course.id,
    name: course.name,
    addressSummary: summarizeAddress(course.address),
    holeCount: course.loops.length > 0 ? course.loops.length * 9 : null,
    hasLocation: course.latitude !== null && course.longitude !== null,
    publicPrivateGroup: groupPublicPrivate(course.publicPrivate),
  }));

  return (
    <main className="mx-auto min-h-screen max-w-md p-5 pb-24">
      <TopBar title="골프장" backHref="/dashboard" />
      <CourseSearchList courses={rows} />
      <NavBar />
    </main>
  );
}
