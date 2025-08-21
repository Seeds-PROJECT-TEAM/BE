const express = require('express');
const cors = require('cors');
require('dotenv').config();

// DB 연결 및 모델 import
const { connectDB } = require('./db');
const { Problem, ProblemSet, AnswerAttempt, Unit } = require('./models');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB 연결
connectDB();

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

// 라우터 사용
app.use('/v1/problems', problemsRouter);
app.use('/api/problems', problemsRouter);
app.use('/v1/units', unitsRouter);
app.use('/v1/answers', answersRouter);
app.use('/v1/units', conceptsRouter);
app.use('/v1/vocab', vocaRouter);
app.use('/v1/diagnostics', diagnosticsRouter);
app.use('/v1/bookmarks', bookmarksRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다!`);
  console.log(`외부 접속: http://172.16.8.121:${PORT}`);
});