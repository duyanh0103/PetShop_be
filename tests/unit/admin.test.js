const { test } = require("node:test");
const assert = require("node:assert/strict");

const authRepository = require("../../src/modules/auth/auth.repository");
const authMiddleware = require("../../src/middlewares/auth.middleware");
const customerRepository = require("../../src/modules/customer/customer.repository");
const customerService = require("../../src/modules/customer/customer.service");
const dashboardRepository = require("../../src/modules/dashboard/dashboard.repository");
const dashboardService = require("../../src/modules/dashboard/dashboard.service");
const { signToken } = require("../../src/utils/jwt");
const { startOfVietnamMonth } = require("../../src/utils/vietnamTime");
const { NotFoundError } = require("../../src/utils/errors");

const CUSTOMER = {
  id: "user-1",
  username: "khach",
  email: "khach@x.vn",
  fullName: "Khách",
  phone: null,
  password: "hash",
  role: "CUSTOMER",
  isActive: true,
  createdAt: new Date(),
  _count: { orders: 2 },
};

async function runAuth(token) {
  const req = { headers: token ? { authorization: `Bearer ${token}` } : {} };
  const result = { statusCode: null, payload: null, nextArg: "not-called" };
  const res = {
    status(code) {
      result.statusCode = code;
      return this;
    },
    json(data) {
      result.payload = data;
      return this;
    },
  };

  await authMiddleware(req, res, (arg) => {
    result.nextArg = arg;
  });

  return { ...result, req };
}

test("auth rejects a locked account even when its token is still valid", async (t) => {
  t.mock.method(authRepository, "findById", async () => ({ ...CUSTOMER, isActive: false }));

  const { statusCode, payload, nextArg } = await runAuth(signToken({ id: "user-1", role: "CUSTOMER" }));

  assert.equal(statusCode, 401);
  assert.equal(payload.message, "Tài khoản đã bị khoá");
  assert.equal(nextArg, "not-called");
});

test("auth uses the current role from the database, not the one in the token", async (t) => {
  t.mock.method(authRepository, "findById", async () => CUSTOMER);

  const { req, nextArg } = await runAuth(signToken({ id: "user-1", role: "ADMIN" }));

  assert.equal(nextArg, undefined);
  assert.equal(req.user.role, "CUSTOMER");
});

test("auth rejects a token whose user no longer exists", async (t) => {
  t.mock.method(authRepository, "findById", async () => null);

  const { statusCode } = await runAuth(signToken({ id: "gone", role: "CUSTOMER" }));

  assert.equal(statusCode, 401);
});

test("auth passes database failures on as server errors instead of a 401", async (t) => {
  const failure = new Error("db down");
  t.mock.method(authRepository, "findById", async () => {
    throw failure;
  });

  const { statusCode, nextArg } = await runAuth(signToken({ id: "user-1", role: "CUSTOMER" }));

  assert.equal(statusCode, null);
  assert.equal(nextArg, failure);
});

test("auth rejects a bad token without querying the database", async (t) => {
  const find = t.mock.method(authRepository, "findById", async () => CUSTOMER);

  const { statusCode } = await runAuth("not-a-token");

  assert.equal(statusCode, 401);
  assert.equal(find.mock.callCount(), 0);
});

test("customer queries are always scoped to the CUSTOMER role", () => {
  assert.equal(customerRepository.buildWhere({}).role, "CUSTOMER");
  assert.equal(customerRepository.buildWhere({ search: "a", isActive: false }).role, "CUSTOMER");
  assert.equal(customerRepository.buildWhere({ isActive: false }).isActive, false);
});

test("customer responses never contain the password and include spend", async (t) => {
  t.mock.method(customerRepository, "findMany", async () => [CUSTOMER]);
  t.mock.method(customerRepository, "count", async () => 1);
  t.mock.method(customerRepository, "sumCompletedByUsers", async () => new Map([["user-1", 500000]]));

  const { items } = await customerService.list({ page: 1, limit: 10 });

  assert.equal(items[0].password, undefined);
  assert.equal(items[0].role, undefined);
  assert.equal(items[0].totalSpent, 500000);
  assert.equal(items[0].orderCount, 2);
});

test("locking an account that is not a customer returns 404 and changes nothing", async (t) => {
  t.mock.method(customerRepository, "findById", async () => null);
  const setActive = t.mock.method(customerRepository, "setActive", async () => CUSTOMER);

  await assert.rejects(() => customerService.setActiveStatus("admin-1", false), NotFoundError);
  assert.equal(setActive.mock.callCount(), 0);
});

test("dashboard reports zero for statuses with no orders and uses Vietnam day boundaries", async (t) => {
  const revenue = t.mock.method(dashboardRepository, "sumRevenueSince", async () => 100);
  t.mock.method(dashboardRepository, "countOrdersByStatus", async () => [
    { status: "PENDING", _count: { _all: 3 } },
  ]);
  t.mock.method(dashboardRepository, "countOrdersSince", async () => 1);
  t.mock.method(dashboardRepository, "countCustomersSince", async () => 1);
  t.mock.method(dashboardRepository, "findLowStockProducts", async () => []);
  t.mock.method(dashboardRepository, "countLowStockProducts", async () => 0);
  t.mock.method(dashboardRepository, "findRecentOrders", async () => [{ id: "o", total: "230000" }]);

  // 18:00 UTC on Nov 30 is already Dec 1 in Vietnam.
  const summary = await dashboardService.getSummary(new Date("2026-11-30T18:00:00Z"));

  assert.deepEqual(summary.ordersByStatus, {
    PENDING: 3,
    CONFIRMED: 0,
    SHIPPING: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  });
  assert.equal(summary.recentOrders[0].total, 230000);
  assert.equal(revenue.mock.calls[0].arguments[0].toISOString(), "2026-11-30T17:00:00.000Z");
  assert.equal(revenue.mock.calls[1].arguments[0].toISOString(), "2026-11-30T17:00:00.000Z");
  assert.equal(startOfVietnamMonth(new Date("2026-11-30T16:00:00Z")).toISOString(), "2026-10-31T17:00:00.000Z");
});
