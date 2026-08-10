-- Add unique constraints to prevent duplicate names per customer

-- Add unique constraint for Category (customer_id, name)
ALTER TABLE `category` ADD UNIQUE INDEX `unique_category_per_customer` (`customer_id`, `name`);

-- Add unique constraint for Location (customer_id, name)
ALTER TABLE `location` ADD UNIQUE INDEX `unique_location_per_customer` (`customer_id`, `name`);

-- Add unique constraint for Status (customer_id, status)
ALTER TABLE `status` ADD UNIQUE INDEX `unique_status_per_customer` (`customer_id`, `status`);

-- Add unique constraint for Item (customer_id, tag)
ALTER TABLE `item` ADD UNIQUE INDEX `unique_tag_per_customer` (`customer_id`, `tag`);
