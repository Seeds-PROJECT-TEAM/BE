const express = require('express');
const router = express.Router();
const { Problem } = require('../models');

// 문제 단건 조회 API (API 명세에 맞춤)
router.get('/:problemId', async (req, res) => {
  try {
    const { problemId } = req.params;
    
    let problem;
    
    // ObjectId 형식인지 확인
    if (require('mongoose').Types.ObjectId.isValid(problemId)) {
      // MongoDB _id로 조회
      problem = await Problem.findById(problemId);
    } else {
      // problem_id로 조회 (문자열)
      problem = await Problem.findOne({ problem_id: problemId });
    }
    
    if (!problem) {
      return res.status(404).json({
        error: 'Problem not found'
      });
    }

    // API 명세에 맞는 응답 형식
    const response = {
      problemId: problem._id.toString(),
      unitId: problem.unitId ? problem.unitId.toString() : null,
      grade: problem.grade,
      chapter: problem.chapter,
      context: problem.context,
      cognitiveType: problem.cognitiveType,
      level: problem.level,
      type: problem.type,
      tags: problem.tags,
      content: {
        stem: { text: problem.content.question },
        choices: problem.content.options ? problem.content.options.map((option, index) => ({
          key: String.fromCharCode(9312 + index), // ①, ②, ③...
          text: option
        })) : []
      },
      imageUrl: problem.imageUrl,
      createdAt: problem.createdAt ? problem.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: problem.updatedAt ? problem.updatedAt.toISOString() : new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching problem:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;
