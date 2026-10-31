const { z } = require("zod");

// Storefront-facing sort options mapped to Prisma orderBy clauses.
const SORT_OPTIONS = {
  newest: { createdAt: "desc" },
  price_asc: { price: "asc" },
  price_desc: { price: "desc" },
  name_asc: { name: "asc" },
};

const listPublicProductSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(48).optional().default(12),
  search: z.string().trim().optional(),
  categorySlug: z.string().trim().min(1).optional(),
  sort: z
    .enum(Object.keys(SORT_OPTIONS), { error: "Kiểu sắp xếp không hợp lệ" })
    .optional()
    .default("newest"),
});

function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ",
        errors: result.error.flatten().fieldErrors,
      });
    }

    // Express 5's req.query is getter-only; see product.validation.js.
    req.validatedQuery = result.data;
    next();
  };
}

module.exports = {
  SORT_OPTIONS,
  validateListPublicProduct: validateQuery(listPublicProductSchema),
};
