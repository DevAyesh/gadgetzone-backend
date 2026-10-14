const dns = require('dns');
// Set public DNS to prevent Windows SRV lookup failures
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('../models/Product');
const Category = require('../models/Category');

async function migrate() {
  try {
    console.log('[MIGRATION] Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[MIGRATION] Connected to MongoDB Atlas successfully.');

    const categories = await Category.find({}).lean();
    console.log(`[MIGRATION] Found ${categories.length} categories.`);

    const catMap = new Map();
    categories.forEach((cat) => {
      if (cat._id) catMap.set(cat._id.toString(), cat.name);
      if (cat.id) catMap.set(String(cat.id), cat.name);
      if (cat.slug) catMap.set(cat.slug.toLowerCase(), cat.name);
      if (cat.name) catMap.set(cat.name.toLowerCase(), cat.name);
    });

    const products = await Product.find({});
    console.log(`[MIGRATION] Checking ${products.length} products in database...`);

    let updatedCount = 0;
    for (const p of products) {
      const currentCat = String(p.category || '').trim();
      let newCat = null;

      if (catMap.has(currentCat)) {
        newCat = catMap.get(currentCat);
      } else if (catMap.has(currentCat.toLowerCase())) {
        newCat = catMap.get(currentCat.toLowerCase());
      } else if (/^[0-9a-fA-F]{24}$/.test(currentCat)) {
        const found = await Category.findById(currentCat);
        if (found && found.name) {
          newCat = found.name;
        }
      }

      if (newCat && newCat !== currentCat) {
        console.log(`[MIGRATION] Updating Product "${p.name}": Category "${currentCat}" -> "${newCat}"`);
        p.category = newCat;
        await p.save();
        updatedCount++;
      }
    }

    console.log(`[MIGRATION COMPLETED] Successfully updated ${updatedCount} product(s).`);
    process.exit(0);
  } catch (err) {
    console.error('[MIGRATION ERROR]', err);
    process.exit(1);
  }
}

migrate();
