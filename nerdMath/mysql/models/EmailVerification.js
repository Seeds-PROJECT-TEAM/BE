class EmailVerification {
  constructor(data) {
    this.verificationId = data.verificationId || this.generateVerificationId();
    this.userId = data.userId || null; // 회원가입 전에는 null
    this.email = data.email;
    this.code = data.code || this.generateCode();
    this.expiresAt = data.expiresAt || this.calculateExpiresAt();
    this.verified = data.verified || false;
    this.createdAt = data.createdAt || new Date();
  }

  // 고유 인증 ID 생성
  generateVerificationId() {
    return Math.floor(Math.random() * 100000) + 10000;
  }

  // 6자리 인증 코드 생성
  generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // 만료 시간 계산 (1시간 후 - 테스트용으로 늘림)
  calculateExpiresAt() {
    const now = new Date();
    return new Date(now.getTime() + 60 * 60 * 1000); // 1시간
  }

  // 인증 코드 검증
  verifyCode(inputCode) {
    if (this.verified) {
      return { success: false, message: '이미 인증된 코드입니다.' };
    }

    if (this.isExpired()) {
      return { success: false, message: '인증 코드가 만료되었습니다.' };
    }

    if (this.code !== inputCode) {
      return { success: false, message: '잘못된 인증 코드입니다.' };
    }

    this.verified = true;
    return { success: true, message: '인증이 완료되었습니다.' };
  }

  // 만료 확인
  isExpired() {
    const now = new Date();
    return this.expiresAt < now;
  }

  // 유효성 확인
  isValid() {
    return !this.isExpired() && !this.verified;
  }

  // 남은 시간 계산 (분 단위)
  getRemainingMinutes() {
    const now = new Date();
    const diff = this.expiresAt - now;
    return Math.max(0, Math.floor(diff / (1000 * 60)));
  }

  // 데이터 검증
  validate() {
    const errors = [];

    if (!this.email) errors.push('Email is required');
    if (!this.code) errors.push('Verification code is required');
    if (!this.expiresAt) errors.push('Expiration date is required');

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (this.email && !emailRegex.test(this.email)) {
      errors.push('Invalid email format');
    }

    // 인증 코드 형식 검증 (6자리 숫자)
    const codeRegex = /^\d{6}$/;
    if (this.code && !codeRegex.test(this.code)) {
      errors.push('Verification code must be 6 digits');
    }

    return errors;
  }

  // 민감한 정보 제외한 데이터 반환
  toJSON() {
    const verification = { ...this };
    delete verification.code;
    return verification;
  }

  // 인증 코드만 반환 (디버깅용)
  toDebugJSON() {
    return {
      verificationId: this.verificationId,
      email: this.email,
      code: this.code, // 디버깅용으로만 노출
      expiresAt: this.expiresAt,
      verified: this.verified,
      remainingMinutes: this.getRemainingMinutes()
    };
  }
}

module.exports = EmailVerification;
