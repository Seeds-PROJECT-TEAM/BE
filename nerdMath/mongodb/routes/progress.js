const express = require('express');
const router = express.Router();
const { Progress, Unit, Concept, Problem, Voca, AnswerAttempt } = require('../models');

// 헬퍼 함수들
function getStatus(progress) {
  if (progress === 100) return 'completed';
  if (progress > 0) return 'in_progress';
  return 'not_started';
}

async function calculateOverallProgress(userId) {
  try {
    // 소단원별 진행률 조회
    const unitProgress = await Progress.find({ 
      userId: parseInt(userId), 
      category: 'unit' 
    });
    
    if (unitProgress.length === 0) {
      return {
        totalConceptProgress: 0,
        totalProblemProgress: 0
      };
    }

    // 각 영역별 완료된 소단원 수 계산
    const conceptCompletedUnits = unitProgress.filter(p => p.conceptProgress === 100).length;
    const problemCompletedUnits = unitProgress.filter(p => p.problemProgress === 100).length;

    // 각 영역별 진행률 계산
    const totalConceptProgress = Number(((conceptCompletedUnits / 97) * 100).toFixed(2));
    const totalProblemProgress = Number(((problemCompletedUnits / 97) * 100).toFixed(2));

    return {
      totalConceptProgress: totalConceptProgress,
      totalProblemProgress: totalProblemProgress
    };
  } catch (error) {
    console.error('Error calculating overall progress:', error);
    throw error;
  }
}

async function calculateCompletedUnits(userId) {
  try {
    // 완료된 소단원 수 계산 (빈출 어휘 제외)
    const completedUnits = await Progress.countDocuments({
      userId: parseInt(userId),
      category: 'unit',
      conceptProgress: 100,
      problemProgress: 100,
      vocabProgress: 100
    });
    
    // 총 소단원 수는 97개로 고정 (빈출 어휘 제외)
    const totalUnits = 97;
    const ratio = Number(((completedUnits / totalUnits) * 100).toFixed(2));
    
    return {
      completedUnits,
      totalUnits,
      ratio
    };
  } catch (error) {
    console.error('Error calculating completed units:', error);
    throw error;
  }
}

async function calculateVocabProgress(userId) {
  try {
    // 소단원별 어휘 진행률 조회
    const unitProgress = await Progress.find({ 
      userId: parseInt(userId), 
      category: 'unit' 
    });
    
    // 빈출 어휘 진행률 조회
    const frequentProgress = await Progress.findOne({ 
      userId: parseInt(userId), 
      category: 'frequent' 
    });

    console.log('Debug - unitProgress length:', unitProgress.length);
    console.log('Debug - frequentProgress:', frequentProgress);

    // 완료된 소단원 수 계산 (어휘가 100%인 단원)
    const completedUnits = unitProgress.filter(p => p.vocabProgress === 100).length;
    
    // 빈출 어휘도 완료된 경우 추가
    const frequentCompleted = frequentProgress && frequentProgress.vocabProgress === 100 ? 1 : 0;

    // 전체 어휘 진행률 = 완료한 소단원 수 / 98 (97개 소단원 + 1개 빈출 어휘)
    const totalVocabProgress = Number((((completedUnits + frequentCompleted) / 98) * 100).toFixed(2));
    
    console.log('Debug - completedUnits:', completedUnits);
    console.log('Debug - totalVocabProgress:', totalVocabProgress);

    return totalVocabProgress;
  } catch (error) {
    console.error('Error calculating vocab progress:', error);
    throw error;
  }
}

