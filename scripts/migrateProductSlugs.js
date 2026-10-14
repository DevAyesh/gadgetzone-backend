const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const Product = require('../models/Product');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  const products = await Product.find({}).lean();
  console.log('Found', products.length, 'products');
  let count = 0;
  for (const p of products) {
    if (p.name) {
      const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      await Product.updateOne({ _id: p._id }, { $set: { slug } });
      count++;
      console.log('Updated:', p.name, '-> slug:', slug);
    }
  }
  await mongoose.disconnect();
  console.log('Migration completed successfully! Total updated:', count);
}

migrate().catch(console.error);
