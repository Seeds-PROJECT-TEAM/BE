const mongoose = require('mongoose');

const gamificationStateSchema = new mongoose.Schema({
  gamifiId: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true,
    unique: true
  },
  userId: {
    type: Number,
    required: true,
    unique: true
  },
  level: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  xp: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  totalXp: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  nextLevelXp: {
    type: Number,
    required: true,
    default: 50
  },
  equippedCharacterId: {
    type: String,
    required: true,
    default: 'char_default_male_lv1'
  },
  lastLeveledUpAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// 인덱스
gamificationStateSchema.index({ userId: 1 }, { unique: true });
gamificationStateSchema.index({ level: 1 });
gamificationStateSchema.index({ totalXp: -1 });

module.exports = mongoose.model('GamificationState', gamificationStateSchema);
