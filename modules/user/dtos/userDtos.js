/**
 * Data Transfer Objects and Validators for User Module
 */

const validateUpdateProfileInput = (data) => {
  const errors = [];
  if (data.email && (typeof data.email !== 'string' || !data.email.includes('@'))) {
    errors.push('Invalid email format');
  }
  if (data.password && (typeof data.password !== 'string' || data.password.length < 6)) {
    errors.push('Password must be at least 6 characters long');
  }
  if (data.name && (typeof data.name !== 'string' || !data.name.trim())) {
    errors.push('Name cannot be empty');
  }
  if (data.city !== undefined && data.city !== null && isNaN(Number(data.city))) {
    errors.push('city must be a valid master data ID (Number)');
  }
  if (data.province !== undefined && data.province !== null && isNaN(Number(data.province))) {
    errors.push('province must be a valid master data ID (Number)');
  }
  if (data.gender !== undefined && data.gender !== null && isNaN(Number(data.gender))) {
    errors.push('gender must be a valid master data ID (Number)');
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateUserStatusInput = (data) => {
  const errors = [];
  if (typeof data.isActive !== 'boolean') {
    errors.push('isActive parameter must be a boolean (true or false)');
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
};

const toUserProfileDTO = (user) => {
  return {
    _id: user._id,
    userId: user.userId,
    name: user.name,
    email: user.email,
    role: user.role || (user.isAdmin ? 'admin' : 'customer'),
    isAdmin: user.isAdmin || user.role === 'admin',
    avatar: user.avatar || '',
    phoneNumber: user.phoneNumber || '',
    address_line1: user.address_line1 || '',
    address_line2: user.address_line2 || '',
    city: user.city !== undefined ? user.city : null,
    province: user.province !== undefined ? user.province : null,
    gender: user.gender !== undefined ? user.gender : null,
    isEmailVerified: user.isEmailVerified !== undefined ? user.isEmailVerified : true,
    isActive: user.isActive !== undefined ? user.isActive : true,
    isRemoved: user.isRemoved || false,
    googleId: user.googleId || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

module.exports = {
  validateUpdateProfileInput,
  validateUserStatusInput,
  toUserProfileDTO,
};
