const jwt = require('jsonwebtoken');
const { UserAuth } = require('../models');

// JWT 토큰 검증 미들웨어
const verifyToken = async (req, res, next) => {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access token is required',
        message: 'Authorization header must start with Bearer'
      });
    }

    // Bearer 제거하고 토큰만 추출
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        error: 'Access token is required',
        message: 'Token not found in Authorization header'
      });
    }

    // JWT 토큰 검증
    const jwtSecret = process.env.JWT_SECRET || 'nerdmath-super-secret-jwt-key-2024';
    const decoded = jwt.verify(token, jwtSecret);
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token payload is invalid'
      });
    }

    // 토큰 타입 확인 (access token만 허용)
    if (decoded.type !== 'access') {
      return res.status(401).json({
        error: 'Invalid token type',
        message: 'Access token required'
      });
    }

    // Mock DB에서 토큰 상태 확인 (실제로는 MySQL에서 조회)
    // const userAuth = await UserAuth.findOne({ 
    //   userId: decoded.userId, 
    //   accessToken: token 
    // });
    
    // Mock 검증 (실제 구현 시 위 주석 해제)
    const userAuth = { isValid: () => true }; // 임시로 항상 유효하다고 가정

    if (!userAuth || !userAuth.isValid()) {
      return res.status(401).json({
        error: 'Token revoked or expired',
        message: 'Please login again'
      });
    }

    // 요청 객체에 사용자 정보 추가
    req.user = {
      userId: decoded.userId,
      token: token
    };

    next();

  } catch (error) {
    console.error('Token verification error:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Access token has expired'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Malformed or invalid token'
      });
    }

    return res.status(500).json({
      error: 'Token verification failed',
      message: 'Internal server error during token verification'
    });
  }
};

// 선택적 토큰 검증 (토큰이 있으면 검증, 없어도 통과)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // 토큰이 없으면 그냥 통과
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next();
    }

    // 토큰 검증 시도
    const jwtSecret = process.env.JWT_SECRET || 'nerdmath-super-secret-jwt-key-2024';
    const decoded = jwt.verify(token, jwtSecret);
    
    if (decoded && decoded.userId && decoded.type === 'access') {
      req.user = {
        userId: decoded.userId,
        token: token
      };
    }

    next();

  } catch (error) {
    // 토큰 검증 실패해도 통과 (선택적이므로)
    console.log('Optional auth failed:', error.message);
    next();
  }
};

// 관리자 권한 확인 미들웨어 (향후 확장용)
const requireAdmin = async (req, res, next) => {
  try {
    // 먼저 토큰 검증
    await verifyToken(req, res, (err) => {
      if (err) return next(err);
    });

    // 사용자 정보에서 관리자 권한 확인
    // const user = await User.findById(req.user.userId);
    // if (!user || !user.isAdmin) {
    //   return res.status(403).json({
    //     error: 'Admin access required',
    //     message: 'This endpoint requires administrator privileges'
    //   });
    // }

    // Mock 관리자 확인 (실제 구현 시 위 주석 해제)
    if (req.user.userId !== 99999) { // 임시로 특정 ID만 관리자로 설정
      return res.status(403).json({
        error: 'Admin access required',
        message: 'This endpoint requires administrator privileges'
      });
    }

    next();

  } catch (error) {
    console.error('Admin verification error:', error);
    return res.status(500).json({
      error: 'Admin verification failed',
      message: 'Internal server error during admin verification'
    });
  }
};

// 이메일 인증 확인 미들웨어 (향후 확장용)
const requireEmailVerified = async (req, res, next) => {
  try {
    // 먼저 토큰 검증
    await verifyToken(req, res, (err) => {
      if (err) return next(err);
    });

    // 사용자 정보에서 이메일 인증 상태 확인
    // const user = await User.findById(req.user.userId);
    // if (!user || !user.emailVerified) {
    //   return res.status(403).json({
    //     error: 'Email verification required',
    //     message: 'Please verify your email address first'
    //   });
    // }

    // Mock 이메일 인증 확인 (실제 구현 시 위 주석 해제)
    // 현재는 모든 사용자가 이메일 인증된 것으로 가정

    next();

  } catch (error) {
    console.error('Email verification check error:', error);
    return res.status(500).json({
      error: 'Email verification check failed',
      message: 'Internal server error during email verification check'
    });
  }
};

module.exports = {
  verifyToken,
  optionalAuth,
  requireAdmin,
  requireEmailVerified
};
