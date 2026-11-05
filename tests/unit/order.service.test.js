const { test } = require("node:test");
const assert = require("node:assert/strict");

const orderRepository = require("../../src/modules/order/order.repository");
const orderService = require("../../src/modules/order/order.service");
const {
  validateCreateOrder,
  validateQuote,
} = require("../../src/modules/order/order.validation");
const { errorHandler } = require("../../src/middlewares/error.middleware");
const { ConflictError, ForbiddenError, NotFoundError } = require("../../src/utils/errors");

const product = (overrides = {}) => ({
  id: "prod-1",
  name: "Hạt khô Royal Canin 3kg",
  sku: "DOG-FOOD-001",
  price: "100000",
  quantity: 10,
  imageUrl: null,
  ...overrides,
});

const CHECKOUT = {
  shippingName: "Nguyễn Văn A",
  shippingPhone: "0901234567",
  shippingAddress: "1 Lê Lợi, Quận 1",
};

function mockTransaction(t, { products, user = { id: "user-1", isActive: true }, decrement = true }) {
  t.mock.method(orderRepository, "transaction", (work) => work("tx"));
  t.mock.method(orderRepository, "findUserById", async () => user);
  t.mock.method(orderRepository, "findSellableProducts", async () => products);
  t.mock.method(orderRepository, "nextOrderCode", async () => "PS20261104-0001");

  return {
    decrementStock: t.mock.method(orderRepository, "decrementStock", async () => decrement),
    createOrder: t.mock.method(orderRepository, "createOrder", async ({ items, ...data }) => ({
      id: "order-1",
      status: "PENDING",
      paymentMethod: "COD",
      note: null,
      ...data,
      items: items.map((item, index) => ({ id: `item-${index}`, ...item })),
    })),
  };
}

function runValidator(validator, body) {
  const req = { body };
  let statusCode;
  let payload;
  let passed = false;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    },
  };

  validator(req, res, () => {
    passed = true;
  });

  return { passed, statusCode, payload, req };
}

test("quote charges flat shipping below the threshold", async (t) => {
  t.mock.method(orderRepository, "findSellableProducts", async () => [product()]);

  const quote = await orderService.quote([{ productId: "prod-1", quantity: 2 }]);

  assert.equal(quote.subtotal, 200000);
  assert.equal(quote.shippingFee, 30000);
  assert.equal(quote.total, 230000);
  assert.equal(quote.canCheckout, true);
});

test("quote ships free exactly at the threshold", async (t) => {
  t.mock.method(orderRepository, "findSellableProducts", async () => [product()]);

  const quote = await orderService.quote([{ productId: "prod-1", quantity: 5 }]);

  assert.equal(quote.subtotal, 500000);
  assert.equal(quote.shippingFee, 0);
  assert.equal(quote.total, 500000);
});

test("quote reads shipping settings from the environment", async (t) => {
  process.env.SHIPPING_FEE = "15000";
  process.env.FREE_SHIPPING_THRESHOLD = "150000";
  t.after(() => {
    delete process.env.SHIPPING_FEE;
    delete process.env.FREE_SHIPPING_THRESHOLD;
  });
  t.mock.method(orderRepository, "findSellableProducts", async () => [product()]);

  const quote = await orderService.quote([{ productId: "prod-1", quantity: 1 }]);

  assert.equal(quote.shippingFee, 15000);
  assert.equal(quote.freeShippingThreshold, 150000);
});

test("quote merges duplicate lines before checking stock", async (t) => {
  t.mock.method(orderRepository, "findSellableProducts", async () => [product({ quantity: 3 })]);

  const quote = await orderService.quote([
    { productId: "prod-1", quantity: 2 },
    { productId: "prod-1", quantity: 2 },
  ]);

  assert.equal(quote.items.length, 1);
  assert.equal(quote.items[0].quantity, 4);
  assert.equal(quote.items[0].status, "INSUFFICIENT");
  assert.equal(quote.canCheckout, false);
});

test("quote flags hidden and sold-out products, excludes them from the total", async (t) => {
  t.mock.method(orderRepository, "findSellableProducts", async () => [
    product({ id: "sold-out", quantity: 0 }),
  ]);

  const quote = await orderService.quote([
    { productId: "hidden", quantity: 1 },
    { productId: "sold-out", quantity: 1 },
  ]);

  assert.deepEqual(quote.items.map((item) => item.status), ["UNAVAILABLE", "UNAVAILABLE"]);
  assert.equal(quote.total, 0);
  assert.equal(quote.shippingFee, 0);
  assert.equal(quote.canCheckout, false);
});

