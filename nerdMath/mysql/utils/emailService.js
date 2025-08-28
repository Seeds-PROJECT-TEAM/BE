const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

// AWS SES 클라이언트를 함수 내에서 생성하도록 변경
function createSESClient() {
  // dotenv를 다시 로드하여 환경 변수 확인
  require('dotenv').config();
  
  // 환경 변수 디버깅
  console.log('🔍 AWS 환경 변수 확인:');
  console.log('AWS_REGION:', process.env.AWS_REGION);
  console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '설정됨' : '설정되지 않음');
  console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '설정됨' : '설정되지 않음');
  console.log('FROM_EMAIL:', process.env.FROM_EMAIL);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 환경 변수 사용 (하드코딩 제거)
  const awsRegion = process.env.AWS_REGION || 'ap-southeast-2';
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  // 필수 환경변수 체크
  if (!awsAccessKeyId || !awsSecretAccessKey) {
    throw new Error('AWS_ACCESS_KEY_ID 또는 AWS_SECRET_ACCESS_KEY가 설정되지 않았습니다.');
  }

  console.log('🔧 사용할 AWS 설정:');
  console.log('Region:', awsRegion);
  console.log('Access Key ID:', awsAccessKeyId);
  console.log('Secret Access Key:', awsSecretAccessKey ? '설정됨' : '설정되지 않음');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // AWS SES v1 클라이언트 설정
  return new SESClient({
    region: awsRegion,
    credentials: {
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey
    }
  });
}

class EmailService {
  // 인증 코드 발송
  static async sendVerificationCode(email, code) {
    try {
      // SES 클라이언트 생성
      const sesClient = createSESClient();
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">NerdMath 이메일 인증</h2>
          <p>안녕하세요! NerdMath 회원가입을 위한 인증 코드입니다.</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; margin: 0;">${code}</h1>
          </div>
          <p>이 코드는 10분 후에 만료됩니다.</p>
          <p>본인이 요청하지 않았다면 이 이메일을 무시하세요.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">© 2024 NerdMath. All rights reserved.</p>
        </div>
      `;

      const command = new SendEmailCommand({
        Source: process.env.FROM_EMAIL || '56j78@naver.com',
        Destination: {
          ToAddresses: [email]
        },
        Message: {
          Subject: {
            Data: '[NerdMath] 이메일 인증 코드',
            Charset: 'UTF-8'
          },
          Body: {
            Html: {
              Data: htmlContent,
              Charset: 'UTF-8'
            }
          }
        }
      });

      const result = await sesClient.send(command);
      
      console.log('📧 AWS SES - Verification Code Sent');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📮 To: ${email}`);
      console.log(`🔢 Verification Code: ${code}`);
      console.log(`⏰ Expires: 10 minutes`);
      console.log(`📧 Message ID: ${result.MessageId}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      return { success: true, messageId: result.MessageId };
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return { success: false, message: error.message };
    }
  }

  // 환영 이메일 발송
  static async sendWelcomeEmail(email, name) {
    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">NerdMath에 오신 것을 환영합니다!</h2>
          <p>안녕하세요, <strong>${name}</strong>님!</p>
          <p>NerdMath 회원가입이 성공적으로 완료되었습니다.</p>
          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #28a745; margin-top: 0;">🎉 계정이 활성화되었습니다!</h3>
            <p>이제 NerdMath의 모든 기능을 이용하실 수 있습니다.</p>
          </div>
          <p>궁금한 점이 있으시면 언제든 문의해주세요.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">© 2024 NerdMath. All rights reserved.</p>
        </div>
      `;

      const command = new SendEmailCommand({
        FromEmailAddress: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
        Destination: {
          ToAddresses: [email]
        },
        Content: {
          Simple: {
            Subject: {
              Data: '[NerdMath] 환영합니다!',
              Charset: 'UTF-8'
            },
            Body: {
              Html: {
                Data: htmlContent,
                Charset: 'UTF-8'
              }
            }
          }
        }
      });

      const result = await sesClient.send(command);
      
      console.log('📧 AWS SES - Welcome Email Sent');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📮 To: ${email}`);
      console.log(`👋 Welcome ${name}!`);
      console.log(`🎉 Your account has been successfully created.`);
      console.log(`📧 Message ID: ${result.MessageId}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      return { success: true, messageId: result.MessageId };
    } catch (error) {
      console.error('❌ Welcome email sending failed:', error);
      return { success: false, message: error.message };
    }
  }

  // 비밀번호 재설정 이메일
  static async sendPasswordResetEmail(email, resetToken) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">비밀번호 재설정 요청</h2>
          <p>NerdMath 계정의 비밀번호 재설정을 요청하셨습니다.</p>
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p>아래 버튼을 클릭하여 비밀번호를 재설정하세요:</p>
            <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">비밀번호 재설정</a>
          </div>
          <p>이 링크는 1시간 후에 만료됩니다.</p>
          <p>본인이 요청하지 않았다면 이 이메일을 무시하세요.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">© 2024 NerdMath. All rights reserved.</p>
        </div>
      `;

      const command = new SendEmailCommand({
        FromEmailAddress: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
        Destination: {
          ToAddresses: [email]
        },
        Content: {
          Simple: {
            Subject: {
              Data: '[NerdMath] 비밀번호 재설정',
              Charset: 'UTF-8'
            },
            Body: {
              Html: {
                Data: htmlContent,
                Charset: 'UTF-8'
              }
            }
          }
        }
      });

      const result = await sesClient.send(command);
      
      console.log('📧 AWS SES - Password Reset Email Sent');
      console.log(`📮 To: ${email}`);
      console.log(`📧 Message ID: ${result.MessageId}`);

      return { success: true, messageId: result.MessageId };
    } catch (error) {
      console.error('❌ Password reset email sending failed:', error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = EmailService;
