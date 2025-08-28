const express = require('express');
const router = express.Router();

// 모델 및 유틸리티 import
const { User, UserAuth, EmailVerification } = require('../models');
const { pool } = require('../config/database');
const EmailService = require('../utils/emailService');
const ValidationUtils = require('../utils/validation');
const { verifyToken } = require('../middleware/auth');
const { createHttpError, ERROR_CODES } = require('../../mongodb/utils/errorHandler');

// 1. 이메일 인증 코드 발송
router.post('/send-verification', async (req, res) => {
  console.log('🔍 인증 코드 발송 요청 받음:', req.body);
  try {
    const { email } = req.body;

    // 필수 필드 검증
    if (!email) {
      return res.status(400).json(createHttpError(400, '이메일은 필수 필드입니다', ['email']));
    }

    // 입력 검증
    const validationErrors = ValidationUtils.validateEmailVerificationData({ email });
    if (validationErrors.length > 0) {
      return res.status(400).json(createHttpError(400, '입력 데이터가 올바르지 않습니다', validationErrors));
    }

    // 이미 가입된 이메일인지 확인
    const [existingUsers] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    if (existingUsers.length > 0) {
      return res.status(409).json(createHttpError(409, '이미 가입된 이메일입니다', ['email']));
    }

    // 기존 인증 코드가 있으면 제거
    await pool.execute(
      'DELETE FROM email_verifications WHERE email = ?',
      [email]
    );

    // 새로운 인증 코드 생성
    const verification = new EmailVerification({ email });
    await pool.execute(
      'INSERT INTO email_verifications (email, code, expiresAt) VALUES (?, ?, ?)',
      [email, verification.code, verification.expiresAt]
    );

    // 이메일 발송 (Mock)
    const emailResult = await EmailService.sendVerificationCode(email, verification.code);

    if (!emailResult.success) {
      return res.status(500).json(createHttpError(500, emailResult.message || '이메일 발송에 실패했습니다'));
    }

    res.status(200).json({
      message: '인증 코드가 발송되었습니다.',
      email: email,
      expiresIn: '10분'
    });

  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json(createHttpError(500, '인증 코드 발송 중 오류가 발생했습니다'));
  }
});

// 2. 이메일 인증 코드 확인
router.post('/check-verification', async (req, res) => {
  try {
    const { email, code } = req.body;

    // 필수 필드 검증
    if (!email || !code) {
      return res.status(400).json(createHttpError(400, '이메일과 인증 코드는 필수 필드입니다', ['email', 'code']));
    }

    // 입력 검증
    const validationErrors = ValidationUtils.validateVerificationCodeData({ email, code });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: '입력 데이터가 올바르지 않습니다.',
        details: validationErrors
      });
    }

    // 인증 코드 찾기
    const [verificationRows] = await pool.execute(
      'SELECT * FROM email_verifications WHERE email = ? AND code = ? AND expiresAt > NOW()',
      [email, code]
    );
    
    if (verificationRows.length === 0) {
      return res.status(404).json(createHttpError(404, '인증 코드를 찾을 수 없습니다', ['code']));
    }

    const verification = verificationRows[0];
    
    // 이미 사용된 코드인지 확인
    if (verification.isUsed) {
      return res.status(422).json(createHttpError(422, '이미 인증된 코드입니다', ['code']));
    }

    // 인증 코드를 사용됨으로 표시
    await pool.execute(
      'UPDATE email_verifications SET isUsed = 1 WHERE id = ?',
      [verification.id]
    );

    res.status(200).json({
      message: '인증이 완료되었습니다.',
      emailVerified: true
    });

  } catch (error) {
    console.error('Check verification error:', error);
    res.status(500).json(createHttpError(500, '인증 코드 확인 중 오류가 발생했습니다'));
  }
});

