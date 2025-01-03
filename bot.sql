-- Tabel untuk pengguna
CREATE TABLE `users` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(255) NOT NULL UNIQUE, // berisi phone number user
  `username` VARCHAR(255) DEFAULT NULL, // berisi username user
  `is_premium` TINYINT(1) DEFAULT 0, 
  `is_banned` TINYINT(1) DEFAULT 0, // di gunakan untuk apakah user di banned atau tidak oleh admin
  `is_blocked` TINYINT(1) DEFAULT 0, // di gunakan untuk user apakah di blockir oleh bot
  `coins` INT(11) DEFAULT 0,
  `experience` INT(11) DEFAULT 0,
  `level` INT(11) DEFAULT 1,
  `ranking` INT(11) DEFAULT NULL,
  `total_messages` INT(11) DEFAULT 0,
  `messages_per_day` INT(11) DEFAULT 0,
  `feature_first_used` VARCHAR(255) DEFAULT 'unknown',
  `feature_last_used` VARCHAR(255) DEFAULT 'unknown',
  `total_feature_usage` INT(11) DEFAULT 0,
  `daily_feature_average` INT(11) DEFAULT 0,
  `blocked_status` TINYINT(1) DEFAULT 0,
  `is_sewa` TINYINT(1) DEFAULT 0,
  `language` VARCHAR(50) DEFAULT 'id',
  `anti_delete_message` TINYINT(1) DEFAULT 0,
  `anti_hidden_tag` TINYINT(1) DEFAULT 0,
  `anti_group_link` TINYINT(1) DEFAULT 0,
  `anti_view_once` TINYINT(1) DEFAULT 0,
  `auto_sticker` TINYINT(1) DEFAULT 0,
  `log_detection` TINYINT(1) DEFAULT 0,
  `auto_level_up` TINYINT(1) DEFAULT 0,
  `mute_bot` TINYINT(1) DEFAULT 0, // di gunakan untuk mengecek apakah bot di mute atau tidak oleh user
  `warnings` INT(11) DEFAULT 0, // di gunakan untuk mengecek apakah user di warn atau tidak oleh bot
  `created_at` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  `updated_at` TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabel untuk grup
CREATE TABLE `groups` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `group_id` VARCHAR(255) NOT NULL UNIQUE,
  `group_name` VARCHAR(255) DEFAULT NULL,
  `owner_id` VARCHAR(255) NOT NULL,
  `total_members` INT(11) DEFAULT 0,
  `created_at` DATETIME NOT NULL,
  `bot_is_admin` TINYINT(1) DEFAULT 0,
  `registration_date` DATETIME DEFAULT current_timestamp(),
  `premium_status` TINYINT(1) DEFAULT 0,
  `sewa_status` TINYINT(1) DEFAULT 0,
  `language` VARCHAR(50) DEFAULT 'id',
  `leaderboard_rank` INT(11) DEFAULT NULL,
  `level` INT(11) DEFAULT 1,
  `total_xp` INT(11) DEFAULT 0,
  `current_xp` INT(11) DEFAULT 0,
  `xp_to_next_level` INT(11) DEFAULT 1000,
  `anti_bot` TINYINT(1) DEFAULT 0,
  `anti_delete_message` TINYINT(1) DEFAULT 0,
  `anti_hidden_tag` TINYINT(1) DEFAULT 0,
  `anti_group_link` TINYINT(1) DEFAULT 0,
  `anti_view_once` TINYINT(1) DEFAULT 0,
  `auto_sticker` TINYINT(1) DEFAULT 0,
  `log_detection` TINYINT(1) DEFAULT 0,  
  `auto_level_up` TINYINT(1) DEFAULT 0,
  `mute_bot` TINYINT(1) DEFAULT 0,
  `anti_country` TINYINT(1) DEFAULT 0,
  `welcome_message` TINYINT(1) DEFAULT 0,
  `goodbye_message` TINYINT(1) DEFAULT 0,
  `warnings` INT(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`owner_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabel untuk log aktivitas pengguna
CREATE TABLE `user_activity_logs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(255) NOT NULL,
  `activity` ENUM('FARM_EXP', 'SPEND_COINS', 'EARN_COINS', 'LEVEL_UP') NOT NULL,
  `value` INT(11) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabel untuk leaderboard
CREATE TABLE `leaderboard` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `group_id` VARCHAR(255) NOT NULL,
  `user_id` VARCHAR(255) NOT NULL,
  `rank` INT(11) NOT NULL,
  `level` INT(11) NOT NULL,
  `total_xp` INT(11) NOT NULL,
  `coins` INT(11) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`group_id`) REFERENCES `groups`(`group_id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabel untuk pengaturan grup
CREATE TABLE `group_settings` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `group_id` VARCHAR(255) NOT NULL,
  `setting_key` VARCHAR(255) NOT NULL,
  `setting_value` TEXT DEFAULT NULL,
  `is_premium_only` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`group_id`) REFERENCES `groups`(`group_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabel untuk pengguna yang dibanned
CREATE TABLE `banned_users` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(255) NOT NULL,
  `reason` TEXT DEFAULT NULL,
  `banned_by` VARCHAR(255) NOT NULL,
  `is_system_block` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
