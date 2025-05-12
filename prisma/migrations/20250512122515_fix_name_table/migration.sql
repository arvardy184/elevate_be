-- DropForeignKey
ALTER TABLE `userroadmap` DROP FOREIGN KEY `userroadmap_paymentId_fkey`;

-- AddForeignKey
ALTER TABLE `userroadmap` ADD CONSTRAINT `userroadmap_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
