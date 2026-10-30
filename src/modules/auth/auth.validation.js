const { z } = require("zod");

const usernameRegex = /^[a-zA-Z0-9_]+$/;

const registerSchema = z.object({
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
  username: z.string().trim().min(1, "Vui lòng nhập tên đăng nhập"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
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
