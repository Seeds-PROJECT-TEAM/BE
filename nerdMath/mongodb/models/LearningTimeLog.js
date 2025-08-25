const mongoose = require('mongoose');

const learningTimeLogSchema = new mongoose.Schema({
  learningTimeId: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true,
    unique: true
  },
  userId: {
    type: Number,
    required: true
  },
  activityType: {
    type: String,
    enum: ['concept', 'vocab', 'problem'],
    required: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId
    // 선택적 필드 (진단테스트, 문제세트 등에 사용)
  },
  startedAt: {
    type: Date,
    required: true
  },
  endedAt: {
    type: Date
  },
  durationSeconds: {
    type: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // createdAt, updatedAt 자동 생성
});

// 인덱스 설정
learningTimeLogSchema.index({ userId: 1 });
learningTimeLogSchema.index({ activityType: 1 });
learningTimeLogSchema.index({ contentId: 1 });
learningTimeLogSchema.index({ sessionId: 1 });
learningTimeLogSchema.index({ startedAt: -1 });
learningTimeLogSchema.index({ userId: 1, startedAt: -1 });

module.exports = mongoose.model('LearningTimeLog', learningTimeLogSchema);
