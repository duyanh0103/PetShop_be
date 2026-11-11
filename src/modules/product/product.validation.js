const { z } = require("zod");

const productFields = {
  name: z.string().trim().min(1, "Vui lòng nhập tên sản phẩm").max(255),
  // Stored upper-case whatever the client sends, so "st-01" and "ST-01" are one SKU.
  sku: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập SKU")
    .max(100)
    .transform((value) => value.toUpperCase()),
  price: z.coerce.number().nonnegative("Giá phải lớn hơn hoặc bằng 0"),
  quantity: z.coerce.number().int().nonnegative("Số lượng phải lớn hơn hoặc bằng 0"),
  imageUrl: z.string().trim().max(1000).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  isActive: z.boolean(),
  categoryId: z.string().uuid("Danh mục không hợp lệ"),
};

const createProductSchema = z.object({
  ...productFields,
  quantity: productFields.quantity.optional().default(0),
  isActive: productFields.isActive.optional().default(true),
});

// Built from the raw fields instead of createProductSchema.partial(): Zod 4 still
// applies .default() inside .partial(), which would reset quantity/isActive on
// every partial update.
const updateProductSchema = z.object(productFields).partial();

const updateStatusSchema = z.object({
  isActive: z.boolean({ error: "Vui lòng chọn trạng thái hợp lệ" }),
});

const listProductSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  sortBy: z
    .enum(["name", "price", "quantity", "createdAt", "updatedAt"])
    .optional()
    .default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
});

const nextSkuSchema = z.object({
  prefix: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9]{1,10}$/, "Tiền tố SKU chỉ gồm 1–10 chữ hoặc số")),
});

function validate(schema, source) {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ",
        errors: result.error.flatten().fieldErrors,
      });
    }

    // Express 5 exposes req.query as a getter-only accessor, so it cannot be
    // reassigned (silently no-ops in non-strict mode). Store the parsed/coerced
    // query on a separate property instead; req.body remains a plain writable
    // property set by body-parser, so it can be reassigned safely.
    if (source === "query") {
      req.validatedQuery = result.data;
    } else {
      req[source] = result.data;
    }

    next();
  };
}

module.exports = {
  validateCreateProduct: validate(createProductSchema, "body"),
  validateUpdateProduct: validate(updateProductSchema, "body"),
  validateUpdateStatus: validate(updateStatusSchema, "body"),
  validateListProduct: validate(listProductSchema, "query"),
  validateNextSku: validate(nextSkuSchema, "query"),
};
