<template>
  <div class="auth-wrapper">
    <div class="auth-card">
      <div class="auth-logo">
        <div class="logo-icon">📦</div>
        <span>Inventory</span>
      </div>
      <div>
        <h2>Kayıt Ol</h2>
        <p style="margin-top:4px">Yeni hesap oluştur</p>
      </div>
      <div v-if="error" class="error-msg">{{ error }}</div>
      <div class="form-group">
        <label>Kullanıcı Adı</label>
        <input v-model="username" placeholder="kullanici_adi" />
      </div>
      <div class="form-group">
        <label>Şifre</label>
        <input v-model="password" type="password" placeholder="••••••••" @keyup.enter="handleRegister" />
      </div>
      <button class="btn btn-primary btn-full" @click="handleRegister">Kayıt Ol</button>
      <p style="text-align:center;font-size:13px;color:#6b7280">
        Hesabın var mı? <router-link to="/login" style="color:#534AB7;font-weight:500">Giriş Yap</router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const username = ref('');
const password = ref('');
const error = ref('');
const router = useRouter();
const authStore = useAuthStore();

const handleRegister = async () => {
  error.value = '';
  if (!username.value || !password.value) { error.value = 'Tüm alanları doldurun'; return; }
  try {
    await authStore.register(username.value, password.value);
    router.push('/');
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Bir hata oluştu';
  }
};
</script>