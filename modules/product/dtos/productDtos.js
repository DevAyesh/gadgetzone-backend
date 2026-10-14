

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
  const stockVal = data.countInStock !== undefined ? data.countInStock : data.stock;
  if (stockVal !== undefined && (isNaN(Number(stockVal)) || Number(stockVal) < 0)) {
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
  const updateStockVal = data.countInStock !== undefined ? data.countInStock : data.stock;
  if (updateStockVal !== undefined && (isNaN(Number(updateStockVal)) || Number(updateStockVal) < 0)) {
    errors.push('countInStock must be a valid non-negative number');
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
};

const toProductDTO = (product) => {
  if (!product) return null;
  const slug = product.slug || (product.name
    ? product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    : '');

  const imageList = (product.images || []).map((img, i) => ({
    image_url: img,
    is_primary: i === 0,
  }));

  const primaryImage = product.images && product.images.length > 0 ? product.images[0] : '';

  return {
    _id: product._id,
    id: product._id ? product._id.toString() : '',
    name: product.name,
    slug,
    description: product.description,
    price: product.price,
    category: product.category,
    images: imageList,
    imageUrl: primaryImage,
    countInStock: product.countInStock,
    stock: product.countInStock,
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