test("create prices the order from the database and snapshots the product", async (t) => {
  const mocks = mockTransaction(t, { products: [product()] });

  const order = await orderService.create("user-1", {
    ...CHECKOUT,
    items: [{ productId: "prod-1", quantity: 2 }],
    expectedTotal: 230000,
  });

  assert.equal(order.code, "PS20261104-0001");
  assert.equal(order.total, 230000);
  assert.equal(order.items[0].productName, "Hạt khô Royal Canin 3kg");
  assert.equal(order.items[0].unitPrice, 100000);
  assert.deepEqual(mocks.decrementStock.mock.calls[0].arguments, ["prod-1", 2, "tx"]);
  assert.equal(mocks.createOrder.mock.calls[0].arguments[1], "tx");
});

test("create rejects when the price changed from what the customer saw", async (t) => {
  const mocks = mockTransaction(t, { products: [product({ price: "120000" })] });

  await assert.rejects(
    () =>
      orderService.create("user-1", {
        ...CHECKOUT,
        items: [{ productId: "prod-1", quantity: 1 }],
        expectedTotal: 130000,
      }),
    ConflictError
  );
  assert.equal(mocks.decrementStock.mock.callCount(), 0);
  assert.equal(mocks.createOrder.mock.callCount(), 0);
});

test("create rejects when stock is short at read time", async (t) => {
  const mocks = mockTransaction(t, { products: [product({ quantity: 1 })] });

  await assert.rejects(
    () =>
      orderService.create("user-1", {
        ...CHECKOUT,
        items: [{ productId: "prod-1", quantity: 2 }],
        expectedTotal: 230000,
      }),
    /không đủ hàng: Hạt khô Royal Canin 3kg/
  );
  assert.equal(mocks.createOrder.mock.callCount(), 0);
});

test("create aborts the transaction when another buyer takes the last stock", async (t) => {
  mockTransaction(t, { products: [product({ quantity: 1 })], decrement: false });

  await assert.rejects(
    () =>
      orderService.create("user-1", {
        ...CHECKOUT,
        items: [{ productId: "prod-1", quantity: 1 }],
        expectedTotal: 130000,
      }),
    /không đủ hàng/
  );
});

test("create runs the stock decrement last and generates the code outside the transaction", async (t) => {
  const steps = [];
  t.mock.method(orderRepository, "findUserById", async () => ({ id: "user-1", isActive: true }));
  t.mock.method(orderRepository, "findSellableProducts", async () => [product()]);
  t.mock.method(orderRepository, "nextOrderCode", async () => {
    steps.push("code");
    return "PS20261105-0001";
  });
  t.mock.method(orderRepository, "transaction", (work) => {
    steps.push("begin");
    return work("tx");
  });
  t.mock.method(orderRepository, "createOrder", async ({ items, ...data }) => {
    steps.push("order");
    return { id: "order-1", ...data, items };
  });
  t.mock.method(orderRepository, "decrementStock", async () => {
    steps.push("stock");
    return true;
  });

  await orderService.create("user-1", {
    ...CHECKOUT,
    items: [{ productId: "prod-1", quantity: 1 }],
    expectedTotal: 130000,
  });

  assert.deepEqual(steps, ["code", "begin", "order", "stock"]);
});

test("a timed-out transaction returns a retryable 503, not a 500", () => {
  let statusCode;
  let payload;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    },
  };

  errorHandler({ code: "P2028" }, {}, res, () => {});

  assert.equal(statusCode, 503);
  assert.equal(payload.message, "Hệ thống đang bận, vui lòng thử lại");
});

test("create decrements products in id order so concurrent orders cannot deadlock", async (t) => {
  const mocks = mockTransaction(t, {
    products: [product({ id: "a" }), product({ id: "b" })],
  });

  await orderService.create("user-1", {
    ...CHECKOUT,
    items: [
      { productId: "b", quantity: 1 },
      { productId: "a", quantity: 1 },
    ],
    expectedTotal: 230000,
  });

  assert.deepEqual(
    mocks.decrementStock.mock.calls.map((call) => call.arguments[0]),
    ["a", "b"]
  );
});

