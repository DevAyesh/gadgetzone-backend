const productService = require('./productService');
const {
  validateCreateProductInput,
  validateUpdateProductInput,
  toProductDTO,
} = require('./dtos/productDtos');
const { successResponse, errorResponse } = require('../../common/dtos/responseDto');

class ProductController {
  /**
   * @route   GET /api/products
   * @desc    Fetch & search all products (public, read-only)
   * @access  Public
   */
  async getProducts(req, res, next) {
    try {
      const { products, pagination } = await productService.getAllProducts(req.query);
      const productsDtoList = products.map(toProductDTO);

      // If explicitly requested paginated format (e.g. from admin panel)
      if (req.query.paginated === 'true' || req.query.format === 'object') {
        return successResponse(res, 200, 'Products fetched successfully', {
          products: productsDtoList,
          pagination,
        });
      }

      // Default storefront contract expects direct array of products
      return res.status(200).json(productsDtoList);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   GET /api/products/:id
   * @desc    Fetch a single product by ID
   * @access  Public
   */
  async getProductById(req, res, next) {
    try {
      const product = await productService.getProductById(req.params.id);
      const dto = toProductDTO(product);
      return res.status(200).json(dto);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   GET /api/products/slug/:slug
   * @desc    Fetch a single product by slug
   * @access  Public
   */
  async getProductBySlug(req, res, next) {
    try {
      const product = await productService.getProductBySlug(req.params.slug);
      const dto = toProductDTO(product);
      return res.status(200).json(dto);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   POST /api/products/admin
   * @desc    Create a new product (with optional image uploads)
   * @access  Private/Admin
   */
  async createProduct(req, res, next) {
    try {
      const validation = validateCreateProductInput(req.body);
      if (!validation.isValid) {
        console.warn(`[ADMIN WARN] PRODUCT CREATE VALIDATION FAILED: ${validation.errors.join(', ').toUpperCase()}`);
        return errorResponse(res, 400, 'Validation Failed', validation.errors);
      }

      const product = await productService.createProduct(req.body, req.files || []);
      console.log(`[ADMIN SUCCESS] ADMIN '${req.user.email.toUpperCase()}' CREATED PRODUCT: ${product.name.toUpperCase()} (ID: ${product._id})`);
      return successResponse(res, 201, 'Product created successfully', toProductDTO(product));
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   PUT /api/products/admin/:id
   * @desc    Update a product (with optional new image uploads / image removal)
   * @access  Private/Admin
   */
  async updateProduct(req, res, next) {
    try {
      const validation = validateUpdateProductInput(req.body);
      if (!validation.isValid) {
        console.warn(`[ADMIN WARN] PRODUCT UPDATE VALIDATION FAILED: ${validation.errors.join(', ').toUpperCase()}`);
        return errorResponse(res, 400, 'Validation Failed', validation.errors);
      }

      const product = await productService.updateProduct(req.params.id, req.body, req.files || []);
      console.log(`[ADMIN SUCCESS] ADMIN '${req.user.email.toUpperCase()}' UPDATED PRODUCT: ${product.name.toUpperCase()} (ID: ${product._id})`);
      return successResponse(res, 200, 'Product updated successfully', toProductDTO(product));
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   DELETE /api/products/admin/:id
   * @desc    Soft delete a product
   * @access  Private/Admin
   */
  async deleteProduct(req, res, next) {
    try {
      const product = await productService.deleteProduct(req.params.id);
      console.log(`[ADMIN SUCCESS] ADMIN '${req.user.email.toUpperCase()}' DELETED PRODUCT: ${product.name.toUpperCase()} (ID: ${product._id})`);
      return successResponse(res, 200, 'Product deleted successfully');
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }
}

module.exports = new ProductController();