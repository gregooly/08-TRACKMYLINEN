-- Agent login is by PulsePoint manager email (maps to customer_id).
-- Username is a display name and may be duplicated.
-- One local agent per PulsePoint admin.
--
-- If you see "Duplicate key name 'users_customer_id_unique'", the index is already applied.

ALTER TABLE `users` ADD UNIQUE INDEX `users_customer_id_unique` (`customer_id`);
