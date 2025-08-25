const express = require('express');
const router = express.Router();
const { XpTransaction, GamificationState } = require('../models');

/**
 * XP 획득 이력 조회
 * GET /v1/gamification/xp-history
 */
router.get('/xp-history', async (req, res) => {
  try {
    const { userId, limit = 20, page = 1 } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        error: 'userId parameter is required'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const transactions = await XpTransaction.find({ userId: parseInt(userId) })
      .sort({ at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalItems = await XpTransaction.countDocuments({ userId: parseInt(userId) });
    const totalPages = Math.ceil(totalItems / parseInt(limit));

    res.json({
      transactions: transactions.map(tx => ({
        transactionId: tx.transactionId,
        amount: tx.amount,
        reason: tx.reason,
        reasonRef: tx.reasonRef,
        at: tx.at
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Error fetching XP history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 레벨업 이력 조회
 * GET /v1/gamification/level-history
 */
router.get('/level-history', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        error: 'userId parameter is required'
      });
    }

    const gamificationState = await GamificationState.findOne({ userId: parseInt(userId) });
    
    if (!gamificationState || !gamificationState.lastLeveledUpAt) {
      return res.json({
        levelHistory: []
      });
    }

    // 현재 레벨 정보를 기반으로 레벨업 이력 생성
    const currentLevel = gamificationState.level;
    const levelHistory = [];
    
    // 레벨업 기준 XP 테이블 (방법 3)
    const LEVEL_XP_REQUIREMENTS = {
      1: 50,
      2: 100,
      3: 175,
      4: 275,
      5: 400,
      6: 550,
      7: 725,
      8: 925,
      9: 1150,
      10: 1400
    };

    // 각 레벨별 XP 누적 계산
    let cumulativeXp = 0;
    for (let level = 1; level <= currentLevel; level++) {
      cumulativeXp += LEVEL_XP_REQUIREMENTS[level] || 1400;
      
      if (level > 1) { // 레벨 1은 시작 레벨이므로 제외
        levelHistory.push({
          level,
          leveledUpAt: gamificationState.lastLeveledUpAt, // 실제로는 각 레벨별 시간을 저장해야 함
          xpAtLevelUp: LEVEL_XP_REQUIREMENTS[level - 1] || 1400
        });
      }
    }

    res.json({
      levelHistory: levelHistory.reverse() // 최신 레벨업부터 표시
    });

  } catch (error) {
    console.error('Error fetching level history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
