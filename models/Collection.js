const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a collection name'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Please add a slug'],
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    image: {
      type: String,
      default: '',
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

collectionSchema.virtual('id').get(function () {
  return this._id ? this._id.toHexString() : undefined;
});

collectionSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    if (ret._id) {
      ret.id = ret._id.toString();
    }
    return ret;
  },
});

const Collection = mongoose.model('Collection', collectionSchema);

module.exports = Collection;
