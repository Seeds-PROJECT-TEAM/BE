const bcrypt = require('bcryptjs');

class User {
  constructor(data) {
    this.userId = data.userId || this.generateUserId();
    this.email = data.email;
    this.password = data.password;
    this.name = data.name;
    this.birthDate = data.birthDate;
    this.phoneNumber = data.phoneNumber;
    this.nickname = data.nickname;
    this.gender = data.gender;
    this.emailVerified = data.emailVerified || false;
    this.createdAt = data.createdAt || new Date();
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.agreeTerms = data.agreeTerms || false;
    this.agreePrivacy = data.agreePrivacy || false;
    this.agreeMarketing = data.agreeMarketing || false;
  }

  // 고유 ID 생성
  generateUserId() {
    return Math.floor(Math.random() * 100000) + 10000;
  }

  // 비밀번호 해싱
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  // 비밀번호 검증
  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  // 사용자 데이터 검증
  validate() {
    const errors = [];

    if (!this.email) errors.push('Email is required');
    if (!this.password) errors.push('Password is required');
    if (!this.name) errors.push('Name is required');
    if (!this.birthDate) errors.push('Birth date is required');
    if (!this.phoneNumber) errors.push('Phone number is required');
    if (!this.nickname) errors.push('Nickname is required');
    if (!this.gender) errors.push('Gender is required');

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (this.email && !emailRegex.test(this.email)) {
      errors.push('Invalid email format');
    }

    // 비밀번호 강도 검증 (최소 8자, 영문+숫자+특수문자)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (this.password && !passwordRegex.test(this.password)) {
      errors.push('Password must be at least 8 characters with letters, numbers, and special characters');
    }

    // 성별 검증
    if (this.gender && !['male', 'female'].includes(this.gender)) {
      errors.push('Gender must be male or female');
    }

    return errors;
  }

  // 민감한 정보 제외한 사용자 정보 반환
  toJSON() {
    const user = { ...this };
    delete user.password;
    return user;
  }

  // 공개 정보만 반환 (프로필 조회용)
  toPublicJSON() {
    return {
      userId: this.userId,
      email: this.email,
      name: this.name,
      birthDate: this.birthDate,
      phoneNumber: this.phoneNumber,
      nickname: this.nickname,
      gender: this.gender,
      emailVerified: this.emailVerified,
      createdAt: this.createdAt,
      isActive: this.isActive
    };
  }
}

module.exports = User;
