import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { randomUUID } from 'node:crypto';

// GET - Fetch API key for customer
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.customer_id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const customerId = decoded.customer_id;

    // Fetch existing API key
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        customer_id: customerId,
      },
    });

    return NextResponse.json({ 
      apiKey: apiKey?.api_key || null,
      customerId: customerId 
    });
  } catch (error) {
    console.error('Error fetching API key:', error);
    return NextResponse.json({ error: 'Failed to fetch API key' }, { status: 500 });
  }
}

// POST - Generate new API key
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.customer_id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const customerId = decoded.customer_id;

    // Generate a new API key.
    // The old format hardcoded a fixed "c4fcc7a0-" first group, so every key
    // ever issued shared a known prefix and only the remaining 14 bytes were
    // random. randomUUID() is a full CSPRNG-backed v4 UUID of the same shape.
    const newApiKey = randomUUID();
    const createdAt = new Date().toISOString();

    // Check if API key already exists
    const existingApiKey = await prisma.apiKey.findFirst({
      where: {
        customer_id: customerId,
      },
    });

    if (existingApiKey) {
      // Update existing API key
      await prisma.apiKey.update({
        where: {
          id: existingApiKey.id,
        },
        data: {
          api_key: newApiKey,
          created_at: createdAt,
        },
      });
    } else {
      // Create new API key
      await prisma.apiKey.create({
        data: {
          customer_id: customerId,
          api_key: newApiKey,
          created_at: createdAt,
        },
      });
    }

    return NextResponse.json({ apiKey: newApiKey });
  } catch (error) {
    console.error('Error generating API key:', error);
    return NextResponse.json({ error: 'Failed to generate API key' }, { status: 500 });
  }
}
