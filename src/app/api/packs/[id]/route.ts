import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenant } from '@/lib/tenantAuth';
import { checkInItemStatusOnly } from '@/lib/checkInItem';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/packs/:id
 * PATCH /api/packs/:id — { name?, status_id? } status cascades to all items
 * DELETE /api/packs/:id — destroy pack (items remain)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await resolveTenant(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const packId = parseInt(id, 10);
    if (Number.isNaN(packId)) {
      return NextResponse.json({ error: 'Invalid pack id' }, { status: 400 });
    }

    const pack = await prisma.pack.findFirst({
      where: { id: packId, customer_id: auth.customerId },
      include: {
        status: { select: { id: true, status: true } },
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                tag: true,
                category_id: true,
              },
            },
          },
        },
      },
    });

    if (!pack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }

    return NextResponse.json(pack);
  } catch (error) {
    console.error('Error fetching pack:', error);
    return NextResponse.json({ error: 'Failed to fetch pack' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await resolveTenant(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const packId = parseInt(id, 10);
    if (Number.isNaN(packId)) {
      return NextResponse.json({ error: 'Invalid pack id' }, { status: 400 });
    }

    const pack = await prisma.pack.findFirst({
      where: { id: packId, customer_id: auth.customerId },
      include: { items: true },
    });

    if (!pack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }

    const body = await request.json();
    const data: { name?: string; status_id?: number | null } = {};

    if (typeof body.name === 'string' && body.name.trim()) {
      data.name = body.name.trim();
    }

    let statusChanged = false;
    let newStatusId: number | null = null;

    if (body.status_id !== undefined) {
      if (body.status_id === null) {
        data.status_id = null;
        statusChanged = true;
        newStatusId = null;
      } else {
        newStatusId = parseInt(body.status_id, 10);
        if (Number.isNaN(newStatusId)) {
          return NextResponse.json({ error: 'Invalid status_id' }, { status: 400 });
        }
        const status = await prisma.status.findFirst({
          where: { id: newStatusId, customer_id: auth.customerId },
        });
        if (!status) {
          return NextResponse.json({ error: 'Invalid status_id' }, { status: 400 });
        }
        data.status_id = newStatusId;
        statusChanged = true;
      }
    }

    const updated = await prisma.pack.update({
      where: { id: packId },
      data,
      include: {
        status: { select: { id: true, status: true } },
        items: {
          include: {
            item: { select: { id: true, name: true, tag: true } },
          },
        },
      },
    });

    // Cascade status to all items in the pack
    if (statusChanged && newStatusId !== null && pack.items.length > 0) {
      const now = new Date().toISOString();
      for (const packItem of pack.items) {
        await checkInItemStatusOnly({
          customerId: auth.customerId,
          itemId: packItem.item_id,
          statusId: newStatusId,
          dateString: now,
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('Error updating pack:', error);
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'A pack with this name already exists' },
        { status: 409 }
      );
    }
    const message =
      error instanceof Error ? error.message : 'Failed to update pack';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await resolveTenant(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const packId = parseInt(id, 10);
    if (Number.isNaN(packId)) {
      return NextResponse.json({ error: 'Invalid pack id' }, { status: 400 });
    }

    const pack = await prisma.pack.findFirst({
      where: { id: packId, customer_id: auth.customerId },
    });

    if (!pack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }

    await prisma.pack.delete({ where: { id: packId } });

    return NextResponse.json({ message: 'Pack deleted successfully' });
  } catch (error) {
    console.error('Error deleting pack:', error);
    return NextResponse.json({ error: 'Failed to delete pack' }, { status: 500 });
  }
}
