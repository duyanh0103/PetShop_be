const productRepository = require("./product.repository");
const categoryRepository = require("../category/category.repository");
const { NotFoundError, BadRequestError, ConflictError } = require("../../utils/errors");

class ProductService {
  async assertCategoryExists(categoryId) {
    const category = await categoryRepository.findById(categoryId);
    if (!category) {
      throw new BadRequestError("Category does not exist");
    }
  }

  async list({ page, limit, search, categoryId, sortBy, sortDir }) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      productRepository.findMany({
        search,
        categoryId,
        skip,
        take: limit,
        sortBy,
        sortDir,
      }),
      productRepository.count({ search, categoryId }),
    ]);

    return {
      items: items.map(this.toResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getById(id) {
    const product = await productRepository.findById(id);

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    return this.toResponse(product);
  }

  async create(data) {
    await this.assertCategoryExists(data.categoryId);

    const existingSku = await productRepository.findBySku(data.sku);
    if (existingSku) {
      throw new ConflictError("SKU already exists");
    }

    const product = await productRepository.create({
      name: data.name,
      sku: data.sku,
      price: data.price,
      quantity: data.quantity ?? 0,
      imageUrl: data.imageUrl ?? null,
      description: data.description ?? null,
      categoryId: data.categoryId,
    });

    return this.toResponse(product);
  }

  async update(id, data) {
    const existing = await productRepository.findById(id);

    if (!existing) {
      throw new NotFoundError("Product not found");
    }

    if (data.categoryId && data.categoryId !== existing.categoryId) {
      await this.assertCategoryExists(data.categoryId);
    }

    if (data.sku && data.sku !== existing.sku) {
      const skuOwner = await productRepository.findBySku(data.sku);
      if (skuOwner && skuOwner.id !== id) {
        throw new ConflictError("SKU already exists");
      }
    }

    const product = await productRepository.update(id, data);
    return this.toResponse(product);
  }

  async remove(id) {
    const existing = await productRepository.findById(id);

    if (!existing) {
      throw new NotFoundError("Product not found");
    }

    await productRepository.delete(id);
    return { id };
  }

  toResponse(product) {
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: Number(product.price),
      quantity: product.quantity,
      imageUrl: product.imageUrl,
      description: product.description,
      categoryId: product.categoryId,
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            slug: product.category.slug,
          }
        : undefined,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}

module.exports = new ProductService();
