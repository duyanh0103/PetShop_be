const { test } = require("node:test");
const assert = require("node:assert/strict");

const { slugify } = require("../../src/utils/slug.util");

test("slugify converts spaces to hyphens and lowercases", () => {
  assert.equal(slugify("Hello World"), "hello-world");
});

test("slugify strips Vietnamese diacritics", () => {
  assert.equal(slugify("Thức ăn cho Chó"), "thuc-an-cho-cho");
});

test("slugify collapses non-alphanumeric runs and trims leading/trailing hyphens", () => {
  assert.equal(slugify("  --Cat & Dog!!  "), "cat-dog");
});

test("slugify handles the Vietnamese 'đ' which NFD does not decompose", () => {
  assert.equal(slugify("Đồ chơi"), "do-choi");
});
