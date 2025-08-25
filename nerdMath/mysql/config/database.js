const mysql = require('mysql2/promise');
require('dotenv').config();

// MySQL 연결 풀 생성
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'database-1.cts0a426g5pw.ap-southeast-2.rds.amazonaws.com',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'admin',
  password: process.env.MYSQL_PASSWORD || 'E*EYAG(yEW3-D0HxXq47xK[B>C1:',
  database: process.env.MYSQL_DATABASE || 'database-1',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});

// 연결 테스트 함수
async function testConnection() {
  try {
    console.log('🔍 MySQL 연결 테스트 시작...');
    const connection = await pool.getConnection();
    console.log('✅ MySQL 연결 성공!');
    console.log(`📍 호스트: ${process.env.MYSQL_HOST}`);
    console.log(`📊 데이터베이스: ${process.env.MYSQL_DATABASE}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL 연결 실패:', error.message);
    return false;
  }
}

// 데이터베이스 초기화 함수
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // 사용자 테이블 생성
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        userId INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        birthDate DATE,
        phoneNumber VARCHAR(20),
        nickname VARCHAR(50),
        gender ENUM('male', 'female', 'other'),
        emailVerified BOOLEAN DEFAULT FALSE,
        agreeTerms BOOLEAN DEFAULT FALSE,
        agreePrivacy BOOLEAN DEFAULT FALSE,
        agreeMarketing BOOLEAN DEFAULT FALSE,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_userId (userId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 이메일 인증 테이블 생성
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(10) NOT NULL,
        expiresAt TIMESTAMP NOT NULL,
        isUsed BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_code (code),
        INDEX idx_expires (expiresAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 리프레시 토큰 테이블 생성
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        token VARCHAR(500) NOT NULL,
        expiresAt TIMESTAMP NOT NULL,
        isRevoked BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE,
        INDEX idx_userId (userId),
        INDEX idx_token (token),
        INDEX idx_expires (expiresAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ MySQL 테이블 초기화 완료!');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL 테이블 초기화 실패:', error.message);
    return false;
  }
}

module.exports = {
  pool,
  testConnection,
  initializeDatabase
};
