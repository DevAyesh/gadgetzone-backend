const mongoose = require('mongoose');
const dns = require('dns');

// Fix for local Windows DNS SRV lookup error (active in development only)
if (process.env.NODE_ENV !== 'production') {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch (e) {
    // fallback if custom DNS set fails
  }
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[DATABASE] MONGODB CONNECTED: ${conn.connection.host.toUpperCase()}`);
  } catch (error) {
    console.error(`[DATABASE ERROR] MONGODB CONNECTION ERROR: ${error.message.toUpperCase()}`);
    console.error('[DATABASE TIP] ENSURE YOUR IP ADDRESS IS WHITELISTED (0.0.0.0/0) IN MONGODB ATLAS UNDER NETWORK ACCESS.');
  }
};

module.exports = connectDB;
