const authService = require("./auth.service");

class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);

      return res.status(201).json({
        message: "Đăng ký thành công",
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  }

  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);

      return res.status(200).json({
        message: "Đăng nhập thành công",
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getCurrentUser(req, res, next) {
    try {
      const user = await authService.getCurrentUser(req.user.id);

      return res.status(200).json({
        message: "Lấy thông tin người dùng thành công",
        data: user,
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new AuthController();
