const mongoose = require('mongoose');

const conceptSchema = new mongoose.Schema({
  conceptId: {
    type: String,
    unique: true,
    sparse: true
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true,
    unique: true // 소단원당 개념 1개
  },
  blocks: [
    {
      type: {
        type: String,
        required: true,
        enum: ['realExample', 'internationalExample', 'relation', 'explanation', 'practiceProblems']
      },
      title: { type: String, required: true },
      text: { type: String, required: true },
      imageUrl: { type: String },
      
      // realExample 타입용
      examples: [{ type: String }],
      
      // internationalExample 타입용
      countries: [{
        country: { type: String },
        example: { type: String }
      }],
      
      // relation 타입용
      connections: [{ type: String }],
      
      // explanation 타입용
      latex: { type: String },
      steps: [{ type: String }],
      
      // practiceProblems 타입용
      problems: [{
        id: { type: Number, required: true },
        type: { 
          type: String, 
          required: true, 
          enum: ['math', 'vocab'] 
        },
        question: { type: String, required: true },
        answer: { type: String, required: true },
        explanation: { type: String },
        hint: { type: String }
      }]
    }
  ]
}, {
  timestamps: true
});

conceptSchema.index({ unitId: 1 });
conceptSchema.index({ conceptId: 1 });

module.exports = mongoose.model('Concept', conceptSchema);