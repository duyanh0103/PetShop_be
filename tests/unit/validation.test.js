const { test } = require("node:test");
const assert = require("node:assert/strict");

const { validateCreateCategory } = require("../../src/modules/category/category.validation");
const {
  validateCreateProduct,
  validateUpdateProduct,
} = require("../../src/modules/product/product.validation");
const { validateRegister, validateLogin } = require("../../src/modules/auth/auth.validation");

function mockRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
}

test("validateCreateCategory rejects a payload missing 'name'", () => {
  const req = { body: {} };
  const res = mockRes();
  let nextCalled = false;

  validateCreateCategory(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.ok(res.body.errors.name);
});

test("validateCreateCategory accepts a valid payload and normalizes it", () => {
  const req = { body: { name: "  Dog Food  ", sortOrder: "5" } };
  const res = mockRes();
  let nextCalled = false;

  validateCreateCategory(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.body.name, "Dog Food");
  assert.equal(req.body.sortOrder, 5);
});

test("validateCreateProduct rejects an invalid categoryId (not a UUID)", () => {
  const req = {
    body: { name: "Toy", sku: "SKU-1", price: 10, categoryId: "not-a-uuid" },
  };
  const res = mockRes();
  let nextCalled = false;

  validateCreateProduct(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.ok(res.body.errors.categoryId);
});

test("validateCreateProduct accepts a valid payload and coerces price/quantity to numbers", () => {
  const req = {
    body: {
      name: "Toy",
      sku: "SKU-1",
      price: "19.99",
      quantity: "3",
      categoryId: "11111111-1111-4111-8111-111111111111",
    },
  };
  const res = mockRes();
  let nextCalled = false;

  validateCreateProduct(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.body.price, 19.99);
  assert.equal(req.body.quantity, 3);
});

test("validateCreateProduct rejects a negative price", () => {
  const req = {
    body: {
      name: "Toy",
      sku: "SKU-1",
      price: -5,
      categoryId: "11111111-1111-4111-8111-111111111111",
    },
  };
  const res = mockRes();
  let nextCalled = false;

  validateCreateProduct(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
});

test("validateRegister rejects passwords shorter than 6 characters", () => {
  const req = { body: { username: "duyanh", password: "123" } };
  const res = mockRes();
  let nextCalled = false;

  validateRegister(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.ok(res.body.errors.password);
});

test("validateRegister rejects usernames with invalid characters", () => {
  const req = { body: { username: "duy anh!", password: "secret123" } };
  const res = mockRes();
  let nextCalled = false;

  validateRegister(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.ok(res.body.errors.username);
});

test("validateLogin accepts a valid payload", () => {
  const req = { body: { username: "duyanh", password: "secret123" } };
  const res = mockRes();
  let nextCalled = false;

  validateLogin(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test("validateUpdateProduct does not inject defaults for omitted fields", () => {
  const req = { body: { name: "Dog Toy v2" } };
  const res = mockRes();
  let nextCalled = false;

  validateUpdateProduct(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.deepEqual(req.body, { name: "Dog Toy v2" });
});

test("validateCreateProduct defaults quantity to 0 and isActive to true", () => {
  const req = {
    body: {
      name: "Dog Toy",
      sku: "TOY-001",
      price: 10,
      categoryId: "11111111-1111-4111-8111-111111111111",
    },
  };
  const res = mockRes();

  validateCreateProduct(req, res, () => {});

  assert.equal(req.body.quantity, 0);
  assert.equal(req.body.isActive, true);
});
