const express = require('express');
const cors = require('cors');
require('dotenv').config();

// DB 연결 및 모델 import
const { connectDB } = require('./db');
const { Problem, ProblemSet, AnswerAttempt, Unit } = require('./models');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors({
  origin: '*', // 모든 도메인에서 접근 허용
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key']
}));
app.use(express.json());

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


// 라우터 import
const problemsRouter = require('./routes/problems');
const unitsRouter = require('./routes/units');
const answersRouter = require('./routes/answers');
const conceptsRouter = require('./routes/concepts');
const vocaRouter = require('./routes/voca');
const diagnosticsRouter = require('./routes/diagnostics');
const bookmarksRouter = require('./routes/bookmarks');
const learningRouter = require('./routes/learning');
const { router: progressRouter } = require('./routes/progress');
const { router: activityRouter } = require('./routes/activity');
const charactersRouter = require('./routes/characters');
const gamificationRouter = require('./routes/gamification');

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다!`);
  console.log(`외부 접속: http://10.15.214.211:${PORT}`);
});