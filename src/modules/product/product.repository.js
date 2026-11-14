const prisma = require("../../configs/prisma");

// Primary category (legacy column) plus every linked category/brand.
const categoryInclude = {
  category: { select: { id: true, name: true, slug: true } },
  categories: {
    select: { category: { select: { id: true, name: true, slug: true, type: true } } },
  },
};

class ProductRepository {
  buildWhere({ search, categoryId, isActive }) {
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoryId) {
      where.categories = { some: { categoryId } };
    }

    if (typeof isActive === "boolean") {
      where.isActive = isActive;
    }

    return where;
  }

  async findMany({ search, categoryId, isActive, skip, take, sortBy, sortDir }) {
    const where = this.buildWhere({ search, categoryId, isActive });

    return prisma.product.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortDir },
      include: categoryInclude,
    });
  }

  async count({ search, categoryId, isActive }) {
    const where = this.buildWhere({ search, categoryId, isActive });
    return prisma.product.count({ where });
  }

  async findById(id) {
    return prisma.product.findUnique({
      where: { id },
      include: categoryInclude,
    });
  }

  // Case-insensitive so SKUs saved before upper-casing still count as taken.
  async findBySku(sku) {
    return prisma.product.findFirst({ where: { sku: { equals: sku, mode: "insensitive" } } });
  }

  async findSkusWithPrefix(prefix) {
    const rows = await prisma.product.findMany({
      where: { sku: { startsWith: `${prefix}-`, mode: "insensitive" } },
      select: { sku: true },
    });
    return rows.map((row) => row.sku);
  }

  // categoryIds[0] is stored as the primary category so the legacy column stays valid.
  async create({ categoryIds, ...data }) {
    return prisma.product.create({
      data: {
        ...data,
        categoryId: categoryIds[0],
        categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
      },
      include: categoryInclude,
    });
  }

  async update(id, { categoryIds, ...data }) {
    return prisma.product.update({
      where: { id },
      data: categoryIds
        ? {
            ...data,
            categoryId: categoryIds[0],
            categories: {
              deleteMany: {},
              create: categoryIds.map((categoryId) => ({ categoryId })),
            },
          }
        : data,
      include: categoryInclude,
    });
  }

  async delete(id) {
    return prisma.product.delete({ where: { id } });
  }
}

module.exports = new ProductRepository();
