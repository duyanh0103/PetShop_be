const uploadService = require("./upload.service");

class UploadController {
  createSignature(req, res, next) {
    try {
      return res.status(200).json({
        message: "Tạo chữ ký tải ảnh thành công",
        data: uploadService.createImageSignature(),
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new UploadController();
