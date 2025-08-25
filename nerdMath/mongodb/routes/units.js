const express = require('express');
const router = express.Router();
const { Unit, ProblemSet, Problem, AnswerAttempt } = require('../models');

// 문제 정렬 함수
function sortProblemsByCognitiveType(problems) {
  const sortOrder = ['understanding', 'application', 'analysis'];
  const levelOrder = ['easy', 'medium', 'hard'];
  
  return problems.sort((a, b) => {
    // 1. 인지 수준별 정렬
    const aIndex = sortOrder.indexOf(a.cognitiveType);
    const bIndex = sortOrder.indexOf(b.cognitiveType);
    if (aIndex !== bIndex) return aIndex - bIndex;
    
    // 2. 난이도별 정렬
    const aLevelIndex = levelOrder.indexOf(a.level);
    const bLevelIndex = levelOrder.indexOf(b.level);
    return aLevelIndex - bLevelIndex;
  });
}

// 소단원 목록 조회 (대단원별 필터링)
router.get('/', async (req, res) => {
  try {
    const { grade, chapter, cursor, limit = 40 } = req.query;
    
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

    // 응답 데이터 변환
    const formattedUnits = units.map(unit => ({
      unitId: unit.unitId,
      subject: unit.subject || 'math',
      title: {
        ko: unit.title,
        en: unit.titleEn || unit.title
      },
      grade: unit.grade,
      chapter: unit.chapter,
      chapterTitle: unit.chapterTitle || `제${unit.chapter}장`,
      orderInGrade: unit.orderInGrade,
      description: {
        ko: unit.description || '',
        en: unit.descriptionEn || unit.description || ''
      },
      status: unit.status,
      createdAt: unit.createdAt ? unit.createdAt.toISOString() : new Date().toISOString()
    }));

    res.json({
      items: formattedUnits,
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

    // 응답 데이터 변환
    const formattedUnit = {
      unitId: unit.unitId,
      subject: unit.subject || 'math',
      title: {
        ko: unit.title,
        en: unit.titleEn || unit.title
      },
      grade: unit.grade,
      chapter: unit.chapter,
      chapterTitle: unit.chapterTitle || `제${unit.chapter}장`,
      orderInGrade: unit.orderInGrade,
      description: {
        ko: unit.description || '',
        en: unit.descriptionEn || unit.description || ''
      },
      status: unit.status
    };

    res.json(formattedUnit);
  } catch (error) {
    console.error('Error fetching unit:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// 소단원의 첫 번째 문제 + 문제 ID 배열 조회 (이어풀기 기능 포함)
router.get('/:unitId/first-problem', async (req, res) => {
  try {
    const { unitId } = req.params;
    const { userId } = req.query; // 이어풀기용 (선택사항)
    
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

    // 모든 문제 조회
    const problems = await Problem.find({ _id: { $in: problemSet.problemIds } });
    
    // 정렬된 문제 배열
    const sortedProblems = sortProblemsByCognitiveType(problems);
    const sortedProblemIds = sortedProblems.map(p => p._id.toString());

    // 이어풀기 로직
    let targetProblem = sortedProblems[0]; // 기본값: 첫 번째 문제
    let isFirstTime = true;
    let progress = {
      completed: 0,
      total: sortedProblems.length,
      remaining: sortedProblems.length,
      percentage: 0.0
    };

    if (userId) {
      // 사용자가 풀은 문제들 조회 (현재 단원의 문제들만)
      const answeredProblems = await AnswerAttempt.find({
        userId: parseInt(userId),
        unitId: unit._id,
        mode: 'practice',
        problemId: { $in: problemSet.problemIds } // 현재 단원 문제만 필터링
      });

      // 중복 제거 (같은 문제를 여러 번 풀었을 수 있음)
      const uniqueAnsweredIds = [...new Set(answeredProblems.map(a => a.problemId.toString()))];
      
      // 다음에 풀 문제 찾기
      const nextProblem = sortedProblems.find(p => !uniqueAnsweredIds.includes(p._id.toString()));
      
      if (nextProblem) {
        targetProblem = nextProblem;
        isFirstTime = false;
        progress = {
          completed: uniqueAnsweredIds.length,
          total: sortedProblems.length,
          remaining: sortedProblems.length - uniqueAnsweredIds.length,
          percentage: Math.round((uniqueAnsweredIds.length / sortedProblems.length) * 100 * 100) / 100
        };
      } else {
        // 모든 문제를 완료한 경우
        targetProblem = null;
        isFirstTime = false;
        progress = {
          completed: sortedProblems.length,
          total: sortedProblems.length,
          remaining: 0,
          percentage: 100.0
        };
      }
    }

    // 응답 구성
    const response = {
      problem: targetProblem ? {
        problemId: targetProblem._id.toString(),
        unitId: targetProblem.unitId ? targetProblem.unitId.toString() : unit._id.toString(),
        grade: targetProblem.grade,
        chapter: targetProblem.chapter,
        context: {
          source: targetProblem.context?.source || "교과서",
          for: targetProblem.context?.for || ["diagnostic"]
        },
        cognitiveType: targetProblem.cognitiveType === 'understanding' ? '이해' : 
                      targetProblem.cognitiveType === 'application' ? '적용' : 
                      targetProblem.cognitiveType === 'analysis' ? '응용' : targetProblem.cognitiveType,
        level: targetProblem.level === 'easy' ? '하' : 
               targetProblem.level === 'medium' ? '중' : 
               targetProblem.level === 'hard' ? '상' : targetProblem.level,
        type: targetProblem.type === 'multiple_choice' ? '객관식' : 
              targetProblem.type === 'short_answer' ? '단답식' : 
              targetProblem.type === 'essay' ? '서술형' : targetProblem.type,
        tags: targetProblem.tags,
        content: {
          stem: { text: targetProblem.content.question },
          choices: targetProblem.content.options ? targetProblem.content.options.map((option, index) => ({
            key: String.fromCharCode(9312 + index), // ①, ②, ③...
            text: option
          })) : []
        },
        imageUrl: targetProblem.imageUrl,
        createdAt: targetProblem.createdAt ? targetProblem.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: targetProblem.updatedAt ? targetProblem.updatedAt.toISOString() : new Date().toISOString()
      } : null,
      problemIds: sortedProblemIds,
      progress: progress,
      sortedBy: "cognitiveType",
      sortOrder: ["이해", "적용", "응용"],
      isFirstTime: isFirstTime
    };

    // 완료된 경우 메시지 추가
    if (targetProblem === null) {
      response.message = "모든 문제를 완료했습니다!";
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching first problem:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;
