import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TopBar from "@/components/TopBar";
import NavBar from "@/components/NavBar";
import CourseSearchList, {
  type CourseRow,
} from "@/components/CourseSearchList";
import { summarizeAddress, groupPublicPrivate } from "@/lib/course-format";

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
