const { z } = require("zod");

const usernameRegex = /^[a-zA-Z0-9_]+$/;

const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters")
    .regex(usernameRegex, "Username can only contain letters, numbers and underscores"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be at most 100 characters"),
});

const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
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

    req[source] = result.data;
    next();
  };
}

module.exports = {
  validateRegister: validate(registerSchema, "body"),
  validateLogin: validate(loginSchema, "body"),
};
