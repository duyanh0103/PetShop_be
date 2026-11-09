const { z } = require("zod");

const listCustomerSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().trim().optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

const updateStatusSchema = z.object({
  isActive: z.boolean({ error: "Vui lòng chọn trạng thái hợp lệ" }),
});

function validate(schema, source, target) {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ",
        errors: result.error.flatten().fieldErrors,
      });
    }

    // Express 5's req.query is getter-only; see product.validation.js.
    req[target] = result.data;
    next();
  };
}

module.exports = {
  validateListCustomer: validate(listCustomerSchema, "query", "validatedQuery"),
  validateUpdateCustomerStatus: validate(updateStatusSchema, "body", "body"),
};
