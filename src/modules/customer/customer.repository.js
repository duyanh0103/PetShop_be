const prisma = require("../../configs/prisma");

const RECENT_ORDER_LIMIT = 20;

class CustomerRepository {
  // Every query is scoped to CUSTOMER, so admin accounts can never be listed or locked here.
  buildWhere({ search, isActive }) {
    const where = { role: "CUSTOMER" };

    if (typeof isActive === "boolean") {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    return where;
  }

  async findMany({ search, isActive, skip, take }) {
    return prisma.user.findMany({
      where: this.buildWhere({ search, isActive }),
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { orders: true } } },
    });
  }

  async count({ search, isActive }) {
    return prisma.user.count({ where: this.buildWhere({ search, isActive }) });
  }

  async findById(id) {
    return prisma.user.findFirst({
      where: { id, role: "CUSTOMER" },
      include: { _count: { select: { orders: true } } },
    });
  }

  async findRecentOrders(userId) {
    return prisma.order.findMany({
      where: { userId },
      take: RECENT_ORDER_LIMIT,
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
  }

  // Only completed orders count: for COD that is when the shop is actually paid.
  async sumCompletedByUsers(userIds) {
    const rows = await prisma.order.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, status: "COMPLETED" },
      _sum: { total: true },
    });

    return new Map(rows.map((row) => [row.userId, Number(row._sum.total ?? 0)]));
  }

  async setActive(id, isActive) {
    return prisma.user.update({
      where: { id },
      data: { isActive },
      include: { _count: { select: { orders: true } } },
    });
  }
}

module.exports = new CustomerRepository();
