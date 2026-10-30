const { test } = require("node:test");
const assert = require("node:assert/strict");

const productRepository = require("../../src/modules/product/product.repository");
const categoryRepository = require("../../src/modules/category/category.repository");
const productService = require("../../src/modules/product/product.service");
const { NotFoundError, BadRequestError, ConflictError } = require("../../src/utils/errors");

test("create throws BadRequestError when categoryId does not reference an existing category", async (t) => {
  t.mock.method(categoryRepository, "findById", async () => null);

  await assert.rejects(
    () =>
      productService.create({
        name: "Dog Toy",
        sku: "TOY-001",
        price: 10,
        quantity: 5,
        categoryId: "missing-category",
      }),
    BadRequestError
  );
});

test("create throws ConflictError when the SKU is already taken", async (t) => {
  t.mock.method(categoryRepository, "findById", async () => ({ id: "cat-1" }));
  t.mock.method(productRepository, "findBySku", async () => ({ id: "existing-product" }));

  await assert.rejects(
    () =>
      productService.create({
        name: "Dog Toy",
        sku: "TOY-001",
        price: 10,
        quantity: 5,
        categoryId: "cat-1",
      }),
    ConflictError
  );
});

test("create returns the product with price coerced to a Number", async (t) => {
  t.mock.method(categoryRepository, "findById", async () => ({ id: "cat-1" }));
  t.mock.method(productRepository, "findBySku", async () => null);
  t.mock.method(productRepository, "create", async (data) => ({
    id: "prod-1",
    ...data,
    // Mimics Prisma's Decimal, which stringifies rather than being a plain number.
    price: { toString: () => String(data.price) },
    category: { id: "cat-1", name: "Toys", slug: "toys" },
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const result = await productService.create({
    name: "Dog Toy",
    sku: "TOY-001",
    price: 19.99,
    quantity: 5,
    categoryId: "cat-1",
  });

  assert.equal(result.price, 19.99);
  assert.equal(typeof result.price, "number");
  assert.equal(result.category.slug, "toys");
});

test("update throws NotFoundError when the product does not exist", async (t) => {
  t.mock.method(productRepository, "findById", async () => null);

  await assert.rejects(
    () => productService.update("missing-id", { name: "New name" }),
    NotFoundError
  );
});

test("update throws ConflictError when the new SKU belongs to another product", async (t) => {
  t.mock.method(productRepository, "findById", async () => ({
    id: "prod-1",
    sku: "OLD-SKU",
    categoryId: "cat-1",
  }));
  t.mock.method(productRepository, "findBySku", async () => ({ id: "other-product" }));

  await assert.rejects(
    () => productService.update("prod-1", { sku: "TAKEN-SKU" }),
    ConflictError
  );
});

test("remove throws NotFoundError when the product does not exist", async (t) => {
  t.mock.method(productRepository, "findById", async () => null);

  await assert.rejects(() => productService.remove("missing-id"), NotFoundError);
});

test("remove deletes the product when it exists", async (t) => {
  t.mock.method(productRepository, "findById", async () => ({ id: "prod-1", sku: "TOY-001" }));
  const deleteMock = t.mock.method(productRepository, "delete", async () => ({}));

  const result = await productService.remove("prod-1");

  assert.equal(result.id, "prod-1");
  assert.equal(deleteMock.mock.calls.length, 1);
});

test("setActiveStatus throws NotFoundError when the product does not exist", async (t) => {
  t.mock.method(productRepository, "findById", async () => null);

  await assert.rejects(() => productService.setActiveStatus("missing-id", false), NotFoundError);
});

test("setActiveStatus updates only isActive and returns the mapped product", async (t) => {
  t.mock.method(productRepository, "findById", async () => ({ id: "prod-1", isActive: true }));
  const updateMock = t.mock.method(productRepository, "update", async (id, data) => ({
    id,
    name: "Dog Toy",
    sku: "TOY-001",
    price: { toString: () => "19.99" },
    quantity: 5,
    isActive: data.isActive,
    category: { id: "cat-1", name: "Toys", slug: "toys" },
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const result = await productService.setActiveStatus("prod-1", false);

  assert.equal(result.isActive, false);
  assert.deepEqual(updateMock.mock.calls[0].arguments, ["prod-1", { isActive: false }]);
});
