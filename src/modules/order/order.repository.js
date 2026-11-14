const prisma = require("../../configs/prisma");
const {
  toVietnamDate,
  startOfVietnamDay,
  startOfNextVietnamDay,
} = require("../../utils/vietnamTime");

const adminInclude = {
  items: true,
  user: { select: { id: true, username: true, fullName: true, email: true, phone: true } },
};

class OrderRepository {
  transaction(work) {
    return prisma.$transaction(work, { maxWait: 5000, timeout: 10000 });
  }

  // Same visibility rule as the storefront: the product and at least one of its categories must be active.
  async findSellableProducts(ids) {
    return prisma.product.findMany({
      where: { id: { in: ids }, isActive: true, categories: { some: { category: { isActive: true } } } },
    });
  }

  async findUserById(id) {
    return prisma.user.findUnique({ where: { id } });
  }

  // Conditional update: the row lock makes concurrent buyers wait here, and the
  // re-checked condition is what keeps stock from ever going negative.
  async decrementStock(productId, quantity, db = prisma) {
    const { count } = await db.product.updateMany({
      where: { id: productId, quantity: { gte: quantity } },
      data: { quantity: { decrement: quantity } },
    });

    return count === 1;
  }

  async incrementStock(productId, quantity, db = prisma) {
    return db.product.updateMany({
      where: { id: productId },
      data: { quantity: { increment: quantity } },
    });
  }

  // Atomic, so codes are unique. Deliberately runs outside the order transaction:
  // inside it, this one row would make every order wait for the previous commit.
  // The cost is a skipped number when an order then fails.
  async nextOrderCode(db = prisma, now = new Date()) {
    const date = toVietnamDate(now).replaceAll("-", "");

    const counter = await db.orderCounter.upsert({
      where: { date },
      create: { date, value: 1 },
      update: { value: { increment: 1 } },
    });

    return `PS${date}-${String(counter.value).padStart(4, "0")}`;
  }

  async createOrder({ items, ...data }, db = prisma) {
    return db.order.create({
      data: { ...data, items: { create: items } },
      include: { items: true },
    });
  }

  async findManyByUser({ userId, skip, take }) {
    return prisma.order.findMany({
      where: { userId },
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
  }

  async countByUser(userId) {
    return prisma.order.count({ where: { userId } });
  }

  async findOwnedById(id, userId) {
    return prisma.order.findFirst({
      where: { id, userId },
      include: { items: true },
    });
  }

  // Guarded on the status the caller saw: of two concurrent changes only one
  // applies, so a cancel can never restock the same order twice.
  async transitionStatus(id, from, to, db = prisma) {
    const { count } = await db.order.updateMany({
      where: { id, status: from },
      data: { status: to },
    });

    return count === 1;
  }

  buildAdminWhere({ status, from, to, search }) {
    const where = {};

    if (status) {
      where.status = status;
    }

    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: startOfVietnamDay(from) } : {}),
        ...(to ? { lt: startOfNextVietnamDay(to) } : {}),
      };
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { shippingPhone: { contains: search } },
        { shippingName: { contains: search, mode: "insensitive" } },
      ];
    }

    return where;
  }

  async findManyAdmin({ skip, take, ...filters }) {
    return prisma.order.findMany({
      where: this.buildAdminWhere(filters),
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: adminInclude,
    });
  }

  async countAdmin(filters) {
    return prisma.order.count({ where: this.buildAdminWhere(filters) });
  }

  async findByIdAdmin(id) {
    return prisma.order.findUnique({ where: { id }, include: adminInclude });
  }
}

module.exports = new OrderRepository();
