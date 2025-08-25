const mongoose = require('mongoose');

const characterSchema = new mongoose.Schema({
  characterId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: true
  },
  level: {
    type: Number,
    required: true,
    min: 1
  },
  description: {
    type: String,
    default: ''
  },
  isDefault: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 인덱스
characterSchema.index({ characterId: 1 }, { unique: true });
characterSchema.index({ gender: 1, level: 1 });
characterSchema.index({ isDefault: 1, isActive: 1 });

module.exports = mongoose.model('Character', characterSchema);
