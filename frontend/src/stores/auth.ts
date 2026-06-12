import { defineStore } from 'pinia';
import api from '../api';
import { connectSocket, disconnectSocket } from '../socket';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') as string | null,
    username: localStorage.getItem('username') as string | null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
  },

  actions: {
    async register(username: string, password: string, email?: string) {
      const res = await api.post('/auth/register', { username, password, email });
      this.token = res.data.token;
      this.username = res.data.username;
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.username);
      connectSocket(res.data.token);
    },

    async login(username: string, password: string) {
      const res = await api.post('/auth/login', { username, password });
      this.token = res.data.token;
      this.username = res.data.username;
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.username);
      connectSocket(res.data.token);
    },

    logout() {
      this.token = null;
      this.username = null;
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      disconnectSocket();
    },

    initSocket() {
      if (this.token) {
        connectSocket(this.token);
      }
    }
  },
});