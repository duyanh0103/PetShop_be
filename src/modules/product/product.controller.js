const productService = require("./product.service");

class ProductController {
  async list(req, res, next) {
    try {
      const result = await productService.list(req.validatedQuery);

      return res.status(200).json({
        message: "Get products successfully",
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const product = await productService.getById(req.params.id);

      return res.status(200).json({
        message: "Get product successfully",
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
        message: "Create product successfully",
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
        message: "Update product successfully",
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
        message: "Delete product successfully",
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new ProductController();
