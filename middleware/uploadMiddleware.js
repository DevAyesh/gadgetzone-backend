const multer = require('multer');
const path = require('path');


const storage = multer.memoryStorage();

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
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
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10, // max 10 images per product
  },
});

const uploadFieldsHandler = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'imageFiles', maxCount: 10 },
]);

const uploadProductImages = (req, res, next) => {
  uploadFieldsHandler(req, res, (err) => {
    if (err) {
      const error = new Error(err.message || 'Image upload failed');
      error.statusCode = 400;
      if (typeof res.status === 'function') {
        res.status(400);
      }
      return next(error);
    }
    // Flatten req.files into an array so downstream controllers receive a uniform file array
    if (req.files) {
      if (Array.isArray(req.files)) {
        // already an array
      } else {
        const allFiles = [
          ...(req.files.images || []),
          ...(req.files.imageFiles || []),
        ];
        req.files = allFiles;
      }
    } else {
      req.files = [];
    }
    next();
  });
};

module.exports = { upload, uploadProductImages };