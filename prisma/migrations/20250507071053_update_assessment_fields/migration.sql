/*
  Warnings:

  - You are about to drop the column `achievementGoal` on the `assessment` table. All the data in the column will be lost.
  - You are about to drop the column `passionArea` on the `assessment` table. All the data in the column will be lost.
  - Added the required column `currentField` to the `Assessment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dreamJob` to the `Assessment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `interestedField` to the `Assessment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mainGoal` to the `Assessment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `assessment` DROP COLUMN `achievementGoal`,
    DROP COLUMN `passionArea`,
    ADD COLUMN `currentField` VARCHAR(191) NOT NULL,
    ADD COLUMN `dreamJob` VARCHAR(191) NOT NULL,
    ADD COLUMN `interestedField` VARCHAR(191) NOT NULL,
    ADD COLUMN `mainGoal` VARCHAR(191) NOT NULL;
