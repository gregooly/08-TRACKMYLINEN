import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const customerId = decoded.customer_id || decoded.userId;

    if (!customerId) {
      return NextResponse.json(
        { error: 'Invalid token. Please log out and log back in.' },
        { status: 401 }
      );
    }

    const locations = await prisma.location.findMany({
      where: { customer_id: customerId },
      orderBy: { id: 'asc' },
    });

    return NextResponse.json(locations);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const customerId = decoded.customer_id || decoded.userId;

    if (!customerId) {
      return NextResponse.json(
        {
          error:
            'Invalid token: customer_id not found. Please log out and log back in.',
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = normalizeEmail(body.email);

    if (!name) {
      return NextResponse.json({ error: 'Location name is required' }, { status: 400 });
    }

    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const location = await prisma.location.create({
      data: {
        customer_id: customerId,
        name,
        email,
      },
    });

    return NextResponse.json(location);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
  }
}

async function getCustomerIdFromRequest(request: NextRequest): Promise<
  | { ok: true; customerId: number }
  | { ok: false; response: NextResponse }
> {
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid token' }, { status: 401 }),
    };
  }

  const customerId = decoded.customer_id || decoded.userId;
  if (!customerId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid token. Please log out and log back in.' },
        { status: 401 }
      ),
    };
  }

  return { ok: true, customerId };
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getCustomerIdFromRequest(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const id =
      body.id !== undefined && body.id !== null
        ? parseInt(String(body.id), 10)
        : NaN;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = normalizeEmail(body.email);

    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: 'Location name is required' }, { status: 400 });
    }

    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const existing = await prisma.location.findFirst({
      where: { id, customer_id: auth.customerId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const duplicate = await prisma.location.findFirst({
      where: {
        customer_id: auth.customerId,
        name,
        NOT: { id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: 'A location with this name already exists' },
        { status: 409 }
      );
    }

    const location = await prisma.location.update({
      where: { id },
      data: { name, email },
    });

    return NextResponse.json(location);
  } catch (error: unknown) {
    console.error('Error updating location:', error);
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'A location with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const customerId = decoded.customer_id || decoded.userId;

    if (!customerId) {
      return NextResponse.json(
        { error: 'Invalid token. Please log out and log back in.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
    }

    await prisma.location.delete({
      where: {
        id: parseInt(id),
        customer_id: customerId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 });
  }
}
