-- DropForeignKey
ALTER TABLE `voucher` DROP FOREIGN KEY `Voucher_userId_fkey`;

-- AddForeignKey
ALTER TABLE `voucher` ADD CONSTRAINT `voucher_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `voucher` RENAME INDEX `Voucher_code_key` TO `voucher_code_key`;
