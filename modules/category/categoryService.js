const Category = require('../../models/Category');

const DEFAULT_CATEGORIES = [
  { name: 'Smartphones', slug: 'smartphones', icon: '📱' },
  { name: 'Laptops', slug: 'laptops', icon: '💻' },
  { name: 'Audio', slug: 'audio', icon: '🎧' },
  { name: 'Wearables', slug: 'wearables', icon: '⌚' },
  { name: 'Cameras', slug: 'cameras', icon: '📷' },
  { name: 'Gaming', slug: 'gaming', icon: '🎮' },
  { name: 'Accessories', slug: 'accessories', icon: '🔌' },
];

class CategoryService {
  /**
   * Helper to format a Category document into a clean DTO
   */
  toCategoryDTO(category) {
    if (!category) return null;
    const obj = typeof category.toJSON === 'function' ? category.toJSON() : category;
    return {
      id: obj._id ? obj._id.toString() : obj.id,
      _id: obj._id ? obj._id.toString() : obj.id,
      name: obj.name,
      slug: obj.slug,
      icon: obj.icon || '📦',
      isRemoved: Boolean(obj.isRemoved),
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }

  /**
   * Fetch all active categories. Auto-seeds default categories if empty.
   */
  async getAllCategories() {
    let categories = await Category.find({ isRemoved: false }).sort({ name: 1 });

    if (!categories || categories.length === 0) {
      // Check total active count
      const activeCount = await Category.countDocuments({ isRemoved: false });
      if (activeCount === 0) {
        try {
          await Category.insertMany(DEFAULT_CATEGORIES);
          categories = await Category.find({ isRemoved: false }).sort({ name: 1 });
        } catch (seedErr) {
          console.warn('[CATEGORY SEED WARN] Failed to auto-seed default categories:', seedErr.message);
        }
      }
    }

    return (categories || []).map((cat) => this.toCategoryDTO(cat));
  }

  /**
   * Fetch a single category by id or slug
   */
  async getCategoryById(idOrSlug) {
    if (!idOrSlug) {
      const err = new Error('Category ID or slug is required');
      err.statusCode = 400;
      throw err;
    }

    let category = null;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);

    if (isObjectId) {
      category = await Category.findOne({ _id: idOrSlug, isRemoved: false });
    }

    if (!category) {
      category = await Category.findOne({ slug: idOrSlug.toLowerCase(), isRemoved: false });
    }

    if (!category) {
      const err = new Error('Category not found');
      err.statusCode = 404;
      throw err;
    }

    return this.toCategoryDTO(category);
  }

  /**
   * [ADMIN] Create a new category
   */
  async createCategory(data) {
    if (!data || !data.name || !data.name.trim()) {
      const err = new Error('Category name is required');
      err.statusCode = 400;
      throw err;
    }

    const name = data.name.trim();
    let slug = data.slug ? data.slug.trim().toLowerCase() : '';
    if (!slug) {
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    const icon = data.icon ? data.icon.trim() : '📦';

    // Check if an active category with the same slug already exists
    const existing = await Category.findOne({ slug, isRemoved: false });
    if (existing) {
      const err = new Error(`Category with slug "${slug}" already exists`);
      err.statusCode = 400;
      throw err;
    }

    const category = await Category.create({
      name,
      slug,
      icon,
      isRemoved: false,
    });

    return this.toCategoryDTO(category);
  }

  /**
   * [ADMIN] Update an existing category
   */
  async updateCategory(id, data) {
    if (!id) {
      const err = new Error('Category ID is required');
      err.statusCode = 400;
      throw err;
    }

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const filter = isObjectId ? { _id: id, isRemoved: false } : { slug: id, isRemoved: false };
    const category = await Category.findOne(filter);

    if (!category) {
      const err = new Error('Category not found');
      err.statusCode = 404;
      throw err;
    }

    if (data.name !== undefined && data.name.trim()) {
      category.name = data.name.trim();
    }

    if (data.slug !== undefined && data.slug.trim()) {
      const newSlug = data.slug.trim().toLowerCase();
      // Ensure new slug is not taken by another category
      const existing = await Category.findOne({
        slug: newSlug,
        _id: { $ne: category._id },
        isRemoved: false,
      });
      if (existing) {
        const err = new Error(`Category with slug "${newSlug}" already exists`);
        err.statusCode = 400;
        throw err;
      }
      category.slug = newSlug;
    }

    if (data.icon !== undefined) {
      category.icon = data.icon.trim() || '📦';
    }

    const updated = await category.save();
    return this.toCategoryDTO(updated);
  }

  /**
   * [ADMIN] Soft-delete a category
   */
  async deleteCategory(id) {
    if (!id) {
      const err = new Error('Category ID is required');
      err.statusCode = 400;
      throw err;
    }

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const filter = isObjectId ? { _id: id, isRemoved: false } : { slug: id, isRemoved: false };
    const category = await Category.findOne(filter);

    if (!category) {
      const err = new Error('Category not found or already deleted');
      err.statusCode = 404;
      throw err;
    }

    category.isRemoved = true;
    await category.save();
    return this.toCategoryDTO(category);
  }
}

module.exports = new CategoryService();
