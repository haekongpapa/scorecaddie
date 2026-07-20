/*
  Warnings:

  - You are about to drop the column `golfCourseId` on the `GolfCourseHole` table. All the data in the column will be lost.
  - You are about to drop the column `backCourseLabel` on the `Round` table. All the data in the column will be lost.
  - You are about to drop the column `frontCourseLabel` on the `Round` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[loopId,holeNumber]` on the table `GolfCourseHole` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `loopId` to the `GolfCourseHole` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "GolfCourseHole" DROP CONSTRAINT "GolfCourseHole_golfCourseId_fkey";

-- DropIndex
DROP INDEX "GolfCourseHole_golfCourseId_holeNumber_key";

-- AlterTable
ALTER TABLE "GolfCourseHole" DROP COLUMN "golfCourseId",
ADD COLUMN     "loopId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Round" DROP COLUMN "backCourseLabel",
DROP COLUMN "frontCourseLabel",
ADD COLUMN     "backLoopId" TEXT,
ADD COLUMN     "frontLoopId" TEXT;

-- CreateTable
CREATE TABLE "GolfCourseLoop" (
    "id" TEXT NOT NULL,
    "golfCourseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GolfCourseLoop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GolfCourseLoop_golfCourseId_name_key" ON "GolfCourseLoop"("golfCourseId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "GolfCourseHole_loopId_holeNumber_key" ON "GolfCourseHole"("loopId", "holeNumber");

-- AddForeignKey
ALTER TABLE "GolfCourseLoop" ADD CONSTRAINT "GolfCourseLoop_golfCourseId_fkey" FOREIGN KEY ("golfCourseId") REFERENCES "GolfCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GolfCourseHole" ADD CONSTRAINT "GolfCourseHole_loopId_fkey" FOREIGN KEY ("loopId") REFERENCES "GolfCourseLoop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_frontLoopId_fkey" FOREIGN KEY ("frontLoopId") REFERENCES "GolfCourseLoop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_backLoopId_fkey" FOREIGN KEY ("backLoopId") REFERENCES "GolfCourseLoop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
