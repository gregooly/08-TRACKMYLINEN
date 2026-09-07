-- Agent login uses PulsePoint manager email + username + password.
-- The same username may exist under different admins.
-- Username must be unique per PulsePoint admin (customer_id).

ALTER TABLE `users` DROP INDEX `users_customer_id_unique`;
ALTER TABLE `users` ADD UNIQUE INDEX `users_customer_id_username_unique` (`customer_id`, `username`);
