const categoryService = require("./category.service");

class CategoryController {
  async list(req, res, next) {
    try {
      const result = await categoryService.list(req.validatedQuery);

      return res.status(200).json({
        message: "Get categories successfully",
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const category = await categoryService.getById(req.params.id);

      return res.status(200).json({
        message: "Get category successfully",
        data: category,
      });
    } catch (error) {
      return next(error);
    }
  }

  async create(req, res, next) {
    try {
      const category = await categoryService.create(req.body);

      return res.status(201).json({
        message: "Create category successfully",
        data: category,
      });
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const category = await categoryService.update(req.params.id, req.body);

      return res.status(200).json({
        message: "Update category successfully",
        data: category,
      });
    } catch (error) {
      return next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const category = await categoryService.setActiveStatus(
        req.params.id,
        req.body.isActive
      );

      return res.status(200).json({
        message: "Update category status successfully",
        data: category,
      });
    } catch (error) {
      return next(error);
    }
  }

  async remove(req, res, next) {
    try {
      await categoryService.remove(req.params.id);

      return res.status(200).json({
        message: "Delete category successfully",
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new CategoryController();
