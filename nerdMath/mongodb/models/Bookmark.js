const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true
  },
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    required: true
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit'
  },
  bookmarkedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // createdAt, updatedAt 자동 생성
});

// 복합 인덱스 (중복 북마크 방지)
bookmarkSchema.index({ userId: 1, problemId: 1 }, { unique: true });
bookmarkSchema.index({ userId: 1, bookmarkedAt: -1 });
bookmarkSchema.index({ userId: 1, unitId: 1 });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
