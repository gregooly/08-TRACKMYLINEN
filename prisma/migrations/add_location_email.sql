-- Optional email on location (for pack-send notification mail)
ALTER TABLE `location`
  ADD COLUMN `email` varchar(255) DEFAULT NULL AFTER `name`;
