const publicRepository = require("./public.repository");
const { SORT_OPTIONS } = require("./public.validation");
const { NotFoundError } = require("../../utils/errors");

class PublicService {
  async listCategories() {
    const categories = await publicRepository.findActiveCategories();
    return categories.map(this.toCategoryResponse);
  }

  async listProducts({ page, limit, search, categorySlug, sort }) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      publicRepository.findProducts({
        search,
        categorySlug,
        skip,
        take: limit,
        orderBy: SORT_OPTIONS[sort],
      }),
      publicRepository.countProducts({ search, categorySlug }),
    ]);

    return {
      items: items.map(this.toProductResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getProductById(id) {
    const product = await publicRepository.findProductById(id);

    if (!product) {
      throw new NotFoundError("Không tìm thấy sản phẩm");
    }

    return this.toProductResponse(product);
  }

  toCategoryResponse(category) {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      type: category.type,
    };
  }

  // Storefront shape: no admin-only fields (isActive, timestamps).
  toProductResponse(product) {
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: Number(product.price),
      quantity: product.quantity,
      inStock: product.quantity > 0,
      imageUrl: product.imageUrl,
      description: product.description,
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            slug: product.category.slug,
          }
        : null,
      categories: (product.categories ?? []).map((link) => link.category),
    };
  }
}

module.exports = new PublicService();
