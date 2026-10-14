const authService = require('../modules/auth/authService');
const userService = require('../modules/user/userService');
const { toAuthResponseDTO } = require('../modules/auth/dtos/authDtos');
const { toUserProfileDTO } = require('../modules/user/dtos/userDtos');
const { errorResponse } = require('../common/dtos/responseDto');

const registerUser = async (req, res, _next) => {
  try {
    const { user, token } = await authService.registerUser(req.body);
    const authData = toAuthResponseDTO(user, token);
    return res.status(201).json(authData);
  } catch (error) {
    return errorResponse(res, error.statusCode || 400, error.message);
  }
};

const loginUser = async (req, res, _next) => {
  try {
    const { user, token } = await authService.loginUser(req.body);
    const authData = toAuthResponseDTO(user, token);
    return res.json(authData);
  } catch (error) {
    return errorResponse(res, error.statusCode || 401, error.message);
  }
};

const getUserProfile = async (req, res, _next) => {
  try {
    const user = await userService.getUserProfile(req.user._id);
    const profileData = toUserProfileDTO(user);
    return res.json(profileData);
  } catch (error) {
    return errorResponse(res, error.statusCode || 404, error.message);
  }
};

module.exports = { registerUser, loginUser, getUserProfile };
