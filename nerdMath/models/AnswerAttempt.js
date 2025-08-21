const mongoose = require('mongoose');

const answerAttemptSchema = new mongoose.Schema({
  answerId: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true,
    unique: true
  },
  userId: {
    type: Number,
    required: true
  },
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    required: true
  },
  vocaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Voca'
    // 어휘 테스트에서 어휘 카드 ID 참조
  },
  mode: {
    type: String,
    enum: ['diagnostic', 'practice', 'vocab_test'],
    required: true
  },
  setId: {
    type: mongoose.Schema.Types.ObjectId
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true
  },
  userAnswer: {
    value: {
      type: String,
      required: true
    },
    selectedOption: {
      type: Number
    },
    textAnswer: {
      type: String
    }
  },
  isCorrect: {
    type: Boolean,
    required: function() {
      // 진단 테스트 모드에서는 나중에 채점하므로 null 허용
      return this.mode !== 'diagnostic';
    }
  },
  scoredAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  explanationShown: {
    type: Boolean,
    default: false
  },
  problemOrderIndex: {
    type: Number
  },
  idempotencyKey: {
    type: String
  }
}, {
  timestamps: true // createdAt, updatedAt 자동 생성
});


// 인덱스 설정
answerAttemptSchema.index({ userId: 1 });
answerAttemptSchema.index({ problemId: 1 });
answerAttemptSchema.index({ vocaId: 1 }); // 어휘 테스트용 인덱스 추가
answerAttemptSchema.index({ setId: 1 });
answerAttemptSchema.index({ unitId: 1 });
answerAttemptSchema.index({ scoredAt: -1 });
answerAttemptSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('AnswerAttempt', answerAttemptSchema);
