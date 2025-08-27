const express = require('express');
const router = express.Router();
const { DiagnosticTest, DiagnosticAnalysis, Unit, ProblemSet, Problem, AnswerAttempt } = require('../models');
const { createHttpError, ERROR_CODES } = require('../utils/errorHandler');

// 타임아웃 체크 함수
async function checkTimeout(diagnosticTest) {
  const now = new Date();
  const timeDiff = (now - diagnosticTest.startedAt) / (1000 * 60); // 분 단위
  
  if (timeDiff > diagnosticTest.timeoutMinutes) {
    // 타임아웃 발생 - 자동 완료 처리
    diagnosticTest.completed = true;
    diagnosticTest.endedAt = now;
    diagnosticTest.durationSec = Math.floor((now - diagnosticTest.startedAt) / 1000);
    await diagnosticTest.save();
    return true; // 타임아웃 발생
  }
  return false; // 타임아웃 없음
}

// 문제 순서 셔플 함수
function shuffleProblems(problemIds, seed) {
  const shuffled = [...problemIds];
  let currentSeed = seed;
  
  // Fisher-Yates 셔플 알고리즘
  for (let i = shuffled.length - 1; i > 0; i--) {
    currentSeed = (currentSeed * 9301 + 49297) % 233280; // 간단한 난수 생성
    const j = Math.floor((currentSeed / 233280) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

// 1-1. 진단 자격 확인
router.get('/eligibility', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json(createHttpError(400, 'userId는 필수입니다', ['userId']));
    }

    // 완료된 진단 테스트가 있는지 확인
    const existingTest = await DiagnosticTest.findOne({
      userId: parseInt(userId),
      completed: true
    });

    if (existingTest) {
      return res.status(403).json({
        eligible: false,
        reason: '이미 진단 테스트를 완료했습니다',
        existingTestId: existingTest._id
      });
    }

    res.json({
      eligible: true,
      reason: null,
      existingTestId: null
    });

  } catch (error) {
    console.error('Error checking diagnostic eligibility:', error);
    res.status(500).json(createHttpError(500, '진단 자격 확인 중 오류가 발생했습니다'));
  }
});

// 1-2. 진단 시작
router.post('/start', async (req, res) => {
  try {
    const { userId } = req.query;
    const { gradeRange, rule } = req.body;
    
    if (!userId || !gradeRange) {
      return res.status(400).json(createHttpError(400, 'userId와 gradeRange는 필수입니다', ['userId', 'gradeRange']));
    }

    // 자격 확인 - 완료된 테스트가 있으면 재시작 불가
    const completedTest = await DiagnosticTest.findOne({
      userId: parseInt(userId),
      completed: true
    });

    if (completedTest) {
      return res.status(403).json(createHttpError(403, '이미 진단 테스트를 완료했습니다'));
    }

    // 진행 중인 테스트가 있는지 확인
    const existingTest = await DiagnosticTest.findOne({
      userId: parseInt(userId),
      completed: false
    });

    let diagnosticTest;
    let isRestart = false;

    if (existingTest) {
      // 재시작 정책 적용
      if (existingTest.restartCount >= 2) {
        return res.status(403).json({
          error: '재시작 횟수 제한을 초과했습니다'
        });
      }
      
      isRestart = true;
      existingTest.restartCount += 1;
      
      // 2회 이상 재시작 시 새로운 셔플 시드 생성
      if (existingTest.restartCount >= 2) {
        existingTest.shuffleSeed = Math.floor(Math.random() * 1000000);
      }
      
      await existingTest.save();
      diagnosticTest = existingTest;
    }

    // 학년 범위에 맞는 진단 테스트용 ProblemSet 조회
    const diagnosticUnitMap = {
      '1': 'middle_1',
      '1-2': 'middle_1_2',
      '1-3': 'middle_1_3'
    };

    const unitKey = `${gradeRange.min}-${gradeRange.max}`;
    const diagnosticUnit = diagnosticUnitMap[unitKey] || diagnosticUnitMap['1-3']; // 기본값

    // ProblemSet 조회
    const problemSet = await ProblemSet.findOne({
      mode: 'diagnostic',
      diagnosticUnit: diagnosticUnit
    });

    if (!problemSet) {
      return res.status(404).json(createHttpError(404, '해당 학년 범위의 진단 테스트 세트가 없습니다'));
    }

    if (!isRestart) {
      // 새로운 테스트 생성
      diagnosticTest = new DiagnosticTest({
        userId: parseInt(userId),
        gradeRange: gradeRange,
        problemSetId: problemSet._id,
        selectedRuleSnapshot: rule || {},
        startedAt: new Date(),
        completed: false,
        restartCount: 0,
        timeoutMinutes: 60,
        shuffleSeed: Math.floor(Math.random() * 1000000)
      });

      await diagnosticTest.save();
    }

    // 문제 순서 셔플 적용
    const shuffledProblemIds = shuffleProblems(problemSet.problemIds, diagnosticTest.shuffleSeed);
    const firstProblem = await Problem.findById(shuffledProblemIds[0]);

    res.status(201).json({
      testId: diagnosticTest._id,
      userId: parseInt(userId),
      gradeRange: gradeRange,
      startedAt: diagnosticTest.startedAt,
      firstProblemId: firstProblem._id,
      totalProblems: problemSet.problemIds.length,
      isRestart: isRestart,
      restartCount: diagnosticTest.restartCount,
      shuffleSeed: diagnosticTest.shuffleSeed
    });

  } catch (error) {
    console.error('Error starting diagnostic test:', error);
    res.status(500).json(createHttpError(500, '진단 테스트 시작 중 오류가 발생했습니다'));
  }
});

