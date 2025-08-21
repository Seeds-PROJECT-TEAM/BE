const mongoose = require('mongoose');

const diagnosticTestSchema = new mongoose.Schema({
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true,
    unique: true
  },
  userId: {
    type: Number,
    required: true
  },
  gradeRange: {
    min: {
      type: Number,
      required: true,
      min: 1,
      max: 6
    },
    max: {
      type: Number,
      required: true,
      min: 1,
      max: 6
    }
  },
  problemSetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProblemSet',
    required: true
  },
  selectedRuleSnapshot: {
    perUnit: {
      type: Number
    },
    perCognitiveType: {
      type: Number
    },
    perLevel: {
      type: Number
    },
    seed: {
      type: Number
    }
  },
  startedAt: {
    type: Date,
    required: true
  },
  endedAt: {
    type: Date
  },
  durationSec: {
    type: Number
  },
  completed: {
    type: Boolean,
    required: true,
    default: false
  },
  restartCount: {
    type: Number,
    required: true,
    default: 0
  },
  timeoutMinutes: {
    type: Number,
    required: true,
    default: 30
  },
  shuffleSeed: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true // createdAt, updatedAt 자동 생성
});

// 인덱스 설정
diagnosticTestSchema.index({ userId: 1 });
diagnosticTestSchema.index({ testId: 1 });
diagnosticTestSchema.index({ problemSetId: 1 });
diagnosticTestSchema.index({ completed: 1 });
diagnosticTestSchema.index({ startedAt: -1 });

module.exports = mongoose.model('DiagnosticTest', diagnosticTestSchema);
