# Duplicate Prevention Implementation

## Overview
Implemented comprehensive duplicate prevention for locations, categories, and statuses throughout the application, including both manual entry and CSV imports.

## Changes Made

### 1. **Database Schema** - `prisma/schema.prisma`
Added unique constraints to prevent duplicates at the database level:

```prisma
model Category {
  // ...
  @@unique([customer_id, name], name: "unique_category_per_customer")
}

model Location {
  // ...
  @@unique([customer_id, name], name: "unique_location_per_customer")
}

model Status {
  // ...
  @@unique([customer_id, status], name: "unique_status_per_customer")
}

model Item {
  // ...
  @@unique([customer_id, tag], name: "unique_tag_per_customer")
}
```

**Benefits:**
- Enforces uniqueness at the database level
- Prevents race conditions
- Ensures data integrity across all entry points

### 2. **Settings Page** - `src/app/admin/settings/page.tsx`
Added client-side duplicate checking before API calls:

#### Location Addition:
```typescript
const handleAddLocation = async () => {
  if (locationInput.trim()) {
    // Check for duplicates (case-insensitive)
    const exists = locations.some(
      loc => loc.name.toLowerCase() === locationInput.trim().toLowerCase()
    );
    
    if (exists) {
      notification.warning('Duplicate Location', 'This location already exists.');
      return;
    }
    // ... proceed with API call
  }
};
```

#### Category Addition:
```typescript
const handleAddCategory = async () => {
  if (categoryInput.trim()) {
    // Check for duplicates (case-insensitive)
    const exists = categories.some(
      cat => cat.name.toLowerCase() === categoryInput.trim().toLowerCase()
    );
    
    if (exists) {
      notification.warning('Duplicate Category', 'This category already exists.');
      return;
    }
    // ... proceed with API call
  }
};
```

#### Status Addition:
```typescript
const handleAddStatus = async () => {
  if (statusInput.trim()) {
    // Check for duplicates (case-insensitive)
    const exists = statuses.some(
      stat => stat.status.toLowerCase() === statusInput.trim().toLowerCase()
    );
    
    if (exists) {
      notification.warning('Duplicate Status', 'This status already exists.');
      return;
    }
    // ... proceed with API call
  }
};
```

**User Experience:**
- Immediate feedback with toast notification
- Case-insensitive comparison
- No unnecessary API calls for duplicates

### 3. **CSV Import API** - `src/app/api/import-csv/route.ts`
Updated to reuse existing IDs instead of creating duplicates:

```typescript
// 1. Get or create category (reuse if exists)
let category = await prisma.category.findFirst({
  where: {
    customer_id: customerId,
    name: row.category
  }
});

if (!category) {
  category = await prisma.category.create({
    data: {
      customer_id: customerId,
      name: row.category
    }
  });
}

// 2. Get or create location (reuse if exists)
let location = await prisma.location.findFirst({
  where: {
    customer_id: customerId,
    name: row.location
  }
});

if (!location) {
  location = await prisma.location.create({
    data: {
      customer_id: customerId,
      name: row.location
    }
  });
}

// 3. Get or create status (reuse if exists)
let status = await prisma.status.findFirst({
  where: {
    customer_id: customerId,
    status: row.status
  }
});

if (!status) {
  status = await prisma.status.create({
    data: {
      customer_id: customerId,
      status: row.status
    }
  });
}
```

**Import Behavior:**
- Always checks for existing records first
- Reuses existing IDs when names match
- Only creates new records when needed
- Maintains referential integrity

### 4. **Database Migration** - `prisma/migrations/add_unique_constraints.sql`
SQL script to add unique constraints to existing database:

```sql
-- Add unique constraint for Category
ALTER TABLE `category` ADD UNIQUE INDEX `unique_category_per_customer` (`customer_id`, `name`);

-- Add unique constraint for Location  
ALTER TABLE `location` ADD UNIQUE INDEX `unique_location_per_customer` (`customer_id`, `name`);

-- Add unique constraint for Status
ALTER TABLE `status` ADD UNIQUE INDEX `unique_status_per_customer` (`customer_id`, `status`);

-- Add unique constraint for Item
ALTER TABLE `item` ADD UNIQUE INDEX `unique_tag_per_customer` (`customer_id`, `tag`);
```

## How It Works

