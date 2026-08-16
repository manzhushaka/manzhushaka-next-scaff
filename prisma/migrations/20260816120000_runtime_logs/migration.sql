-- CreateTable
CREATE TABLE `RuntimeLog` (
    `id` VARCHAR(30) NOT NULL,
    `level` ENUM('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL') NOT NULL,
    `service` VARCHAR(32) NOT NULL,
    `message` TEXT NOT NULL,
    `contextJson` JSON NULL,
    `stack` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RuntimeLog_createdAt_id_idx`(`createdAt`, `id`),
    INDEX `RuntimeLog_service_createdAt_idx`(`service`, `createdAt`),
    INDEX `RuntimeLog_level_createdAt_idx`(`level`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
