const customerService = require("./customer.service");

class CustomerController {
  async list(req, res, next) {
    try {
      const result = await customerService.list(req.validatedQuery);

      return res.status(200).json({
        message: "Lấy danh sách khách hàng thành công",
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const customer = await customerService.getById(req.params.id);

      return res.status(200).json({
        message: "Lấy thông tin khách hàng thành công",
        data: customer,
      });
    } catch (error) {
      return next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const customer = await customerService.setActiveStatus(req.params.id, req.body.isActive);

      return res.status(200).json({
        message: "Cập nhật trạng thái khách hàng thành công",
        data: customer,
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new CustomerController();
