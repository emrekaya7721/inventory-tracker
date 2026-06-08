<template>
  <AppLayout>
    <div class="form-card">
      <h2 style="font-size:16px;font-weight:600">{{ isEdit ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle' }}</h2>
      <div v-if="error" class="error-msg">{{ error }}</div>
      <div class="form-group">
        <label>Ürün Adı</label>
        <input v-model="form.name" placeholder="Ürün adını girin" />
      </div>
      <div class="form-group">
        <label>Alış Fiyatı (TL)</label>
        <input v-model.number="form.purchase_price" type="number" placeholder="0.00" min="0" step="0.01" />
      </div>
      <div class="form-group">
        <label>Satış Fiyatı (TL)</label>
        <input v-model.number="form.selling_price" type="number" placeholder="0.00" min="0" step="0.01" />
      </div>
      <div class="form-group">
        <label>Açıklama</label>
        <input v-model="form.description" placeholder="Kısa açıklama" />
      </div>
      <div class="form-group">
        <label>Stok Adedi</label>
        <input v-model.number="form.quantity" type="number" placeholder="0" min="0" />
      </div>
      <div class="form-group">
        <label>Kategori</label>
        <input v-model="form.category" placeholder="Elektronik, Giyim..." />
      </div>
      <div style="display:flex;gap:8px;margin-top:0.5rem">
        <button class="btn btn-primary" @click="handleSubmit">{{ isEdit ? 'Güncelle' : 'Oluştur' }}</button>
        <router-link to="/products" class="btn btn-secondary">İptal</router-link>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AppLayout from '../components/AppLayout.vue';
import { useToastStore } from '../stores/toast';
import api from '../api';

const router = useRouter();
const route = useRoute();
const isEdit = !!route.params.id;
const error = ref('');
const toast = useToastStore();

const form = ref({
  name: '',
  description: '',
  quantity: 0,
  category: '',
  purchase_price: 0,
  selling_price: 0
});

onMounted(async () => {
  if (isEdit) {
    try {
      const res = await api.get('/products');
      const product = res.data.find((p: any) => p.id === Number(route.params.id));
      if (product) form.value = {
        name: product.name,
        description: product.description || '',
        quantity: product.quantity,
        category: product.category,
        purchase_price: parseFloat(product.purchase_price) || 0,
        selling_price: parseFloat(product.selling_price) || 0
      };
    } catch { error.value = 'Ürün yüklenemedi'; }
  }
});

const handleSubmit = async () => {
  error.value = '';
  if (!form.value.name || !form.value.category || form.value.quantity < 0) {
    error.value = 'Ad, kategori ve geçerli bir stok adedi giriniz';
    return;
  }
  try {
    if (isEdit) {
      await api.put(`/products/${route.params.id}`, form.value);
    } else {
      await api.post('/products', form.value);
    }
    toast.show(isEdit ? 'Ürün güncellendi' : 'Ürün oluşturuldu');
    router.push('/products');
  } catch (e: any) {
    error.value = e.response?.data?.error || 'İşlem başarısız';
  }
};
</script>