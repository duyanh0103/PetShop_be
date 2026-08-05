const prisma = require("../../configs/prisma");

class ProductRepository {
  buildWhere({ search, categoryId }) {
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    return where;
  }

  async findMany({ search, categoryId, skip, take, sortBy, sortDir }) {
    const where = this.buildWhere({ search, categoryId });

    return prisma.product.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortDir },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async count({ search, categoryId }) {
    const where = this.buildWhere({ search, categoryId });
    return prisma.product.count({ where });
  }

  async findById(id) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async findBySku(sku) {
    return prisma.product.findUnique({ where: { sku } });
  }

  async create(data) {
    return prisma.product.create({
      data,
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async update(id, data) {
    return prisma.product.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async delete(id) {
    return prisma.product.delete({ where: { id } });
  }
}

module.exports = new ProductRepository();
