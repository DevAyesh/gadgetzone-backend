const categoryService = require('./categoryService');
const { successResponse, errorResponse } = require('../../common/dtos/responseDto');

class CategoryController {
  /**
   * @route   GET /api/categories
   * @desc    List all active categories (auto-seeds defaults if empty)
   * @access  Public
   */
  async getCategories(req, res, next) {
    try {
      const categories = await categoryService.getAllCategories();

      if (req.query.format === 'object' || req.query.paginated === 'true') {
        return successResponse(res, 200, 'Categories fetched successfully', categories);
      }

      // Default storefront and header contract expects direct array of categories
      return res.status(200).json(categories);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   GET /api/categories/:id
   * @desc    Get a single category by id or slug
   * @access  Public
   */
  async getCategoryById(req, res, next) {
    try {
      const category = await categoryService.getCategoryById(req.params.id);
      return successResponse(res, 200, 'Category fetched successfully', category);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   POST /api/categories
   * @desc    Create a new category
   * @access  Private/Admin
   */
  async createCategory(req, res, next) {
    try {
      const category = await categoryService.createCategory(req.body);
      console.log(`[ADMIN SUCCESS] ADMIN '${req.user?.email || 'ADMIN'}' CREATED CATEGORY: ${category.name} (${category.slug})`);
      return successResponse(res, 201, 'Category created successfully', category);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   PUT /api/categories/:id
   * @desc    Update a category
   * @access  Private/Admin
   */
  async updateCategory(req, res, next) {
    try {
      const category = await categoryService.updateCategory(req.params.id, req.body);
      console.log(`[ADMIN SUCCESS] ADMIN '${req.user?.email || 'ADMIN'}' UPDATED CATEGORY: ${category.name} (${category.slug})`);
      return successResponse(res, 200, 'Category updated successfully', category);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   DELETE /api/categories/:id
   * @desc    Soft-delete a category
   * @access  Private/Admin
   */
  async deleteCategory(req, res, next) {
    try {
      const category = await categoryService.deleteCategory(req.params.id);
      console.log(`[ADMIN SUCCESS] ADMIN '${req.user?.email || 'ADMIN'}' DELETED CATEGORY: ${category.name} (ID: ${category.id})`);
      return successResponse(res, 200, 'Category deleted successfully', category);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }
}

module.exports = new CategoryController();
