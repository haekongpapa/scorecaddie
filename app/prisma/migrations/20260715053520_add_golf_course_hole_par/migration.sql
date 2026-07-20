-- AlterTable
ALTER TABLE "HoleScore" ADD COLUMN     "par" INTEGER;

-- CreateTable
CREATE TABLE "GolfCourseHole" (
    "id" TEXT NOT NULL,
    "golfCourseId" TEXT NOT NULL,
    "holeNumber" INTEGER NOT NULL,
    "par" INTEGER NOT NULL,

    CONSTRAINT "GolfCourseHole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GolfCourseHole_golfCourseId_holeNumber_key" ON "GolfCourseHole"("golfCourseId", "holeNumber");

-- AddForeignKey
ALTER TABLE "GolfCourseHole" ADD CONSTRAINT "GolfCourseHole_golfCourseId_fkey" FOREIGN KEY ("golfCourseId") REFERENCES "GolfCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
