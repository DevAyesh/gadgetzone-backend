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
    } catch (err) {
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
  async updateUserStatus(adminUserId, targetUserId, isActive) {
    const user = await this.findUserByIdentifier(targetUserId);
    if (!user || user.isRemoved) {
      const error = new Error('Target account not found or deleted');
      error.statusCode = 404;
      throw error;
    }

    if (user._id.toString() === adminUserId.toString() && isActive === false) {
      const error = new Error('Admins cannot deactivate their own account.');
      error.statusCode = 400;
      throw error;
    }

    user.isActive = Boolean(isActive);
    const updatedUser = await user.save();
    return updatedUser;
  }

  /**
   * [ADMIN] Onboard a new Admin user
   */
  async createAdminUser({ name, email, password }) {
    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      if (!user.isRemoved && user.role === 'admin') {
        const error = new Error('Admin already exists with this email address');
        error.statusCode = 400;
        throw error;
      }
      user.name = name;
      user.password = password;
      user.role = 'admin';
      user.isAdmin = true;
      user.isRemoved = false;
      user.isActive = true;
      await user.save();
    } else {
      user = await User.create({
        name,
        email: email.toLowerCase(),
        password,
        role: 'admin',
        isAdmin: true,
        isRemoved: false,
        isActive: true,
      });
    }

    return user;
  }

  /**
   * [ADMIN] Update User Role (Promote to Admin / Demote to Customer)
   */
  async updateUserRole(targetUserId, role) {
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

    user.role = role;
    user.isAdmin = role === 'admin';
    const updatedUser = await user.save();
    return updatedUser;
  }

  /**
   * [ADMIN] Soft delete a specific user/admin by numeric userId or _id
   */
  async softDeleteUserByAdmin(adminUserId, targetUserId) {
    const user = await this.findUserByIdentifier(targetUserId);
    if (!user || user.isRemoved) {
      const error = new Error('Target user account not found or already deleted');
      error.statusCode = 404;
      throw error;
    }

    if (user._id.toString() === adminUserId.toString()) {
      const error = new Error('Admins cannot soft-delete their own account via admin management. Use profile deletion instead.');
      error.statusCode = 400;
      throw error;
    }

    user.isRemoved = true;
    const deletedUser = await user.save();
    return deletedUser;
  }

  /**
   * [ADMIN] Restore / Undelete a soft-deleted user/admin account
   */
  async restoreUserByAdmin(targetUserId) {
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

    user.isRemoved = false;
    user.isActive = true;
    const restoredUser = await user.save();
    return restoredUser;
  }
}

module.exports = new UserService();