// 1-3. 진단 상태 조회
router.get('/:testId/status', async (req, res) => {
  try {
    const { testId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json(createHttpError(400, 'userId는 필수입니다', ['userId']));
    }

    const diagnosticTest = await DiagnosticTest.findById(testId);

    if (!diagnosticTest) {
      return res.status(404).json(createHttpError(404, '진단 테스트를 찾을 수 없습니다', ['testId']));
    }

    if (diagnosticTest.userId !== parseInt(userId)) {
      return res.status(403).json(createHttpError(403, '권한이 없습니다'));
    }

    // 답안 개수 조회
    const answeredCount = await AnswerAttempt.countDocuments({
      setId: diagnosticTest.problemSetId,
      userId: parseInt(userId),
      mode: 'diagnostic'
    });

    // ProblemSet에서 총 문제 개수 조회
    const problemSet = await ProblemSet.findById(diagnosticTest.problemSetId);
    const totalProblems = problemSet ? problemSet.problemIds.length : 0;
    const remainingCount = totalProblems - answeredCount;

    // 셔플된 문제 순서 적용
    const shuffledProblemIds = shuffleProblems(problemSet.problemIds, diagnosticTest.shuffleSeed);
    
    // 현재 문제 ID (마지막 답안 이후의 문제)
    let currentProblemId = null;
    if (answeredCount < totalProblems) {
      currentProblemId = shuffledProblemIds[answeredCount];
    }

    res.json({
      testId: diagnosticTest._id,
      userId: diagnosticTest.userId,
      completed: diagnosticTest.completed,
      answeredCount: answeredCount,
      remainingCount: remainingCount,
      currentProblemId: currentProblemId,
      startedAt: diagnosticTest.startedAt,
      timeoutMinutes: diagnosticTest.timeoutMinutes
    });

  } catch (error) {
    console.error('Error getting diagnostic status:', error);
    res.status(500).json(createHttpError(500, '진단 상태 조회 중 오류가 발생했습니다'));
  }
});

