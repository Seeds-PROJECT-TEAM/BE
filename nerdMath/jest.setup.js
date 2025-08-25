// Jest 테스트 환경 설정
require('dotenv').config();

// 테스트 환경 변수 설정
process.env.NODE_ENV = 'test';
process.env.PORT = '3003'; // 테스트용 포트

// 글로벌 테스트 타임아웃 설정
jest.setTimeout(10000);

// 콘솔 로그 억제 (테스트 중에는 로그가 너무 많이 나오지 않도록)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
