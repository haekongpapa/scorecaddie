-- CreateTable
CREATE TABLE "GolfCourseSyncLog" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GolfCourseSyncLog_pkey" PRIMARY KEY ("id")
);
