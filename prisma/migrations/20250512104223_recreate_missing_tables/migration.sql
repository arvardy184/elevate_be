/*
  Warnings:

  - You are about to drop the column `achievementGoal` on the `assessment` table. All the data in the column will be lost.
  - You are about to drop the column `passionArea` on the `assessment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[orderId]` on the table `payment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `currentField` to the `assessment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dreamJob` to the `assessment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `interestedField` to the `assessment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mainGoal` to the `assessment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `assessment` DROP COLUMN `achievementGoal`,
    DROP COLUMN `passionArea`,
    ADD COLUMN `currentField` VARCHAR(191) NOT NULL,
    ADD COLUMN `dreamJob` VARCHAR(191) NOT NULL,
    ADD COLUMN `interestedField` VARCHAR(191) NOT NULL,
    ADD COLUMN `mainGoal` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `coursevideo` ADD COLUMN `s3Key` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `payment` ADD COLUMN `orderId` VARCHAR(191) NULL,
    ADD COLUMN `snapToken` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `bookmarkcourse` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `courseId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BookmarkCourse_userId_courseId_key`(`userId`, `courseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `voucher` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `discount` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,
    `isUsed` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `voucher_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Payment_orderId_key` ON `payment`(`orderId`);

-- AddForeignKey
ALTER TABLE `voucher` ADD CONSTRAINT `voucher_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
