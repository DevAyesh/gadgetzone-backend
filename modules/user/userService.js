const User = require('../../models/User');

class UserService {
  /**
   * Helper function to find a user by numeric userId OR Mongo ObjectId
   */
  async findUserByIdentifier(identifier, includeRemoved = false) {
    if (!identifier) return null;

    let query;
    // Check if identifier is numeric (auto-increment userId)
    if (!isNaN(Number(identifier)) && String(identifier).trim() !== '') {
      query = { userId: Number(identifier) };
    } else {
      query = { _id: identifier };
    }

    if (!includeRemoved) {
      query.isRemoved = false;
    }

    try {
      return await User.findOne(query);
    } catch (_err) {
      return await User.findOne({ userId: identifier, ...(includeRemoved ? {} : { isRemoved: false }) });
    }
  }

  /**
   * Fetch User Profile by User ID (supports numeric userId or ObjectId)
   */
  async getUserProfile(userId) {
    const user = await this.findUserByIdentifier(userId);
    if (!user || user.isRemoved) {
      const error = new Error('User account is deactivated or deleted');
      error.statusCode = 404;
      throw error;
    }
    return user;
  }

  /**
   * Update User Profile
   */
  async updateUserProfile(userId, updateData) {
    const user = await this.findUserByIdentifier(userId);
    if (!user || user.isRemoved) {
      const error = new Error('User account is deactivated or deleted');
      error.statusCode = 404;
      throw error;
    }

    const {
      name,
      email,
      password,
      avatar,
      phoneNumber,
      address_line1,
      address_line2,
      city,
      province,
      gender,
    } = updateData;

    if (email && email.toLowerCase() !== user.email) {
      const emailExists = await User.findOne({ email: email.toLowerCase(), isRemoved: false });
      if (emailExists) {
        const error = new Error('Email is already in use');
        error.statusCode = 400;
        throw error;
      }
      user.email = email.toLowerCase();
    }

    if (name) user.name = name;
    if (avatar) user.avatar = avatar;
    if (password) user.password = password; // pre-save hook will hash it
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (address_line1 !== undefined) user.address_line1 = address_line1;
    if (address_line2 !== undefined) user.address_line2 = address_line2;
    if (city !== undefined) user.city = city === null ? null : Number(city);
    if (province !== undefined) user.province = province === null ? null : Number(province);
    if (gender !== undefined) user.gender = gender === null ? null : Number(gender);

    const updatedUser = await user.save();
    return updatedUser;
  }

  /**
   * Soft Delete User Account by self (setting isRemoved = true)
   */
  async deleteUserProfile(userId) {
    const user = await this.findUserByIdentifier(userId);
    if (!user || user.isRemoved) {
      const error = new Error('User account is already deleted or not found');
      error.statusCode = 404;
      throw error;
    }

    user.isRemoved = true;
    await user.save();
    return user;
  }

