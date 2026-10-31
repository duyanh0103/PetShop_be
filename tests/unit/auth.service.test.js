require("dotenv").config();

const { test } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const authRepository = require("../../src/modules/auth/auth.repository");
const authService = require("../../src/modules/auth/auth.service");
const {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} = require("../../src/utils/errors");

const REGISTER_PAYLOAD = {
  fullName: "Duy Anh",
  email: "duyanh@example.com",
  username: "duyanh",
  password: "secret123",
};

test("register throws ConflictError when the username is already taken", async (t) => {
  t.mock.method(authRepository, "findByUsername", async () => ({ id: "existing" }));

  await assert.rejects(
    () => authService.register(REGISTER_PAYLOAD),
    ConflictError
  );
});

test("register hashes the password and returns a valid signed token", async (t) => {
  t.mock.method(authRepository, "findByUsername", async () => null);
  t.mock.method(authRepository, "findByEmail", async () => null);
  const hashMock = t.mock.method(bcrypt, "hash", async () => "hashed-password");
  t.mock.method(authRepository, "createUser", async (data) => ({ id: "user-1", ...data }));

  const result = await authService.register(REGISTER_PAYLOAD);

  // bcrypt.hash must be called with the plaintext password, never the raw payload as-is unhashed downstream.
  assert.equal(hashMock.mock.calls[0].arguments[0], "secret123");
  assert.equal(result.user.username, "duyanh");
  assert.equal(result.user.role, "CUSTOMER");
  assert.equal(result.user.email, "duyanh@example.com");
  assert.equal(result.user.password, undefined);

  const decoded = jwt.verify(result.token, process.env.JWT_SECRET);
  assert.equal(decoded.username, "duyanh");
});

test("login throws UnauthorizedError when no user matches the identifier", async (t) => {
  t.mock.method(authRepository, "findByIdentifier", async () => null);

  await assert.rejects(
    () => authService.login({ identifier: "ghost", password: "whatever" }),
    UnauthorizedError
  );
});

test("login throws UnauthorizedError when the password does not match", async (t) => {
  t.mock.method(authRepository, "findByIdentifier", async () => ({
    id: "user-1",
    username: "duyanh",
    password: "hashed",
    role: "CUSTOMER",
  }));
  t.mock.method(bcrypt, "compare", async () => false);

  await assert.rejects(
    () => authService.login({ identifier: "duyanh", password: "wrong" }),
    UnauthorizedError
  );
});

test("login returns a signed token on valid credentials", async (t) => {
  t.mock.method(authRepository, "findByIdentifier", async () => ({
    id: "user-1",
    username: "duyanh",
    password: "hashed",
    role: "ADMIN",
  }));
  t.mock.method(bcrypt, "compare", async () => true);

  const result = await authService.login({ identifier: "duyanh", password: "correct" });

  assert.equal(result.user.role, "ADMIN");
  const decoded = jwt.verify(result.token, process.env.JWT_SECRET);
  assert.equal(decoded.id, "user-1");
});

test("register throws ConflictError when the email is already used", async (t) => {
  t.mock.method(authRepository, "findByUsername", async () => null);
  t.mock.method(authRepository, "findByEmail", async () => ({ id: "existing" }));

  await assert.rejects(
    () => authService.register(REGISTER_PAYLOAD),
    (error) => error instanceof ConflictError && error.message === "Email đã được sử dụng"
  );
});

test("register always creates a CUSTOMER even if the payload asks for another role", async (t) => {
  t.mock.method(authRepository, "findByUsername", async () => null);
  t.mock.method(authRepository, "findByEmail", async () => null);
  t.mock.method(bcrypt, "hash", async () => "hashed-password");
  const createMock = t.mock.method(authRepository, "createUser", async (data) => ({
    id: "user-1",
    ...data,
  }));

  await authService.register({ ...REGISTER_PAYLOAD, role: "SUPER_ADMIN" });

  assert.equal(createMock.mock.calls[0].arguments[0].role, "CUSTOMER");
});

test("login accepts an email as the identifier", async (t) => {
  const findMock = t.mock.method(authRepository, "findByIdentifier", async () => ({
    id: "user-1",
    username: "duyanh",
    email: "duyanh@example.com",
    password: "hashed",
    role: "CUSTOMER",
    isActive: true,
  }));
  t.mock.method(bcrypt, "compare", async () => true);

  const result = await authService.login({ identifier: "duyanh@example.com", password: "ok" });

  assert.equal(findMock.mock.calls[0].arguments[0], "duyanh@example.com");
  assert.equal(result.user.email, "duyanh@example.com");
});

test("login throws ForbiddenError for a locked account with the right password", async (t) => {
  t.mock.method(authRepository, "findByIdentifier", async () => ({
    id: "user-1",
    username: "duyanh",
    password: "hashed",
    role: "CUSTOMER",
    isActive: false,
  }));
  t.mock.method(bcrypt, "compare", async () => true);

  await assert.rejects(
    () => authService.login({ identifier: "duyanh", password: "ok" }),
    (error) => error instanceof ForbiddenError && error.message === "Tài khoản đã bị khoá"
  );
});

test("getCurrentUser throws NotFoundError when the user does not exist", async (t) => {
  t.mock.method(authRepository, "findById", async () => null);

  await assert.rejects(() => authService.getCurrentUser("missing-id"), NotFoundError);
});

test("getCurrentUser returns a public profile without the password hash", async (t) => {
  t.mock.method(authRepository, "findById", async () => ({
    id: "user-1",
    username: "duyanh",
    password: "hashed", // must never leak into the response
    role: "CUSTOMER",
    createdAt: new Date("2026-01-01"),
  }));

  const result = await authService.getCurrentUser("user-1");

  assert.equal(result.username, "duyanh");
  assert.equal(result.password, undefined);
});
