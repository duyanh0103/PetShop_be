const prisma = require("../../configs/prisma");

const categorySelect = { select: { id: true, name: true, slug: true } };
const productInclude = {
  category: categorySelect,
  categories: {
    where: { category: { isActive: true } },
    select: { category: { select: { id: true, name: true, slug: true, type: true } } },
  },
};

// Visible when at least one linked category is active (and, if filtering, matches the slug).
function visibleCategory(categorySlug) {
  return {
    categories: {
      some: { category: { isActive: true, ...(categorySlug && { slug: categorySlug }) } },
    },
  };
}

class PublicRepository {
  // A product is visible on the storefront only when it is active and at
  // least one of its categories is active.
  buildProductWhere({ search, categorySlug }) {
    const where = { isActive: true, ...visibleCategory(categorySlug) };

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
      include: productInclude,
    });
  }

  async countProducts({ search, categorySlug }) {
    return prisma.product.count({
      where: this.buildProductWhere({ search, categorySlug }),
    });
  }

  async findProductById(id) {
    return prisma.product.findFirst({
      where: { id, isActive: true, ...visibleCategory() },
      include: productInclude,
    });
  }
}

module.exports = new PublicRepository();
