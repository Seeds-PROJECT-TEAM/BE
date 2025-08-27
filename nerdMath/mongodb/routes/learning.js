const express = require('express');
const router = express.Router();
const { LearningTimeLog, Unit } = require('../models');
const { createHttpError, ERROR_CODES } = require('../utils/errorHandler');

// 3-1. 학습 활동 시작
router.post('/start', async (req, res) => {
  try {
    const { userId } = req.query;
    const { activityType, contentId, sessionId } = req.body;

    if (!userId || !activityType || !contentId) {
      return res.status(400).json(createHttpError(400, 'userId, activityType, contentId는 필수입니다', ['userId', 'activityType', 'contentId']));
    }

    // 기존 활성 세션이 있다면 종료 처리
    const activeSession = await LearningTimeLog.findOne({
      userId: parseInt(userId),
      endedAt: null
    });

    if (activeSession) {
      const now = new Date();
      const durationSeconds = Math.floor((now - activeSession.startedAt) / 1000);
      
      activeSession.endedAt = now;
      activeSession.durationSeconds = durationSeconds;
      await activeSession.save();
    }

    // 새로운 학습 세션 생성
    const learningSession = new LearningTimeLog({
      userId: parseInt(userId),
      activityType,
      contentId,
      sessionId,
      startedAt: new Date()
    });

    await learningSession.save();

    res.status(201).json({
      learningTimeId: learningSession._id,
      startedAt: learningSession.startedAt,
      activityType: learningSession.activityType,
      contentId: learningSession.contentId
    });

  } catch (error) {
    console.error('Error starting learning session:', error);
    res.status(500).json(createHttpError(500, '학습 세션 시작 중 오류가 발생했습니다'));
  }
});

// 3-2. 학습 활동 종료
router.post('/end', async (req, res) => {
  try {
    const { learningTimeId } = req.body;

    if (!learningTimeId) {
      return res.status(400).json(createHttpError(400, 'learningTimeId는 필수입니다', ['learningTimeId']));
    }

    const learningSession = await LearningTimeLog.findById(learningTimeId);
    
    if (!learningSession) {
      return res.status(404).json(createHttpError(404, '학습 세션을 찾을 수 없습니다', ['learningTimeId']));
    }

    if (learningSession.endedAt) {
      return res.status(409).json(createHttpError(409, '학습 세션이 이미 종료되었습니다'));
    }

    const now = new Date();
    const durationSeconds = Math.floor((now - learningSession.startedAt) / 1000);

    learningSession.endedAt = now;
    learningSession.durationSeconds = durationSeconds;
    await learningSession.save();

    res.json({
      learningTimeId: learningSession._id,
      durationSeconds: learningSession.durationSeconds,
      completed: true
    });

  } catch (error) {
    console.error('Error ending learning session:', error);
    res.status(500).json(createHttpError(500, '학습 세션 종료 중 오류가 발생했습니다'));
  }
});

// 3-3. 현재 진행 중인 학습 활동 확인
router.get('/active', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json(createHttpError(400, 'userId는 필수입니다', ['userId']));
    }

    const activeSession = await LearningTimeLog.findOne({
      userId: parseInt(userId),
      endedAt: null
    });

    if (!activeSession) {
      return res.json({ activeSession: null });
    }

    const now = new Date();
    const elapsedSeconds = Math.floor((now - activeSession.startedAt) / 1000);

    res.json({
      activeSession: {
        learningTimeId: activeSession._id,
        activityType: activeSession.activityType,
        contentId: activeSession.contentId,
        startedAt: activeSession.startedAt,
        elapsedSeconds: elapsedSeconds
      }
    });

  } catch (error) {
    console.error('Error checking active session:', error);
    res.status(500).json(createHttpError(500, '활성 세션 확인 중 오류가 발생했습니다'));
  }
});

// 30분 타임아웃 처리 API
router.post('/timeout', async (req, res) => {
  try {
    const inactiveSessions = await LearningTimeLog.find({
      endedAt: null,
      startedAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) } // 30분 이상
    });
    
    let timeoutCount = 0;
    for (const session of inactiveSessions) {
      const now = new Date();
      const durationSeconds = Math.floor((now - session.startedAt) / 1000);
      
      session.endedAt = now;
      session.durationSeconds = durationSeconds;
      await session.save();
      timeoutCount++;
    }
    
    res.json({ 
      timeoutCount: timeoutCount,
      message: `${timeoutCount}개의 세션이 타임아웃으로 종료되었습니다.`
    });
  } catch (error) {
    console.error('Error processing timeout:', error);
    res.status(500).json(createHttpError(500, '타임아웃 처리 중 오류가 발생했습니다'));
  }
});

module.exports = router;
