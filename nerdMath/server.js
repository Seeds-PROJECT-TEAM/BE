const express = require('express');
const cors = require('cors');
require('dotenv').config();

// DB 연결 및 모델 import
const { connectDB } = require('./mongodb/config/database');
const { Problem, ProblemSet, AnswerAttempt, Unit } = require('./mongodb/models');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors({
  origin: '*', // 모든 도메인에서 접근 허용
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key']
}));
app.use(express.json());

// favicon.ico 요청 처리 (404 오류 방지)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No Content 응답
});

// 모든 요청에 대한 로깅 미들웨어 추가
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// MongoDB 연결
connectDB().catch(err => {
  console.log('MongoDB 연결 실패:', err.message);
  console.log('서버는 실행되지만 데이터베이스 기능은 제한됩니다.');
});

// 기본 라우트
app.get('/', (req, res) => {
  res.json({ 
    message: 'NerdMath API에 오신 것을 환영합니다!',
    version: '1.0.0',
    status: 'running'
  });
});


// MongoDB Routes
const progressRouter = require('./mongodb/routes/progress').router;
const activityRouter = require('./mongodb/routes/activity').router;
const charactersRouter = require('./mongodb/routes/characters');
const gamificationRouter = require('./mongodb/routes/gamification');
const answersRouter = require('./mongodb/routes/answers');
const conceptsRouter = require('./mongodb/routes/concepts');
const unitsRouter = require('./mongodb/routes/units');
const vocaRouter = require('./mongodb/routes/voca');
const problemsRouter = require('./mongodb/routes/problems');
const bookmarksRouter = require('./mongodb/routes/bookmarks');
const diagnosticsRouter = require('./mongodb/routes/diagnostics');
const learningRouter = require('./mongodb/routes/learning');

// MySQL Routes
const authRouter = require('./mysql/routes/auth');

// 공통 Routes
const uploadRouter = require('./s3/routes/upload');

// 라우터 사용
app.use('/v1/problems', problemsRouter);
app.use('/api/problems', problemsRouter);
app.use('/v1/units', unitsRouter);
app.use('/v1/answers', answersRouter);
app.use('/v1/units', conceptsRouter);
app.use('/v1/vocab', vocaRouter);
app.use('/v1/diagnostics', diagnosticsRouter);
app.use('/v1/bookmarks', bookmarksRouter);
app.use('/v1/learning', learningRouter);
app.use('/v1/progress', progressRouter);
app.use('/v1/activity', activityRouter);
app.use('/v1/characters', charactersRouter);
app.use('/v1/gamification', gamificationRouter);

// MySQL 인증 라우터
app.use('/v1/auth', authRouter);
console.log('🔧 인증 라우터 등록됨: /v1/auth');

// 업로드 라우터
app.use('/v1/upload', uploadRouter);
console.log('🔧 업로드 라우터 등록됨: /v1/upload');

app.listen(PORT, '0.0.0.0', () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다!`);
  console.log(`외부 접속: http://10.15.214.211:${PORT}`);
});