const mongoose = require('mongoose');

const diagnosticAnalysisSchema = new mongoose.Schema({
  analysisId: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true,
    unique: true
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DiagnosticTest',
    required: true
  },
  userId: {
    type: Number,
    required: true
  },
  analysisType: {
    type: String,
    enum: ['diagnostic'],
    required: true,
    default: 'diagnostic'
  },
  aiComment: {
    type: String,
    required: true
  },
  recommendedPath: [{
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Unit',
      required: true
    },
    unitTitle: {
      type: String,
      required: true
    },
    priority: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      required: true
    }
  }],
  class: {
    type: String,
    enum: ['pre-nerd', 'nerd'],
    required: true
  },
  generatedAt: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  timestamps: true // createdAt, updatedAt 자동 생성
});

// 인덱스 설정
diagnosticAnalysisSchema.index({ testId: 1 });
diagnosticAnalysisSchema.index({ userId: 1 });
diagnosticAnalysisSchema.index({ analysisId: 1 });
diagnosticAnalysisSchema.index({ generatedAt: -1 });

module.exports = mongoose.model('DiagnosticAnalysis', diagnosticAnalysisSchema);
