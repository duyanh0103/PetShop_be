const categoryRepository = require("./category.repository");
const { slugify } = require("../../utils/slug.util");
const { NotFoundError, ConflictError } = require("../../utils/errors");

class CategoryService {
  /**
   * Generate a unique slug, appending -2, -3, ... on collision.
   * excludeId lets update() skip comparing a category against itself.
   */
  async generateUniqueSlug(base, excludeId = null) {
    const root = slugify(base);
    let candidate = root;
    let suffix = 1;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await categoryRepository.findBySlug(candidate);

      if (!existing || existing.id === excludeId) {
        return candidate;
      }

      suffix += 1;
      candidate = `${root}-${suffix}`;
    }
  }

  async list({ page, limit, search, isActive, type, sortBy, sortDir }) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      categoryRepository.findMany({
        search,
        isActive,
        type,
        skip,
        take: limit,
        sortBy,
        sortDir,
      }),
      categoryRepository.count({ search, isActive, type }),
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
    const category = await categoryRepository.findById(id);

    if (!category) {
      throw new NotFoundError("Không tìm thấy danh mục");
    }

    return this.toResponse(category);
  }

  async create(data) {
    let slug;

    if (data.slug) {
      const existing = await categoryRepository.findBySlug(data.slug);
      if (existing) {
        throw new ConflictError("Slug đã tồn tại");
      }
      slug = data.slug;
    } else {
      slug = await this.generateUniqueSlug(data.name);
    }

    const category = await categoryRepository.create({
      name: data.name,
      slug,
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? null,
      type: data.type ?? "CATEGORY",
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    });

    return this.toResponse(category);
  }

  async update(id, data) {
    const existing = await categoryRepository.findById(id);

    if (!existing) {
      throw new NotFoundError("Không tìm thấy danh mục");
    }

    const payload = { ...data };

    if (data.slug && data.slug !== existing.slug) {
      const slugOwner = await categoryRepository.findBySlug(data.slug);
      if (slugOwner && slugOwner.id !== id) {
        throw new ConflictError("Slug đã tồn tại");
      }
    }
    // Note: slug is only changed when the caller explicitly sends a new one.
    // We deliberately do NOT auto-regenerate the slug when only "name" changes,
    // to avoid silently breaking links/SEO/URLs already built on the old slug.

    const category = await categoryRepository.update(id, payload);
    return this.toResponse(category);
  }

  async remove(id) {
    const existing = await categoryRepository.findById(id);

    if (!existing) {
      throw new NotFoundError("Không tìm thấy danh mục");
    }

    const productCount = await categoryRepository.countProducts(id);

    if (productCount > 0) {
      throw new ConflictError(
        `Không thể xóa danh mục: còn ${productCount} sản phẩm thuộc danh mục này`
      );
    }

    await categoryRepository.delete(id);
    return { id };
  }

  async setActiveStatus(id, isActive) {
    const existing = await categoryRepository.findById(id);

    if (!existing) {
      throw new NotFoundError("Không tìm thấy danh mục");
    }

    const category = await categoryRepository.update(id, { isActive });
    return this.toResponse(category);
  }

  toResponse(category) {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      type: category.type,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      productCount: category._count ? category._count.productLinks : undefined,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}

module.exports = new CategoryService();
