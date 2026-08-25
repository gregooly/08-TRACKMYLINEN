-- App device users (Android registration)
CREATE TABLE IF NOT EXISTS `app_user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `machine_number` char(16) NOT NULL,
  `created_at` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_machine_number` (`machine_number`),
  UNIQUE KEY `unique_username_per_customer` (`customer_id`, `username`),
  KEY `idx_app_user_customer_id` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Virtual pack (destroyed after transmit; no location_id; no pack_history)
CREATE TABLE IF NOT EXISTS `pack` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `status_id` int(11) DEFAULT NULL,
  `created_at` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_pack_name_per_customer` (`customer_id`, `name`),
  KEY `idx_pack_customer_id` (`customer_id`),
  KEY `idx_pack_status_id` (`status_id`),
  CONSTRAINT `fk_pack_status`
    FOREIGN KEY (`status_id`) REFERENCES `status` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `pack_item` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) NOT NULL,
  `pack_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `added_at` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_item_in_one_pack` (`item_id`),
  UNIQUE KEY `unique_pack_item` (`pack_id`, `item_id`),
  KEY `idx_pack_item_customer_id` (`customer_id`),
  CONSTRAINT `fk_pack_item_pack`
    FOREIGN KEY (`pack_id`) REFERENCES `pack` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pack_item_item`
    FOREIGN KEY (`item_id`) REFERENCES `item` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
