const orderService = require("./order.service");

class OrderController {
  async quote(req, res, next) {
    try {
      const quote = await orderService.quote(req.body.items);

      return res.status(200).json({
        message: "Tính tiền giỏ hàng thành công",
        data: quote,
      });
    } catch (error) {
      return next(error);
    }
  }

  async create(req, res, next) {
    try {
      const order = await orderService.create(req.user.id, req.body);

      return res.status(201).json({
        message: "Đặt hàng thành công",
        data: order,
      });
    } catch (error) {
      return next(error);
    }
  }

  async listMine(req, res, next) {
    try {
      const result = await orderService.listMine(req.user.id, req.validatedQuery);

      return res.status(200).json({
        message: "Lấy danh sách đơn hàng thành công",
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getMine(req, res, next) {
    try {
      const order = await orderService.getMine(req.user.id, req.params.id);

      return res.status(200).json({
        message: "Lấy thông tin đơn hàng thành công",
        data: order,
      });
    } catch (error) {
      return next(error);
    }
  }

  async cancelMine(req, res, next) {
    try {
      const order = await orderService.cancelMine(req.user.id, req.params.id);

      return res.status(200).json({
        message: "Huỷ đơn hàng thành công",
        data: order,
      });
    } catch (error) {
      return next(error);
    }
  }

  async listAdmin(req, res, next) {
    try {
      const result = await orderService.listAdmin(req.validatedQuery);

      return res.status(200).json({
        message: "Lấy danh sách đơn hàng thành công",
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getAdmin(req, res, next) {
    try {
      const order = await orderService.getAdmin(req.params.id);

      return res.status(200).json({
        message: "Lấy thông tin đơn hàng thành công",
        data: order,
      });
    } catch (error) {
      return next(error);
    }
  }

  async updateStatusAdmin(req, res, next) {
    try {
      const order = await orderService.updateStatusAdmin(req.params.id, req.body.status);

      return res.status(200).json({
        message: "Cập nhật trạng thái đơn hàng thành công",
        data: order,
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new OrderController();
