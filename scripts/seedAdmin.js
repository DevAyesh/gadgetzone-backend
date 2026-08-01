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
        isActive: true,
        isRemoved: false,
      });
      console.log(`[SEED SUCCESS] FIRST SUPER ADMIN CREATED SUCCESSFULLY: ${admin.email.toUpperCase()} (USER ID: ${admin.userId || admin._id})`);
    }

    console.log(`\nADMIN CREDENTIALS FOR TESTING:`);
    console.log(`EMAIL: ${adminEmail}`);
    console.log(`PASSWORD: ${adminPassword}\n`);

    process.exit(0);
  } catch (error) {
    console.error(`[SEED ERROR] FAILED TO SEED ADMIN USER: ${error.message.toUpperCase()}`);
    process.exit(1);
  }
};

seedAdmin();
