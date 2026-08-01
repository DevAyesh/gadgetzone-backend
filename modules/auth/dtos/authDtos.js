/**
 * Data Transfer Objects (DTOs) and Validators for Auth Module
 */

const validateRegisterInput = (data) => {
  const errors = [];
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.push('Name is required');
  }
  if (!data.email || typeof data.email !== 'string' || !data.email.includes('@')) {
    errors.push('Valid email is required');
  }
  if (!data.password || typeof data.password !== 'string' || data.password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateLoginInput = (data) => {
  const errors = [];
  if (!data.email || typeof data.email !== 'string') {
    errors.push('Email is required');
  }
  if (!data.password || typeof data.password !== 'string') {
    errors.push('Password is required');
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateGoogleAuthInput = (data) => {
  const errors = [];
  if (!data.idToken || typeof data.idToken !== 'string') {
    errors.push('Google idToken is required');
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
};

const toAuthResponseDTO = (user, token) => {
  return user.toAuthDTO(token);
};

module.exports = {
  validateRegisterInput,
  validateLoginInput,
  validateGoogleAuthInput,
  toAuthResponseDTO,
};
