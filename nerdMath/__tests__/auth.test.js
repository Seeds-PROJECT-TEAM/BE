const request = require('supertest');
const express = require('express');
const { pool } = require('../mysql/config/database');

// 테스트용 Express 앱 생성
const app = express();
app.use(express.json());

// MySQL auth 라우터 등록
const authRouter = require('../mysql/routes/auth');
app.use('/v1/auth', authRouter);

// 테스트 데이터
const TEST_EMAIL = 'jest-test@example.com';
const TEST_PASSWORD = 'Test123!@$';
let verificationCode = '';
let accessToken = '';

describe('🔐 MySQL Auth API Tests', () => {
  beforeAll(async () => {
    // 테스트 전 데이터베이스 정리
    try {
      await pool.execute('DELETE FROM email_verifications WHERE email = ?', [TEST_EMAIL]);
      await pool.execute('DELETE FROM refresh_tokens WHERE userId IN (SELECT userId FROM users WHERE email = ?)', [TEST_EMAIL]);
      await pool.execute('DELETE FROM users WHERE email = ?', [TEST_EMAIL]);
    } catch (error) {
      console.log('테스트 데이터 정리 중 오류:', error.message);
    }
  });

  afterAll(async () => {
    // 테스트 후 데이터베이스 정리
    try {
      await pool.execute('DELETE FROM email_verifications WHERE email = ?', [TEST_EMAIL]);
      await pool.execute('DELETE FROM refresh_tokens WHERE userId IN (SELECT userId FROM users WHERE email = ?)', [TEST_EMAIL]);
      await pool.execute('DELETE FROM users WHERE email = ?', [TEST_EMAIL]);
    } catch (error) {
      console.log('테스트 데이터 정리 중 오류:', error.message);
    }
  });

  describe('📧 POST /v1/auth/send-verification', () => {
    it('✅ 이메일 인증 코드 발송 성공', async () => {
      const response = await request(app)
        .post('/v1/auth/send-verification')
        .send({ email: TEST_EMAIL })
        .expect(200);

      expect(response.body).toHaveProperty('message', '인증 코드가 발송되었습니다.');
      expect(response.body).toHaveProperty('email', TEST_EMAIL);
      expect(response.body).toHaveProperty('expiresIn', '10분');

      // 인증 코드를 데이터베이스에서 가져오기
      const [rows] = await pool.execute(
        'SELECT code FROM email_verifications WHERE email = ? ORDER BY createdAt DESC LIMIT 1',
        [TEST_EMAIL]
      );
      
      if (rows.length > 0) {
        verificationCode = rows[0].code;
      }
    });

    it('❌ 이메일 형식이 잘못된 경우', async () => {
      const response = await request(app)
        .post('/v1/auth/send-verification')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('❌ 이메일이 누락된 경우', async () => {
      const response = await request(app)
        .post('/v1/auth/send-verification')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('🔍 POST /v1/auth/check-verification', () => {
    it('✅ 인증 코드 확인 성공', async () => {
      if (!verificationCode) {
        throw new Error('인증 코드가 없습니다. send-verification 테스트를 먼저 실행하세요.');
      }

      const response = await request(app)
        .post('/v1/auth/check-verification')
        .send({ 
          email: TEST_EMAIL, 
          code: verificationCode 
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', '인증이 완료되었습니다.');
      expect(response.body).toHaveProperty('emailVerified', true);
    });

    it('❌ 잘못된 인증 코드', async () => {
      const response = await request(app)
        .post('/v1/auth/check-verification')
        .send({ 
          email: TEST_EMAIL, 
          code: '000000' 
        })
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Verification not found');
    });

    it('❌ 이미 사용된 인증 코드', async () => {
      const response = await request(app)
        .post('/v1/auth/check-verification')
        .send({ 
          email: TEST_EMAIL, 
          code: verificationCode 
        })
        .expect(422);

      expect(response.body).toHaveProperty('error', 'Verification already used');
    });
  });

  describe('👤 POST /v1/auth/register', () => {
    it('✅ 회원가입 성공', async () => {
      const userData = {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: '테스트 사용자',
        birthDate: '2000-01-01',
        phoneNumber: '010-1234-5678',
        nickname: '테스터',
        gender: 'male',
        agreeTerms: true,
        agreePrivacy: true,
        agreeMarketing: false
      };

      const response = await request(app)
        .post('/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('email', TEST_EMAIL);
      expect(response.body).toHaveProperty('message', '회원가입이 완료되었습니다.');
    });

    it('❌ 이미 가입된 이메일', async () => {
      const userData = {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: '테스트 사용자',
        birthDate: '2000-01-01',
        phoneNumber: '010-1234-5678',
        nickname: '테스터2',
        gender: 'male',
        agreeTerms: true,
        agreePrivacy: true,
        agreeMarketing: false
      };

      const response = await request(app)
        .post('/v1/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Email already exists');
    });

    it('❌ 이메일 인증되지 않은 경우', async () => {
      // 새로운 이메일로 테스트
      const newEmail = 'unverified@example.com';
      
      const userData = {
        email: newEmail,
        password: TEST_PASSWORD,
        name: '미인증 사용자',
        birthDate: '2000-01-01',
        phoneNumber: '010-1234-5678',
        nickname: '미인증',
        gender: 'male',
        agreeTerms: true,
        agreePrivacy: true,
        agreeMarketing: false
      };

      const response = await request(app)
        .post('/v1/auth/register')
        .send(userData)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Email not verified');
    });
  });

  describe('🔐 POST /v1/auth/login', () => {
    it('✅ 로그인 성공', async () => {
      const response = await request(app)
        .post('/v1/auth/login')
        .send({
          email: TEST_EMAIL,
          password: TEST_PASSWORD
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('userId');
      expect(response.body.user).toHaveProperty('email', TEST_EMAIL);
      expect(response.body.user).toHaveProperty('name', '테스트 사용자');
      expect(response.body.user).toHaveProperty('emailVerified', 1);

      accessToken = response.body.accessToken;
    });

    it('❌ 잘못된 비밀번호', async () => {
      const response = await request(app)
        .post('/v1/auth/login')
        .send({
          email: TEST_EMAIL,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('❌ 존재하지 않는 이메일', async () => {
      const response = await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: TEST_PASSWORD
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });
  });

  describe('👤 GET /v1/auth/profile', () => {
    it('✅ 프로필 조회 성공', async () => {
      if (!accessToken) {
        throw new Error('Access Token이 없습니다. login 테스트를 먼저 실행하세요.');
      }

      const response = await request(app)
        .get('/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('email', TEST_EMAIL);
      expect(response.body).toHaveProperty('name', '테스트 사용자');
      expect(response.body).toHaveProperty('nickname', '테스터');
      expect(response.body).toHaveProperty('emailVerified', 1);
    });

    it('❌ 토큰이 없는 경우', async () => {
      const response = await request(app)
        .get('/v1/auth/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token is required');
    });

    it('❌ 잘못된 토큰', async () => {
      const response = await request(app)
        .get('/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid token');
    });
  });

  describe('🚪 POST /v1/auth/logout', () => {
    it('✅ 로그아웃 성공', async () => {
      if (!accessToken) {
        throw new Error('Access Token이 없습니다. login 테스트를 먼저 실행하세요.');
      }

      const response = await request(app)
        .post('/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', '로그아웃되었습니다.');
    });

    it('❌ 토큰이 없는 경우', async () => {
      const response = await request(app)
        .post('/v1/auth/logout')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token is required');
    });
  });
});
