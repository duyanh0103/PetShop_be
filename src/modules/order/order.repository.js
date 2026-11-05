const prisma = require("../../configs/prisma");

const VIETNAM_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

class OrderRepository {
  transaction(work) {
    return prisma.$transaction(work, { maxWait: 5000, timeout: 10000 });
  }

  // Same visibility rule as the storefront: the product and its category must be active.
  async findSellableProducts(ids) {
    return prisma.product.findMany({
      where: { id: { in: ids }, isActive: true, category: { isActive: true } },
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
    const date = VIETNAM_DATE.format(now).replaceAll("-", "");

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

  // Guarded on PENDING so a concurrent cancel cannot restock the same order twice.
  async markCancelled(id, db = prisma) {
    const { count } = await db.order.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    return count === 1;
  }
}

module.exports = new OrderRepository();
