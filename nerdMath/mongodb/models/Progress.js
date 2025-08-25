const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  progressId: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true,
    unique: true
  },
  userId: {
    type: Number,
    required: true
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: false, // 빈출 어휘는 unitId가 null
    default: null
  },
  category: {
    type: String,
    enum: ['unit', 'frequent'], // 소단원별 / 빈출
    required: true,
    default: 'unit'
  },
  conceptProgress: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    max: 100
  },
  problemProgress: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    max: 100
  },
  vocabProgress: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    max: 100
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // createdAt, updatedAt 자동 생성
});

// 복합 인덱스 (사용자별 단원별/카테고리별 진행률)
progressSchema.index({ userId: 1, unitId: 1, category: 1 }, { unique: true });
// 기존 인덱스 제거를 위한 임시 인덱스 (마이그레이션 후 삭제 예정)
// progressSchema.index({ userId: 1, unitId: 1 }, { unique: true });
progressSchema.index({ userId: 1 });
progressSchema.index({ unitId: 1 });
progressSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Progress', progressSchema);
