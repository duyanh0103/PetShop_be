const dashboardService = require("./dashboard.service");

class DashboardController {
  async getSummary(req, res, next) {
    try {
      const summary = await dashboardService.getSummary();

      return res.status(200).json({
        message: "Lấy số liệu tổng quan thành công",
        data: summary,
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new DashboardController();
