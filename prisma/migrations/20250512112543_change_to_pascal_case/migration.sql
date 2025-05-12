-- AlterTable
ALTER TABLE `userroadmap` ADD COLUMN `paymentId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `UserRoadmap` ADD CONSTRAINT `UserRoadmap_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
