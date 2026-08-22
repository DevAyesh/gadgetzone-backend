

const validateCreateProductInput = (data) => {
  const errors = [];
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.push('Product name is required');
  }
  if (!data.description || typeof data.description !== 'string' || !data.description.trim()) {
    errors.push('Description is required');
  }
  if (data.price === undefined || data.price === null || isNaN(Number(data.price)) || Number(data.price) < 0) {
    errors.push('A valid non-negative price is required');
  }
  if (!data.category || typeof data.category !== 'string' || !data.category.trim()) {
    errors.push('Category is required');
  }
  if (data.countInStock !== undefined && (isNaN(Number(data.countInStock)) || Number(data.countInStock) < 0)) {
    errors.push('countInStock must be a valid non-negative number');
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateUpdateProductInput = (data) => {
  const errors = [];
  if (data.name !== undefined && (typeof data.name !== 'string' || !data.name.trim())) {
    errors.push('Product name cannot be empty');
  }
  if (data.description !== undefined && (typeof data.description !== 'string' || !data.description.trim())) {
    errors.push('Description cannot be empty');
  }
  if (data.price !== undefined && (isNaN(Number(data.price)) || Number(data.price) < 0)) {
    errors.push('Price must be a valid non-negative number');
  }
  if (data.category !== undefined && (typeof data.category !== 'string' || !data.category.trim())) {
    errors.push('Category cannot be empty');
  }
  if (data.countInStock !== undefined && (isNaN(Number(data.countInStock)) || Number(data.countInStock) < 0)) {
    errors.push('countInStock must be a valid non-negative number');
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
};

const toProductDTO = (product) => {
  return {
    _id: product._id,
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category,
    images: product.images || [],
    countInStock: product.countInStock,
    isRemoved: product.isRemoved || false,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
};

module.exports = {
  validateCreateProductInput,
  validateUpdateProductInput,
  toProductDTO,
};