const crypto = require("crypto");

const { AppError } = require("../../utils/errors");

const ALLOWED_FORMATS = "jpg,png,webp";
// Cloudinary cannot enforce a size on a signed upload, so the admin screen
// checks it before uploading; this is the limit it is told to use.
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Cloudinary's rule: sort the signed params by name, join as k=v with "&",
// append the API secret, SHA-1 the result.
function signParams(params, apiSecret) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto.createHash("sha1").update(payload + apiSecret).digest("hex");
}

class UploadService {
  /**
   * Signature for one direct browser → Cloudinary image upload. The browser
   * never sees the secret, and the signed folder/formats cannot be changed
   * without invalidating the signature. Cloudinary rejects it after 1 hour.
   */
  createImageSignature(now = new Date()) {
    const {
      CLOUDINARY_CLOUD_NAME: cloudName,
      CLOUDINARY_API_KEY: apiKey,
      CLOUDINARY_API_SECRET: apiSecret,
      CLOUDINARY_FOLDER: folder,
    } = process.env;

    if (!cloudName || !apiKey || !apiSecret || !folder) {
      throw new AppError("Chưa cấu hình dịch vụ lưu ảnh", 503);
    }

    const timestamp = Math.floor(now.getTime() / 1000);
    const params = { allowed_formats: ALLOWED_FORMATS, folder, timestamp };

    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      apiKey,
      timestamp,
      folder,
      allowedFormats: ALLOWED_FORMATS,
      maxFileSize: MAX_FILE_SIZE,
      signature: signParams(params, apiSecret),
    };
  }
}

module.exports = new UploadService();
module.exports.signParams = signParams;
