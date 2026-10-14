require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
const User = require('../models/User');

// Fix for local Windows DNS SRV lookup error (active in development only)
if (process.env.NODE_ENV !== 'production') {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch (_e) {
    // fallback
  }
}

const promoteSuperAdmin = async () => {
  const targetEmail = 'akilamw772@gmail.com';
  const targetId = '6acf103c7811fcef933ce80b';

  try {
    console.log('[PROMOTION] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[PROMOTION] Connected successfully.');

    // Find by email or targetId
    let user = await User.findOne({
      $or: [
        { email: targetEmail.toLowerCase() },
        ...(mongoose.Types.ObjectId.isValid(targetId) ? [{ _id: targetId }] : []),
      ],
    });

    if (user) {
      console.log(`[PROMOTION] Found existing user: ${user.email} (ID: ${user._id})`);
      user.email = targetEmail.toLowerCase();
      user.role = 'admin';
      user.isAdmin = true;
      user.isSuperAdmin = true;
      user.isActive = true;
      user.isRemoved = false;
      user.isEmailVerified = true;
      await user.save();
      console.log(`[PROMOTION SUCCESS] User ${user.email} successfully promoted to Super Admin!`);
    } else {
      console.log(`[PROMOTION] User not found. Creating user ${targetEmail} as Super Admin...`);
      user = new User({
        ...(mongoose.Types.ObjectId.isValid(targetId) ? { _id: new mongoose.Types.ObjectId(targetId) } : {}),
        name: 'Akila',
        email: targetEmail.toLowerCase(),
        password: 'SuperAdminPassword123!',
        role: 'admin',
        isAdmin: true,
        isSuperAdmin: true,
        isActive: true,
        isRemoved: false,
        isEmailVerified: true,
      });
      await user.save();
      console.log(`[PROMOTION SUCCESS] Super Admin created: ${user.email} (ID: ${user._id})`);
    }

    // Verify by reloading
    const verifiedUser = await User.findOne({ email: targetEmail.toLowerCase() });
    console.log('\n[VERIFIED SUPER ADMIN USER RECORD]:');
    console.log({
      _id: verifiedUser._id.toString(),
      userId: verifiedUser.userId,
      name: verifiedUser.name,
      email: verifiedUser.email,
      role: verifiedUser.role,
      isAdmin: verifiedUser.isAdmin,
      isSuperAdmin: verifiedUser.isSuperAdmin,
      isActive: verifiedUser.isActive,
      isRemoved: verifiedUser.isRemoved,
      isEmailVerified: verifiedUser.isEmailVerified,
    });

    await mongoose.disconnect();
    console.log('[PROMOTION] MongoDB connection closed.');
    return verifiedUser;
  } catch (error) {
    console.error(`[PROMOTION ERROR] Failed: ${error.message}`);
    throw error;
  }
};

if (require.main === module) {
  promoteSuperAdmin()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = promoteSuperAdmin;
