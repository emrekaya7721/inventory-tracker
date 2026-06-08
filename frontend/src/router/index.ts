import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
  { path: '/', component: () => import('../views/DashboardView.vue'), meta: { requiresAuth: true } },
  { path: '/login', component: () => import('../views/LoginView.vue') },
  { path: '/register', component: () => import('../views/RegisterView.vue') },
  { path: '/products', component: () => import('../views/ProductsView.vue'), meta: { requiresAuth: true } },
  { path: '/products/new', component: () => import('../views/ProductFormView.vue'), meta: { requiresAuth: true } },
  { path: '/products/:id/movements', component: () => import('../views/StockMovementsView.vue'), meta: { requiresAuth: true } },
  { path: '/products/:id/edit', component: () => import('../views/ProductFormView.vue'), meta: { requiresAuth: true } },
],
});

router.beforeEach((to) => {
  const authStore = useAuthStore();
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return '/login';
  }
});

export default router;