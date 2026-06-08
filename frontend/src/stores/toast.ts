import { defineStore } from 'pinia';
import { ref } from 'vue';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([]);
  let counter = 0;

  const show = (message: string, type: 'success' | 'error' = 'success') => {
    const id = counter++;
    toasts.value.push({ id, message, type });
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id);
    }, 3000);
  };

  return { toasts, show };
});