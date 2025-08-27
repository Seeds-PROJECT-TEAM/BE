/**
 * 공통 에러 응답 생성 유틸리티
 */

/**
 * 에러 응답 객체 생성
 * @param {string} code - 에러 코드
 * @param {string} message - 에러 메시지
 * @param {Array} details - 상세 정보 배열
 * @param {string} traceId - 요청 추적 ID
 * @returns {Object} 에러 응답 객체
 */
const createError = (code, message, details = [], traceId = null) => {
  return {
    code,
    message,
    details,
    traceId: traceId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
};

/**
 * 일반적인 에러 코드들
 */
const ERROR_CODES = {
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_INPUT: 'INVALID_INPUT',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  DUPLICATE_REQUEST: 'DUPLICATE_REQUEST'
};

/**
 * HTTP 상태 코드별 기본 에러 메시지
 */
const DEFAULT_MESSAGES = {
  400: '잘못된 요청입니다',
  401: '인증이 필요합니다',
  403: '접근 권한이 없습니다',
  404: '요청한 리소스를 찾을 수 없습니다',
  409: '요청이 충돌했습니다',
  422: '입력 데이터가 올바르지 않습니다',
  500: '서버 내부 오류가 발생했습니다'
};

/**
 * HTTP 상태 코드에 따른 기본 에러 응답 생성
 * @param {number} statusCode - HTTP 상태 코드
 * @param {string} customMessage - 커스텀 메시지
 * @param {Array} details - 상세 정보
 * @param {string} traceId - 요청 추적 ID
 * @returns {Object} 에러 응답 객체
 */
const createHttpError = (statusCode, customMessage = null, details = [], traceId = null) => {
  const message = customMessage || DEFAULT_MESSAGES[statusCode] || '알 수 없는 오류가 발생했습니다';
  
  let code;
  switch (statusCode) {
    case 400:
      code = ERROR_CODES.INVALID_INPUT;
      break;
    case 401:
      code = ERROR_CODES.UNAUTHORIZED;
      break;
    case 403:
      code = ERROR_CODES.FORBIDDEN;
      break;
    case 404:
      code = ERROR_CODES.NOT_FOUND;
      break;
    case 409:
      code = ERROR_CODES.CONFLICT;
      break;
    case 422:
      code = ERROR_CODES.VALIDATION_FAILED;
      break;
    case 500:
      code = ERROR_CODES.INTERNAL_SERVER_ERROR;
      break;
    default:
      code = ERROR_CODES.INTERNAL_SERVER_ERROR;
  }
  
  return createError(code, message, details, traceId);
};

module.exports = {
  createError,
  createHttpError,
  ERROR_CODES
};
