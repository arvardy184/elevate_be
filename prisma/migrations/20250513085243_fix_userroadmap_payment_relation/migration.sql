/*
  Warnings:

  - You are about to drop the column `filePath` on the `certificate` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[certificateId]` on the table `certificate` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `certificateId` to the `certificate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileUrl` to the `certificate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `s3Key` to the `certificate` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `certificate` DROP COLUMN `filePath`,
    ADD COLUMN `certificateId` VARCHAR(191) NOT NULL,
    ADD COLUMN `fileUrl` VARCHAR(191) NOT NULL,
    ADD COLUMN `s3Key` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `userroadmap` ADD COLUMN `paymentId` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `certificate_certificateId_key` ON `certificate`(`certificateId`);

-- AddForeignKey
ALTER TABLE `userroadmap` ADD CONSTRAINT `UserRoadmap_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
