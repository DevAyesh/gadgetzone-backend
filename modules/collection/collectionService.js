const Collection = require('../../models/Collection');
const Product = require('../../models/Product');

const DEFAULT_COLLECTIONS = [
  { name: 'Featured', slug: 'featured', description: 'Featured products handpicked for quality' },
  { name: 'New Arrivals', slug: 'new-arrivals', description: 'The latest gadgets and technology' },
  { name: 'Best Sellers', slug: 'best-sellers', description: 'Our most popular high-performance gadgets' },
  { name: 'Apple Products', slug: 'apple-products', description: 'Premium Apple devices and accessories' },
  { name: 'Headphones', slug: 'headphones', description: 'Premium audio and noise-cancelling headphones' },
];

class CollectionService {
  /**
   * Helper to format a Collection document into a clean DTO
   */
  toCollectionDTO(collection) {
    if (!collection) return null;
    const obj = typeof collection.toJSON === 'function' ? collection.toJSON() : collection;
    return {
      id: obj._id ? obj._id.toString() : obj.id,
      _id: obj._id ? obj._id.toString() : obj.id,
      name: obj.name,
      slug: obj.slug,
      description: obj.description || '',
      image: obj.image || '',
      isRemoved: Boolean(obj.isRemoved),
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }

  /**
   * Fetch all active collections. Auto-seeds default collections if empty.
   */
  async getAllCollections() {
    let collections = await Collection.find({ isRemoved: false }).sort({ name: 1 });

    if (!collections || collections.length === 0) {
      const activeCount = await Collection.countDocuments({ isRemoved: false });
      if (activeCount === 0) {
        try {
          await Collection.insertMany(DEFAULT_COLLECTIONS);
          collections = await Collection.find({ isRemoved: false }).sort({ name: 1 });
        } catch (seedErr) {
          console.warn('[COLLECTION SEED WARN] Failed to auto-seed default collections:', seedErr.message);
        }
      }
    }

    return (collections || []).map((col) => this.toCollectionDTO(col));
  }

  /**
   * Fetch a single collection by id or slug along with matching products
   */
  async getCollectionById(idOrSlug) {
    if (!idOrSlug) {
      const err = new Error('Collection ID or slug is required');
      err.statusCode = 400;
      throw err;
    }

    let collection = null;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);

    if (isObjectId) {
      collection = await Collection.findOne({ _id: idOrSlug, isRemoved: false });
    }

    if (!collection) {
      collection = await Collection.findOne({ slug: idOrSlug.toLowerCase(), isRemoved: false });
    }

    if (!collection) {
      const err = new Error('Collection not found');
      err.statusCode = 404;
      throw err;
    }

    const colDTO = this.toCollectionDTO(collection);

    // Look for matching products based on collection name, slug keywords, or category
    const slugTerm = collection.slug.replace(/-/g, ' ');
    const products = await Product.find({
      isRemoved: false,
      $or: [
        { category: new RegExp(collection.name, 'i') },
        { category: new RegExp(collection.slug, 'i') },
        { name: new RegExp(collection.name, 'i') },
        { name: new RegExp(slugTerm, 'i') },
      ],
    }).sort({ createdAt: -1 });

    return {
      collection: colDTO,
      products,
      ...colDTO,
    };
  }

  /**
   * [ADMIN] Create a new collection
   */
  async createCollection(data) {
    if (!data || !data.name || !data.name.trim()) {
      const err = new Error('Collection name is required');
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

    const description = data.description ? data.description.trim() : '';
    const image = data.image ? data.image.trim() : '';

    const existing = await Collection.findOne({ slug, isRemoved: false });
    if (existing) {
      const err = new Error(`Collection with slug "${slug}" already exists`);
      err.statusCode = 400;
      throw err;
    }

    const collection = await Collection.create({
      name,
      slug,
      description,
      image,
      isRemoved: false,
    });

    return this.toCollectionDTO(collection);
  }

  /**
   * [ADMIN] Update an existing collection
   */
  async updateCollection(id, data) {
    if (!id) {
      const err = new Error('Collection ID is required');
      err.statusCode = 400;
      throw err;
    }

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const filter = isObjectId ? { _id: id, isRemoved: false } : { slug: id, isRemoved: false };
    const collection = await Collection.findOne(filter);

    if (!collection) {
      const err = new Error('Collection not found');
      err.statusCode = 404;
      throw err;
    }

    if (data.name !== undefined && data.name.trim()) {
      collection.name = data.name.trim();
    }

    if (data.slug !== undefined && data.slug.trim()) {
      const newSlug = data.slug.trim().toLowerCase();
      const existing = await Collection.findOne({
        slug: newSlug,
        _id: { $ne: collection._id },
        isRemoved: false,
      });
      if (existing) {
        const err = new Error(`Collection with slug "${newSlug}" already exists`);
        err.statusCode = 400;
        throw err;
      }
      collection.slug = newSlug;
    }

    if (data.description !== undefined) {
      collection.description = data.description.trim();
    }

    if (data.image !== undefined) {
      collection.image = data.image.trim();
    }

    const updated = await collection.save();
    return this.toCollectionDTO(updated);
  }

  /**
   * [ADMIN] Soft-delete a collection
   */
  async deleteCollection(id) {
    if (!id) {
      const err = new Error('Collection ID is required');
      err.statusCode = 400;
      throw err;
    }

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const filter = isObjectId ? { _id: id, isRemoved: false } : { slug: id, isRemoved: false };
    const collection = await Collection.findOne(filter);

    if (!collection) {
      const err = new Error('Collection not found or already deleted');
      err.statusCode = 404;
      throw err;
    }

    collection.isRemoved = true;
    await collection.save();
    return this.toCollectionDTO(collection);
  }
}

module.exports = new CollectionService();
