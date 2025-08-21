const mongoose = require('mongoose');

const problemSetSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit'
  },
  problemIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    required: true
  }],
  ruleSnapshot: {
    perUnit: {
      type: Number
    },
    perCognitiveType: {
      개념: { type: Number },
      이해: { type: Number },
      응용: { type: Number }
    },
    perLevel: {
      상: { type: Number },
      중: { type: Number },
      하: { type: Number }
    },
    seed: {
      type: Number
    }
  },
  mode: {
    type: String,
    enum: ['diagnostic', 'unit', 'vocab_test']
  },
  title: {
    type: String
  }
}, {
  timestamps: true // createdAt, updatedAt 자동 생성
});

// 인덱스 설정
problemSetSchema.index({ userId: 1 });
problemSetSchema.index({ unitId: 1 });
problemSetSchema.index({ mode: 1 });
problemSetSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ProblemSet', problemSetSchema);
