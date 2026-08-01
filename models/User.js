const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Counter = require('./Counter');

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        // Password required only if not signing in with Google
        return !this.googleId;
      },
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    googleId: {
      type: String,
      default: null,
    },
    avatar: {
      type: String,
      default: '',
    },
    phoneNumber: {
      type: String,
      default: '',
    },
    address_line1: {
      type: String,
      default: '',
    },
    address_line2: {
      type: String,
      default: '',
    },
    city: {
      type: Number,
      default: null, // Master data City ID
    },
    province: {
      type: Number,
      default: null, // Master data Province ID
    },
    gender: {
      type: Number,
      default: null, // Master data Gender ID
    },
    isEmailVerified: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
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

// Pre-save hook for auto-increment userId & password hashing
userSchema.pre('save', async function () {
  if (this.isNew && !this.userId) {
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'userId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.userId = counter.seq;
  }

  if (this.role === 'admin') {
    this.isAdmin = true;
  } else if (this.isAdmin) {
    this.role = 'admin';
  } else {
    this.role = 'customer';
    this.isAdmin = false;
  }

  if (!this.isModified('password') || !this.password) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Clean object serialization DTO
userSchema.methods.toAuthDTO = function (token = null) {
  const dto = {
    _id: this._id,
    userId: this.userId,
    name: this.name,
    email: this.email,
    role: this.role,
    isAdmin: this.isAdmin,
    avatar: this.avatar,
    phoneNumber: this.phoneNumber,
    address_line1: this.address_line1,
    address_line2: this.address_line2,
    city: this.city,
    province: this.province,
    gender: this.gender,
    isEmailVerified: this.isEmailVerified,
    isActive: this.isActive,
    isRemoved: this.isRemoved,
  };
  if (token) {
    dto.token = token;
  }
  return dto;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