// 3-5. 전체 진행률 조회 (개선)
router.get('/overall', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    console.log('Debug - API 호출됨, userId:', userId);

    // 전체 진행률 계산
    const overallProgress = await calculateOverallProgress(userId);
    console.log('Debug - overallProgress:', overallProgress);
    
    // 완료된 단원 수 계산
    const completedUnitsInfo = await calculateCompletedUnits(userId);
    console.log('Debug - completedUnitsInfo:', completedUnitsInfo);
    
    // 어휘 진행률 계산 (소단원별 + 빈출 어휘 통합)
    console.log('Debug - calculateVocabProgress 호출 전');
    const totalVocabProgress = await calculateVocabProgress(userId);
    console.log('Debug - totalVocabProgress 결과:', totalVocabProgress);

    const response = {
      totalConceptProgress: overallProgress.totalConceptProgress,
      totalProblemProgress: overallProgress.totalProblemProgress,
      totalVocabProgress: totalVocabProgress,
      completedAllUnitsRatio: completedUnitsInfo.ratio
    };

    console.log('Debug - 최종 응답:', response);
    res.json(response);

  } catch (error) {
    console.error('Error getting overall progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// 3-6. 개념 진행률 목록 조회
router.get('/concepts', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // 모든 단원 조회
    const units = await Unit.find({ status: 'active' }).sort({ grade: 1, chapter: 1, orderInGrade: 1 });
    
    // 각 단원의 개념 진행률 조회
    const unitsWithProgress = await Promise.all(
      units.map(async (unit) => {
        let progress = await Progress.findOne({
          userId: parseInt(userId),
          unitId: unit._id,
          category: 'unit'
        });

        const conceptProgress = progress ? progress.conceptProgress : 0;
        
        return {
          unitId: unit._id.toString(),
          unitTitle: unit.title.ko,
          conceptProgress: conceptProgress,
          status: getStatus(conceptProgress)
        };
      })
    );

    res.json({
      units: unitsWithProgress
    });

  } catch (error) {
    console.error('Error getting concepts progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3-7. 문제 진행률 목록 조회
router.get('/problems', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // 모든 단원 조회
    const units = await Unit.find({ status: 'active' }).sort({ grade: 1, chapter: 1, orderInGrade: 1 });
    
    // 각 단원의 문제 진행률 조회
    const unitsWithProgress = await Promise.all(
      units.map(async (unit) => {
        let progress = await Progress.findOne({
          userId: parseInt(userId),
          unitId: unit._id,
          category: 'unit'
        });

        const problemProgress = progress ? progress.problemProgress : 0;
        
        return {
          unitId: unit._id.toString(),
          unitTitle: unit.title.ko,
          problemProgress: problemProgress,
          status: getStatus(problemProgress)
        };
      })
    );

    res.json({
      units: unitsWithProgress
    });

  } catch (error) {
    console.error('Error getting problems progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3-8. 어휘 진행률 목록 조회
router.get('/vocab', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // 모든 단원 조회
    const units = await Unit.find({ status: 'active' }).sort({ grade: 1, chapter: 1, orderInGrade: 1 });
    
    // 각 단원의 어휘 진행률 조회
    const unitsWithProgress = await Promise.all(
      units.map(async (unit) => {
        let progress = await Progress.findOne({
          userId: parseInt(userId),
          unitId: unit._id,
          category: 'unit'
        });

        const vocabProgress = progress ? progress.vocabProgress : 0;
        
        return {
          unitId: unit._id.toString(),
          unitTitle: unit.title.ko,
          vocabProgress: vocabProgress,
          status: getStatus(vocabProgress)
        };
      })
    );

    // 빈출 어휘 진행률 조회
    let frequentVocabProgress = 0;
    const frequentProgress = await Progress.findOne({
      userId: parseInt(userId),
      category: 'frequent'
    });
    
    if (frequentProgress) {
      frequentVocabProgress = frequentProgress.vocabProgress;
    }

    res.json({
      units: unitsWithProgress,
      frequentVocab: {
        unitId: 'frequent_vocab',
        unitTitle: '빈출 어휘',
        vocabProgress: frequentVocabProgress,
        status: getStatus(frequentVocabProgress)
      }
    });

  } catch (error) {
    console.error('Error getting vocab progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 진행률 업데이트 헬퍼 함수
async function updateProgress(userId, unitId, activityType, progressValue, category = 'unit') {
  try {
    console.log('Debug - updateProgress 시작');
    console.log('Debug - 파라미터:', { userId, unitId, activityType, progressValue, category });
    
    // 활동 유형에 따라 업데이트할 필드 결정
    let updateField = {};
    switch (activityType) {
      case 'concept':
        updateField = { conceptProgress: Math.min(100, progressValue) };
        break;
      case 'problem':
        updateField = { problemProgress: Math.min(100, progressValue) };
        break;
      case 'vocab':
        updateField = { vocabProgress: Math.min(100, progressValue) };
        break;
    }
    
    console.log('Debug - updateField:', updateField);

    // findOneAndUpdate로 atomic operation 수행
    console.log('Debug - findOneAndUpdate 호출 전');
    const progress = await Progress.findOneAndUpdate(
      {
        userId: parseInt(userId),
        unitId: unitId,
        category: category
      },
      {
        $set: {
          ...updateField,
          updatedAt: new Date()
        }
      },
      {
        upsert: true, // 없으면 생성
        new: true,    // 업데이트된 문서 반환
        setDefaultsOnInsert: true // 새로 생성될 때 기본값 설정
      }
    );
    
    console.log('Debug - findOneAndUpdate 완료:', progress);
    return progress;
  } catch (error) {
    console.error('Error updating progress:', error);
    throw error;
  }
}

// 진행률 업데이트 API (내부용)
router.post('/update', async (req, res) => {
  try {
    const { userId, unitId, activityType, progressValue } = req.body;

    if (!userId || !unitId || !activityType || progressValue === undefined) {
      return res.status(400).json({ error: 'userId, unitId, activityType, progressValue are required' });
    }

    const progress = await updateProgress(userId, unitId, activityType, progressValue);

    res.json({
      unitId: progress.unitId,
      conceptProgress: progress.conceptProgress,
      problemProgress: progress.problemProgress,
      vocabProgress: progress.vocabProgress,
      updatedAt: progress.updatedAt
    });

  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = {
  router,
  updateProgress,
  getStatus
};