  /**
   * [ADMIN] Fetch & Search registered users with keyword search, role filter, active status, and pagination
   */
  async getAllUsers(queryParams = {}) {
    const { search, role, isActive, page = 1, limit = 20, includeRemoved } = queryParams;
    let filter = {};

    if (String(includeRemoved) !== 'true') {
      filter.isRemoved = false;
    }

    if (role) {
      filter.role = role;
    }

    if (isActive !== undefined && isActive !== '') {
      filter.isActive = String(isActive) === 'true';
    }

    if (search && String(search).trim()) {
      const searchStr = String(search).trim();
      const searchRegex = new RegExp(searchStr, 'i');
      const searchConditions = [
        { name: searchRegex },
        { email: searchRegex },
        { phoneNumber: searchRegex },
      ];

      if (!isNaN(Number(searchStr))) {
        searchConditions.push({ userId: Number(searchStr) });
      }

      filter.$or = searchConditions;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .sort({ userId: 1 })
      .skip(skip)
      .limit(limitNum);

    return {
      users,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * [ADMIN] Update User or Admin Account Active/Inactive status
   */
  async updateUserStatus(adminUser, targetUserId, isActive) {
    const adminUserId = adminUser && adminUser._id ? adminUser._id.toString() : String(adminUser);
    const isRequesterSuperAdmin = Boolean(adminUser && adminUser.isSuperAdmin);

    const user = await this.findUserByIdentifier(targetUserId);
    if (!user || user.isRemoved) {
      const error = new Error('Target account not found or deleted');
      error.statusCode = 404;
      throw error;
    }

    if (user._id.toString() === adminUserId && isActive === false) {
      const error = new Error('Admins cannot deactivate their own account.');
      error.statusCode = 400;
      throw error;
    }

    if (user.isSuperAdmin && !isRequesterSuperAdmin) {
      const error = new Error('Only Super Admins can change status of a Super Admin account');
      error.statusCode = 403;
      throw error;
    }

    user.isActive = Boolean(isActive);
    const updatedUser = await user.save();
    return updatedUser;
  }

  /**
   * [ADMIN] Onboard a new Admin user
   */
  async createAdminUser({ name, email, password, isSuperAdmin = false }) {
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name ? name.trim() : '';
    let user = await User.findOne({ email: cleanEmail });

    if (user) {
      if (!user.isRemoved && user.role === 'admin') {
        const error = new Error('Admin already exists with this email address');
        error.statusCode = 400;
        throw error;
      }
      user.name = cleanName;
      user.password = password;
      user.role = 'admin';
      user.isAdmin = true;
      if (isSuperAdmin !== undefined) {
        user.isSuperAdmin = Boolean(isSuperAdmin);
      }
      user.isRemoved = false;
      user.isActive = true;
      user.isEmailVerified = true;
      await user.save();
    } else {
      user = await User.create({
        name: cleanName,
        email: cleanEmail,
        password,
        role: 'admin',
        isAdmin: true,
        isSuperAdmin: Boolean(isSuperAdmin),
        isRemoved: false,
        isActive: true,
        isEmailVerified: true,
      });
    }

    return user;
  }

  /**
   * [ADMIN] Update User Role (Promote to Admin / Demote to Customer)
   */
  async updateUserRole(targetUserId, role, isSuperAdmin = undefined, requestingUser = null) {
    if (!['customer', 'admin'].includes(role)) {
      const error = new Error('Invalid role specified. Must be customer or admin.');
      error.statusCode = 400;
      throw error;
    }

    const user = await this.findUserByIdentifier(targetUserId);
    if (!user || user.isRemoved) {
      const error = new Error('Target user account not found or deleted');
      error.statusCode = 404;
      throw error;
    }

    const requesterIsSuper = Boolean(requestingUser && requestingUser.isSuperAdmin);

    // If target is super admin and requester is not super admin, block
    if (user.isSuperAdmin && requestingUser && !requesterIsSuper) {
      const error = new Error('Only Super Admins can modify the role of another Super Admin');
      error.statusCode = 403;
      throw error;
    }

    // Prevent demoting oneself or revoking one's own Super Admin privileges
    if (requestingUser && user._id.toString() === requestingUser._id.toString()) {
      if (role === 'customer') {
        const error = new Error('Admins cannot demote their own account');
        error.statusCode = 400;
        throw error;
      }
      if (user.isSuperAdmin && isSuperAdmin === false) {
        const error = new Error('Super Admins cannot revoke their own Super Admin privileges');
        error.statusCode = 400;
        throw error;
      }
    }

    // Only super admins can grant super admin role
    if (isSuperAdmin && requestingUser && !requesterIsSuper) {
      const error = new Error('Only Super Admins can grant Super Admin privileges');
      error.statusCode = 403;
      throw error;
    }

    user.role = role;
    user.isAdmin = role === 'admin';
    if (role === 'customer') {
      user.isSuperAdmin = false;
    } else if (isSuperAdmin !== undefined) {
      user.isSuperAdmin = Boolean(isSuperAdmin);
    }
    const updatedUser = await user.save();
    return updatedUser;
  }

  /**
   * [ADMIN] Soft delete a specific user/admin by numeric userId or _id
   */
  async softDeleteUserByAdmin(adminUser, targetUserId) {
    const adminUserId = adminUser && adminUser._id ? adminUser._id.toString() : String(adminUser);
    const isRequesterSuperAdmin = Boolean(adminUser && adminUser.isSuperAdmin);

    const user = await this.findUserByIdentifier(targetUserId);
    if (!user || user.isRemoved) {
      const error = new Error('Target user account not found or already deleted');
      error.statusCode = 404;
      throw error;
    }

    if (user._id.toString() === adminUserId) {
      const error = new Error('Admins cannot soft-delete their own account via admin management. Use profile deletion instead.');
      error.statusCode = 400;
      throw error;
    }

    if (user.isSuperAdmin && !isRequesterSuperAdmin) {
      const error = new Error('Only Super Admins can delete a Super Admin account');
      error.statusCode = 403;
      throw error;
    }

    user.isRemoved = true;
    const deletedUser = await user.save();
    return deletedUser;
  }

  /**
   * [ADMIN] Restore / Undelete a soft-deleted user/admin account
   */
  async restoreUserByAdmin(adminUser, targetUserId) {
    const isRequesterSuperAdmin = Boolean(adminUser && adminUser.isSuperAdmin);
    const user = await this.findUserByIdentifier(targetUserId, true);
    if (!user) {
      const error = new Error('Target user account not found');
      error.statusCode = 404;
      throw error;
    }

    if (!user.isRemoved) {
      const error = new Error('User account is not deleted');
      error.statusCode = 400;
      throw error;
    }

    if (user.isSuperAdmin && !isRequesterSuperAdmin) {
      const error = new Error('Only Super Admins can restore a Super Admin account');
      error.statusCode = 403;
      throw error;
    }

    user.isRemoved = false;
    user.isActive = true;
    const restoredUser = await user.save();
    return restoredUser;
  }
}

module.exports = new UserService();
