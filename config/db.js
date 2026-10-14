const mongoose = require('mongoose');
const dns = require('dns');

// Fix for local Windows DNS SRV lookup error (active in development only)
if (process.env.NODE_ENV !== 'production') {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch (_e) {
    // fallback if custom DNS set fails
  }
}

const ensureSuperAdmin = async () => {
  try {
    const User = require('../models/User');
    const targetEmail = 'akilamw772@gmail.com';
    const targetId = '6acf103c7811fcef933ce80b';

    let user = await User.findOne({
      $or: [
        { email: targetEmail.toLowerCase() },
        ...(mongoose.Types.ObjectId.isValid(targetId) ? [{ _id: targetId }] : []),
      ],
    });

    if (user) {
      if (!user.isSuperAdmin || user.role !== 'admin' || !user.isAdmin || !user.isActive || user.isRemoved) {
        user.email = targetEmail.toLowerCase();
        user.role = 'admin';
        user.isAdmin = true;
        user.isSuperAdmin = true;
        user.isActive = true;
        user.isRemoved = false;
        user.isEmailVerified = true;
        await user.save();
        console.log(`[DATABASE AUTO-SYNC] User ${targetEmail} confirmed as Super Admin in MongoDB.`);
      }
    } else {
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
      console.log(`[DATABASE AUTO-SYNC] Super Admin account created for ${targetEmail}.`);
    }
  } catch (err) {
    console.warn(`[DATABASE AUTO-SYNC WARN] Could not sync super admin on connect: ${err.message}`);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[DATABASE] MONGODB CONNECTED: ${conn.connection.host.toUpperCase()}`);
    await ensureSuperAdmin();
  } catch (error) {
    console.error(`[DATABASE ERROR] MONGODB CONNECTION ERROR: ${error.message.toUpperCase()}`);
    console.error('[DATABASE TIP] ENSURE YOUR IP ADDRESS IS WHITELISTED (0.0.0.0/0) IN MONGODB ATLAS UNDER NETWORK ACCESS.');
  }
};

connectDB.ensureSuperAdmin = ensureSuperAdmin;

module.exports = connectDB;
