const express = require('express');
const router = express.Router();
const { Bookmark, Problem, Unit, ProblemSet } = require('../models');

// 2-1. 북마크 토글
router.post('/toggle', async (req, res) => {
  try {
    const { userId } = req.query;
    const { problemId } = req.body;

    if (!userId || !problemId) {
      return res.status(400).json({ error: 'userId and problemId are required' });
    }

    // 문제 존재 확인
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // 기존 북마크 확인
    const existingBookmark = await Bookmark.findOne({
      userId: parseInt(userId),
      problemId: problemId
    });

    if (existingBookmark) {
      // 북마크 해제
      await Bookmark.findByIdAndDelete(existingBookmark._id);
      
      res.json({
        bookmarkId: existingBookmark._id,
        problemId: problemId,
        bookmarked: false,
        message: '북마크가 해제되었습니다'
      });
    } else {
      // 북마크 추가
      const bookmark = new Bookmark({
        userId: parseInt(userId),
        problemId: problemId,
        unitId: problem.unitId,
        bookmarkedAt: new Date()
      });

      await bookmark.save();

      res.json({
        bookmarkId: bookmark._id,
        problemId: problemId,
        bookmarked: true,
        message: '북마크가 추가되었습니다'
      });
    }

  } catch (error) {
    console.error('Error toggling bookmark:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2-2. 북마크 목록 조회
router.get('/', async (req, res) => {
  try {
    const { userId, unitId, startDate, endDate } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // 필터 조건 구성
    const filter = { userId: parseInt(userId) };

    if (unitId) {
      filter.unitId = unitId;
    }

    if (startDate || endDate) {
      filter.bookmarkedAt = {};
      if (startDate) filter.bookmarkedAt.$gte = new Date(startDate);
      if (endDate) filter.bookmarkedAt.$lte = new Date(endDate);
    }

    // 북마크 조회 (최신순)
    const bookmarks = await Bookmark.find(filter)
      .populate('problemId')
      .populate('unitId')
      .sort({ bookmarkedAt: -1 });

    // 응답 데이터 구성
    const bookmarkList = bookmarks.map(bookmark => ({
      bookmarkId: bookmark._id,
      problemId: bookmark.problemId._id,
      unitId: bookmark.unitId._id,
      unitTitle: bookmark.unitId.title,
      problemTitle: bookmark.problemId.title,
      bookmarkedAt: bookmark.bookmarkedAt
    }));

    res.json({
      bookmarks: bookmarkList,
      totalCount: bookmarkList.length
    });

  } catch (error) {
    console.error('Error getting bookmarks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2-3. 북마크한 문제로 복습 시작
router.post('/review', async (req, res) => {
  try {
    const { userId } = req.query;
    const { unitId, mode = 'individual' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // 필터 조건
    const filter = { userId: parseInt(userId) };
    if (unitId) {
      filter.unitId = unitId;
    }

    // 북마크한 문제 조회
    const bookmarks = await Bookmark.find(filter);
    
    if (bookmarks.length === 0) {
      return res.status(404).json({ error: '북마크한 문제가 없습니다' });
    }

    const problemIds = bookmarks.map(b => b.problemId);

    if (mode === 'set') {
      // 문제 세트 생성
      const problemSet = new ProblemSet({
        mode: 'review',
        problemIds: problemIds,
        unitId: unitId || bookmarks[0].unitId,
        createdAt: new Date()
      });

      await problemSet.save();

      res.status(201).json({
        setId: problemSet._id,
        problemIds: problemIds,
        totalProblems: problemIds.length,
        mode: 'review'
      });
    } else {
      // 개별 문제 모드
      res.json({
        problemIds: problemIds,
        totalProblems: problemIds.length,
        mode: 'individual'
      });
    }

  } catch (error) {
    console.error('Error starting bookmark review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2-4. 북마크 상태 확인
router.get('/:problemId/status', async (req, res) => {
  try {
    const { problemId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const bookmark = await Bookmark.findOne({
      userId: parseInt(userId),
      problemId: problemId
    });

    if (!bookmark) {
      return res.json({
        problemId: problemId,
        bookmarked: false,
        bookmarkedAt: null
      });
    }

    res.json({
      problemId: problemId,
      bookmarked: true,
      bookmarkedAt: bookmark.bookmarkedAt
    });

  } catch (error) {
    console.error('Error checking bookmark status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
