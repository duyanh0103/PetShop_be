const authService = require("./auth.service");

class AuthController {
  async register(req, res) {
    try {
      const result = await authService.register(req.body);

      return res.status(201).json({
        message: "Register successfully",
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        message: error.message,
      });
    }
  }

  async login(req, res) {
    try {
      const result = await authService.login(req.body);

      return res.status(200).json({
        message: "Login successfully",
        data: result,
      });
    } catch (error) {
      return res.status(401).json({
        message: error.message,
      });
    }
  }
  async getCurrentUser(req, res) {
    try {
      const user = await authService.getCurrentUser(req.user.id);

      return res.status(200).json({
        message: "Get current user successfully",
        data: user,
      });
    } catch (error) {
      return res.status(404).json({
        message: error.message,
      });
    }
  }
}

module.exports = new AuthController();