### Manual Entry (Settings Page)
1. User types a name (e.g., "Room 101")
2. Clicks "ADD" button
3. **Frontend checks** if name already exists (case-insensitive)
4. If duplicate: Shows warning toast, prevents API call
5. If unique: Proceeds with API call
6. **Database enforces** uniqueness constraint
7. Success notification displayed

### CSV Import
1. User uploads CSV file
2. For each row:
   - **Check Category**: Query database for existing category by name
   - If found: Use existing ID
   - If not found: Create new category
   - **Check Location**: Query database for existing location by name
   - If found: Use existing ID
   - If not found: Create new location
   - **Check Status**: Query database for existing status by name
   - If found: Use existing ID
   - If not found: Create new status
   - **Check Item**: Query database for existing item by tag
   - If found: Update existing item
   - If not found: Create new item
3. Create/update inventory record using retrieved IDs
4. Create history entry

### Example CSV Import Scenario

**CSV Content:**
```csv
category,item_name,item_tag,location,status
Linen,Bed Sheet,BS-001,Room 101,Clean
Towel,Bath Towel,BT-001,Room 101,In Use
```

**Database Before Import:**
- Location "Room 101" already exists (ID: 5)
- Category "Linen" exists (ID: 2)
- Category "Towel" doesn't exist
- Status "Clean" exists (ID: 1)
- Status "In Use" exists (ID: 3)

**Import Process:**
Row 1:
- Category "Linen" → Found existing (ID: 2) ✓
- Location "Room 101" → Found existing (ID: 5) ✓
- Status "Clean" → Found existing (ID: 1) ✓
- Item "BS-001" → Create new
- Result: Uses existing IDs, no duplicates created

Row 2:
- Category "Towel" → Not found, create new (ID: 10)
- Location "Room 101" → Found existing (ID: 5) ✓
- Status "In Use" → Found existing (ID: 3) ✓
- Item "BT-001" → Create new
- Result: Only creates new category, reuses location and status

## Benefits

### 1. Data Integrity
- No duplicate entries in master data tables
- Consistent references across all tables
- Database-level enforcement prevents bugs

### 2. Performance
- Reduced database size (no duplicates)
- Faster queries (fewer rows to scan)
- Better indexing efficiency

### 3. User Experience
- Clear feedback when duplicates attempted
- Consistent behavior across manual and import entry
- No confusing multiple entries with same name

### 4. Import Efficiency
- CSV imports don't create unnecessary duplicates
- Existing master data is reused
- Only new items are created

## Testing

### Manual Entry Test:
1. Go to Settings page
2. Try adding "Room 101" location
3. Try adding "Room 101" again
4. **Expected:** Warning toast appears, no duplicate created

### CSV Import Test:
1. Create CSV with existing location names
2. Import CSV file
3. Check database
4. **Expected:** Existing locations reused, no duplicates created

### Database Integrity Test:
1. Try creating duplicate via direct SQL
2. **Expected:** Database rejects with unique constraint error

## Migration Steps

To apply these changes to an existing database:

1. **Backup Database:**
   ```bash
   mysqldump -u username -p database_name > backup.sql
   ```

2. **Run Migration:**
   ```bash
   mysql -u username -p database_name < prisma/migrations/add_unique_constraints.sql
   ```

3. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   ```

4. **Test Application:**
   - Try adding duplicates in Settings
   - Test CSV import with existing names
   - Verify toast notifications appear

## Error Handling

### Frontend Errors:
- Duplicate detection: Warning toast
- Network errors: Error toast with retry option

### Backend Errors:
- Unique constraint violation: Caught and reported in import summary
- Connection errors: Returns 500 with error message

### Import Errors:
- Row-level errors don't stop import
- Successful rows still imported
- Detailed error summary returned

## Notes

- Case-insensitive comparison in frontend checks
- Database constraints are case-sensitive (MySQL default)
- All checks scoped by `customer_id` (multi-tenant isolation)
- Item tags remain unique per customer
- Import continues processing valid rows even if some fail

## Future Enhancements

1. **Bulk Edit:** Allow renaming locations/categories with duplicate check
2. **Merge Tool:** Merge duplicate master data if they exist
3. **Import Preview:** Show which items will be created vs reused before import
4. **Audit Log:** Track when duplicates were attempted
5. **Case-Insensitive DB:** Consider using case-insensitive collation in MySQL
