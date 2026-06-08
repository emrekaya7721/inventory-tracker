<template>
  <div class="app-layout">
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="logo-title">
          <div class="logo-icon">📦</div>
          Inventory
        </div>
        <div class="logo-sub">Stok Takip Sistemi</div>
        <Toast />
      </div>

      <nav class="sidebar-nav">
        <router-link to="/" class="nav-item" :class="{ active: route.path === '/' }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          Dashboard
        </router-link>
        <router-link to="/products" class="nav-item" :class="{ active: route.path === '/products' }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          Ürünler
        </router-link>
        <router-link to="/products/new" class="nav-item" :class="{ active: route.path === '/products/new' }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          Yeni Ürün
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="nav-item" @click="handleLogout" style="cursor:pointer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Çıkış
        </div>
      </div>
    </aside>

    <div class="main-content">
      <div class="topbar">
        <div class="topbar-title">{{ pageTitle }}</div>
        <div class="topbar-right">
          <div class="avatar">{{ initials }}</div>
        </div>
      </div>

      <div class="page-content">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import Toast from './Toast.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const pageTitle = computed(() => {
  if (route.path === '/') return 'Dashboard';
  if (route.path === '/products') return 'Ürünler';
  if (route.path === '/products/new') return 'Yeni Ürün';
  if (route.path.includes('edit')) return 'Ürünü Düzenle';
  return 'Inventory';
});

const initials = computed(() => 'ME');

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};
</script>