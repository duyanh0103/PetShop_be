const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

const uploadService = require("../../src/modules/upload/upload.service");
const { signParams } = require("../../src/modules/upload/upload.service");

const ENV = {
  CLOUDINARY_CLOUD_NAME: "demo",
  CLOUDINARY_API_KEY: "1234",
  CLOUDINARY_API_SECRET: "abcd",
  CLOUDINARY_FOLDER: "cuc-meow/dev",
};

function withEnv(values, fn) {
  const saved = Object.fromEntries(Object.keys(ENV).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("signParams follows Cloudinary's sorted k=v&... + secret SHA-1 rule", () => {
  // Example from Cloudinary's signature docs.
  const signature = signParams({ timestamp: 1315060510, public_id: "sample_image", eager: "w_400,h_300,c_pad|w_260,h_200,c_crop" }, "abcd");
  assert.equal(signature, "bfd09f95f331f558cbd1320e67aa8d488770583e");
});

test("createImageSignature signs folder, formats and timestamp", () => {
  const now = new Date("2026-11-11T00:00:00Z");
  const result = withEnv(ENV, () => uploadService.createImageSignature(now));
  const timestamp = Math.floor(now.getTime() / 1000);
  const expected = crypto
    .createHash("sha1")
    .update(`allowed_formats=jpg,png,webp&folder=cuc-meow/dev&timestamp=${timestamp}abcd`)
    .digest("hex");

  assert.equal(result.signature, expected);
  assert.equal(result.uploadUrl, "https://api.cloudinary.com/v1_1/demo/image/upload");
  assert.equal(result.folder, "cuc-meow/dev");
  assert.equal(result.maxFileSize, 2 * 1024 * 1024);
  assert.equal("apiSecret" in result, false);
  assert.equal(JSON.stringify(result).includes("abcd"), false);
});

test("createImageSignature is a 503 when Cloudinary is not configured", () => {
  assert.throws(
    () => withEnv({ ...ENV, CLOUDINARY_API_SECRET: "" }, () => uploadService.createImageSignature()),
    (error) => error.statusCode === 503
  );
});
