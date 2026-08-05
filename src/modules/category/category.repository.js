const prisma = require("../../configs/prisma");

class CategoryRepository {
  buildWhere({ search, isActive }) {
    const where = {};

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    if (typeof isActive === "boolean") {
      where.isActive = isActive;
    }

    return where;
  }

  async findMany({ search, isActive, skip, take, sortBy, sortDir }) {
    const where = this.buildWhere({ search, isActive });

    return prisma.category.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortDir },
      include: {
        _count: { select: { products: true } },
      },
    });
  }

  async count({ search, isActive }) {
    const where = this.buildWhere({ search, isActive });
    return prisma.category.count({ where });
  }

  async findById(id) {
    return prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
      },
    });
  }

  async findBySlug(slug) {
    return prisma.category.findUnique({ where: { slug } });
  }

  async create(data) {
    return prisma.category.create({ data });
  }

  async update(id, data) {
    return prisma.category.update({ where: { id }, data });
  }

  async delete(id) {
    return prisma.category.delete({ where: { id } });
  }

  async countProducts(id) {
    return prisma.product.count({ where: { categoryId: id } });
  }
}

module.exports = new CategoryRepository();