// 1-4. 답안 제출
router.post('/:testId/submit', async (req, res) => {
  try {
    const { testId } = req.params;
    const { userId } = req.query;
    const { problemId, userAnswer, durationSeconds } = req.body;

    if (!userId || !problemId || !userAnswer) {
      return res.status(400).json(createHttpError(400, 'userId, problemId, userAnswer는 필수입니다', ['userId', 'problemId', 'userAnswer']));
    }

    const diagnosticTest = await DiagnosticTest.findById(testId);

    if (!diagnosticTest) {
      return res.status(404).json({ error: 'Diagnostic test not found' });
    }

    if (diagnosticTest.userId !== parseInt(userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (diagnosticTest.completed) {
      return res.status(409).json(createHttpError(409, '진단 테스트가 이미 완료되었습니다'));
    }

    // 타임아웃 체크
    const isTimeout = await checkTimeout(diagnosticTest);
    if (isTimeout) {
      return res.status(408).json(createHttpError(408, '진단 테스트가 타임아웃되었습니다'));
    }

    // 문제 조회해서 unitId 가져오기
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json(createHttpError(404, '문제를 찾을 수 없습니다', ['problemId']));
    }

    // 답안 저장 (채점 안 함)
    const answerAttempt = new AnswerAttempt({
      userId: parseInt(userId),
      problemId: problemId,
      mode: 'diagnostic',
      setId: diagnosticTest.problemSetId,
      unitId: problem.unitId, // 문제의 실제 unitId 사용
      userAnswer: userAnswer,
      isCorrect: null, // 채점 안 함
      scoredAt: new Date()
    });

    await answerAttempt.save();

    // 셔플된 문제 순서로 다음 문제 ID 조회
    const problemSet = await ProblemSet.findById(diagnosticTest.problemSetId);
    const shuffledProblemIds = shuffleProblems(problemSet.problemIds, diagnosticTest.shuffleSeed);
    const currentIndex = shuffledProblemIds.indexOf(problemId);
    const nextProblemId = currentIndex < shuffledProblemIds.length - 1 
      ? shuffledProblemIds[currentIndex + 1] 
      : null;

    // 답안 개수 조회
    const answeredCount = await AnswerAttempt.countDocuments({
      setId: diagnosticTest.problemSetId,
      userId: parseInt(userId),
      mode: 'diagnostic'
    });

    const remainingCount = problemSet.problemIds.length - answeredCount;

    res.json({
      answerId: answerAttempt._id,
      isCorrect: null,
      nextProblemId: nextProblemId,
      answeredCount: answeredCount,
      remainingCount: remainingCount
    });

  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json(createHttpError(500, '답안 제출 중 오류가 발생했습니다'));
  }
});

// 1-5. 진단 완료
router.post('/:testId/complete', async (req, res) => {
  try {
    const { testId } = req.params;
    const { userId } = req.query;
    const { endedAt, completed } = req.body;

    if (!userId) {
      return res.status(400).json(createHttpError(400, 'userId는 필수입니다', ['userId']));
    }

    const diagnosticTest = await DiagnosticTest.findById(testId);

    if (!diagnosticTest) {
      return res.status(404).json(createHttpError(404, '진단 테스트를 찾을 수 없습니다', ['testId']));
    }

    if (diagnosticTest.userId !== parseInt(userId)) {
      return res.status(403).json(createHttpError(403, '권한이 없습니다'));
    }

    if (diagnosticTest.completed) {
      return res.status(409).json(createHttpError(409, '진단 테스트가 이미 완료되었습니다'));
    }

    // 타임아웃 체크
    const isTimeout = await checkTimeout(diagnosticTest);
    if (isTimeout) {
      return res.status(408).json(createHttpError(408, '진단 테스트가 타임아웃되었습니다'));
    }

    // 진단 테스트 완료 처리
    diagnosticTest.completed = completed || true;
    diagnosticTest.endedAt = endedAt || new Date();
    diagnosticTest.durationSec = Math.floor((diagnosticTest.endedAt - diagnosticTest.startedAt) / 1000);
    await diagnosticTest.save();

    // 모든 답안 수집
    const answers = await AnswerAttempt.find({
      setId: diagnosticTest.problemSetId,
      userId: parseInt(userId),
      mode: 'diagnostic'
    }).populate('problemId');

    // 한 번에 채점 처리 (기존 로직 활용)
    let correctCount = 0;
    const scoredAnswers = [];

    for (const answer of answers) {
      const problem = answer.problemId;
      let isCorrect = false;

      // 문제 유형에 따른 채점
      if (problem.type === 'multiple_choice') {
        isCorrect = answer.userAnswer.selectedOption === parseInt(problem.content.correctAnswer);
      } else {
        isCorrect = answer.userAnswer.value === problem.content.correctAnswer;
      }

      // 채점 결과 업데이트
      answer.isCorrect = isCorrect;
      answer.scoredAt = new Date();
      await answer.save();

      if (isCorrect) correctCount++;
      
      scoredAnswers.push({
        problemId: problem._id,
        userAnswer: answer.userAnswer,
        isCorrect: isCorrect,
        durationSeconds: Math.floor((answer.scoredAt - answer.createdAt) / 1000)
      });
    }

    const score = Math.round((correctCount / answers.length) * 100);

    // FastAPI로 분석 요청 데이터 전송
    const analysisData = {
      testId: diagnosticTest._id,
      userId: parseInt(userId),
      gradeRange: diagnosticTest.gradeRange,
      answers: scoredAnswers,
      totalProblems: answers.length,
      durationSec: diagnosticTest.durationSec
    };

    console.log('Sending analysis data to FastAPI:', analysisData);

    // FastAPI 호출
    try {
      const fastApiResponse = await fetch('http://fastapi-url/api/learning-path/express/diagnostic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Token': 'test-token'
        },
        body: JSON.stringify(analysisData)
      });

      if (fastApiResponse.ok) {
        const analysisResult = await fastApiResponse.json();
        console.log('FastAPI 분석 완료:', analysisResult.success);
      } else {
        console.error('FastAPI 분석 실패:', fastApiResponse.status);
        // FastAPI 호출 실패해도 진단 완료는 성공으로 처리
      }
    } catch (fastApiError) {
      console.error('FastAPI 호출 중 오류:', fastApiError);
      // FastAPI 호출 실패해도 진단 완료는 성공으로 처리
    }

    res.json({
      testId: diagnosticTest._id,
      completed: diagnosticTest.completed,
      durationSec: diagnosticTest.durationSec,
      totalProblems: answers.length,
      answeredProblems: answers.length,
      score: score,
      correctCount: correctCount,
      analysisRequested: true,
      estimatedAnalysisTime: '5-10분'
    });

  } catch (error) {
    console.error('Error completing diagnostic test:', error);
    res.status(500).json(createHttpError(500, '진단 테스트 완료 중 오류가 발생했습니다'));
  }
});

