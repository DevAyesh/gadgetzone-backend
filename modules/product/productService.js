const Product = require('../../models/Product');
const Category = require('../../models/Category');
const supabase = require('../../config/supabaseClient');
const crypto = require('crypto');
const path = require('path');

const BUCKET = process.env.SUPABASE_BUCKET || 'product-images';

class ProductService {
  /**
   * Resolve category input (ObjectId, UUID, slug, or name) to official category display name
   */
  async _resolveCategoryName(categoryInput) {
    if (!categoryInput || typeof categoryInput !== 'string') return 'General';
    const trimmed = categoryInput.trim();
    if (!trimmed || trimmed === 'none') return 'General';

    try {
      let cat = null;
      // 1. If 24-hex ObjectId
      if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
        cat = await Category.findById(trimmed);
      }
      // 2. If UUID or custom ID
      if (!cat) {
        cat = await Category.findOne({ id: trimmed, isRemoved: false });
      }
      // 3. If matching by slug
      if (!cat) {
        cat = await Category.findOne({ slug: trimmed.toLowerCase(), isRemoved: false });
      }
      // 4. If matching by case-insensitive name
      if (!cat) {
        cat = await Category.findOne({ name: new RegExp(`^${trimmed}$`, 'i'), isRemoved: false });
      }

      if (cat && cat.name) {
        return cat.name;
      }
    } catch {
      // Fallback to trimmed input if Category collection query fails
    }

