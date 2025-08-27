const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
  problem_id: { // Added for alternative lookup
    type: String,
    unique: true,
    sparse: true
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true
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
  context: {
    source: {
      type: String,
      required: true
    },
    year: {
      type: Number
    },
    region: {
      type: String
    }
  },
  cognitiveType: {
    type: String,
    required: true,
    enum: ['understanding', 'application', 'analysis']
  },
  level: {
    type: String,
    required: true,
    enum: ['easy', 'medium', 'hard']
  },
  type: {
    type: String,
    required: true,
    enum: ['multiple_choice', 'short_answer', 'essay']
  },
  tags: [{
    type: String
  }],
  content: {
    question: { type: String, required: true },
    options: [{ type: String }],
    correctAnswer: { type: String, required: true },  // 다시 content 안으로
    explanation: { type: String }  // 다시 content 안으로
  },
  imageUrl: {
    type: String
  },
  diagnosticTest: {
    type: Boolean,
    default: false
  },
  diagnosticUnit: {
    type: String,
    enum: ['middle_1', 'middle_1_2', 'middle_1_3'],
    required: function() {
      return this.diagnosticTest === true; // 진단테스트용인 경우에만 필수
    }
  }
}, {
  timestamps: true // createdAt, updatedAt auto-generation
});

// 인덱스 설정
problemSchema.index({ unitId: 1 });
problemSchema.index({ grade: 1, chapter: 1 });
problemSchema.index({ problem_id: 1 });
problemSchema.index({ level: 1 });
problemSchema.index({ cognitiveType: 1 });
problemSchema.index({ diagnosticTest: 1 });
problemSchema.index({ diagnosticUnit: 1 });

module.exports = mongoose.model('Problem', problemSchema);
