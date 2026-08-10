# CSV Import Feature Implementation

## Overview
A comprehensive CSV import feature has been added to the trackmylinen admin panel, allowing administrators to bulk import inventory data from CSV files.

## Files Created/Modified

### 1. **New Icon** - `public/svg/upload.svg`
- Created upload icon for the Import menu item

### 2. **Sidebar Menu** - `src/app/admin/layout.tsx`
- Added "Import CSV" menu item with upload icon
- Path: `/admin/import`

### 3. **Import Page** - `src/app/admin/import/page.tsx`
- **Features:**
  - Comprehensive CSV format documentation
  - Required columns explanation with examples
  - Drag-and-drop file upload interface
  - Manual file selection
  - Real-time validation
  - Detailed import results with statistics
  - Template CSV download functionality
  
- **User Experience:**
  - Visual drag-and-drop zone
  - File validation (CSV only)
  - Progress indicator during import
  - Success/error notifications
  - Detailed summary of import results
  - Error reporting for failed rows

### 4. **API Endpoint** - `src/app/api/import-csv/route.ts`
- **Authentication:** Uses JWT token from cookies
- **CSV Processing:**
  - Validates CSV format and required columns
  - Handles quoted values and commas in fields
  - Row-by-row error handling
  
- **Smart Import Logic:**
  1. **Auto-creates** categories, locations, and statuses if they don't exist
  2. **Updates** existing items if tag matches
  3. **Creates** new items for new tags
  4. **Updates** inventory records for existing items
  5. **Creates** inventory records for new items
  6. **Always creates** history entries for audit trail

## CSV Format

### Required Columns (in order):
1. **category** - Category name (e.g., "Linen", "Towel")
2. **item_name** - Item name (e.g., "Bed Sheet")
3. **item_tag** - Unique identifier (e.g., "BS-001")
4. **location** - Location name (e.g., "Room 101")
5. **status** - Status name (e.g., "Clean", "In Use")

### Example CSV:
```csv
category,item_name,item_tag,location,status
Linen,Bed Sheet,BS-001,Room 101,Clean
Linen,Pillow Case,PC-001,Room 101,Clean
Towel,Bath Towel,BT-001,Room 102,Clean
```

## Key Features

### 1. **Intelligent Data Handling**
- Creates missing categories, locations, and statuses automatically
- Updates existing items instead of creating duplicates
- Maintains data integrity with proper foreign key relationships

### 2. **Robust Error Handling**
- Validates CSV structure before processing
- Reports specific errors for each row
- Continues processing valid rows even if some fail
- Provides detailed error messages

### 3. **Audit Trail**
- Creates history records for every imported item
- Records timestamp of import
- Maintains full transaction history

### 4. **User-Friendly Interface**
- Clear instructions and examples
- Visual feedback during upload and processing
- Detailed import summary
- Template download for easy start

### 5. **Security**
- JWT authentication required
- Customer ID isolation (users only see their data)
- File type validation
- Input sanitization

## Import Process Flow

1. **Upload CSV File**
   - User selects or drags CSV file
   - File is validated (must be .csv)

2. **Parse and Validate**
   - Check for required columns
   - Validate each row's data
   - Report any format errors

3. **Process Data**
   - For each row:
     - Get or create Category
     - Get or create Location
     - Get or create Status
     - Get or update Item (by tag)
     - Create/update Inventory record
     - Create History entry

4. **Report Results**
   - Total rows processed
   - Successful imports
   - Skipped/failed rows
   - Detailed error list

## Benefits

1. **Time Saving:** Bulk import hundreds of items at once
2. **Data Consistency:** Auto-creates master data (categories, locations, statuses)
3. **Error Tolerance:** Processes valid rows even if some fail
4. **Audit Trail:** Full history of all imports
5. **User Friendly:** Clear documentation and examples
6. **Flexible:** Updates existing items or creates new ones

## Usage Instructions

1. Navigate to **Admin Panel → Import CSV**
2. Review the format requirements and example
3. Click **Download Template** to get started quickly
4. Prepare your CSV file with the required columns
5. Upload via drag-and-drop or file selection
6. Click **Start Import**
7. Review the import summary

## Notes

- Item tags must be unique across your entire inventory
- Empty rows are automatically skipped
- The import process is transactional per row (if one row fails, others still process)
- All timestamps are recorded in ISO format
- Categories, locations, and statuses are case-sensitive

## Testing Recommendations

1. Test with the provided template first
2. Try importing a small dataset before bulk imports
3. Verify all categories, locations, and statuses are created correctly
4. Check inventory and history tables after import
5. Test with duplicate tags to verify update behavior
