const { S3Client } = require('@aws-sdk/client-s3');
require('dotenv').config();

// 환경 변수 디버깅
console.log('🔍 S3 환경 변수 확인:');
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '설정됨' : '설정되지 않음');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '설정됨' : '설정되지 않음');
console.log('S3_BUCKET_NAME:', process.env.S3_BUCKET_NAME);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// 환경 변수 사용 (하드코딩 제거)
const awsRegion = process.env.AWS_REGION;
const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

console.log('🔧 사용할 S3 설정:');
console.log('Region:', awsRegion);
console.log('Access Key ID:', awsAccessKeyId);
console.log('Secret Access Key:', awsSecretAccessKey ? '설정됨' : '설정되지 않음');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// S3 클라이언트 생성
const s3Client = new S3Client({
  region: awsRegion,
  credentials: {
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey
  }
});

module.exports = {
  s3Client,
  bucketName: process.env.S3_BUCKET_NAME || 'nerdmath-images'
};
