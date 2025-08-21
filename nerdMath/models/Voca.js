const mongoose = require('mongoose');

const vocaSchema = new mongoose.Schema({
  vocaId: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['일반', '복습', '테스트'],
    required: true
  },
  category: {
    type: String,
    enum: ['math_term', 'sat_act'],
    required: true
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit'
    // math_term일 때만 필수, sat_act일 때는 없을 수 있음
  },
  word: {
    type: String,
    required: true
  },
  meaning: {
    type: String,
    required: true
  },
  etymology: {
    type: String
    // 조건부 필수: 어근/접두사 설명
  },
  imageUrl: {
    type: String
    // 조건부 필수: 시각 자료 이미지 URL
  }
}, {
  timestamps: true // createdAt, updatedAt 자동 생성
});

// 인덱스 설정
vocaSchema.index({ unitId: 1 });
vocaSchema.index({ category: 1 });
vocaSchema.index({ type: 1 });
vocaSchema.index({ word: 1 });

module.exports = mongoose.model('Voca', vocaSchema);

