const express = require('express');
const router = express.Router();
const { Voca, Unit } = require('../models');

// 1. 단원별 어휘 배열 조회
router.get('/unit/:unitId', async (req, res) => {
  try {
    const { unitId } = req.params;

    // 단위 조회
    const unit = await Unit.findById(unitId);
    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    // 해당 단원의 어휘들 조회
    const vocabularies = await Voca.find({ 
      unitId: unitId,
      category: 'math_term',
      type: '일반'
    }).sort({ createdAt: 1 });

    // 응답 구성
    const response = {
      unitId: unitId,
      category: 'math_term',
      vocabularies: vocabularies.map(voca => ({
        vocaId: voca._id.toString(),
        word: voca.word,
        meaning: voca.meaning,
        etymology: voca.etymology,
        imageUrl: voca.imageUrl,
        createdAt: voca.createdAt.toISOString()
      }))
    };

    res.json(response);

  } catch (error) {
    console.error('Error fetching unit vocabularies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. 빈출 숙어/단어 배열 조회
router.get('/common/:type', async (req, res) => {
  try {
    const { type } = req.params;

    // 유효한 타입인지 확인
    if (!['sat_act'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Use sat_act' });
    }

    // 해당 카테고리의 어휘들 조회
    const vocabularies = await Voca.find({ 
      category: type,
      type: '일반'
    }).sort({ createdAt: 1 });

    // 응답 구성
    const response = {
      type: type,
      vocabularies: vocabularies.map(voca => ({
        vocaId: voca._id.toString(),
        word: voca.word,
        meaning: voca.meaning,
        etymology: voca.etymology,
        imageUrl: voca.imageUrl,
        createdAt: voca.createdAt.toISOString()
      }))
    };

    res.json(response);

  } catch (error) {
    console.error('Error fetching common vocabularies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. 어휘 테스트 생성
router.get('/test', async (req, res) => {
  try {
    const { unitId, testSize } = req.query;

    if (!unitId) {
      return res.status(400).json({ error: 'unitId is required' });
    }

    // 단위 조회
    const unit = await Unit.findById(unitId);
    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    // 해당 단원의 어휘들 조회
    const vocabularies = await Voca.find({ 
      unitId: unitId,
      category: 'math_term',
      type: '일반'
    });

    if (vocabularies.length === 0) {
      return res.status(404).json({ error: 'No vocabularies found for this unit' });
    }

    // testSize가 지정되지 않으면 모든 어휘 사용, 지정되면 해당 개수만큼 사용
    const finalTestSize = testSize ? Math.min(parseInt(testSize), vocabularies.length) : vocabularies.length;
    
    // 랜덤하게 어휘 선택
    const selectedVocabularies = vocabularies
      .sort(() => 0.5 - Math.random())
      .slice(0, finalTestSize);

    // 문제 생성 (영어→한글, 한글→영어 랜덤)
    const problems = selectedVocabularies.map((voca, index) => {
      const isWordToMeaning = Math.random() < 0.5;
      
      return {
        problemId: `vocab_${voca._id}_${index}`, // 간단한 임시 ID
        vocaId: voca._id.toString(),
        question: isWordToMeaning 
          ? `${voca.word}의 뜻을 쓰세요`
          : `${voca.meaning}을 영어로 쓰세요`,
        correctAnswer: isWordToMeaning ? voca.meaning : voca.word,
        explanation: voca.etymology || '어원 정보가 없습니다.',
        questionType: isWordToMeaning ? 'word_to_meaning' : 'meaning_to_word'
      };
    });

    // 응답 구성
    const response = {
      testSet: {
        unitId: unitId,
        testSize: problems.length,
        problems: problems
      },
      generatedAt: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('Error generating vocab test:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. 소단원별 복습 어휘 조회
router.get('/review/unit/:unitId', async (req, res) => {
  try {
    const { unitId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // 단위 조회
    const unit = await Unit.findById(unitId);
    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    // 해당 단원의 최신 틀린 어휘들 조회 (MongoDB Aggregation)
    const incorrectVocabularies = await AnswerAttempt.aggregate([
      { $match: { 
        userId: parseInt(userId), 
        mode: 'vocab_test',
        unitId: unit._id 
      }},
      // 각 어휘별로 최신 시도 기록만 가져오기
      { $sort: { scoredAt: -1 } },
      { $group: {
        _id: '$vocaId',
        latestAttempt: { $first: '$$ROOT' }
      }},
      // 최신 시도가 틀린 것만 필터링
      { $match: {
        'latestAttempt.isCorrect': false
      }},
      { $addFields: {
        vocaId: '$_id',
        lastAttempted: '$latestAttempt.scoredAt'
      }},
      { $lookup: {
        from: 'vocas',
        localField: '_id',
        foreignField: '_id',
        as: 'vocabInfo'
      }},
      { $unwind: '$vocabInfo' },
      { $project: {
        vocaId: '$_id',
        word: '$vocabInfo.word',
        meaning: '$vocabInfo.meaning',
        etymology: '$vocabInfo.etymology',
        imageUrl: '$vocabInfo.imageUrl',
        lastAttempted: 1
      }}
    ]);

    // 응답 구성
    const response = {
      unitId: unitId,
      category: 'math_term',
      userId: parseInt(userId),
      incorrectVocabularies: incorrectVocabularies.map(voca => ({
        ...voca,
        vocaId: voca.vocaId.toString(),
        lastAttempted: voca.lastAttempted.toISOString()
      }))
    };

    res.json(response);

  } catch (error) {
    console.error('Error fetching review vocabularies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. 빈출 숙어/단어 복습 어휘 조회
router.get('/review/common/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // 유효한 타입인지 확인
    if (!['sat_act'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Use sat_act' });
    }

    // 해당 카테고리의 최신 틀린 어휘들 조회 (MongoDB Aggregation)
    const incorrectVocabularies = await AnswerAttempt.aggregate([
      { $match: { 
        userId: parseInt(userId), 
        mode: 'vocab_test'
      }},
      { $lookup: {
        from: 'vocas',
        localField: 'vocaId',
        foreignField: '_id',
        as: 'vocabInfo'
      }},
      { $unwind: '$vocabInfo' },
      { $match: {
        'vocabInfo.category': type
      }},
      // 각 어휘별로 최신 시도 기록만 가져오기
      { $sort: { scoredAt: -1 } },
      { $group: {
        _id: '$vocaId',
        latestAttempt: { $first: '$$ROOT' }
      }},
      // 최신 시도가 틀린 것만 필터링
      { $match: {
        'latestAttempt.isCorrect': false
      }},
      { $addFields: {
        vocaId: '$_id',
        lastAttempted: '$latestAttempt.scoredAt'
      }},
      { $project: {
        vocaId: '$_id',
        word: '$latestAttempt.vocabInfo.word',
        meaning: '$latestAttempt.vocabInfo.meaning',
        etymology: '$latestAttempt.vocabInfo.etymology',
        imageUrl: '$latestAttempt.vocabInfo.imageUrl',
        lastAttempted: 1
      }}
    ]);

    // 응답 구성
    const response = {
      type: type,
      userId: parseInt(userId),
      incorrectVocabularies: incorrectVocabularies.map(voca => ({
        ...voca,
        vocaId: voca.vocaId.toString(),
        lastAttempted: voca.lastAttempted.toISOString()
      }))
    };

    res.json(response);

  } catch (error) {
    console.error('Error fetching common review vocabularies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

