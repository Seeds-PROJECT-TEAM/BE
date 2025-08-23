const mongoose = require('mongoose');

const xpTransactionSchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true,
    unique: true
  },
  userId: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  reason: {
    type: String,
    enum: ['concept_completed', 'problem_solved', 'vocab_solved', 'unit_completed', 'correct_answer', 'streak_bonus'],
    required: true
  },
  reasonRef: {
    type: String,
    default: null
  },
  idempotencyKey: {
    type: String,
    required: true
  },
  at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 인덱스
xpTransactionSchema.index({ transactionId: 1 }, { unique: true });
xpTransactionSchema.index({ userId: 1, at: -1 });
xpTransactionSchema.index({ idempotencyKey: 1 }, { unique: true });
xpTransactionSchema.index({ reason: 1 });

module.exports = mongoose.model('XpTransaction', xpTransactionSchema);
