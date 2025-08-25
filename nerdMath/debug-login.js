const axios = require('axios');

async function debugLogin() {
  try {
    console.log('🔍 로그인 디버깅 시작...');
    
    const response = await axios.post('http://localhost:3002/v1/auth/login', {
      email: 'test9@example.com',
      password: 'Test123!@$'
    });
    
    console.log('✅ 로그인 성공:', response.data);
  } catch (error) {
    console.log('❌ 로그인 실패:');
    console.log('Status:', error.response?.status);
    console.log('Data:', error.response?.data);
    console.log('Error:', error.message);
  }
}

debugLogin();