// 3. 회원가입
router.post('/register', async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      birthDate,
      phoneNumber,
      nickname,
      gender,
      agreeTerms,
      agreePrivacy,
      agreeMarketing
    } = req.body;

    // 필수 필드 검증
    const requiredFields = { email, password, name, birthDate, phoneNumber, nickname, gender };
    const missingFields = Object.keys(requiredFields).filter(field => !requiredFields[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json(createHttpError(400, '필수 필드가 누락되었습니다', missingFields));
    }

    // 입력 검증
    const validationErrors = ValidationUtils.validateRegistrationData({
      email,
      password,
      name,
      birthDate,
      phoneNumber,
      nickname,
      gender,
      agreeTerms,
      agreePrivacy,
      agreeMarketing
    });

    if (validationErrors.length > 0) {
      return res.status(400).json(createHttpError(400, '입력 데이터가 올바르지 않습니다', validationErrors));
    }

    // 이메일 중복 확인
    const [existingUsers] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    if (existingUsers.length > 0) {
      return res.status(409).json(createHttpError(409, '이미 가입된 이메일입니다', ['email']));
    }

    // 이메일 인증 확인
    const [verificationRows] = await pool.execute(
      'SELECT * FROM email_verifications WHERE email = ? AND isUsed = 1 AND expiresAt > NOW()',
      [email]
    );
    if (verificationRows.length === 0) {
      return res.status(403).json(createHttpError(403, '이메일 인증이 필요합니다. 인증 코드를 확인해주세요.', ['email']));
    }

    // 비밀번호 해싱
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    // 사용자 생성 (MySQL에 저장)
    const [result] = await pool.execute(
      `INSERT INTO users (
        email, password, name, birthDate, phoneNumber, nickname, 
        gender, emailVerified, agreeTerms, agreePrivacy, agreeMarketing, 
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        email, hashedPassword, name, birthDate, phoneNumber, nickname,
        gender, false, agreeTerms, agreePrivacy, agreeMarketing
      ]
    );

    const userId = result.insertId;

    // 환영 이메일 발송 (Mock)
    await EmailService.sendWelcomeEmail(email, name);

    res.status(201).json({
      userId: userId,
      email: email,
      message: '회원가입이 완료되었습니다.'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json(createHttpError(500, '회원가입 중 오류가 발생했습니다'));
  }
});

// 4. 로그인
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 필수 필드 검증
    if (!email || !password) {
      return res.status(400).json(createHttpError(400, '이메일과 비밀번호는 필수 필드입니다', ['email', 'password']));
    }

    // 입력 검증
    const validationErrors = ValidationUtils.validateLoginData({ email, password });
    if (validationErrors.length > 0) {
      return res.status(400).json(createHttpError(400, '입력 데이터가 올바르지 않습니다', validationErrors));
    }

    // 사용자 찾기
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    if (users.length === 0) {
      return res.status(401).json(createHttpError(401, '이메일 또는 비밀번호가 올바르지 않습니다', ['email', 'password']));
    }

    const user = users[0];

    // 비밀번호 확인
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json(createHttpError(401, '이메일 또는 비밀번호가 올바르지 않습니다', ['email', 'password']));
    }

    // 이메일 인증 확인
    if (!user.emailVerified) {
      return res.status(403).json(createHttpError(403, '이메일 인증이 필요합니다', ['email']));
    }

    // 출석 체크 (일일 첫 로그인 시에만)
    try {
      const { updateActivityStats } = require('../../mongodb/routes/activity');
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // 오늘 날짜의 활동 로그 확인
      const { ActivityLog } = require('../../mongodb/models');
      const todayActivity = await ActivityLog.findOne({
        userId: user.userId,
        date: today
      });
      
      // 오늘 처음 로그인하는 경우에만 출석 카운트 증가
      if (!todayActivity || todayActivity.attendanceCount === 0) {
        await updateActivityStats(user.userId, today, {
          attendanceCount: 1
        });
        console.log(`출석 체크 완료: userId ${user.userId}, date ${today}`);
      }
    } catch (attendanceError) {
      console.error('출석 체크 중 오류:', attendanceError);
      // 출석 체크 실패해도 로그인은 계속 진행
    }

    // 기존 토큰 무효화
    await pool.execute(
      'DELETE FROM refresh_tokens WHERE userId = ?',
      [user.userId]
    );

    // 새 토큰 생성
    const tokens = UserAuth.generateTokens(user.userId);

    // 리프레시 토큰을 MySQL에 저장
    await pool.execute(
      'INSERT INTO refresh_tokens (userId, token, expiresAt) VALUES (?, ?, ?)',
      [user.userId, tokens.refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
    );

    res.status(200).json({
      accessToken: tokens.accessToken,
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        nickname: user.nickname, // 원래대로 nickname으로 변경
        emailVerified: user.emailVerified
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(createHttpError(500, '로그인 중 오류가 발생했습니다'));
  }
});

// 5. 로그아웃
router.post('/logout', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // 토큰 무효화 (MySQL에서 리프레시 토큰 삭제)
    await pool.execute(
      'DELETE FROM refresh_tokens WHERE userId = ?',
      [userId]
    );

    res.status(200).json({
      message: '로그아웃되었습니다.'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json(createHttpError(500, '로그아웃 중 오류가 발생했습니다'));
  }
});

// 6. 사용자 정보 조회
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // 사용자 찾기
    const [users] = await pool.execute(
      'SELECT userId, email, name, nickname, birthDate, phoneNumber, gender, emailVerified, createdAt FROM users WHERE userId = ?',
      [userId]
    );
    if (users.length === 0) {
      return res.status(404).json(createHttpError(404, '사용자를 찾을 수 없습니다', ['userId']));
    }

    const user = users[0];
    // API 명세서에 맞춰 응답 필드 매핑
    res.status(200).json({
      userId: user.userId,
      email: user.email,
      name: user.name,
      nickname: user.nickname, // 원래대로 nickname으로 변경
      birthDate: user.birthDate,
      phoneNumber: user.phoneNumber,
      gender: user.gender,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json(createHttpError(500, '사용자 정보 조회 중 오류가 발생했습니다'));
  }
});

// 토큰 없이 접근하는 경우 (미들웨어에서 처리됨)
// 401 Unauthorized - 토큰 없음/만료
// 500 Internal Server Error - 서버 오류

module.exports = router;
