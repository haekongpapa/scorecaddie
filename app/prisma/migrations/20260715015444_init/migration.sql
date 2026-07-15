-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "GolfCourse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "rawCoordX" TEXT,
    "rawCoordY" TEXT,
    "needsGeocoding" BOOLEAN NOT NULL DEFAULT false,
    "externalOrgCd" TEXT,
    "externalMngNo" TEXT,
    "businessStatus" TEXT,
    "subCategory" TEXT,
    "publicPrivate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GolfCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "golfCourseId" TEXT NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL,
    "weatherSnapshot" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HoleScore" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "holeNumber" INTEGER NOT NULL,
    "strokes" INTEGER NOT NULL,
    "memo" TEXT,

    CONSTRAINT "HoleScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "GolfCourse_externalOrgCd_externalMngNo_key" ON "GolfCourse"("externalOrgCd", "externalMngNo");

-- CreateIndex
CREATE INDEX "Round_userId_playedAt_idx" ON "Round"("userId", "playedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HoleScore_roundId_holeNumber_key" ON "HoleScore"("roundId", "holeNumber");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_golfCourseId_fkey" FOREIGN KEY ("golfCourseId") REFERENCES "GolfCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HoleScore" ADD CONSTRAINT "HoleScore_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
