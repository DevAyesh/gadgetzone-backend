const multer = require('multer');
const path = require('path');


const storage = multer.memoryStorage();

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const fileFilter = (req, file, cb) => {
  const extValid = allowedExtensions.includes(path.extname(file.originalname).toLowerCase());
  const mimeValid = allowedMimeTypes.includes(file.mimetype);

  if (extValid && mimeValid) {
    return cb(null, true);
  }
  cb(new Error('Only image files (jpg, jpeg, png, webp, gif) are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5, // max 5 images per product
  },
});


const uploadProductImages = (req, res, next) => {
  const handler = upload.array('images', 5);
  handler(req, res, (err) => {
    if (err) {
      const error = new Error(err.message || 'Image upload failed');
      error.statusCode = 400;
      return next(error);
    }
    next();
  });
};

module.exports = { uploadProductImages };