const { Character, GamificationState, XpTransaction } = require('../models');

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

// XP 지급량 규칙
const XP_REWARDS = {
  concept_completed: 20,
  problem_solved_correct: 15,
  problem_solved_incorrect: 10,
  vocab_solved_correct: 5,
  vocab_solved_incorrect: 3,
  unit_completed: 10,
  streak_bonus: 10
};

/**
 * 레벨업에 필요한 XP 계산
 * @param {number} level - 현재 레벨
 * @returns {number} - 다음 레벨까지 필요한 XP
 */
function calculateNextLevelXp(level) {
  return LEVEL_XP_REQUIREMENTS[level] || 1400;
}

/**
 * XP 지급량 계산
 * @param {string} reason - XP 지급 사유
 * @param {boolean} isCorrect - 정답 여부 (문제/어휘의 경우)
 * @returns {number} - 지급할 XP 양
 */
function calculateXpReward(reason, isCorrect = true) {
  switch (reason) {
    case 'concept_completed':
      return XP_REWARDS.concept_completed;
    case 'problem_solved':
      return isCorrect ? XP_REWARDS.problem_solved_correct : XP_REWARDS.problem_solved_incorrect;
    case 'vocab_solved':
      return isCorrect ? XP_REWARDS.vocab_solved_correct : XP_REWARDS.vocab_solved_incorrect;
    case 'unit_completed':
      return XP_REWARDS.unit_completed;
    case 'streak_bonus':
      return XP_REWARDS.streak_bonus;
    default:
      return 0;
  }
}

/**
 * 레벨업 체크 및 처리
 * @param {number} userId - 사용자 ID
 * @param {number} newXp - 새로운 XP
 * @returns {Object} - 레벨업 결과
 */
async function checkAndProcessLevelUp(userId, newXp) {
  const gamificationState = await GamificationState.findOne({ userId });
  if (!gamificationState) return { leveledUp: false, newLevel: 1 };

  const currentLevel = gamificationState.level;
  const requiredXp = calculateNextLevelXp(currentLevel);
  
  if (newXp >= requiredXp) {
    // 레벨업
    const newLevel = currentLevel + 1;
    const newNextLevelXp = calculateNextLevelXp(newLevel);
    
    // 캐릭터 자동 업그레이드
    const newCharacterId = `char_default_${gamificationState.equippedCharacterId.includes('male') ? 'male' : 'female'}_lv${newLevel}`;
    
    await GamificationState.findOneAndUpdate(
      { userId },
      {
        level: newLevel,
        xp: newXp - requiredXp,
        nextLevelXp: newNextLevelXp,
        equippedCharacterId: newCharacterId,
        lastLeveledUpAt: new Date()
      },
      { new: true }
    );

    return {
      leveledUp: true,
      newLevel,
      newCharacterId,
      xpGained: requiredXp,
      remainingXp: newXp - requiredXp
    };
  }

  return { leveledUp: false, newLevel: currentLevel };
}

/**
 * XP 지급 및 레벨업 처리
 * @param {number} userId - 사용자 ID
 * @param {string} reason - XP 지급 사유
 * @param {string} reasonRef - 참조 ID
 * @param {string} idempotencyKey - 중복 방지 키
 * @param {boolean} isCorrect - 정답 여부
 * @returns {Object} - XP 지급 결과
 */
async function awardXp(userId, reason, reasonRef = null, idempotencyKey, isCorrect = true) {
  try {
    // 중복 방지 체크
    const existingTransaction = await XpTransaction.findOne({ idempotencyKey });
    if (existingTransaction) {
      return {
        success: false,
        error: 'Duplicate transaction',
        transactionId: existingTransaction.transactionId
      };
    }

    // XP 지급량 계산
    const xpAmount = calculateXpReward(reason, isCorrect);
    if (xpAmount === 0) {
      return {
        success: false,
        error: 'Invalid reason or no XP to award'
      };
    }

    // 게이미피케이션 상태 조회 또는 생성
    let gamificationState = await GamificationState.findOne({ userId });
    if (!gamificationState) {
      gamificationState = new GamificationState({
        userId,
        level: 1,
        xp: 0,
        totalXp: 0,
        nextLevelXp: 50,
        equippedCharacterId: 'char_default_male_lv1'
      });
    }

    // XP 트랜잭션 생성
    const xpTransaction = new XpTransaction({
      userId,
      amount: xpAmount,
      reason,
      reasonRef,
      idempotencyKey
    });
    await xpTransaction.save();

    // 게이미피케이션 상태 업데이트
    const newXp = gamificationState.xp + xpAmount;
    const newTotalXp = gamificationState.totalXp + xpAmount;
    
    // 레벨업 체크
    const levelUpResult = await checkAndProcessLevelUp(userId, newXp);
    
    if (!levelUpResult.leveledUp) {
      // 레벨업이 없는 경우 XP만 업데이트
      await GamificationState.findOneAndUpdate(
        { userId },
        {
          xp: newXp,
          totalXp: newTotalXp
        },
        { new: true }
      );
    }

    return {
      success: true,
      xpGained: xpAmount,
      totalXp: newTotalXp,
      levelUpResult,
      transactionId: xpTransaction.transactionId
    };

  } catch (error) {
    console.error('Error awarding XP:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 사용자 게이미피케이션 상태 조회
 * @param {number} userId - 사용자 ID
 * @returns {Object} - 게이미피케이션 상태
 */
async function getGamificationState(userId) {
  try {
    let gamificationState = await GamificationState.findOne({ userId });
    
    if (!gamificationState) {
      // 초기 상태 생성
      gamificationState = new GamificationState({
        userId,
        level: 1,
        xp: 0,
        totalXp: 0,
        nextLevelXp: 50,
        equippedCharacterId: 'char_default_male_lv1'
      });
      await gamificationState.save();
    }

    // 장착된 캐릭터 정보 조회
    const equippedCharacter = await Character.findOne({
      characterId: gamificationState.equippedCharacterId
    });

    return {
      gamificationState,
      equippedCharacter
    };

  } catch (error) {
    console.error('Error getting gamification state:', error);
    throw error;
  }
}

module.exports = {
  calculateNextLevelXp,
  calculateXpReward,
  checkAndProcessLevelUp,
  awardXp,
  getGamificationState,
  LEVEL_XP_REQUIREMENTS,
  XP_REWARDS
};
