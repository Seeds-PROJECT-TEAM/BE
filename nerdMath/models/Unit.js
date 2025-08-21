const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  unitId: {
    type: String,
    required: true,
    unique: true
  },
  subject: {
    type: String,
    required: true,
    enum: ['math', 'science', 'english']
  },
  title: {
    ko: { type: String, required: true },
    en: { type: String, required: true }
  },
  grade: {
    type: Number,
    required: true,
    min: 1,
    max: 6
  },
  chapter: {
    type: Number,
    required: true,
    min: 1
  },
  chapterTitle: {
    type: String,
    required: true
  },
  orderInGrade: {
    type: Number,
    required: true
  },
  description: {
    ko: { type: String }
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'hidden'],
    default: 'active'
  }
}, {
  timestamps: true
});

// 인덱스 설정
unitSchema.index({ grade: 1, chapter: 1 });
unitSchema.index({ unitId: 1 });
unitSchema.index({ status: 1 });

module.exports = mongoose.model('Unit', unitSchema);
