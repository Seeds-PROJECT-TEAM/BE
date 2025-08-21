const express = require('express');
const router = express.Router();
const { Problem, AnswerAttempt, Unit } = require('../models');

// 채점 + 해설 API
router.post('/check', async (req, res) => {
  try {
    const { 
      mode, 
      setId, 
      unitId, 
      problemId, 
      userAnswer, 
      durationSeconds,
      problemOrderIndex 
    } = req.body;

    const idempotencyKey = req.headers['idempotency-key'];

    // 필수 필드 검증
    if (!mode || !unitId || !problemId || !userAnswer || !userAnswer.value) {
      return res.status(422).json({ 
        error: 'Missing required fields: mode, unitId, problemId, userAnswer.value' 
      });
    }

    // 문제 조회
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // 단위 조회 (relatedConcepts용)
    const unit = await Unit.findById(unitId);
    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    // 중복 요청 체크
    if (idempotencyKey) {
      const existingAttempt = await AnswerAttempt.findOne({ idempotencyKey });
      if (existingAttempt) {
        return res.status(409).json({ 
          error: 'Duplicate request detected',
          answerId: existingAttempt._id.toString()
        });
      }
    }

    // 채점 로직
    let isCorrect = false;
    const userAnswerValue = userAnswer.value.trim().toLowerCase();
    
    // correctAnswer를 content에서 가져오기
    const correctAnswer = problem.content.correctAnswer;
    if (!correctAnswer) {
      return res.status(500).json({ error: 'Problem does not have correctAnswer field' });
    }
    
    const correctAnswerValue = correctAnswer.trim().toLowerCase();

    if (problem.type === 'multiple_choice') {
      // 객관식: 선택한 옵션 번호와 정답 비교
      const selectedOption = userAnswer.selectedOption;
      const correctOptionIndex = problem.content.options.findIndex(
        option => option.trim().toLowerCase() === correctAnswerValue
      );
      isCorrect = selectedOption === correctOptionIndex;
    } else {
      // 단답식: 답안 텍스트 직접 비교
      isCorrect = userAnswerValue === correctAnswerValue;
    }

    // AnswerAttempt 문서 생성
    const answerAttempt = new AnswerAttempt({
      userId: 1, // 임시 사용자 ID (나중에 인증에서 가져올 예정)
      problemId: problem._id,
      mode: mode,
      setId: setId,
      unitId: unit._id,
      userAnswer: {
        value: userAnswer.value,
        selectedOption: userAnswer.selectedOption,
        textAnswer: userAnswer.textAnswer
      },
      isCorrect: isCorrect,
      scoredAt: new Date(),
      explanationShown: false,
      problemOrderIndex: problemOrderIndex,
      idempotencyKey: idempotencyKey,
      bookmarked: false
    });

    // DB에 저장
    await answerAttempt.save();

    // 응답 구성 - explanation도 content에서 가져오기
    const explanation = problem.content.explanation;
    const response = {
      answerId: answerAttempt._id.toString(),
      isCorrect: isCorrect,
      explanation: {
        explanation: explanation || '해설이 제공되지 않았습니다.'
      },
      relatedConcepts: problem.tags && problem.tags.length > 0 ? [{
        unitId: unit._id.toString(),
        title: unit.title.ko
      }] : []
    };

    res.json(response);

  } catch (error) {
    console.error('Error in answer check:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;