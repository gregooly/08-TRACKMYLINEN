import { prisma } from '@/lib/prisma';

type CheckInParams = {
  customerId: number;
  itemId: number;
  locationId: number;
  statusId: number;
  dateString?: string;
};

/**
 * Upsert inventory for one item and always append a history row.
 */
export async function checkInItem({
  customerId,
  itemId,
  locationId,
  statusId,
  dateString = new Date().toISOString(),
}: CheckInParams) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { category_id: true, customer_id: true },
  });

  if (!item) {
    throw new Error(`Item ${itemId} not found`);
  }

  if (item.customer_id !== customerId) {
    throw new Error(`Unauthorized access to item ${itemId}`);
  }

  const categoryId = item.category_id;

  const existingInventory = await prisma.inventory.findFirst({
    where: {
      customer_id: customerId,
      item_id: itemId,
    },
  });

  if (existingInventory) {
    const updatedInventory = await prisma.inventory.update({
      where: { id: existingInventory.id },
      data: {
        category_id: categoryId,
        location_id: locationId,
        status_id: statusId,
      },
    });

    await prisma.history.create({
      data: {
        customer_id: customerId,
        category_id: categoryId,
        item_id: itemId,
        location_id: locationId,
        status_id: statusId,
        date: dateString,
      },
    });

    return { inventory: updatedInventory, isUpdate: true };
  }

  const newInventory = await prisma.inventory.create({
    data: {
      customer_id: customerId,
      category_id: categoryId,
      item_id: itemId,
      location_id: locationId,
      status_id: statusId,
    },
  });

  await prisma.history.create({
    data: {
      customer_id: customerId,
      category_id: categoryId,
      item_id: itemId,
      location_id: locationId,
      status_id: statusId,
      date: dateString,
    },
  });

  return { inventory: newInventory, isUpdate: false };
}

/**
 * Change status only; keep each item's current location.
 * If the item has no inventory yet, requires a fallbackLocationId.
 */
export async function checkInItemStatusOnly({
  customerId,
  itemId,
  statusId,
  fallbackLocationId,
  dateString = new Date().toISOString(),
}: {
  customerId: number;
  itemId: number;
  statusId: number;
  fallbackLocationId?: number;
  dateString?: string;
}) {
  const existingInventory = await prisma.inventory.findFirst({
    where: {
      customer_id: customerId,
      item_id: itemId,
    },
  });

  const locationId = existingInventory?.location_id ?? fallbackLocationId;

  if (!locationId) {
    throw new Error(
      `Item ${itemId} has no location. Register or transmit with a location first.`
    );
  }

  return checkInItem({
    customerId,
    itemId,
    locationId,
    statusId,
    dateString,
  });
}
