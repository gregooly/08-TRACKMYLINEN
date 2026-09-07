import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// Bound the upload: `file.text()` materialises the whole body as a JS string,
// so an unbounded CSV was a one-request out-of-memory kill for the server.
const MAX_CSV_BYTES = 5 * 1024 * 1024;
const MAX_CSV_ROWS = 20_000;

interface CSVRow {
  category: string;
  item_name: string;
  item_tag: string;
  location: string;
  status: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    
    if (!decoded || !decoded.customer_id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const customerId = decoded.customer_id;

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 });
    }

    if (file.size > MAX_CSV_BYTES) {
      return NextResponse.json(
        { error: `CSV file is too large (max ${MAX_CSV_BYTES / 1024 / 1024}MB)` },
        { status: 413 }
      );
    }

    // Read file content
    const fileContent = await file.text();
    const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line);

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty or contains only headers' }, { status: 400 });
    }

    if (lines.length - 1 > MAX_CSV_ROWS) {
      return NextResponse.json(
        { error: `CSV has too many rows (max ${MAX_CSV_ROWS})` },
        { status: 413 }
      );
    }

    // Parse CSV header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Validate required columns
    const requiredColumns = ['category', 'item_name', 'item_tag', 'location', 'status'];
    const missingColumns = requiredColumns.filter(col => !header.includes(col));
    
    if (missingColumns.length > 0) {
      return NextResponse.json({ 
        error: `Missing required columns: ${missingColumns.join(', ')}` 
      }, { status: 400 });
    }

    // Parse data rows
    const rows: CSVRow[] = [];
    const errors: string[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // Handle CSV parsing with potential commas in quoted fields
      const values = parseCSVLine(line);
      
      if (values.length !== header.length) {
        errors.push(`Row ${i + 1}: Column count mismatch`);
        continue;
      }

      const row: any = {};
      header.forEach((col, index) => {
        row[col] = values[index]?.trim() || '';
      });

      // Validate required fields
      const missingFields = requiredColumns.filter(col => !row[col]);
      if (missingFields.length > 0) {
        errors.push(`Row ${i + 1}: Missing fields - ${missingFields.join(', ')}`);
        continue;
      }

      rows.push({
        category: row.category,
        item_name: row.item_name,
        item_tag: row.item_tag,
        location: row.location,
        status: row.status
      });
    }

    if (rows.length === 0) {
      return NextResponse.json({ 
        error: 'No valid rows found in CSV file',
        summary: {
          totalRows: lines.length - 1,
          successfulImports: 0,
          skippedRows: lines.length - 1,
          errors
        }
      }, { status: 400 });
    }

    // Process imports
    let successfulImports = 0;
    const importErrors: string[] = [...errors];

    // Get current date/time for history
    const now = new Date();
    const dateString = now.toISOString();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        // 1. Get or create category (check by name first to avoid duplicates)
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

        // 2. Get or create location (check by name first to avoid duplicates)
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

        // 3. Get or create status (check by name first to avoid duplicates)
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

        // 4. Get or create/update item (check by tag first)
        let item = await prisma.item.findFirst({
          where: {
            customer_id: customerId,
            tag: row.item_tag
          }
        });

        if (item) {
          // Update existing item
          item = await prisma.item.update({
            where: { id: item.id },
            data: {
              name: row.item_name,
              category_id: category.id
            }
          });
        } else {
          // Create new item
          item = await prisma.item.create({
            data: {
              customer_id: customerId,
              category_id: category.id,
              name: row.item_name,
              tag: row.item_tag
            }
          });
        }

        // 5. Check if inventory record exists for this item
        const existingInventory = await prisma.inventory.findFirst({
          where: {
            customer_id: customerId,
            item_id: item.id
          }
        });

        if (existingInventory) {
          // Update existing inventory
          await prisma.inventory.update({
            where: { id: existingInventory.id },
            data: {
              category_id: category.id,
              location_id: location.id,
              status_id: status.id
            }
          });
        } else {
          // Create new inventory record
          await prisma.inventory.create({
            data: {
              customer_id: customerId,
              category_id: category.id,
              item_id: item.id,
              location_id: location.id,
              status_id: status.id
            }
          });
        }

        // 6. Create history record
        await prisma.history.create({
          data: {
            customer_id: customerId,
            category_id: category.id,
            item_id: item.id,
            location_id: location.id,
            status_id: status.id,
            date: dateString
          }
        });

        successfulImports++;
      } catch (error: any) {
        importErrors.push(`Row ${i + 2} (${row.item_tag}): ${error.message}`);
      }
    }

    const summary = {
      totalRows: lines.length - 1,
      successfulImports,
      skippedRows: (lines.length - 1) - successfulImports,
      errors: importErrors
    };

    if (successfulImports === 0) {
      return NextResponse.json({
        success: false,
        message: 'No records were imported',
        summary
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${successfulImports} out of ${lines.length - 1} records`,
      summary
    });

  } catch (error) {
    console.error('CSV Import error:', error);
    return NextResponse.json({ 
      error: 'Failed to process CSV import',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to parse CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add the last field
  result.push(current);

  return result;
}
