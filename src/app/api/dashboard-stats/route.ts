import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// Limit for at-risk items to prevent memory issues
const AT_RISK_ITEMS_LIMIT = 50;

export async function GET(request: NextRequest) {
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

    // Calculate date 6 months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

    // Fetch all statistics in parallel using efficient count queries
    const [
      totalItems,
      totalCategories,
      totalLocations,
      totalStatuses,
      totalUsers,
      inventoryCount,
      historyCount,
      statusBreakdown,
      categoryBreakdown,
      locationBreakdown,
      recentHistory,
      statuses,
      categories,
      locations
    ] = await Promise.all([
      // Total items
      prisma.item.count({
        where: { customer_id: customerId }
      }),

      // Total categories
      prisma.category.count({
        where: { customer_id: customerId }
      }),

      // Total locations
      prisma.location.count({
        where: { customer_id: customerId }
      }),

      // Total statuses
      prisma.status.count({
        where: { customer_id: customerId }
      }),

      // Total users
      prisma.user.count({
        where: { customer_id: customerId }
      }),

      // Total inventory items
      prisma.inventory.count({
        where: { customer_id: customerId }
      }),

      // Total history records
      prisma.history.count({
        where: { customer_id: customerId }
      }),

      // Inventory breakdown by status
      prisma.inventory.groupBy({
        by: ['status_id'],
        where: { customer_id: customerId },
        _count: true
      }),

      // Inventory breakdown by category
      prisma.inventory.groupBy({
        by: ['category_id'],
        where: { customer_id: customerId },
        _count: true
      }),

      // Inventory breakdown by location
      prisma.inventory.groupBy({
        by: ['location_id'],
        where: { customer_id: customerId },
        _count: true
      }),

      // Recent history (last 5 records)
      prisma.history.findMany({
        where: { customer_id: customerId },
        include: {
          item: true,
          category: true,
          location: true,
          status: true
        },
        orderBy: {
          id: 'desc'
        },
        take: 5
      }),

      // Get status names
      prisma.status.findMany({
        where: { customer_id: customerId }
      }),

      // Get category names
      prisma.category.findMany({
        where: { customer_id: customerId }
      }),

      // Get location names
      prisma.location.findMany({
        where: { customer_id: customerId }
      })
    ]);

    const statusMap = Object.fromEntries(
      statuses.map(s => [s.id, s.status])
    );

    const categoryMap = Object.fromEntries(
      categories.map(c => [c.id, c.name])
    );

    const locationMap = Object.fromEntries(
      locations.map(l => [l.id, l.name])
    );

    // Use raw SQL to efficiently calculate confirmed vs at-risk counts
    // This avoids loading all inventory and history into memory
    const confirmedCountResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT i.id) as count
      FROM inventory i
      INNER JOIN (
        SELECT item_id, MAX(date) as latest_date
        FROM history
        WHERE customer_id = ${customerId}
        GROUP BY item_id
      ) h ON i.item_id = h.item_id
      WHERE i.customer_id = ${customerId}
      AND h.latest_date >= ${sixMonthsAgoStr}
    `;

    const confirmedCount = Number(confirmedCountResult[0]?.count || 0);
    const atRiskCount = inventoryCount - confirmedCount;

    // Format status breakdown
    const statusStats = statusBreakdown.map(item => ({
      name: statusMap[item.status_id] || 'Unknown',
      count: item._count
    }));

    // Format category breakdown
    const categoryStats = categoryBreakdown.map(item => ({
      name: categoryMap[item.category_id] || 'Unknown',
      count: item._count
    }));

    // Format location breakdown
    const locationStats = locationBreakdown.map(item => ({
      name: locationMap[item.location_id] || 'Unknown',
      count: item._count
    }));

    // Format recent history
    const recentActivity = recentHistory.map(h => ({
      id: h.id,
      itemName: h.item.name,
      tag: h.item.tag,
      category: h.category.name,
      location: h.location.name,
      status: h.status.status,
      date: h.date
    }));

    // Get at-risk items efficiently with a LIMIT
    const atRiskItemsResult = await prisma.$queryRaw<Array<{
      id: number;
      item_id: number;
      item_name: string;
      item_tag: string;
      category_name: string;
      location_name: string;
      status_name: string;
      latest_date: string | null;
    }>>`
      SELECT
        i.id,
        i.item_id,
        item.name as item_name,
        item.tag as item_tag,
        cat.name as category_name,
        loc.name as location_name,
        st.status as status_name,
        h.latest_date
      FROM inventory i
      INNER JOIN item ON i.item_id = item.id
      INNER JOIN category cat ON i.category_id = cat.id
      INNER JOIN location loc ON i.location_id = loc.id
      INNER JOIN status st ON i.status_id = st.id
      LEFT JOIN (
        SELECT item_id, MAX(date) as latest_date
        FROM history
        WHERE customer_id = ${customerId}
        GROUP BY item_id
      ) h ON i.item_id = h.item_id
      WHERE i.customer_id = ${customerId}
      AND (h.latest_date IS NULL OR h.latest_date < ${sixMonthsAgoStr})
      ORDER BY i.id DESC
      LIMIT ${AT_RISK_ITEMS_LIMIT}
    `;

    const today = new Date();
    const atRiskItems = atRiskItemsResult.map(inv => {
      let daysSinceLastCheck = 999;

      if (inv.latest_date) {
        const lastCheck = new Date(inv.latest_date);
        daysSinceLastCheck = Math.floor((today.getTime() - lastCheck.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        id: inv.id,
        itemName: inv.item_name,
        tag: inv.item_tag,
        category: inv.category_name,
        location: inv.location_name,
        status: inv.status_name,
        lastCheckDate: inv.latest_date || null,
        daysSinceLastCheck
      };
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalItems,
        totalCategories,
        totalLocations,
        totalStatuses,
        totalUsers,
        inventoryCount,
        historyCount,
        confirmedCount,
        atRiskCount
      },
      breakdown: {
        byStatus: statusStats,
        byCategory: categoryStats,
        byLocation: locationStats,
        byConfirmation: [
          { name: 'Good Condition (< 6 months)', count: confirmedCount },
          { name: 'At Risk (≥ 6 months)', count: atRiskCount }
        ]
      },
      recentActivity,
      atRiskItems
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard statistics' }, { status: 500 });
  }
}
