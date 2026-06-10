<template>
  <AppLayout>
    <div style="display:flex;flex-direction:column;gap:1.25rem;max-width:500px">

      <!-- Profil Bilgileri -->
      <div class="form-card">
        <h2 style="font-size:16px;font-weight:600">Profil Bilgileri</h2>
        <div v-if="successMsg" style="background:#dcfce7;color:#15803d;padding:8px 12px;border-radius:8px;font-size:13px">{{ successMsg }}</div>
        <div v-if="profileError" class="error-msg">{{ profileError }}</div>
        <div class="form-group">
          <label>Kullanıcı Adı</label>
          <input v-model="form.username" placeholder="Kullanıcı adı" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input v-model="form.email" type="email" placeholder="ornek@gmail.com" />
        </div>
        <button class="btn btn-primary" @click="handleUpdateProfile">Güncelle</button>
      </div>

      <!-- Şifre Değiştir -->
      <div class="form-card">
        <h2 style="font-size:16px;font-weight:600">Şifre Değiştir</h2>
        <div v-if="passwordSuccess" style="background:#dcfce7;color:#15803d;padding:8px 12px;border-radius:8px;font-size:13px">{{ passwordSuccess }}</div>
        <div v-if="passwordError" class="error-msg">{{ passwordError }}</div>
        <div class="form-group">
          <label>Mevcut Şifre</label>
          <input v-model="passwords.current" type="password" placeholder="••••••••" />
        </div>
        <div class="form-group">
          <label>Yeni Şifre</label>
          <input v-model="passwords.new" type="password" placeholder="••••••••" />
        </div>
        <div class="form-group">
          <label>Yeni Şifre (Tekrar)</label>
          <input v-model="passwords.confirm" type="password" placeholder="••••••••" />
        </div>
        <button class="btn btn-primary" @click="handleChangePassword">Şifreyi Değiştir</button>
      </div>

      <!-- Hesap Bilgisi -->
      <div class="form-card">
        <h2 style="font-size:16px;font-weight:600">Hesap Bilgisi</h2>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px">
          <span style="color:#6b7280">Kullanıcı ID</span>
          <span style="font-weight:500">#{{ profile.id }}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px">
          <span style="color:#6b7280">Kayıt Tarihi</span>
          <span style="font-weight:500">{{ formatDate(profile.created_at) }}</span>
        </div>
      </div>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import { useToastStore } from '../stores/toast';
import api from '../api';

const toast = useToastStore();
const profile = ref<any>({});
const form = ref({ username: '', email: '' });
const passwords = ref({ current: '', new: '', confirm: '' });
const profileError = ref('');
const successMsg = ref('');
const passwordError = ref('');
const passwordSuccess = ref('');

onMounted(async () => {
  try {
    const res = await api.get('/profile');
    profile.value = res.data;
    form.value.username = res.data.username || '';
    form.value.email = res.data.email || '';
  } catch {
    profileError.value = 'Profil yüklenemedi';
  }
});

const handleUpdateProfile = async () => {
  profileError.value = '';
  successMsg.value = '';
  try {
    const res = await api.put('/profile', form.value);
    profile.value = { ...profile.value, ...res.data };
    successMsg.value = 'Profil güncellendi';
    toast.show('Profil güncellendi');
  } catch (e: any) {
    profileError.value = e.response?.data?.error || 'Güncelleme başarısız';
  }
};

const handleChangePassword = async () => {
  passwordError.value = '';
  passwordSuccess.value = '';

  if (!passwords.value.current || !passwords.value.new || !passwords.value.confirm) {
    passwordError.value = 'Tüm alanları doldurun';
    return;
  }

  if (passwords.value.new !== passwords.value.confirm) {
    passwordError.value = 'Yeni şifreler eşleşmiyor';
    return;
  }

  try {
    await api.put('/profile/password', {
      currentPassword: passwords.value.current,
      newPassword: passwords.value.new,
    });
    passwordSuccess.value = 'Şifre güncellendi';
    passwords.value = { current: '', new: '', confirm: '' };
    toast.show('Şifre güncellendi');
  } catch (e: any) {
    passwordError.value = e.response?.data?.error || 'Şifre değiştirilemedi';
  }
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
};
</script>