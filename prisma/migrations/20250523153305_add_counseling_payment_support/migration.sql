-- AlterTable
ALTER TABLE `counselingsession` ADD COLUMN `isPaymentRequired` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `price` INTEGER NULL;

-- AlterTable
ALTER TABLE `payment` ADD COLUMN `counselingSessionId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Payment_counselingSessionId_fkey` ON `payment`(`counselingSessionId`);

-- AddForeignKey
ALTER TABLE `payment` ADD CONSTRAINT `Payment_counselingSessionId_fkey` FOREIGN KEY (`counselingSessionId`) REFERENCES `counselingsession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
