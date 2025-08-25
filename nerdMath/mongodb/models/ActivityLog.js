const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  logId: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true,
    unique: true
  },
  userId: {
    type: Number,
    required: true
  },
  date: {
    type: String,
    required: true,
    // YYYY-MM-DD 형식
  },
  todaySolved: {
    type: Number,
    required: true,
    default: 0
  },
  studyDurationMin: {
    type: Number,
    required: true,
    default: 0
  },
  totalProblems: {
    type: Number,
    required: true,
    default: 0
  },
  totalStudyMinutes: {
    type: Number,
    required: true,
    default: 0
  },
  attendanceCount: {
    type: Number,
    required: true,
    default: 0
  }
}, {
  timestamps: true // createdAt, updatedAt 자동 생성
});

// 복합 인덱스 (사용자별 날짜별 활동 로그)
activityLogSchema.index({ userId: 1, date: 1 }, { unique: true });
activityLogSchema.index({ userId: 1 });
activityLogSchema.index({ date: 1 });
activityLogSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
