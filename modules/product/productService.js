const Product = require('../../models/Product');
const supabase = require('../../config/supabaseClient');
const crypto = require('crypto');
const path = require('path');

const BUCKET = process.env.SUPABASE_BUCKET || 'product-images';

class ProductService {
  /**
   * [PUBLIC] Fetch & search products with category filter, keyword search, pagination
   */
  async getAllProducts(queryParams = {}) {
    const { search, category, minPrice, maxPrice, page = 1, limit = 20 } = queryParams;

    const filter = { isRemoved: false };

    if (category) {
      filter.category = category;
    }

    if (search && String(search).trim()) {
      filter.name = new RegExp(String(search).trim(), 'i');
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined && !isNaN(Number(minPrice))) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined && !isNaN(Number(maxPrice))) filter.price.$lte = Number(maxPrice);
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return {
      products,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * [PUBLIC] Fetch single product by ID
   */
  async getProductById(productId) {
    let product;
    try {
      product = await Product.findById(productId);
    } catch (e) {
      product = null; // invalid ObjectId format
    }

    if (!product || product.isRemoved) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }
    return product;
  }

  /**
   * Upload an array of Multer memory files to Supabase Storage, return their public URLs
   */
  async _uploadImagesToSupabase(files) {
    const urls = [];
    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `product-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(filename, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        const err = new Error(`Supabase upload failed: ${error.message}`);
        err.statusCode = 500;
        throw err;
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  /**
   * Delete an image from Supabase Storage given its public URL (best-effort, never throws)
   */
  async _deleteImageFromSupabase(publicUrl) {
    try {
      const filename = publicUrl.split('/').pop();
      await supabase.storage.from(BUCKET).remove([filename]);
    } catch (err) {
      console.warn(`[PRODUCT WARN] FAILED TO DELETE SUPABASE IMAGE ${publicUrl}: ${err.message.toUpperCase()}`);
    }
  }

  /**
   * [ADMIN] Create a new product
   */
  async createProduct(data, uploadedFiles = []) {
    const imageUrls = uploadedFiles.length > 0
      ? await this._uploadImagesToSupabase(uploadedFiles)
      : [];

    const product = await Product.create({
      name: data.name,
      description: data.description,
      price: Number(data.price),
      category: data.category,
      images: imageUrls,
      countInStock: data.countInStock !== undefined ? Number(data.countInStock) : 0,
    });

    return product;
  }

  /**
   * [ADMIN] Update an existing product.
   * - New uploaded files are appended to the images array.
   * - `removeImages` (array of image URL strings) deletes specific existing images.
   */
  async updateProduct(productId, data, uploadedFiles = []) {
    const product = await Product.findById(productId);
    if (!product || product.isRemoved) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    if (data.name !== undefined) product.name = data.name;
    if (data.description !== undefined) product.description = data.description;
    if (data.price !== undefined) product.price = Number(data.price);
    if (data.category !== undefined) product.category = data.category;
    if (data.countInStock !== undefined) product.countInStock = Number(data.countInStock);

    let removeImages = data.removeImages;
    if (removeImages) {
      if (typeof removeImages === 'string') removeImages = [removeImages];
      product.images = product.images.filter((img) => !removeImages.includes(img));
      for (const imgUrl of removeImages) {
        await this._deleteImageFromSupabase(imgUrl);
      }
    }

    if (uploadedFiles.length > 0) {
      const newUrls = await this._uploadImagesToSupabase(uploadedFiles);
      product.images = [...product.images, ...newUrls];
    }

    const updatedProduct = await product.save();
    return updatedProduct;
  }

  /**
   * [ADMIN] Soft delete a product
   */
  async deleteProduct(productId) {
    const product = await Product.findById(productId);
    if (!product || product.isRemoved) {
      const error = new Error('Product not found or already deleted');
      error.statusCode = 404;
      throw error;
    }

    product.isRemoved = true;
    await product.save();
    return product;
  }
}

module.exports = new ProductService();