    return trimmed;
  }

  /**
   * Helper to normalize a single product's category field if it contains an ID
   */
  async _normalizeProductCategory(product) {
    if (!product || !product.category) return product;
    if (/^[0-9a-fA-F]{24}$/.test(product.category) || /^[0-9a-f-]{36}$/.test(product.category)) {
      const resolved = await this._resolveCategoryName(product.category);
      if (resolved && resolved !== product.category) {
        product.category = resolved;
      }
    }
    return product;
  }

  /**
   * [PUBLIC] Fetch & search products with category filter, keyword search, pagination
   */
  async getAllProducts(queryParams = {}) {
    const { search, category, minPrice, maxPrice, page = 1, limit = 20 } = queryParams;

    const filter = { isRemoved: false };

    if (category && String(category).trim() && String(category).trim() !== 'all') {
      const cleanCat = String(category).trim();
      const resolvedCat = await this._resolveCategoryName(cleanCat);
      filter.$or = [
        { category: cleanCat },
        { category: resolvedCat },
        { category: new RegExp(`^${resolvedCat}$`, 'i') },
      ];
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

    // Resolve any raw ObjectId category to human name
    try {
      const allCategories = await Category.find({}).lean();
      const catMap = new Map();
      allCategories.forEach((c) => {
        if (c._id) catMap.set(c._id.toString(), c.name);
        if (c.id) catMap.set(String(c.id), c.name);
      });
      products.forEach((p) => {
        if (p.category && catMap.has(p.category)) {
          p.category = catMap.get(p.category);
        }
      });
    } catch {
      // best-effort
    }

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
    } catch {
      product = null; // invalid ObjectId format
    }

    if (!product || product.isRemoved) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }
    await this._normalizeProductCategory(product);
    return product;
  }

  /**
   * [PUBLIC] Fetch single product by Slug or ID
   */
  async getProductBySlug(slug) {
    if (!slug) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    const cleanSlug = String(slug).toLowerCase().trim();

    // 1. Direct match on stored slug field
    let product = await Product.findOne({
      slug: cleanSlug,
      isRemoved: false,
    });

    // 2. If not found, attempt flexible regex match on product name
    if (!product) {
      const words = cleanSlug.split('-').filter(Boolean);
      if (words.length > 0) {
        const escapeRegex = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const pattern = '^' + words.map(escapeRegex).join('[^a-z0-9]+') + '$';
        product = await Product.findOne({
          name: new RegExp(pattern, 'i'),
          isRemoved: false,
        });
      }
    }

    // 3. Fallback: try by MongoDB ObjectId if slug matches 24 hex chars
    if (!product && /^[0-9a-fA-F]{24}$/.test(cleanSlug)) {
      try {
        product = await Product.findById(cleanSlug);
      } catch {
        product = null;
      }
    }

    // 4. Fallback: in-memory slug comparison over active products
    if (!product) {
      const allActive = await Product.find({ isRemoved: false });
      for (const p of allActive) {
        const candidateSlug = p.slug || (p.name ? p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '');
        if (candidateSlug === cleanSlug) {
          product = p;
          if (!p.slug) {
            p.slug = candidateSlug;
            await p.save().catch(() => {});
          }
          break;
        }
      }
    }

    if (!product || product.isRemoved) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }
    await this._normalizeProductCategory(product);
    return product;
  }

  /**
   * Check and verify Supabase storage bucket existence
   */
  async _ensureBucketExists() {
    if (this._bucketVerified) return;
    try {
      if (supabase && supabase.storage && typeof supabase.storage.getBucket === 'function') {
        const { data: bucket, error } = await supabase.storage.getBucket(BUCKET);
        if (error || !bucket) {
          if (typeof supabase.storage.createBucket === 'function') {
            const { error: createError } = await supabase.storage.createBucket(BUCKET, { public: true });
            if (!createError) {
              console.log(`[SUPABASE SERVICE] Bucket '${BUCKET}' verified/created for product images`);
              this._bucketVerified = true;
            }
          }
        } else {
          this._bucketVerified = true;
        }
      }
    } catch (err) {
      console.warn(`[SUPABASE WARN] Bucket verification note: ${err.message}`);
    }
  }

  /**
   * Upload an array of Multer memory files to Supabase Storage, return their public URLs
   */
  async _uploadImagesToSupabase(files) {
    if (!files || files.length === 0) return [];
    await this._ensureBucketExists();

    const urls = [];
    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const filename = `product-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

      let uploadSuccess = false;
      try {
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(filename, file.buffer, {
            contentType: file.mimetype || 'image/jpeg',
            upsert: false,
          });

        if (error) {
          console.warn(`[SUPABASE STORAGE WARN] Upload to bucket '${BUCKET}' failed (${error.message}). Falling back to inline image encoding.`);
        } else {
          const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
          const publicUrl = data?.publicUrl || (data && data.publicURL) || (typeof data === 'string' ? data : '');
          if (publicUrl) {
            urls.push(publicUrl);
            uploadSuccess = true;
          }
        }
      } catch (uploadErr) {
        console.warn(`[SUPABASE STORAGE EXCEPTION] ${uploadErr.message}. Falling back to inline image.`);
      }

      // If Supabase upload fails (e.g. publishable key RLS policy restriction),
      // fallback to inline data URI so product creation/update NEVER fails
      if (!uploadSuccess && file.buffer) {
        const mime = file.mimetype || 'image/jpeg';
        const base64 = file.buffer.toString('base64');
        urls.push(`data:${mime};base64,${base64}`);
      }
    }
    return urls;
  }

  /**
   * Normalize and extract external image URLs from input data
   */
  _extractImageUrls(data) {
    if (!data) return [];
    const urls = [];

    const addVal = (val) => {
      if (!val) return;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed) return;
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              parsed.forEach(addVal);
              return;
            }
          } catch {
            // Not a JSON array, treat as regular string
          }
        }
        if (trimmed.includes(',') && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
          trimmed.split(',').forEach(addVal);
          return;
        }
        urls.push(trimmed);
      } else if (Array.isArray(val)) {
        val.forEach(addVal);
      }
    };

    if (data.images !== undefined) {
      addVal(data.images);
    }
    if (data.image_url) {
      addVal(data.image_url);
    }
    if (data.imageUrl) {
      addVal(data.imageUrl);
    }

    return Array.from(new Set(urls.filter((u) => typeof u === 'string' && u.trim().length > 0)));
  }

  /**
   * Delete an image from Supabase Storage given its public URL (best-effort, never throws)
   */
  async _deleteImageFromSupabase(publicUrl) {
    try {
      if (!publicUrl || typeof publicUrl !== 'string') return;
      // Skip deletion if the image is an external URL (e.g. Unsplash, external CDN)
      if (!publicUrl.includes(BUCKET) && !publicUrl.includes('supabase.co')) {
        return;
      }
      const filename = publicUrl.split('/').pop();
      if (filename && supabase?.storage?.from) {
        await supabase.storage.from(BUCKET).remove([filename]);
      }
    } catch (err) {
      console.warn(`[PRODUCT WARN] FAILED TO DELETE SUPABASE IMAGE ${publicUrl}: ${err.message.toUpperCase()}`);
    }
  }

  /**
   * [ADMIN] Create a new product
   * Supports both device uploaded files and external image URLs seamlessly.
   */
  async createProduct(data, uploadedFiles = []) {
    const files = Array.isArray(uploadedFiles)
      ? uploadedFiles
      : uploadedFiles && typeof uploadedFiles === 'object'
        ? [...(uploadedFiles.images || []), ...(uploadedFiles.imageFiles || [])]
        : [];

    const uploadedUrls = files.length > 0
      ? await this._uploadImagesToSupabase(files)
      : [];

    const providedUrls = this._extractImageUrls(data);

    // Merge both external image URLs and newly uploaded file URLs seamlessly
    const allImages = Array.from(new Set([...providedUrls, ...uploadedUrls]));

    const slug = data.slug || (data.name
      ? data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      : '');

    const resolvedCategory = await this._resolveCategoryName(data.category);

    const product = await Product.create({
      name: data.name,
      slug,
      description: data.description || '',
      price: Number(data.price),
      category: resolvedCategory,
      images: allImages,
      countInStock: data.countInStock !== undefined ? Number(data.countInStock) : (data.stock !== undefined ? Number(data.stock) : 0),
    });

    return product;
  }

  /**
   * [ADMIN] Update an existing product.
   * - New uploaded files are saved to Supabase and appended.
   * - Provided external URLs are merged or replaced depending on data.images.
   * - `removeImages` (array of image URL strings) deletes specific existing images.
   */
  async updateProduct(productId, data, uploadedFiles = []) {
    const product = await Product.findById(productId);
    if (!product || product.isRemoved) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    if (data.name !== undefined) {
      product.name = data.name;
      product.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (data.description !== undefined) product.description = data.description;
    if (data.price !== undefined) product.price = Number(data.price);
    if (data.category !== undefined) {
      product.category = await this._resolveCategoryName(data.category);
    }
    if (data.countInStock !== undefined) product.countInStock = Number(data.countInStock);
    else if (data.stock !== undefined) product.countInStock = Number(data.stock);

    let removeImages = data.removeImages;
    if (removeImages) {
      if (typeof removeImages === 'string') {
        try {
          const parsed = JSON.parse(removeImages);
          removeImages = Array.isArray(parsed) ? parsed : [removeImages];
        } catch {
          removeImages = [removeImages];
        }
      } else if (!Array.isArray(removeImages)) {
        removeImages = [removeImages];
      }
      product.images = (product.images || []).filter((img) => !removeImages.includes(img));
      for (const imgUrl of removeImages) {
        if (typeof imgUrl === 'string') {
          await this._deleteImageFromSupabase(imgUrl);
        }
      }
    }

    const files = Array.isArray(uploadedFiles)
      ? uploadedFiles
      : uploadedFiles && typeof uploadedFiles === 'object'
        ? [...(uploadedFiles.images || []), ...(uploadedFiles.imageFiles || [])]
        : [];

    const newUploadedUrls = files.length > 0
      ? await this._uploadImagesToSupabase(files)
      : [];

    const providedUrls = this._extractImageUrls(data)
      .filter((url) => !removeImages || !removeImages.includes(url));

    if (data.replaceImages === true || data.replaceImages === 'true') {
      product.images = Array.from(new Set([...providedUrls, ...newUploadedUrls]));
    } else {
      let retained = product.images || [];
      if (data.existingImages !== undefined) {
        const raw = Array.isArray(data.existingImages) ? data.existingImages : [data.existingImages];
        retained = raw.filter((u) => typeof u === 'string' && u.trim().length > 0);
      }
      product.images = Array.from(new Set([...retained, ...providedUrls, ...newUploadedUrls]));
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