-- CreateEnum
CREATE TYPE "CommandStatus" AS ENUM ('PENDING', 'CONFIRMED', 'EXPIRED');

-- CreateTable
CREATE TABLE "DeviceCommand" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "lockerNumber" INTEGER NOT NULL,
    "command" TEXT NOT NULL,
    "status" "CommandStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceCommand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeviceCommand_deviceId_status_idx" ON "DeviceCommand"("deviceId", "status");

-- CreateIndex
CREATE INDEX "DeviceCommand_status_expiresAt_idx" ON "DeviceCommand"("status", "expiresAt");
