/**
 * 사용자 관리 유틸리티
 * 한글 주석은 제외되어야 함
 */

const UserService = {
  // 사용자 생성
  createUser(userData) {
    if (!userData.name) {
      throw new Error('이름은 필수 항목입니다');
    }
    
    if (!userData.email) {
      throw new Error('이메일은 필수 항목입니다');
    }
    
    console.log('새 사용자 생성:', userData.name);
    return {
      id: Date.now(),
      ...userData,
      status: '활성',
      createdAt: new Date().toISOString()
    };
  },

  // 사용자 검증
  validateUser(user) {
    const errors = [];
    
    if (!user.name || user.name.length < 2) {
      errors.push('이름은 2글자 이상이어야 합니다');
    }
    
    if (!user.email || !user.email.includes('@')) {
      errors.push('올바른 이메일 형식이 아닙니다');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      message: errors.length > 0 ? '입력 정보를 확인해주세요' : '검증 완료'
    };
  },

  // 메시지 생성
  getStatusMessage(status) {
    const messages = {
      active: '활성 상태',
      inactive: '비활성 상태',
      pending: '승인 대기 중',
      blocked: '차단된 사용자'
    };
    
    return messages[status] || '알 수 없는 상태';
  },

  // 알림 메시지
  showNotification(type, message) {
    const prefix = type === 'success' ? '성공:' : '오류:';
    alert(`${prefix} ${message}`);
  },

  // 템플릿 리터럴 테스트
  formatUserInfo(user) {
    return `사용자 정보: ${user.name} (${user.email})
상태: ${this.getStatusMessage(user.status)}
가입일: ${user.createdAt}`;
  }
};

// 상수 정의
const MESSAGES = {
  WELCOME: '환영합니다!',
  GOODBYE: '안녕히 가세요',
  ERROR_NETWORK: '네트워크 오류가 발생했습니다',
  ERROR_SERVER: '서버 오류입니다',
  CONFIRM_DELETE: '정말 삭제하시겠습니까?'
};

// 함수 정의
function showWelcomeMessage(userName) {
  console.log(`안녕하세요, ${userName}님!`);
  return '로그인이 완료되었습니다';
}

function handleError(error) {
  console.error('오류 발생:', error.message);
  return '처리 중 문제가 발생했습니다';
}

// 내보내기
export { UserService, MESSAGES, showWelcomeMessage, handleError }; 