// 1-6. 진단 분석 조회
router.get('/:testId/analysis', async (req, res) => {
  try {
    const { testId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json(createHttpError(400, 'userId는 필수입니다', ['userId']));
    }

    const diagnosticTest = await DiagnosticTest.findById(testId);

    if (!diagnosticTest) {
      return res.status(404).json(createHttpError(404, '진단 테스트를 찾을 수 없습니다', ['testId']));
    }

    if (diagnosticTest.userId !== parseInt(userId)) {
      return res.status(403).json(createHttpError(403, '권한이 없습니다'));
    }

    // 분석 결과 조회
    const analysis = await DiagnosticAnalysis.findOne({
      testId: testId,
      userId: parseInt(userId)
    });

    if (!analysis) {
      return res.status(202).json({
        status: 'analyzing',
        estimatedCompletionTime: new Date(Date.now() + 5 * 60 * 1000) // 5분 후
      });
    }

    res.json({
      analysisId: analysis._id,
      testId: analysis.testId,
      userId: analysis.userId,
      analysisType: analysis.analysisType,
      aiComment: analysis.aiComment,
      class: analysis.class,
      recommendedPath: analysis.recommendedPath,
      generatedAt: analysis.generatedAt
    });

  } catch (error) {
    console.error('Error getting diagnostic analysis:', error);
    res.status(500).json(createHttpError(500, '진단 분석 결과 조회 중 오류가 발생했습니다'));
  }
});

// 1-7. 진단 분석 결과 조회
router.get('/:userId/analysis', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json(createHttpError(400, 'userId는 필수입니다', ['userId']));
    }

    // 1. 최신 진단 테스트 조회
    const latestTest = await DiagnosticTest.findOne({
      userId: parseInt(userId)
    }).sort({ completedAt: -1 });

    // 2. 진단 테스트가 없으면 404
    if (!latestTest) {
      return res.status(404).json(createHttpError(404, '진단 테스트를 찾을 수 없습니다', ['userId']));
    }

    // 3. 분석 결과 조회
    const analysis = await DiagnosticAnalysis.findOne({
      testId: latestTest._id
    });

    // 4. 분석 결과가 없으면 "분석 중"
    if (!analysis) {
      return res.status(202).json({
        status: 'analyzing',
        message: '분석 중입니다. 잠시만 기다려주세요.',
        estimatedCompletionTime: new Date(Date.now() + 5 * 60 * 1000) // 5분 후
      });
    }

    // 5. 분석 결과 있으면 정상 응답
    res.json({
      analysisId: analysis.analysisId,
      testId: analysis.testId,
      userId: analysis.userId,
      aiComment: analysis.aiComment,
      class: analysis.class,
      recommendedPath: analysis.recommendedPath,
      generatedAt: analysis.generatedAt
    });

  } catch (error) {
    console.error('Error getting diagnostic analysis:', error);
    res.status(500).json(createHttpError(500, '진단 분석 결과 조회 중 오류가 발생했습니다'));
  }
});

