const express = require('express');
const router = express.Router();
const { ActivityLog, AnswerAttempt, LearningTimeLog } = require('../models');
const { createHttpError, ERROR_CODES } = require('../utils/errorHandler');

// 3-6. 활동 통계 조회
router.get('/stats', async (req, res) => {
  try {
    const { userId } = req.query;
    const { date } = req.query;

    if (!userId) {
      return res.status(400).json(createHttpError(400, 'userId는 필수입니다', ['userId']));
    }

    const targetDate = date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 해당 날짜의 활동 로그 조회 (없으면 생성)
    let activityLog = await ActivityLog.findOne({
      userId: parseInt(userId),
      date: targetDate
    });

    if (!activityLog) {
      // 기본값으로 활동 로그 생성
      activityLog = new ActivityLog({
        userId: parseInt(userId),
        date: targetDate,
        todaySolved: 0,
        studyDurationMin: 0,
        totalProblems: 0,
        totalStudyMinutes: 0,
        attendanceCount: 0
      });
      await activityLog.save();
    }

    res.json({
      todaySolved: activityLog.todaySolved,
      studyDurationMin: activityLog.studyDurationMin,
      totalProblems: activityLog.totalProblems,
      totalStudyMinutes: activityLog.totalStudyMinutes,
      attendanceCount: activityLog.attendanceCount,
      date: activityLog.date
    });

  } catch (error) {
    console.error('Error getting activity stats:', error);
    res.status(500).json(createHttpError(500, '활동 통계 조회 중 오류가 발생했습니다'));
  }
});

// 활동 통계 업데이트 헬퍼 함수
async function updateActivityStats(userId, date, updates) {
  try {
    let activityLog = await ActivityLog.findOne({
      userId: parseInt(userId),
      date: date
    });

    if (!activityLog) {
      activityLog = new ActivityLog({
        userId: parseInt(userId),
        date: date,
        todaySolved: 0,
        studyDurationMin: 0,
        totalProblems: 0,
        totalStudyMinutes: 0,
        attendanceCount: 0
      });
    }

    // 업데이트 적용
    if (updates.todaySolved !== undefined) {
      activityLog.todaySolved += updates.todaySolved;
    }
    if (updates.studyDurationMin !== undefined) {
      activityLog.studyDurationMin += updates.studyDurationMin;
    }
    if (updates.totalProblems !== undefined) {
      activityLog.totalProblems += updates.totalProblems;
    }
    if (updates.totalStudyMinutes !== undefined) {
      activityLog.totalStudyMinutes += updates.totalStudyMinutes;
    }
    if (updates.attendanceCount !== undefined) {
      activityLog.attendanceCount += updates.attendanceCount;
    }

    await activityLog.save();
    return activityLog;
  } catch (error) {
    console.error('Error updating activity stats:', error);
    throw error;
  }
}

// 활동 통계 업데이트 API (내부용)
router.post('/update', async (req, res) => {
  try {
    const { userId, date, updates } = req.body;

    if (!userId || !date || !updates) {
      return res.status(400).json(createHttpError(400, 'userId, date, updates는 필수입니다', ['userId', 'date', 'updates']));
    }

    const activityLog = await updateActivityStats(userId, date, updates);

    res.json({
      todaySolved: activityLog.todaySolved,
      studyDurationMin: activityLog.studyDurationMin,
      totalProblems: activityLog.totalProblems,
      totalStudyMinutes: activityLog.totalStudyMinutes,
      attendanceCount: activityLog.attendanceCount,
      date: activityLog.date
    });

  } catch (error) {
    console.error('Error updating activity stats:', error);
    res.status(500).json(createHttpError(500, '활동 통계 업데이트 중 오류가 발생했습니다'));
  }
});

// 일별 학습 시간 계산 헬퍼 함수
async function calculateDailyStudyTime(userId, date) {
  try {
    const startOfDay = new Date(date + 'T00:00:00.000Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');

    const learningSessions = await LearningTimeLog.find({
      userId: parseInt(userId),
      startedAt: { $gte: startOfDay, $lte: endOfDay },
      durationSeconds: { $exists: true }
    });

    const totalSeconds = learningSessions.reduce((sum, session) => {
      return sum + (session.durationSeconds || 0);
    }, 0);

    return Math.round(totalSeconds / 60); // 분 단위로 변환
  } catch (error) {
    console.error('Error calculating daily study time:', error);
    return 0;
  }
}

// 일별 문제 풀이 수 계산 헬퍼 함수
async function calculateDailySolvedProblems(userId, date) {
  try {
    const startOfDay = new Date(date + 'T00:00:00.000Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');

    const answerAttempts = await AnswerAttempt.find({
      userId: parseInt(userId),
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      mode: { $ne: 'diagnostic' } // 진단테스트 제외
    });

    return answerAttempts.length;
  } catch (error) {
    console.error('Error calculating daily solved problems:', error);
    return 0;
  }
}

module.exports = {
  router,
  updateActivityStats
};
