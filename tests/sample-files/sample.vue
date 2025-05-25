<template>
  <div class="user-profile">
    <h1>사용자 프로필</h1>
    <div class="profile-info">
      <label>이름:</label>
      <input v-model="userName" placeholder="이름을 입력하세요" />
      
      <label>이메일:</label>
      <input v-model="email" placeholder="이메일 주소" />
      
      <button @click="saveProfile" :disabled="!isValid">
        저장하기
      </button>
      
      <button @click="cancelEdit">
        취소
      </button>
    </div>
    
    <div v-if="showMessage" class="message">
      {{ message }}
    </div>
    
    <div class="actions">
      <a href="/help" title="도움말 페이지로 이동">도움말</a>
      <span class="status">{{ status }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UserProfile',
  data() {
    return {
      userName: '',
      email: '',
      message: '프로필이 저장되었습니다',
      status: '편집 중',
      showMessage: false,
      errors: {
        name: '이름은 필수입니다',
        email: '올바른 이메일을 입력하세요'
      }
    }
  },
  computed: {
    isValid() {
      return this.userName && this.email;
    }
  },
  methods: {
    saveProfile() {
      if (this.isValid) {
        // API 호출
        this.message = '저장이 완료되었습니다';
        this.showMessage = true;
        console.log('사용자 정보 저장됨');
      } else {
        alert('필수 정보를 입력해주세요');
      }
    },
    cancelEdit() {
      if (confirm('변경사항을 취소하시겠습니까?')) {
        this.resetForm();
      }
    },
    resetForm() {
      this.userName = '';
      this.email = '';
      this.status = '초기화됨';
    }
  }
}
</script>

<style scoped>
.user-profile {
  padding: 20px;
}
/* 한글 주석은 제외되어야 함 */
.message {
  color: green;
}
</style> 