const publicService = require("./public.service");

class PublicController {
  async listCategories(req, res, next) {
    try {
      const categories = await publicService.listCategories();

      return res.status(200).json({
        message: "Lấy danh sách danh mục thành công",
        data: categories,
      });
    } catch (error) {
      return next(error);
    }
  }

  async listProducts(req, res, next) {
    try {
      const result = await publicService.listProducts(req.validatedQuery);

      return res.status(200).json({
        message: "Lấy danh sách sản phẩm thành công",
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getProductById(req, res, next) {
    try {
      const product = await publicService.getProductById(req.params.id);

      return res.status(200).json({
        message: "Lấy thông tin sản phẩm thành công",
        data: product,
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new PublicController();
