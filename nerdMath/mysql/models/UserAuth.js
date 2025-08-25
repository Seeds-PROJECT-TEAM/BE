const jwt = require('jsonwebtoken');

class UserAuth {
  constructor(data) {
    this.authId = data.authId || this.generateAuthId();
    this.userId = data.userId;
    this.accessToken = data.accessToken;
    this.accessTokenExpireAt = data.accessTokenExpireAt;
    this.refreshToken = data.refreshToken;
    this.refreshTokenExpireAt = data.refreshTokenExpireAt;
    this.issuedAt = data.issuedAt || new Date();
    this.isRevoked = data.isRevoked || false;
    this.revokedAt = data.revokedAt || null;
  }

  // 고유 인증 ID 생성
  generateAuthId() {
    return Math.floor(Math.random() * 100000) + 10000;
  }

  // JWT 토큰 생성
  static generateTokens(userId) {
    const now = new Date();
    
    // JWT_SECRET 디버깅
    console.log('🔑 JWT_SECRET 확인:', process.env.JWT_SECRET ? '설정됨' : '설정되지 않음');
    console.log('🔑 JWT_SECRET 값:', process.env.JWT_SECRET);
    
    // 임시로 하드코딩된 JWT_SECRET 사용
    const jwtSecret = process.env.JWT_SECRET || 'nerdmath-super-secret-jwt-key-2024';
    console.log('🔑 사용할 JWT_SECRET:', jwtSecret);
    
    // Access Token (24시간)
    const accessToken = jwt.sign(
      { userId, type: 'access' },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Refresh Token (7일)
    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      jwtSecret,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    // 만료 시간 계산
    const accessTokenExpireAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24시간
    const refreshTokenExpireAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7일

    return {
      accessToken,
      refreshToken,
      accessTokenExpireAt,
      refreshTokenExpireAt
    };
  }

  // 토큰 검증
  static verifyToken(token) {
    try {
      const jwtSecret = process.env.JWT_SECRET || 'nerdmath-super-secret-jwt-key-2024';
      return jwt.verify(token, jwtSecret);
    } catch (error) {
      return null;
    }
  }

  // 토큰 만료 확인
  isTokenExpired() {
    const now = new Date();
    return this.accessTokenExpireAt < now;
  }

  // Refresh 토큰 만료 확인
  isRefreshTokenExpired() {
    const now = new Date();
    return this.refreshTokenExpireAt < now;
  }

  // 토큰 무효화
  revoke() {
    this.isRevoked = true;
    this.revokedAt = new Date();
  }

  // 토큰 유효성 확인
  isValid() {
    return !this.isRevoked && !this.isTokenExpired();
  }

  // 데이터 검증
  validate() {
    const errors = [];

    if (!this.userId) errors.push('User ID is required');
    if (!this.accessToken) errors.push('Access token is required');
    if (!this.refreshToken) errors.push('Refresh token is required');
    if (!this.accessTokenExpireAt) errors.push('Access token expire date is required');
    if (!this.refreshTokenExpireAt) errors.push('Refresh token expire date is required');

    return errors;
  }

  // 민감한 정보 제외한 데이터 반환
  toJSON() {
    const auth = { ...this };
    delete auth.accessToken;
    delete auth.refreshToken;
    return auth;
  }
}

module.exports = UserAuth;
