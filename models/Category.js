const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a category name'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Please add a slug'],
      trim: true,
      lowercase: true,
    },
    icon: {
      type: String,
      default: '📦',
      trim: true,
    },
    isRemoved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.virtual('id').get(function () {
  return this._id ? this._id.toHexString() : undefined;
});

categorySchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    if (ret._id) {
      ret.id = ret._id.toString();
    }
    return ret;
  },
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
