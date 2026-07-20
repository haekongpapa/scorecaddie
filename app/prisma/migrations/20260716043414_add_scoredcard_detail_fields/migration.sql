-- CreateEnum
CREATE TYPE "TeeShotResult" AS ENUM ('FAIRWAY', 'MISS', 'PENALTY', 'OB');

-- CreateEnum
CREATE TYPE "PinDistanceType" AS ENUM ('NEAR', 'FAR');

-- AlterTable
ALTER TABLE "HoleScore" ADD COLUMN     "bunkerUsed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "obStrokes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "onGreenStrokes" INTEGER,
ADD COLUMN     "penaltyStrokes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pinDistanceMeters" INTEGER,
ADD COLUMN     "pinDistanceType" "PinDistanceType",
ADD COLUMN     "puttStrokes" INTEGER,
ADD COLUMN     "teeShotResult" "TeeShotResult";

-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "backCourseLabel" TEXT,
ADD COLUMN     "frontCourseLabel" TEXT,
ADD COLUMN     "holesPlayed" INTEGER NOT NULL DEFAULT 18;
