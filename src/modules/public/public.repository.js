const prisma = require("../../configs/prisma");

const categorySelect = { select: { id: true, name: true, slug: true } };

class PublicRepository {
  // A product is visible on the storefront only when both it and its
  // category are active.
  buildProductWhere({ search, categorySlug }) {
    const where = {
      isActive: true,
      category: { isActive: true },
    };

    if (categorySlug) {
      where.category.slug = categorySlug;
    }

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    return where;
  }

  async findActiveCategories() {
    return prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async findProducts({ search, categorySlug, skip, take, orderBy }) {
    return prisma.product.findMany({
      where: this.buildProductWhere({ search, categorySlug }),
      skip,
      take,
      // Tie-break on id so pagination stays stable when sort keys collide.
      orderBy: [orderBy, { id: "asc" }],
      include: { category: categorySelect },
    });
  }

  async countProducts({ search, categorySlug }) {
    return prisma.product.count({
      where: this.buildProductWhere({ search, categorySlug }),
    });
  }

  async findProductById(id) {
    return prisma.product.findFirst({
      where: { id, isActive: true, category: { isActive: true } },
      include: { category: categorySelect },
    });
  }
}

module.exports = new PublicRepository();
