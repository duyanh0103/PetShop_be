const prisma = require("../../configs/prisma");

const LOW_STOCK_THRESHOLD = 5;
const LOW_STOCK_LIMIT = 10;
const RECENT_ORDER_LIMIT = 5;

const lowStockWhere = { isActive: true, quantity: { lte: LOW_STOCK_THRESHOLD } };

class DashboardRepository {
  // A completed order can no longer change status, so updatedAt is its completion time.
  async sumRevenueSince(since) {
    const result = await prisma.order.aggregate({
      where: { status: "COMPLETED", updatedAt: { gte: since } },
      _sum: { total: true },
    });

    return Number(result._sum.total ?? 0);
  }

  async countOrdersByStatus() {
    return prisma.order.groupBy({ by: ["status"], _count: { _all: true } });
  }

  async countOrdersSince(since) {
    return prisma.order.count({ where: { createdAt: { gte: since } } });
  }

  async countCustomersSince(since) {
    return prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: since } } });
  }

  async findLowStockProducts() {
    return prisma.product.findMany({
      where: lowStockWhere,
      take: LOW_STOCK_LIMIT,
      orderBy: [{ quantity: "asc" }, { name: "asc" }],
      select: { id: true, name: true, sku: true, quantity: true },
    });
  }

  async countLowStockProducts() {
    return prisma.product.count({ where: lowStockWhere });
  }

  async findRecentOrders() {
    return prisma.order.findMany({
      take: RECENT_ORDER_LIMIT,
      orderBy: { createdAt: "desc" },
      select: { id: true, code: true, shippingName: true, status: true, total: true, createdAt: true },
    });
  }
}

module.exports = new DashboardRepository();
