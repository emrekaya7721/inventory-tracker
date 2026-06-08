import { defineStore } from 'pinia';
import api from '../api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') as string | null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
  },

  actions: {
    async register(username: string, password: string) {
      const res = await api.post('/auth/register', { username, password });
      this.token = res.data.token;
      localStorage.setItem('token', res.data.token);
    },

    async login(username: string, password: string) {
      const res = await api.post('/auth/login', { username, password });
      this.token = res.data.token;
      localStorage.setItem('token', res.data.token);
    },

    logout() {
      this.token = null;
      localStorage.removeItem('token');
    },
  },
});