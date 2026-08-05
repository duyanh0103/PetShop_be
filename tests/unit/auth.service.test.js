require("dotenv").config();

const { test } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const authRepository = require("../../src/modules/auth/auth.repository");
const authService = require("../../src/modules/auth/auth.service");
const { ConflictError, UnauthorizedError, NotFoundError } = require("../../src/utils/errors");

test("register throws ConflictError when the username is already taken", async (t) => {
  t.mock.method(authRepository, "findByUsername", async () => ({ id: "existing" }));

  await assert.rejects(
    () => authService.register({ username: "duyanh", password: "secret123" }),
    ConflictError
  );
});

test("register hashes the password and returns a valid signed token", async (t) => {
  t.mock.method(authRepository, "findByUsername", async () => null);
  const hashMock = t.mock.method(bcrypt, "hash", async () => "hashed-password");
  t.mock.method(authRepository, "createUser", async (data) => ({
    id: "user-1",
    username: data.username,
    role: data.role,
  }));

  const result = await authService.register({ username: "duyanh", password: "secret123" });

  // bcrypt.hash must be called with the plaintext password, never the raw payload as-is unhashed downstream.
  assert.equal(hashMock.mock.calls[0].arguments[0], "secret123");
  assert.equal(result.user.username, "duyanh");
  assert.equal(result.user.role, "CUSTOMER");

  const decoded = jwt.verify(result.token, process.env.JWT_SECRET);
  assert.equal(decoded.username, "duyanh");
});

test("login throws UnauthorizedError when the username does not exist", async (t) => {
  t.mock.method(authRepository, "findByUsername", async () => null);

  await assert.rejects(
    () => authService.login({ username: "ghost", password: "whatever" }),
    UnauthorizedError
  );
});

test("login throws UnauthorizedError when the password does not match", async (t) => {
  t.mock.method(authRepository, "findByUsername", async () => ({
    id: "user-1",
    username: "duyanh",
    password: "hashed",
    role: "CUSTOMER",
  }));
  t.mock.method(bcrypt, "compare", async () => false);

  await assert.rejects(
    () => authService.login({ username: "duyanh", password: "wrong" }),
    UnauthorizedError
  );
});

test("login returns a signed token on valid credentials", async (t) => {
  t.mock.method(authRepository, "findByUsername", async () => ({
    id: "user-1",
    username: "duyanh",
    password: "hashed",
    role: "ADMIN",
  }));
  t.mock.method(bcrypt, "compare", async () => true);

  const result = await authService.login({ username: "duyanh", password: "correct" });

  assert.equal(result.user.role, "ADMIN");
  const decoded = jwt.verify(result.token, process.env.JWT_SECRET);
  assert.equal(decoded.id, "user-1");
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
