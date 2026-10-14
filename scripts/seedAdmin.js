require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gadgetzone.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
    const adminName = process.env.ADMIN_NAME || 'Super Admin';

    let admin = await User.findOne({ email: adminEmail.toLowerCase() });

    if (admin) {
      admin.role = 'admin';
      admin.isAdmin = true;
      admin.isSuperAdmin = true;
      admin.isActive = true;
      admin.isRemoved = false;
      admin.password = adminPassword;
      await admin.save();
      console.log(`[SEED SUCCESS] EXISTING USER PROMOTED/RESET AS ADMIN: ${admin.email.toUpperCase()} (USER ID: ${admin.userId || admin._id})`);
    } else {
      admin = await User.create({
        name: adminName,
        email: adminEmail.toLowerCase(),
        password: adminPassword,
        role: 'admin',
        isAdmin: true,
        isSuperAdmin: true,
        isActive: true,
        isRemoved: false,
      });
      console.log(`[SEED SUCCESS] FIRST SUPER ADMIN CREATED SUCCESSFULLY: ${admin.email.toUpperCase()} (USER ID: ${admin.userId || admin._id})`);
    }

    // Ensure akilamw772@gmail.com is promoted to Super Admin
    const mongoose = require('mongoose');
    const targetEmail = 'akilamw772@gmail.com';
    const targetId = '6acf103c7811fcef933ce80b';
    let targetUser = await User.findOne({
      $or: [
        { email: targetEmail.toLowerCase() },
        ...(mongoose.Types.ObjectId.isValid(targetId) ? [{ _id: targetId }] : []),
      ],
    });
    if (targetUser) {
      targetUser.email = targetEmail.toLowerCase();
      targetUser.role = 'admin';
      targetUser.isAdmin = true;
      targetUser.isSuperAdmin = true;
      targetUser.isActive = true;
      targetUser.isRemoved = false;
      targetUser.isEmailVerified = true;
      await targetUser.save();
      console.log(`[SEED SUCCESS] PROMOTED ${targetEmail} TO SUPER ADMIN: (USER ID: ${targetUser.userId || targetUser._id})`);
    } else {
      targetUser = await User.create({
        ...(mongoose.Types.ObjectId.isValid(targetId) ? { _id: targetId } : {}),
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
      console.log(`[SEED SUCCESS] CREATED ${targetEmail} AS SUPER ADMIN: (USER ID: ${targetUser.userId || targetUser._id})`);
    }

    console.log(`\nADMIN CREDENTIALS FOR TESTING:`);
    console.log(`EMAIL: ${adminEmail}`);
    console.log(`PASSWORD: ${adminPassword}\n`);

    return { admin, targetUser };
  } catch (error) {
    console.error(`[SEED ERROR] FAILED TO SEED ADMIN USER: ${error.message.toUpperCase()}`);
    throw error;
  }
};

if (require.main === module) {
  seedAdmin()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedAdmin;
