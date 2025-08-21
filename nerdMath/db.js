const mongoose = require('mongoose');

// MongoDB 연결 설정
const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://hagyeoung:dlgkrud1!@cluster0.fcovlkz.mongodb.net/nerdmath?retryWrites=true&w=majority&appName=Cluster0';

// MongoDB 연결 함수
const connectDB = async () => {
  try {
    console.log('사용할 URI:', mongoURI);
    await mongoose.connect(mongoURI);
    console.log('MongoDB 연결 성공!');
  } catch (error) {
    console.error('MongoDB 연결 실패:', error);
    process.exit(1);
  }
};

// MongoDB 연결 상태 확인
const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

module.exports = {
  connectDB,
  isConnected,
  mongoURI
};