test("create rejects a locked account", async (t) => {
  mockTransaction(t, { products: [product()], user: { id: "user-1", isActive: false } });

  await assert.rejects(
    () =>
      orderService.create("user-1", {
        ...CHECKOUT,
        items: [{ productId: "prod-1", quantity: 1 }],
        expectedTotal: 130000,
      }),
    ForbiddenError
  );
});

test("nextOrderCode uses the Vietnam date and pads the counter", async () => {
  const db = {
    orderCounter: {
      upsert: async ({ where }) => ({ date: where.date, value: 7 }),
    },
  };

  // 18:00 UTC on Nov 4 is already Nov 5 in Vietnam.
  const code = await orderRepository.nextOrderCode(db, new Date("2026-11-04T18:00:00Z"));

  assert.equal(code, "PS20261105-0007");
});

test("getMine hides another customer's order behind a 404", async (t) => {
  const find = t.mock.method(orderRepository, "findOwnedById", async () => null);

  await assert.rejects(() => orderService.getMine("user-2", "order-1"), NotFoundError);
  assert.deepEqual(find.mock.calls[0].arguments, ["order-1", "user-2"]);
});

test("cancelMine restocks every item that still has a product", async (t) => {
  t.mock.method(orderRepository, "transaction", (work) => work("tx"));
  t.mock.method(orderRepository, "findOwnedById", async () => ({
    id: "order-1",
    status: "PENDING",
    items: [
      { productId: "prod-1", quantity: 2, unitPrice: 1, lineTotal: 2 },
      { productId: null, quantity: 5, unitPrice: 1, lineTotal: 5 },
    ],
  }));
  t.mock.method(orderRepository, "markCancelled", async () => true);
  const restock = t.mock.method(orderRepository, "incrementStock", async () => ({ count: 1 }));

  const order = await orderService.cancelMine("user-1", "order-1");

  assert.equal(order.status, "CANCELLED");
  assert.equal(restock.mock.callCount(), 1);
  assert.deepEqual(restock.mock.calls[0].arguments, ["prod-1", 2, "tx"]);
});

test("cancelMine rejects an order past PENDING and does not restock", async (t) => {
  t.mock.method(orderRepository, "transaction", (work) => work("tx"));
  t.mock.method(orderRepository, "findOwnedById", async () => ({
    id: "order-1",
    status: "SHIPPING",
    items: [{ productId: "prod-1", quantity: 2 }],
  }));
  t.mock.method(orderRepository, "markCancelled", async () => false);
  const restock = t.mock.method(orderRepository, "incrementStock", async () => ({ count: 1 }));

  await assert.rejects(() => orderService.cancelMine("user-1", "order-1"), ConflictError);
  assert.equal(restock.mock.callCount(), 0);
});

test("validation rejects a non-positive quantity and an empty cart", () => {
  const zero = runValidator(validateQuote, { items: [{ productId: "p", quantity: 0 }] });
  const empty = runValidator(validateQuote, { items: [] });

  assert.equal(zero.statusCode, 400);
  assert.equal(empty.statusCode, 400);
  assert.equal(empty.payload.errors.items[0], "Giỏ hàng đang trống");
});

test("validation strips client-sent prices and status from the order body", () => {
  const { passed, req } = runValidator(validateCreateOrder, {
    ...CHECKOUT,
    items: [{ productId: "p", quantity: 1, unitPrice: 1 }],
    expectedTotal: 1,
    status: "COMPLETED",
    total: 1,
    userId: "someone-else",
  });

  assert.equal(passed, true);
  assert.equal(req.body.status, undefined);
  assert.equal(req.body.total, undefined);
  assert.equal(req.body.userId, undefined);
  assert.equal(req.body.items[0].unitPrice, undefined);
});

test("validation rejects a bad phone number with a Vietnamese message", () => {
  const { statusCode, payload } = runValidator(validateCreateOrder, {
    ...CHECKOUT,
    shippingPhone: "12345",
    items: [{ productId: "p", quantity: 1 }],
    expectedTotal: 1,
  });

  assert.equal(statusCode, 400);
  assert.equal(payload.errors.shippingPhone[0], "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0");
});
