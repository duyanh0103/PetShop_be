const { z } = require("zod");

const usernameRegex = /^[a-zA-Z0-9_]+$/;

const phoneRegex = /^0\d{9}$/;

const registerSchema = z.object({
  fullName: z
    .string({ error: "Vui lòng nhập họ tên" })
    .trim()
    .min(1, "Vui lòng nhập họ tên")
    .max(100, "Họ tên không được vượt quá 100 ký tự"),
  email: z
    .string({ error: "Vui lòng nhập email" })
    .trim()
    .toLowerCase()
    .pipe(z.email("Email không hợp lệ").max(255, "Email không được vượt quá 255 ký tự")),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  username: z
    .string()
    .trim()
    .min(3, "Tên đăng nhập phải có ít nhất 3 ký tự")
    .max(50, "Tên đăng nhập không được vượt quá 50 ký tự")
    .regex(usernameRegex, "Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới"),
  password: z
    .string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .max(100, "Mật khẩu không được vượt quá 100 ký tự"),
});

const loginSchema = z.object({
  identifier: z
    .string({ error: "Vui lòng nhập email hoặc tên đăng nhập" })
    .trim()
    .min(1, "Vui lòng nhập email hoặc tên đăng nhập"),
  password: z.string({ error: "Vui lòng nhập mật khẩu" }).min(1, "Vui lòng nhập mật khẩu"),
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

    req[source] = result.data;
    next();
  };
}

module.exports = {
  validateRegister: validate(registerSchema, "body"),
  validateLogin: validate(loginSchema, "body"),
};
