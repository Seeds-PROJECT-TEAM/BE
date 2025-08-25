const express = require('express');
const router = express.Router();
const { Character, GamificationState } = require('../models');
const { getGamificationState } = require('../utils/gamification');

// 테스트용 기본 라우트
router.get('/', (req, res) => {
  console.log('캐릭터 라우터 기본 경로 호출됨');
  res.json({ message: 'Characters router is working!' });
});

/**
 * 기본 캐릭터 목록 조회
 * GET /v1/characters/default
 */
router.get('/default', async (req, res) => {
  try {
    console.log('캐릭터 조회 API 호출됨');
    const { gender } = req.query;
    console.log('gender:', gender);
    
    if (!gender || !['male', 'female'].includes(gender)) {
      return res.status(400).json({
        error: 'Gender parameter is required and must be "male" or "female"'
      });
    }

    console.log('Character 모델 조회 시작');
    const characters = await Character.find({
      gender,
      isDefault: true,
      isActive: true
    }).sort({ level: 1 });
    console.log('조회된 캐릭터 수:', characters.length);

    res.json({
      characters: characters.map(char => ({
        characterId: char.characterId,
        name: char.name,
        imageUrl: char.imageUrl,
        gender: char.gender,
        level: char.level,
        description: char.description,
        isDefault: char.isDefault,
        isActive: char.isActive
      }))
    });

  } catch (error) {
    console.error('Error fetching default characters:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * 사용자 캐릭터 정보 조회
 * GET /v1/characters/my
 */
router.get('/my', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        error: 'userId parameter is required'
      });
    }

    const { gamificationState, equippedCharacter } = await getGamificationState(parseInt(userId));

    res.json({
      gamificationState: {
        gamifiId: gamificationState.gamifiId,
        userId: gamificationState.userId,
        level: gamificationState.level,
        xp: gamificationState.xp,
        totalXp: gamificationState.totalXp,
        nextLevelXp: gamificationState.nextLevelXp,
        equippedCharacterId: gamificationState.equippedCharacterId,
        lastLeveledUpAt: gamificationState.lastLeveledUpAt
      },
      equippedCharacter: equippedCharacter ? {
        characterId: equippedCharacter.characterId,
        name: equippedCharacter.name,
        imageUrl: equippedCharacter.imageUrl,
        gender: equippedCharacter.gender,
        level: equippedCharacter.level,
        description: equippedCharacter.description
      } : null
    });

  } catch (error) {
    console.error('Error fetching user character:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
