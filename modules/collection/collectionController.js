const collectionService = require('./collectionService');
const { successResponse, errorResponse } = require('../../common/dtos/responseDto');

class CollectionController {
  /**
   * @route   GET /api/collections
   * @desc    List all active collections (auto-seeds defaults if empty)
   * @access  Public
   */
  async getCollections(req, res, next) {
    try {
      const collections = await collectionService.getAllCollections();

      if (req.query.format === 'object' || req.query.paginated === 'true') {
        return successResponse(res, 200, 'Collections fetched successfully', collections);
      }

      // Default contract returns direct array
      return res.status(200).json(collections);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   GET /api/collections/:id
   * @desc    Get a single collection by id or slug with matching products
   * @access  Public
   */
  async getCollectionById(req, res, next) {
    try {
      const result = await collectionService.getCollectionById(req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Collection fetched successfully',
        collection: result.collection,
        products: result.products,
        data: result.collection,
      });
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   POST /api/collections
   * @desc    Create a new collection
   * @access  Private/Admin
   */
  async createCollection(req, res, next) {
    try {
      const collection = await collectionService.createCollection(req.body);
      console.log(`[ADMIN SUCCESS] ADMIN '${req.user?.email || 'ADMIN'}' CREATED COLLECTION: ${collection.name} (${collection.slug})`);
      return successResponse(res, 201, 'Collection created successfully', collection);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   PUT /api/collections/:id
   * @desc    Update a collection
   * @access  Private/Admin
   */
  async updateCollection(req, res, next) {
    try {
      const collection = await collectionService.updateCollection(req.params.id, req.body);
      console.log(`[ADMIN SUCCESS] ADMIN '${req.user?.email || 'ADMIN'}' UPDATED COLLECTION: ${collection.name} (${collection.slug})`);
      return successResponse(res, 200, 'Collection updated successfully', collection);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   DELETE /api/collections/:id
   * @desc    Soft-delete a collection
   * @access  Private/Admin
   */
  async deleteCollection(req, res, next) {
    try {
      const collection = await collectionService.deleteCollection(req.params.id);
      console.log(`[ADMIN SUCCESS] ADMIN '${req.user?.email || 'ADMIN'}' DELETED COLLECTION: ${collection.name} (ID: ${collection.id})`);
      return successResponse(res, 200, 'Collection deleted successfully', collection);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }
}

module.exports = new CollectionController();
