const userService = require('./userService');
const {
  validateUpdateProfileInput,
  validateUserStatusInput,
  toUserProfileDTO,
} = require('./dtos/userDtos');
const { validateRegisterInput } = require('../auth/dtos/authDtos');
const { successResponse, errorResponse } = require('../../common/dtos/responseDto');

class UserController {
  /**
   * @route   GET /api/users/profile
   * @desc    Get logged in user profile
   * @access  Private
   */
  async getProfile(req, res, next) {
    try {
      const user = await userService.getUserProfile(req.user._id);
      const profileData = toUserProfileDTO(user);
      console.log(`[USER INFO] USER PROFILE FETCHED SUCCESSFULLY: ${user.email.toUpperCase()} (USER ID: ${user.userId || user._id})`);
      return successResponse(res, 200, 'User profile fetched successfully', profileData);
    } catch (error) {
      if (error.statusCode) {
        console.warn(`[USER WARN] FAILED TO FETCH PROFILE FOR USER ID ${req.user?._id}: ${error.message.toUpperCase()}`);
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   PUT /api/users/profile
   * @desc    Update logged in user profile
   * @access  Private
   */
  async updateProfile(req, res, next) {
    try {
      const validation = validateUpdateProfileInput(req.body);
      if (!validation.isValid) {
        console.warn(`[USER WARN] PROFILE UPDATE VALIDATION FAILED FOR USER ID ${req.user?._id}: ${validation.errors.join(', ').toUpperCase()}`);
        return errorResponse(res, 400, 'Validation Failed', validation.errors);
      }

      const updatedUser = await userService.updateUserProfile(req.user._id, req.body);
      const profileData = toUserProfileDTO(updatedUser);

      console.log(`[USER SUCCESS] USER PROFILE UPDATED SUCCESSFULLY FOR: ${updatedUser.email.toUpperCase()} (USER ID: ${updatedUser.userId || updatedUser._id})`);
      return successResponse(res, 200, 'User profile updated successfully', profileData);
    } catch (error) {
      if (error.statusCode) {
        console.warn(`[USER WARN] PROFILE UPDATE FAILED FOR USER ID ${req.user?._id}: ${error.message.toUpperCase()}`);
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   DELETE /api/users/profile
   * @desc    Delete logged in user account
   * @access  Private
   */
  async deleteProfile(req, res, next) {
    try {
      const deletedUser = await userService.deleteUserProfile(req.user._id);
      console.log(`[USER SUCCESS] USER ACCOUNT DELETED SUCCESSFULLY: ${deletedUser.email.toUpperCase()} (USER ID: ${deletedUser.userId || deletedUser._id})`);
      return successResponse(res, 200, 'User account deleted successfully');
    } catch (error) {
      if (error.statusCode) {
        console.warn(`[USER WARN] ACCOUNT DELETION FAILED FOR USER ID ${req.user?._id}: ${error.message.toUpperCase()}`);
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   GET /api/users
   * @desc    Fetch & Search all registered users with search keyword, role, status filters, and pagination
   * @access  Private/Admin
   */
  async getAllUsers(req, res, next) {
    try {
      const { users, pagination } = await userService.getAllUsers(req.query);
      const usersDtoList = users.map(toUserProfileDTO);
      
      console.log(`[ADMIN INFO] ADMIN '${req.user.email.toUpperCase()}' SEARCHED/FETCHED USERS (QUERY: ${JSON.stringify(req.query).toUpperCase()}, COUNT: ${users.length})`);
      
      return res.status(200).json({
        success: true,
        message: 'Users fetched successfully',
        data: usersDtoList,
        pagination,
      });
    } catch (error) {
      if (error.statusCode) {
        console.warn(`[ADMIN WARN] FAILED TO FETCH USERS LIST: ${error.message.toUpperCase()}`);
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   GET /api/users/:id
   * @desc    Fetch single user profile by numeric userId or _id
   * @access  Private/Admin
   */
  async getUserById(req, res, next) {
    try {
      const targetUserId = req.params.id;
      const user = await userService.getUserProfile(targetUserId);
      const profileData = toUserProfileDTO(user);
      console.log(`[ADMIN INFO] ADMIN FETCHED USER PROFILE FOR IDENTIFIER: ${targetUserId}`);
      return successResponse(res, 200, 'User profile retrieved successfully', profileData);
    } catch (error) {
      if (error.statusCode) {
        console.warn(`[ADMIN WARN] FAILED TO RETRIEVE USER PROFILE FOR IDENTIFIER ${req.params.id}: ${error.message.toUpperCase()}`);
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   PUT /api/users/:id/status
   * @desc    Update user or admin account active/inactive status (Activate / Deactivate) by numeric userId or _id
   * @access  Private/Admin
   */
  async updateUserStatus(req, res, next) {
    try {
      const validation = validateUserStatusInput(req.body);
      if (!validation.isValid) {
        console.warn(`[ADMIN WARN] USER STATUS VALIDATION FAILED: ${validation.errors.join(', ').toUpperCase()}`);
        return errorResponse(res, 400, 'Validation Failed', validation.errors);
      }

      const adminUserId = req.user._id;
      const targetUserId = req.params.id;
      const updatedUser = await userService.updateUserStatus(adminUserId, targetUserId, req.body.isActive);
      const profileData = toUserProfileDTO(updatedUser);

      console.log(`[ADMIN SUCCESS] ADMIN '${req.user.email.toUpperCase()}' UPDATED ACCOUNT '${updatedUser.email.toUpperCase()}' (ROLE: ${updatedUser.role.toUpperCase()}, USER ID: ${updatedUser.userId || updatedUser._id}) ACTIVE STATUS TO: ${updatedUser.isActive ? 'ACTIVE' : 'INACTIVE'}`);
      return successResponse(res, 200, `Account set to ${updatedUser.isActive ? 'active' : 'inactive'} successfully`, profileData);
    } catch (error) {
      if (error.statusCode) {
        console.warn(`[ADMIN WARN] USER STATUS UPDATE FAILED FOR TARGET USER IDENTIFIER ${req.params.id}: ${error.message.toUpperCase()}`);
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   POST /api/users/admin
   * @desc    Create/Onboard a new Admin user
   * @access  Private/Admin
   */
  async createAdmin(req, res, next) {
    try {
      const validation = validateRegisterInput(req.body);
      if (!validation.isValid) {
        console.warn(`[ADMIN WARN] ADMIN ONBOARDING VALIDATION FAILED: ${validation.errors.join(', ').toUpperCase()}`);
        return errorResponse(res, 400, 'Validation Failed', validation.errors);
      }

      const newAdmin = await userService.createAdminUser(req.body);
      const profileData = toUserProfileDTO(newAdmin);

      console.log(`[ADMIN SUCCESS] ADMIN '${req.user.email.toUpperCase()}' CREATED NEW ADMIN ACCOUNT: ${newAdmin.email.toUpperCase()} (USER ID: ${newAdmin.userId || newAdmin._id})`);
      return successResponse(res, 201, 'New Admin user created successfully', profileData);
    } catch (error) {
      if (error.statusCode) {
        console.warn(`[ADMIN WARN] ADMIN CREATION FAILED FOR EMAIL '${req.body.email?.toUpperCase()}': ${error.message.toUpperCase()}`);
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   PUT /api/users/:id/role
   * @desc    Update user role (Promote to Admin / Demote to Customer)
   * @access  Private/Admin
   */
  async updateUserRole(req, res, next) {
    try {
      const { role } = req.body;
      if (!role || !['customer', 'admin'].includes(role)) {
        return errorResponse(res, 400, 'Invalid role. Must be customer or admin.');
      }

      const targetUserId = req.params.id;
      const updatedUser = await userService.updateUserRole(targetUserId, role);
      const profileData = toUserProfileDTO(updatedUser);

      console.log(`[ADMIN SUCCESS] ADMIN '${req.user.email.toUpperCase()}' UPDATED USER '${updatedUser.email.toUpperCase()}' (USER ID: ${updatedUser.userId || updatedUser._id}) ROLE TO: ${updatedUser.role.toUpperCase()}`);
      return successResponse(res, 200, `User role updated to ${updatedUser.role} successfully`, profileData);
    } catch (error) {
      if (error.statusCode) {
        console.warn(`[ADMIN WARN] USER ROLE UPDATE FAILED FOR TARGET USER IDENTIFIER ${req.params.id}: ${error.message.toUpperCase()}`);
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   DELETE /api/users/:id
   * @desc    Soft-delete a specific user/admin account by numeric userId or _id
   * @access  Private/Admin
   */
  async deleteUserByAdmin(req, res, next) {
    try {
      const adminUserId = req.user._id;
      const targetUserId = req.params.id;
      const deletedUser = await userService.softDeleteUserByAdmin(adminUserId, targetUserId);

      console.log(`[ADMIN SUCCESS] ADMIN '${req.user.email.toUpperCase()}' SOFT-DELETED USER ACCOUNT '${deletedUser.email.toUpperCase()}' (USER ID: ${deletedUser.userId || deletedUser._id})`);
      return successResponse(res, 200, 'User account deleted successfully by admin');
    } catch (error) {
      if (error.statusCode) {
        console.warn(`[ADMIN WARN] ADMIN SOFT-DELETE FAILED FOR TARGET USER IDENTIFIER ${req.params.id}: ${error.message.toUpperCase()}`);
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   PUT /api/users/:id/restore
   * @desc    Restore/Undelete a soft-deleted user/admin account by numeric userId or _id
   * @access  Private/Admin
   */
  async restoreUserByAdmin(req, res, next) {
    try {
      const targetUserId = req.params.id;
      const restoredUser = await userService.restoreUserByAdmin(targetUserId);
      const profileData = toUserProfileDTO(restoredUser);

      console.log(`[ADMIN SUCCESS] ADMIN '${req.user.email.toUpperCase()}' RESTORED SOFT-DELETED USER ACCOUNT '${restoredUser.email.toUpperCase()}' (USER ID: ${restoredUser.userId || restoredUser._id})`);
      return successResponse(res, 200, 'User account restored successfully', profileData);
    } catch (error) {
      if (error.statusCode) {
        console.warn(`[ADMIN WARN] ADMIN USER RESTORE FAILED FOR TARGET USER IDENTIFIER ${req.params.id}: ${error.message.toUpperCase()}`);
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }
}

module.exports = new UserController();