// 1-8. 진단 테스트 재시작
router.post('/:testId/restart', async (req, res) => {
  try {
    const { testId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const diagnosticTest = await DiagnosticTest.findById(testId);

    if (!diagnosticTest) {
      return res.status(404).json({ error: 'Diagnostic test not found' });
    }

    if (diagnosticTest.userId !== parseInt(userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (diagnosticTest.completed) {
      return res.status(409).json(createHttpError(409, '완료된 테스트는 재시작할 수 없습니다'));
    }

    // 재시작 횟수 제한 확인 (최대 2회)
    if (diagnosticTest.restartCount >= 2) {
      return res.status(403).json(createHttpError(403, '재시작 횟수 제한을 초과했습니다'));
    }

    // 재시작 처리
    diagnosticTest.restartCount += 1;
    diagnosticTest.startedAt = new Date(); // 시간 초기화
    
    // 2회 이상 재시작 시 새로운 셔플 시드 생성
    if (diagnosticTest.restartCount >= 2) {
      diagnosticTest.shuffleSeed = Math.floor(Math.random() * 1000000);
    }
    
    await diagnosticTest.save();

    // 기존 답안 삭제
    await AnswerAttempt.deleteMany({
      setId: diagnosticTest.problemSetId,
      userId: parseInt(userId),
      mode: 'diagnostic'
    });

    // 셔플된 첫 번째 문제 반환
    const problemSet = await ProblemSet.findById(diagnosticTest.problemSetId);
    const shuffledProblemIds = shuffleProblems(problemSet.problemIds, diagnosticTest.shuffleSeed);
    const firstProblem = await Problem.findById(shuffledProblemIds[0]);

    res.json({
      testId: diagnosticTest._id,
      restartCount: diagnosticTest.restartCount,
      shuffleSeed: diagnosticTest.shuffleSeed,
      firstProblemId: firstProblem._id,
      totalProblems: problemSet.problemIds.length,
      message: '진단 테스트가 재시작되었습니다'
    });

  } catch (error) {
    console.error('Error restarting diagnostic test:', error);
    res.status(500).json(createHttpError(500, '진단 테스트 재시작 중 오류가 발생했습니다'));
  }
});

// 1-8. 타임아웃 체크
router.get('/:testId/timeout-check', async (req, res) => {
  try {
    const { testId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const diagnosticTest = await DiagnosticTest.findById(testId);

    if (!diagnosticTest) {
      return res.status(404).json({ error: 'Diagnostic test not found' });
    }

    if (diagnosticTest.userId !== parseInt(userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (diagnosticTest.completed) {
      return res.status(409).json(createHttpError(409, '테스트가 이미 완료되었습니다'));
    }

    // 타임아웃 체크
    const isTimeout = await checkTimeout(diagnosticTest);
    
    if (isTimeout) {
      return res.json({
        timedOut: true,
        message: '진단 테스트가 타임아웃되었습니다',
        durationSec: diagnosticTest.durationSec
      });
    }

    // 남은 시간 계산
    const now = new Date();
    const timeDiff = (now - diagnosticTest.startedAt) / (1000 * 60); // 분 단위
    const remainingMinutes = Math.max(0, diagnosticTest.timeoutMinutes - timeDiff);

    res.json({
      timedOut: false,
      remainingMinutes: Math.floor(remainingMinutes),
      totalTimeoutMinutes: diagnosticTest.timeoutMinutes,
      startedAt: diagnosticTest.startedAt
    });

  } catch (error) {
    console.error('Error checking timeout:', error);
    res.status(500).json(createHttpError(500, '타임아웃 확인 중 오류가 발생했습니다'));
  }
});

module.exports = router;
