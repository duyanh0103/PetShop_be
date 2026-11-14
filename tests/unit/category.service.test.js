const { test } = require("node:test");
const assert = require("node:assert/strict");

const categoryRepository = require("../../src/modules/category/category.repository");
const categoryService = require("../../src/modules/category/category.service");
const { NotFoundError, ConflictError } = require("../../src/utils/errors");

test("getById throws NotFoundError when category does not exist", async (t) => {
  t.mock.method(categoryRepository, "findById", async () => null);

  await assert.rejects(() => categoryService.getById("missing-id"), NotFoundError);
});

test("getById returns the mapped category when found", async (t) => {
  t.mock.method(categoryRepository, "findById", async () => ({
    id: "cat-1",
    name: "Dog Food",
    slug: "dog-food",
    description: null,
    imageUrl: null,
    isActive: true,
    sortOrder: 0,
    _count: { productLinks: 3 },
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  }));

  const result = await categoryService.getById("cat-1");

  assert.equal(result.id, "cat-1");
  assert.equal(result.slug, "dog-food");
  assert.equal(result.productCount, 3);
});

test("create throws ConflictError when the explicit slug is already taken", async (t) => {
  t.mock.method(categoryRepository, "findBySlug", async () => ({ id: "other-id" }));

  await assert.rejects(
    () => categoryService.create({ name: "Cat Food", slug: "cat-food" }),
    ConflictError
  );
});

test("create auto-generates a unique slug from the name when none is provided", async (t) => {
  t.mock.method(categoryRepository, "findBySlug", async () => null);
  const createMock = t.mock.method(categoryRepository, "create", async (data) => ({
    id: "new-id",
    ...data,
    _count: { products: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const result = await categoryService.create({ name: "Bird Food" });

  assert.equal(result.slug, "bird-food");
  assert.equal(createMock.mock.calls[0].arguments[0].slug, "bird-food");
});

test("create appends a numeric suffix when the generated slug collides", async (t) => {
  let call = 0;
  t.mock.method(categoryRepository, "findBySlug", async (slug) => {
    call += 1;
    // First lookup ("bird-food") is taken, second ("bird-food-2") is free.
    return call === 1 ? { id: "existing" } : null;
  });
  const createMock = t.mock.method(categoryRepository, "create", async (data) => ({
    id: "new-id",
    ...data,
    _count: { products: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const result = await categoryService.create({ name: "Bird Food" });

  assert.equal(result.slug, "bird-food-2");
  assert.equal(createMock.mock.calls[0].arguments[0].slug, "bird-food-2");
});

test("remove throws ConflictError when the category still has products", async (t) => {
  t.mock.method(categoryRepository, "findById", async () => ({ id: "cat-1" }));
  t.mock.method(categoryRepository, "countProducts", async () => 2);

  await assert.rejects(
    () => categoryService.remove("cat-1"),
    (err) => err instanceof ConflictError && err.message.includes("2 sản phẩm")
  );
});

test("remove deletes the category when no product references it", async (t) => {
  t.mock.method(categoryRepository, "findById", async () => ({ id: "cat-1" }));
  t.mock.method(categoryRepository, "countProducts", async () => 0);
  const deleteMock = t.mock.method(categoryRepository, "delete", async () => ({}));

  const result = await categoryService.remove("cat-1");

  assert.equal(result.id, "cat-1");
  assert.equal(deleteMock.mock.calls.length, 1);
});
