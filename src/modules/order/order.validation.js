const { z } = require("zod");

const phoneRegex = /^0\d{9}$/;

const itemsSchema = z
  .array(
    z.object({
      productId: z.string({ error: "Thiếu mã sản phẩm" }).trim().min(1, "Thiếu mã sản phẩm"),
      quantity: z
        .number({ error: "Số lượng không hợp lệ" })
        .int("Số lượng không hợp lệ")
        .min(1, "Số lượng phải từ 1 trở lên")
        .max(999, "Số lượng không được vượt quá 999"),
    }),
    { error: "Giỏ hàng không hợp lệ" }
  )
  .min(1, "Giỏ hàng đang trống")
  .max(50, "Giỏ hàng không được quá 50 sản phẩm");

const quoteSchema = z.object({ items: itemsSchema });

const createOrderSchema = z.object({
  shippingName: z
    .string({ error: "Vui lòng nhập họ tên người nhận" })
    .trim()
    .min(1, "Vui lòng nhập họ tên người nhận")
    .max(100, "Họ tên không được vượt quá 100 ký tự"),
  shippingPhone: z
    .string({ error: "Vui lòng nhập số điện thoại" })
    .trim()
    .regex(phoneRegex, "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0"),
  shippingAddress: z
    .string({ error: "Vui lòng nhập địa chỉ giao hàng" })
    .trim()
    .min(5, "Địa chỉ phải có ít nhất 5 ký tự")
    .max(500, "Địa chỉ không được vượt quá 500 ký tự"),
  note: z
    .string()
    .trim()
    .max(500, "Ghi chú không được vượt quá 500 ký tự")
    .optional()
    .transform((value) => value || undefined),
  items: itemsSchema,
  expectedTotal: z.number({ error: "Thiếu tổng tiền đơn hàng" }).min(0, "Tổng tiền không hợp lệ"),
});

const listOrderSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

const ORDER_STATUSES = ["PENDING", "CONFIRMED", "SHIPPING", "COMPLETED", "CANCELLED"];

const dateFilter = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ")
  .optional();

const listAdminOrderSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  status: z.enum(ORDER_STATUSES, { error: "Trạng thái không hợp lệ" }).optional(),
  from: dateFilter,
  to: dateFilter,
  search: z.string().trim().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES, { error: "Trạng thái không hợp lệ" }),
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
  validateQuote: validate(quoteSchema, "body", "body"),
  validateCreateOrder: validate(createOrderSchema, "body", "body"),
  validateListOrder: validate(listOrderSchema, "query", "validatedQuery"),
  validateListAdminOrder: validate(listAdminOrderSchema, "query", "validatedQuery"),
  validateUpdateOrderStatus: validate(updateStatusSchema, "body", "body"),
};
