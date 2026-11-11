const productService = require("./product.service");

class ProductController {
  async list(req, res, next) {
    try {
      const result = await productService.list(req.validatedQuery);

      return res.status(200).json({
        message: "Lấy danh sách sản phẩm thành công",
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      return next(error);
    }
  }

  async nextSku(req, res, next) {
    try {
      const sku = await productService.nextSku(req.validatedQuery.prefix);

      return res.status(200).json({ message: "Gợi ý SKU thành công", data: { sku } });
    } catch (error) {
      return next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const product = await productService.getById(req.params.id);

      return res.status(200).json({
        message: "Lấy thông tin sản phẩm thành công",
        data: product,
      });
    } catch (error) {
      return next(error);
    }
  }

  async create(req, res, next) {
    try {
      const product = await productService.create(req.body);

      return res.status(201).json({
        message: "Tạo sản phẩm thành công",
        data: product,
      });
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const product = await productService.update(req.params.id, req.body);

      return res.status(200).json({
        message: "Cập nhật sản phẩm thành công",
        data: product,
      });
    } catch (error) {
      return next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const product = await productService.setActiveStatus(
        req.params.id,
        req.body.isActive
      );

      return res.status(200).json({
        message: "Cập nhật trạng thái sản phẩm thành công",
        data: product,
      });
    } catch (error) {
      return next(error);
    }
  }

  async remove(req, res, next) {
    try {
      await productService.remove(req.params.id);

      return res.status(200).json({
        message: "Xóa sản phẩm thành công",
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new ProductController();
