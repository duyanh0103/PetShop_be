const { z } = require("zod");

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên danh mục").max(255),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(slugRegex, "Slug chỉ được chứa chữ thường, số, cách nhau bởi dấu gạch ngang")
    .optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  imageUrl: z.string().trim().max(1000).optional().nullable(),
  type: z.enum(["CATEGORY", "BRAND"]).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

const updateCategorySchema = createCategorySchema.partial();

const updateStatusSchema = z.object({
  isActive: z.boolean({ error: "Vui lòng chọn trạng thái hợp lệ" }),
});

const listCategorySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().trim().optional(),
  type: z.enum(["CATEGORY", "BRAND"]).optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  sortBy: z.enum(["name", "sortOrder", "createdAt", "updatedAt"]).optional().default("sortOrder"),
  sortDir: z.enum(["asc", "desc"]).optional().default("asc"),
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
  validateCreateCategory: validate(createCategorySchema, "body"),
  validateUpdateCategory: validate(updateCategorySchema, "body"),
  validateUpdateStatus: validate(updateStatusSchema, "body"),
  validateListCategory: validate(listCategorySchema, "query"),
};
