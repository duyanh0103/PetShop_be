const { z } = require("zod");

const createProductSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  sku: z.string().trim().min(1, "SKU is required").max(100),
  price: z.coerce.number().nonnegative("Price must be >= 0"),
  quantity: z.coerce.number().int().nonnegative("Quantity must be >= 0").optional().default(0),
  imageUrl: z.string().trim().max(1000).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  categoryId: z.string().uuid("categoryId must be a valid UUID"),
});

const updateProductSchema = createProductSchema.partial();

const listProductSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  sortBy: z
    .enum(["name", "price", "quantity", "createdAt", "updatedAt"])
    .optional()
    .default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
});

function validate(schema, source) {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
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
  validateListProduct: validate(listProductSchema, "query"),
};
