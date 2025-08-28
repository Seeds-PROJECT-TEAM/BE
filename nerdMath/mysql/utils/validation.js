// Input Validation Utilities

class ValidationUtils {
  // 이메일 형식 검증
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // 비밀번호 강도 검증
  static isValidPassword(password) {
    // 최소 8자, 영문+숫자+특수문자 포함
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  // 전화번호 형식 검증 (한국)
  static isValidPhoneNumber(phoneNumber) {
    const phoneRegex = /^01[0-9]-[0-9]{3,4}-[0-9]{4}$/;
    return phoneRegex.test(phoneNumber);
  }

  // 생년월일 형식 검증 (YYYY-MM-DD)
  static isValidBirthDate(birthDate) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthDate)) return false;
    
    const date = new Date(birthDate);
    const now = new Date();
    
    // 유효한 날짜인지 확인
    if (isNaN(date.getTime())) return false;
    
    // 미래 날짜는 불가
    if (date > now) return false;
    
    // 너무 오래된 날짜는 불가 (1900년 이전)
    const minDate = new Date('1900-01-01');
    if (date < minDate) return false;
    
    return true;
  }

  // 성별 검증
  static isValidGender(gender) {
    return ['male', 'female'].includes(gender);
  }

  // 인증 코드 형식 검증 (6자리 숫자)
  static isValidVerificationCode(code) {
    const codeRegex = /^\d{6}$/;
    return codeRegex.test(code);
  }

  // 회원가입 데이터 검증
  static validateRegistrationData(data) {
    const errors = [];

    // 필수 필드 검증
    if (!data.email) errors.push('이메일은 필수입니다.');
    if (!data.password) errors.push('비밀번호는 필수입니다.');
    if (!data.name) errors.push('이름은 필수입니다.');
    if (!data.birthDate) errors.push('생년월일은 필수입니다.');
    if (!data.phoneNumber) errors.push('전화번호는 필수입니다.');
    if (!data.nickname) errors.push('닉네임은 필수입니다.');
    if (!data.gender) errors.push('성별은 필수입니다.');

    // 형식 검증
    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('올바른 이메일 형식이 아닙니다.');
    }

    if (data.password && !this.isValidPassword(data.password)) {
      errors.push('비밀번호는 최소 8자 이상이며, 영문, 숫자, 특수문자를 포함해야 합니다.');
    }

    if (data.phoneNumber && !this.isValidPhoneNumber(data.phoneNumber)) {
      errors.push('올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)');
    }

    if (data.birthDate && !this.isValidBirthDate(data.birthDate)) {
      errors.push('올바른 생년월일 형식이 아닙니다. (YYYY-MM-DD)');
    }

    if (data.gender && !this.isValidGender(data.gender)) {
      errors.push('성별은 male 또는 female이어야 합니다.');
    }

    // 약관 동의 검증 제거 - 자동으로 true로 설정됨

    return errors;
  }

  // 로그인 데이터 검증
  static validateLoginData(data) {
    const errors = [];

    if (!data.email) errors.push('이메일은 필수입니다.');
    if (!data.password) errors.push('비밀번호는 필수입니다.');

    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('올바른 이메일 형식이 아닙니다.');
    }

    return errors;
  }

  // 이메일 인증 데이터 검증
  static validateEmailVerificationData(data) {
    const errors = [];

    if (!data.email) errors.push('이메일은 필수입니다.');

    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('올바른 이메일 형식이 아닙니다.');
    }

    return errors;
  }

  // 인증 코드 확인 데이터 검증
  static validateVerificationCodeData(data) {
    const errors = [];

    if (!data.email) errors.push('이메일은 필수입니다.');
    if (!data.code) errors.push('인증 코드는 필수입니다.');

    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('올바른 이메일 형식이 아닙니다.');
    }

    if (data.code && !this.isValidVerificationCode(data.code)) {
      errors.push('인증 코드는 6자리 숫자여야 합니다.');
    }

    return errors;
  }

  // 사용자 ID 검증
  static isValidUserId(userId) {
    return Number.isInteger(userId) && userId > 0;
  }

  // 문자열 길이 검증
  static isValidStringLength(str, minLength, maxLength) {
    if (!str) return false;
    return str.length >= minLength && str.length <= maxLength;
  }

  // 숫자 범위 검증
  static isValidNumberRange(num, min, max) {
    return Number.isFinite(num) && num >= min && num <= max;
  }
}

module.exports = ValidationUtils;
