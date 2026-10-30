const productRepository = require("./product.repository");
const categoryRepository = require("../category/category.repository");
const { NotFoundError, BadRequestError, ConflictError } = require("../../utils/errors");

class ProductService {
  async assertCategoryExists(categoryId) {
    const category = await categoryRepository.findById(categoryId);
    if (!category) {
      throw new BadRequestError("Danh mục không tồn tại");
    }
  }

  async list({ page, limit, search, categoryId, isActive, sortBy, sortDir }) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      productRepository.findMany({
        search,
        categoryId,
        isActive,
        skip,
        take: limit,
        sortBy,
        sortDir,
      }),
      productRepository.count({ search, categoryId, isActive }),
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
      throw new NotFoundError("Không tìm thấy sản phẩm");
    }

    return this.toResponse(product);
  }

  async create(data) {
    await this.assertCategoryExists(data.categoryId);

    const existingSku = await productRepository.findBySku(data.sku);
    if (existingSku) {
      throw new ConflictError("SKU đã tồn tại");
    }

    const product = await productRepository.create({
      name: data.name,
      sku: data.sku,
      price: data.price,
      quantity: data.quantity ?? 0,
      imageUrl: data.imageUrl ?? null,
      description: data.description ?? null,
      isActive: data.isActive ?? true,
      categoryId: data.categoryId,
    });

    return this.toResponse(product);
  }

  async update(id, data) {
    const existing = await productRepository.findById(id);

    if (!existing) {
      throw new NotFoundError("Không tìm thấy sản phẩm");
    }

    if (data.categoryId && data.categoryId !== existing.categoryId) {
      await this.assertCategoryExists(data.categoryId);
    }

    if (data.sku && data.sku !== existing.sku) {
      const skuOwner = await productRepository.findBySku(data.sku);
      if (skuOwner && skuOwner.id !== id) {
        throw new ConflictError("SKU đã tồn tại");
      }
    }

    const product = await productRepository.update(id, data);
    return this.toResponse(product);
  }

  async remove(id) {
    const existing = await productRepository.findById(id);

    if (!existing) {
      throw new NotFoundError("Không tìm thấy sản phẩm");
    }

    await productRepository.delete(id);
    return { id };
  }

  async setActiveStatus(id, isActive) {
    const existing = await productRepository.findById(id);

    if (!existing) {
      throw new NotFoundError("Không tìm thấy sản phẩm");
    }

    const product = await productRepository.update(id, { isActive });
    return this.toResponse(product);
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
      isActive: product.isActive,
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
