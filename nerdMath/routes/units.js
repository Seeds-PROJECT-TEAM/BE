const express = require('express');
const router = express.Router();
const { Unit, Problem, ProblemSet } = require('../models');

// 소단원 목록 조회 (대단원별 필터링)
router.get('/', async (req, res) => {
  try {
    const { grade, chapter, cursor, limit = 20 } = req.query;
    
    // 필수 파라미터 검증
    if (!grade || !chapter) {
      return res.status(400).json({
        error: 'grade and chapter are required'
      });
    }

    // 쿼리 조건 구성
    const query = {
      grade: parseInt(grade),
      chapter: parseInt(chapter),
      status: 'active'
    };

    // 커서 기반 페이징
    if (cursor) {
      query.orderInGrade = { $gt: parseInt(cursor) };
    }

    const units = await Unit.find(query)
      .sort({ orderInGrade: 1 })
      .limit(parseInt(limit));

    // 다음 커서 계산
    const nextCursor = units.length > 0 ? units[units.length - 1].orderInGrade : null;

    res.json({
      items: units,
      nextCursor: nextCursor
    });
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// 소단원 단건 조회
router.get('/:unitId', async (req, res) => {
  try {
    const { unitId } = req.params;
    
    const unit = await Unit.findOne({ unitId });
    
    if (!unit) {
      return res.status(404).json({
        error: 'Unit not found'
      });
    }

    res.json(unit);
  } catch (error) {
    console.error('Error fetching unit:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// 소단원의 첫 번째 문제 + 문제 ID 배열 조회
router.get('/:unitId/first-problem', async (req, res) => {
  try {
    const { unitId } = req.params;
    
    // 소단원 존재 확인
    const unit = await Unit.findOne({ unitId });
    if (!unit) {
      return res.status(404).json({
        error: 'Unit not found'
      });
    }

    // 해당 소단원의 문제세트 찾기
    const problemSet = await ProblemSet.findOne({ unitId: unit._id });
    if (!problemSet || !problemSet.problemIds || problemSet.problemIds.length === 0) {
      return res.status(404).json({
        error: 'No problem set found for this unit'
      });
    }

    // 첫 번째 문제 조회
    const firstProblemId = problemSet.problemIds[0];
    const firstProblem = await Problem.findById(firstProblemId);
    
    if (!firstProblem) {
      return res.status(404).json({
        error: 'First problem not found'
      });
    }

    // API 명세에 맞는 응답 형식
    const problemResponse = {
      problemId: firstProblem._id.toString(),
      unitId: firstProblem.unitId ? firstProblem.unitId.toString() : unitId,
      grade: firstProblem.grade,
      chapter: firstProblem.chapter,
      context: firstProblem.context,
      cognitiveType: firstProblem.cognitiveType,
      level: firstProblem.level,
      type: firstProblem.type,
      tags: firstProblem.tags,
      content: {
        stem: { text: firstProblem.content.question },
        choices: firstProblem.content.options ? firstProblem.content.options.map((option, index) => ({
          key: String.fromCharCode(9312 + index), // ①, ②, ③...
          text: option
        })) : []
      },
      imageUrl: firstProblem.imageUrl,
      createdAt: firstProblem.createdAt ? firstProblem.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: firstProblem.updatedAt ? firstProblem.updatedAt.toISOString() : new Date().toISOString()
    };

    // problemIds 배열을 문자열로 변환
    const problemIds = problemSet.problemIds.map(id => id.toString());

    res.json({
      problem: problemResponse,
      problemIds: problemIds
    });
  } catch (error) {
    console.error('Error fetching first problem:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;
