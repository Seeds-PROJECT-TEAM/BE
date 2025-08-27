const express = require('express');
const router = express.Router();
const { AnswerAttempt, Problem, Voca, ActivityLog } = require('../models');
const { getStatus } = require('./progress');
const { awardXp } = require('../utils/gamification');
const { createHttpError, ERROR_CODES } = require('../utils/errorHandler');

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
      problemOrderIndex,
      userId,
      vocaId
    } = req.body;

    const idempotencyKey = req.headers['idempotency-key'];

    // 필수 필드 검증
    if (!mode || !userAnswer || !userAnswer.value || !userId) {
      return res.status(422).json(createHttpError(422, '필수 필드가 누락되었습니다: mode, userAnswer.value, userId', ['mode', 'userAnswer.value', 'userId']));
    }
    
    // mode에 따른 필수 필드 검증
    if (mode === 'vocab_test') {
      if (!vocaId) {
        return res.status(422).json(createHttpError(422, 'vocab_test 모드에서는 vocaId가 필수입니다', ['vocaId']));
      }
    } else {
      if (!problemId) {
        return res.status(422).json(createHttpError(422, 'vocab_test가 아닌 모드에서는 problemId가 필수입니다', ['problemId']));
      }
    }

    // 단위 조회 (빈출 어휘는 unitId가 없을 수 있음)
    let unit = null;
    if (unitId) {
      unit = await Unit.findById(unitId);
      if (!unit) {
        return res.status(404).json(createHttpError(404, '단원을 찾을 수 없습니다', ['unitId']));
      }
    }

    // 어휘 테스트인지 확인
    let problem = null;
    let voca = null;
    
    if (mode === 'vocab_test') {
      // 어휘 테스트: vocaId로 조회
      if (!vocaId) {
        return res.status(400).json(createHttpError(400, 'vocab_test 모드에서는 vocaId가 필요합니다', ['vocaId']));
      }
      voca = await Voca.findById(vocaId);
      if (!voca) {
        return res.status(404).json(createHttpError(404, '어휘를 찾을 수 없습니다', ['vocaId']));
      }
    } else {
          // 일반 문제: Problem 조회
    console.log('Debug - Problem 조회 전, problemId:', problemId);
    problem = await Problem.findById(problemId);
    console.log('Debug - Problem 조회 결과:', problem ? '찾음' : '없음');
    if (!problem) {
      return res.status(404).json(createHttpError(404, '문제를 찾을 수 없습니다', ['problemId']));
    }
    }

    // 중복 요청 체크
    if (idempotencyKey) {
      const existingAttempt = await AnswerAttempt.findOne({ idempotencyKey });
      if (existingAttempt) {
        return res.status(409).json(createHttpError(409, '중복 요청이 감지되었습니다', ['idempotencyKey'], null, {
          answerId: existingAttempt._id.toString()
        }));
      }
    }

    // 채점 로직
    console.log('Debug - 채점 로직 시작');
    let isCorrect = false;
    let correctAnswer = '';
    let explanation = '';
    
    if (mode === 'vocab_test' && voca) {
      // 어휘 테스트 채점 로직
      const question = req.body.question || '';
      

      
      // 한글/영어 질문 모두 지원
      if (question.includes('뜻을 쓰세요') || question.includes('뜻') || question.includes('의 뜻') || 
          question.includes('meaning of') || question.includes('What is') || question.includes('meaning')) {
        // 영어→한글: voca.meaning과 비교 (한글은 대소문자 변환 안 함)
        correctAnswer = voca.meaning;
        const userAnswerValue = userAnswer.value.trim();
        isCorrect = userAnswerValue === voca.meaning.trim();
      } else if (question.includes('영어로 쓰세요') || question.includes('영어로')) {
        // 한글→영어: voca.word와 비교 (영어는 대소문자 변환)
        correctAnswer = voca.word;
        const userAnswerValue = userAnswer.value.trim().toLowerCase();
        isCorrect = userAnswerValue === voca.word.trim().toLowerCase();
      } else {
        // 기본적으로 영어→한글 문제로 처리
        correctAnswer = voca.meaning;
        const userAnswerValue = userAnswer.value.trim();
        isCorrect = userAnswerValue === voca.meaning.trim();
      }
      
      explanation = voca.etymology || `${voca.word}의 어원 정보가 없습니다.`;
      
    } else {
      // 일반 문제 채점 로직
      const userAnswerValue = userAnswer.value.trim().toLowerCase();
      
      correctAnswer = problem.content.correctAnswer;
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
      
      explanation = problem.content.explanation;
    }

    // AnswerAttempt 문서 생성
    const answerAttempt = new AnswerAttempt({
      userId: parseInt(userId),
      problemId: mode === 'vocab_test' ? null : problem._id, // 어휘 테스트는 problemId null
      vocaId: mode === 'vocab_test' ? voca._id : null, // 어휘 테스트는 vocaId 설정
      mode: mode,
      setId: setId,
      unitId: unit ? unit._id : null,
      userAnswer: {
        value: userAnswer.value,
        selectedOption: userAnswer.selectedOption,
        textAnswer: userAnswer.textAnswer
      },
      isCorrect: isCorrect,
      scoredAt: new Date(),
      explanationShown: false,
      problemOrderIndex: problemOrderIndex,
      idempotencyKey: idempotencyKey
    });

    // DB에 저장
    await answerAttempt.save();

    // 학습 시간 기록 종료 (문제별 세션)
    if (mode === 'vocab_test') {
      // 어휘 테스트 세션 종료
      const vocabSession = await LearningTimeLog.findOne({
        userId: parseInt(userId),
        activityType: 'vocab_test',
        endedAt: null
      });
      
      if (vocabSession) {
        const now = new Date();
        const durationSeconds = Math.floor((now - vocabSession.startedAt) / 1000);
        
        vocabSession.endedAt = now;
        vocabSession.durationSeconds = durationSeconds;
        await vocabSession.save();
      }
    } else if (mode === 'practice') {
      // 문제 풀이 세션 종료
      const problemSession = await LearningTimeLog.findOne({
        userId: parseInt(userId),
        activityType: 'problem_solving',
        endedAt: null
      });
      
      if (problemSession) {
        const now = new Date();
        const durationSeconds = Math.floor((now - problemSession.startedAt) / 1000);
        
        problemSession.endedAt = now;
        problemSession.durationSeconds = durationSeconds;
        await problemSession.save();
      }
    }

    // 진행률 업데이트
    let updatedProgress = null;
    try {
      console.log('Debug - 문제 풀이 API: 진행률 업데이트 시작');
      console.log('Debug - mode:', mode, 'userId:', userId, 'unitId:', unitId);
      
      const { updateProgress, getStatus } = require('./progress');
      const { updateActivityStats } = require('./activity');
      
      if (mode === 'vocab_test') {
        // 어휘 데이터 확인
        const voca = await Voca.findById(vocaId);
        
        if (voca.category === 'math_term' && voca.unitId && unit) {
          // 해당 단원의 모든 어휘를 다 풀었는지 확인
          const totalVocabsInUnit = await Voca.countDocuments({ 
            unitId: unit._id, 
            category: 'math_term' 
          });
          
          const solvedVocabsInUnit = await AnswerAttempt.countDocuments({
            userId: parseInt(userId),
            unitId: unit._id,
            mode: 'vocab_test'
          });
          
          // 모든 어휘를 다 풀었을 때만 100%로 설정
          if (solvedVocabsInUnit >= totalVocabsInUnit) {
            updatedProgress = await updateProgress(parseInt(userId), unit._id, 'vocab', 100, 'unit');
          }
          
        } else if (voca.category === 'sat_act') {
          // 빈출 어휘: 해당 카테고리의 모든 어휘를 다 풀었는지 확인
          const totalFrequentVocabs = await Voca.countDocuments({ 
            category: 'sat_act' 
          });
          
          const solvedFrequentVocabs = await AnswerAttempt.countDocuments({
            userId: parseInt(userId),
            mode: 'vocab_test',
            vocaId: { $in: await Voca.find({ category: 'sat_act' }).distinct('_id') }
          });
          
          // 모든 빈출 어휘를 다 풀었을 때만 100%로 설정
          if (solvedFrequentVocabs >= totalFrequentVocabs) {
            updatedProgress = await updateProgress(parseInt(userId), null, 'vocab', 100, 'frequent');
          }
        }
        
      } else if (mode === 'practice') {
        // 해당 문제를 이전에 푼 적이 있는지 확인
        const existingAttempt = await AnswerAttempt.findOne({
          userId: parseInt(userId),
          problemId: problemId,
          mode: { $ne: 'diagnostic' }
        });

        // 이전에 푼 적이 없는 문제만 진행률에 반영
        if (!existingAttempt) {
          const totalProblemsInUnit = await Problem.countDocuments({ unitId: unit._id });
          const solvedProblemsInUnit = await AnswerAttempt.countDocuments({
            userId: parseInt(userId),
            unitId: unit._id,
            mode: { $ne: 'diagnostic' }
          });
          
          const problemProgress = Math.round((solvedProblemsInUnit / totalProblemsInUnit) * 100);
          console.log('Debug - 문제 진행률 계산:', { solvedProblemsInUnit, totalProblemsInUnit, problemProgress });
          updatedProgress = await updateProgress(parseInt(userId), unit._id, 'problem', problemProgress);
          console.log('Debug - 문제 진행률 업데이트 완료:', updatedProgress);
        }
      }
      // diagnostic 모드는 진행률 업데이트 제외

      // 활동 통계 업데이트
      const today = new Date().toISOString().split('T')[0];
      await updateActivityStats(parseInt(userId), today, {
        todaySolved: 1,
        totalProblems: 1
      });
    } catch (error) {
      console.error('Error updating progress and stats:', error);
    }

    // 응답 구성
    const response = {
      answerId: answerAttempt._id.toString(),
      isCorrect: isCorrect,
      explanation: {
        explanation: explanation || '해설이 제공되지 않았습니다.'
      },
      relatedConcepts: mode === 'vocab_test' 
        ? (unit ? [{ unitId: unit._id.toString(), title: unit.title.ko }] : [])
        : (problem.tags && problem.tags.length > 0 ? [{
            unitId: unit._id.toString(),
            title: unit.title.ko
          }] : [])
    };

    // getStatus 함수 정의 (스코프 문제 해결)
    const getStatus = (progress) => {
      if (progress >= 100) return 'completed';
      if (progress > 0) return 'in_progress';
      return 'not_started';
    };

    // XP 지급 (diagnostic 모드 제외)
    let xpResult = null;
    if (mode !== 'diagnostic') {
      const idempotencyKey = `answer_check_${userId}_${mode}_${problemId || vocaId}_${Date.now()}`;
      const reason = mode === 'vocab_test' ? 'vocab_solved' : 'problem_solved';
      
      xpResult = await awardXp(
        parseInt(userId),
        reason,
        mode === 'vocab_test' ? vocaId : problemId,
        idempotencyKey,
        isCorrect
      );
    }

    // mode에 따라 updatedProgress 추가
    if (mode === 'vocab_test' && updatedProgress) {
      response.updatedProgress = {
        vocabProgress: updatedProgress.vocabProgress,
        status: getStatus(updatedProgress.vocabProgress)
      };
    } else if (mode === 'practice' && updatedProgress) {
      response.updatedProgress = {
        problemProgress: updatedProgress.problemProgress,
        status: getStatus(updatedProgress.problemProgress)
      };
    }
    // diagnostic 모드는 updatedProgress 제외

    // XP 지급 결과가 성공한 경우에만 응답에 포함
    if (xpResult && xpResult.success) {
      response.xpGained = xpResult.xpGained;
      response.gamificationUpdate = {
        level: xpResult.levelUpResult.newLevel,
        xp: xpResult.levelUpResult.leveledUp ? xpResult.levelUpResult.remainingXp : xpResult.totalXp - xpResult.xpGained,
        totalXp: xpResult.totalXp,
        nextLevelXp: xpResult.levelUpResult.leveledUp ? xpResult.levelUpResult.newLevel * 50 + (xpResult.levelUpResult.newLevel - 1) * (xpResult.levelUpResult.newLevel - 2) * 25 : xpResult.levelUpResult.newLevel * 50 + (xpResult.levelUpResult.newLevel - 1) * (xpResult.levelUpResult.newLevel - 2) * 25,
        leveledUp: xpResult.levelUpResult.leveledUp
      };
    }

    res.json(response);

  } catch (error) {
    console.error('Error in answer check:', error);
    res.status(500).json(createHttpError(500, '답안 체크 중 오류가 발생했습니다'));
  }
});

module.exports = router;