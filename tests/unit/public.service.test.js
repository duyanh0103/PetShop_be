const { test } = require("node:test");
const assert = require("node:assert/strict");

const publicRepository = require("../../src/modules/public/public.repository");
const publicService = require("../../src/modules/public/public.service");
const { NotFoundError } = require("../../src/utils/errors");

const PRODUCT_ROW = {
  id: "prod-1",
  name: "Hạt khô Royal Canin 3kg",
  sku: "DOG-FOOD-001",
  price: { toString: () => "350000" },
  quantity: 0,
  imageUrl: null,
  description: null,
  isActive: true,
  categoryId: "cat-1",
  category: { id: "cat-1", name: "Thức ăn cho chó", slug: "thuc-an-cho-cho" },
  createdAt: new Date(),
  updatedAt: new Date(),
};

test("buildProductWhere requires an active product with at least one active category", () => {
  const where = publicRepository.buildProductWhere({});

  assert.deepEqual(where, {
    isActive: true,
    categories: { some: { category: { isActive: true } } },
  });
});

test("buildProductWhere filters by category slug and name search", () => {
  const where = publicRepository.buildProductWhere({
    search: "royal",
    categorySlug: "thuc-an-cho-cho",
  });

  assert.deepEqual(where.categories, {
    some: { category: { isActive: true, slug: "thuc-an-cho-cho" } },
  });
  assert.deepEqual(where.name, { contains: "royal", mode: "insensitive" });
});

test("listProducts maps the sort option and paginates", async (t) => {
  const findMock = t.mock.method(publicRepository, "findProducts", async () => [PRODUCT_ROW]);
  t.mock.method(publicRepository, "countProducts", async () => 25);

  const result = await publicService.listProducts({
    page: 3,
    limit: 12,
    sort: "price_asc",
  });

  const args = findMock.mock.calls[0].arguments[0];
  assert.equal(args.skip, 24);
  assert.equal(args.take, 12);
  assert.deepEqual(args.orderBy, { price: "asc" });
  assert.deepEqual(result.pagination, { page: 3, limit: 12, total: 25, totalPages: 3 });
});

test("public product response hides admin-only fields and exposes inStock", async (t) => {
  t.mock.method(publicRepository, "findProductById", async () => PRODUCT_ROW);

  const product = await publicService.getProductById("prod-1");

  assert.equal(product.price, 350000);
  assert.equal(product.inStock, false);
  assert.equal(product.isActive, undefined);
  assert.equal(product.createdAt, undefined);
});

test("getProductById throws NotFoundError for hidden or missing products", async (t) => {
  t.mock.method(publicRepository, "findProductById", async () => null);

  await assert.rejects(() => publicService.getProductById("prod-x"), NotFoundError);
});

test("listCategories returns only storefront fields", async (t) => {
  t.mock.method(publicRepository, "findActiveCategories", async () => [
    {
      id: "cat-1",
      name: "Phụ kiện",
      slug: "phu-kien",
      description: null,
      imageUrl: null,
      type: "CATEGORY",
      isActive: true,
      sortOrder: 0,
    },
  ]);

  const [category] = await publicService.listCategories();

  assert.deepEqual(Object.keys(category), ["id", "name", "slug", "description", "imageUrl", "type"]);
});
