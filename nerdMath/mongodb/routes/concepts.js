const express = require('express');
const router = express.Router();
const { Concept, Unit, LearningTimeLog, Progress } = require('../models');
const { awardXp } = require('../utils/gamification');

// 소단원별 개념 조회 API
router.get('/:unitId/concept', async (req, res) => {
  try {
    const { unitId } = req.params;

    // 단위 조회
    const unit = await Unit.findById(unitId);
    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    // 개념 조회
    const concept = await Concept.findOne({ unitId: unitId });
    if (!concept) {
      return res.status(404).json({ error: 'Concept not found for this unit' });
    }

    // 응답 구성
    const response = {
      conceptId: concept._id.toString(),
      unitId: concept.unitId.toString(),
      blocks: concept.blocks,
      createdAt: concept.createdAt ? concept.createdAt.toISOString() : new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('Error fetching concept:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3-7. 개념 학습 완료
router.post('/:unitId/concept/complete', async (req, res) => {
  try {
    const { unitId } = req.params;
    const { userId, learningTimeId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // 단원 존재 확인
    const unit = await Unit.findById(unitId);
    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    // 학습 시간 기록 종료 (개념 학습 세션)
    const conceptSession = await LearningTimeLog.findOne({
      userId: parseInt(userId),
      activityType: 'concept_learning',
      endedAt: null
    });
    
    if (conceptSession) {
      const now = new Date();
      const durationSeconds = Math.floor((now - conceptSession.startedAt) / 1000);
      
      conceptSession.endedAt = now;
      conceptSession.durationSeconds = durationSeconds;
      await conceptSession.save();
    }

    // 진행률 업데이트 (100%로 설정)
    console.log('Debug - 개념 완료 API: updateProgress 호출 전');
    console.log('Debug - userId:', userId, 'unitId:', unitId);
    
    const { updateProgress, getStatus } = require('./progress');
    const updatedProgress = await updateProgress(userId, unitId, 'concept', 100);
    
    console.log('Debug - updateProgress 완료:', updatedProgress);

    // XP 지급
    const idempotencyKey = `concept_complete_${userId}_${unitId}_${Date.now()}`;
    const xpResult = await awardXp(
      parseInt(userId),
      'concept_completed',
      unitId,
      idempotencyKey,
      true
    );

    // 응답 구성
    const response = {
      unitId: unitId,
      conceptProgress: 100,
      message: '개념 학습이 완료되었습니다',
      updatedProgress: {
        conceptProgress: updatedProgress.conceptProgress,
        status: getStatus(updatedProgress.conceptProgress)
      }
    };

    // XP 지급 결과가 성공한 경우에만 응답에 포함
    if (xpResult.success) {
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
    console.error('Error completing concept learning:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;