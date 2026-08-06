-- CreateEnum
CREATE TYPE "SpaceType" AS ENUM ('DESK', 'MEETING_ROOM');

-- CreateTable
CREATE TABLE "Space" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SpaceType" NOT NULL,
    "capacity" INTEGER NOT NULL,
    "amenities" JSONB NOT NULL DEFAULT '[]',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Space_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Space_type_idx" ON "Space"("type");

-- CreateIndex
CREATE INDEX "Space_deletedAt_idx" ON "Space"("deletedAt");
