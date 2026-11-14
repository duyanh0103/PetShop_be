const prisma = require("../../configs/prisma");

class CategoryRepository {
  buildWhere({ search, isActive, type }) {
    const where = {};

    if (type) {
      where.type = type;
    }

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    if (typeof isActive === "boolean") {
      where.isActive = isActive;
    }

    return where;
  }

  async findMany({ search, isActive, type, skip, take, sortBy, sortDir }) {
    const where = this.buildWhere({ search, isActive, type });

    return prisma.category.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortDir },
      include: {
        _count: { select: { productLinks: true } },
      },
    });
  }

  async count({ search, isActive, type }) {
    const where = this.buildWhere({ search, isActive, type });
    return prisma.category.count({ where });
  }

  async findById(id) {
    return prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { productLinks: true } },
      },
    });
  }

  async findManyByIds(ids) {
    return prisma.category.findMany({ where: { id: { in: ids } }, select: { id: true } });
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
    return prisma.productCategory.count({ where: { categoryId: id } });
  }
}

module.exports = new CategoryRepository();
