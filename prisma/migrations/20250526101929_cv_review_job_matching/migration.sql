/*
  Warnings:

  - The primary key for the `cvreview` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `cvFilePath` on the `cvreview` table. All the data in the column will be lost.
  - You are about to drop the column `cvVersion` on the `cvreview` table. All the data in the column will be lost.
  - You are about to drop the column `feedback` on the `cvreview` table. All the data in the column will be lost.
  - You are about to drop the column `relevanceScore` on the `cvreview` table. All the data in the column will be lost.
  - You are about to drop the column `reviewResult` on the `cvreview` table. All the data in the column will be lost.
  - Added the required column `aiAnalysis` to the `CVReview` table without a default value. This is not possible if the table is not empty.
  - Added the required column `careerField` to the `CVReview` table without a default value. This is not possible if the table is not empty.
  - Added the required column `consistency` to the `CVReview` table without a default value. This is not possible if the table is not empty.
  - Added the required column `extractedText` to the `CVReview` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileName` to the `CVReview` table without a default value. This is not possible if the table is not empty.
  - Added the required column `filePath` to the `CVReview` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileSize` to the `CVReview` table without a default value. This is not possible if the table is not empty.
  - Added the required column `overallScore` to the `CVReview` table without a default value. This is not possible if the table is not empty.
  - Added the required column `relevancyRate` to the `CVReview` table without a default value. This is not possible if the table is not empty.
  - Added the required column `relevantSkill` to the `CVReview` table without a default value. This is not possible if the table is not empty.
  - Added the required column `suggestions` to the `CVReview` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetedJobRate` to the `CVReview` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `CVReview` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workExperience` to the `CVReview` table without a default value. This is not possible if the table is not empty.
  - Added the required column `writingQuality` to the `CVReview` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `cvreview` DROP PRIMARY KEY,
    DROP COLUMN `cvFilePath`,
    DROP COLUMN `cvVersion`,
    DROP COLUMN `feedback`,
    DROP COLUMN `relevanceScore`,
    DROP COLUMN `reviewResult`,
    ADD COLUMN `aiAnalysis` JSON NOT NULL,
    ADD COLUMN `careerField` VARCHAR(191) NOT NULL,
    ADD COLUMN `consistency` DOUBLE NOT NULL,
    ADD COLUMN `extractedText` TEXT NOT NULL,
    ADD COLUMN `fileName` VARCHAR(191) NOT NULL,
    ADD COLUMN `filePath` VARCHAR(191) NOT NULL,
    ADD COLUMN `fileSize` INTEGER NOT NULL,
    ADD COLUMN `overallScore` DOUBLE NOT NULL,
    ADD COLUMN `relevancyRate` DOUBLE NOT NULL,
    ADD COLUMN `relevantSkill` DOUBLE NOT NULL,
    ADD COLUMN `suggestions` JSON NOT NULL,
    ADD COLUMN `targetedJobRate` DOUBLE NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    ADD COLUMN `workExperience` DOUBLE NOT NULL,
    ADD COLUMN `writingQuality` DOUBLE NOT NULL,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- CreateTable
CREATE TABLE `JobMatching` (
    `id` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `cvReviewId` VARCHAR(191) NULL,
    `dreamJob` VARCHAR(191) NOT NULL,
    `matches` JSON NOT NULL,
    `aiAnalysis` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Job` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `company` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `requirements` JSON NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `salaryRange` VARCHAR(191) NULL,
    `jobType` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `JobMatching` ADD CONSTRAINT `JobMatching_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobMatching` ADD CONSTRAINT `JobMatching_cvReviewId_fkey` FOREIGN KEY (`cvReviewId`) REFERENCES `CVReview`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
