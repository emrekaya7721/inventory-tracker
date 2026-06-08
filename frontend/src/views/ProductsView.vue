<template>
  <AppLayout>
    <div class="section-header">
      <div class="chips">
        <div :class="['chip', selectedCategory === '' ? 'active' : '']" @click="selectedCategory = ''">Tümü</div>
        <div
          v-for="cat in categories" :key="cat"
          :class="['chip', selectedCategory === cat ? 'active' : '']"
          @click="selectedCategory = cat"
        >{{ cat }}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <div class="search-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="search" placeholder="Ürün ara..." />
        </div>
        <router-link to="/products/new" class="btn btn-primary">+ Yeni Ürün</router-link>
      </div>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>
    <div v-if="filteredProducts.length === 0" class="empty-state">Ürün bulunamadı.</div>

    <div class="product-grid">
      <div
        v-for="product in filteredProducts"
        :key="product.id"
        :class="['product-card', productClass(product)]"
      >
        <div class="product-card-header">
          <div>
            <div class="product-name">{{ product.name }}</div>
            <div class="product-desc">{{ product.description }}</div>
          </div>
          <span class="category-tag">{{ product.category }}</span>
        </div>
        <div style="font-size:11px;color:#9ca3af">
  {{ formatDate(product.created_at) }}
</div>

        <div class="stock-row">
          <span class="stock-label">Stok</span>
          <div class="stock-bar-bg">
            <div :class="['stock-bar', stockBarClass(product)]" :style="{ width: stockBarWidth(product) }"></div>
          </div>
          <span class="stock-num">{{ product.quantity }}</span>
        </div>

        <div v-if="product.quantity === 0">
          <span class="stat-badge badge-red">Tükendi</span>
        </div>
        <div v-else-if="product.quantity <= 5">
          <span class="stat-badge badge-amber">⚠️ Kritik Stok</span>
        </div>

        <div class="card-actions">
  <div style="flex-wrap:wrap">
    <button
      class="btn"
      style="padding:2px 8px;font-size:16px;font-weight:600;background:white;border:1px solid #ebebeb;border-radius:6px;min-width:28px"
      @click="updateStock(product.id, -1)"
    >−</button>
    <span style="font-size:13px;font-weight:600;min-width:20px;text-align:center">{{ product.quantity }}</span>
    <button
      class="btn"
      style="padding:2px 8px;font-size:16px;font-weight:600;background:white;border:1px solid #ebebeb;border-radius:6px;min-width:28px"
      @click="updateStock(product.id, +1)"
    >+</button>
  </div>
  <router-link :to="`/products/${product.id}/edit`" class="btn btn-secondary" style="font-size:12px;padding:6px 12px">Düzenle</router-link>
  <router-link :to="`/products/${product.id}/movements`" class="btn btn-secondary" style="font-size:12px;padding:6px 12px">Geçmiş</router-link>
  <button class="btn btn-danger" style="font-size:12px;padding:6px 12px" @click="handleDelete(product.id)">Sil</button>
</div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import api from '../api';import { useToastStore } from '../stores/toast';

const toast = useToastStore();
const products = ref<any[]>([]);
const error = ref('');
const selectedCategory = ref('');
const search = ref('');

const categories = computed(() => [...new Set(products.value.map(p => p.category))]);
const filteredProducts = computed(() =>
  products.value
    .filter(p => !selectedCategory.value || p.category === selectedCategory.value)
    .filter(p => !search.value || p.name.toLowerCase().includes(search.value.toLowerCase()))
);

const productClass = (p: any) => {
  if (p.quantity === 0) return 'out-of-stock';
  if (p.quantity <= 5) return 'low-stock';
  return '';
};
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  });
};

const stockBarClass = (p: any) => {
  if (p.quantity === 0) return 'empty';
  if (p.quantity <= 5) return 'low';
  return 'normal';
};

const stockBarWidth = (p: any) => {
  const max = Math.max(...products.value.map(x => x.quantity), 1);
  return `${Math.min((p.quantity / max) * 100, 100)}%`;
};

onMounted(async () => {
  try {
    const res = await api.get('/products');
    products.value = res.data;
  } catch { error.value = 'Ürünler yüklenemedi'; }
});

const handleDelete = async (id: number) => {
  if (!confirm('Ürünü silmek istediğine emin misin?')) return;
  try {
    await api.delete(`/products/${id}`);
    products.value = products.value.filter(p => p.id !== id);
    toast.show('Ürün silindi');
  } catch { 
    toast.show('Silme işlemi başarısız', 'error');
  }
};

const updateStock = async (id: number, change: number) => {
  try {
    const res = await api.patch(`/products/${id}/stock`, { change });
    const index = products.value.findIndex(p => p.id === id);
    if (index !== -1) products.value[index] = res.data;
    toast.show(change > 0 ? 'Stok artırıldı' : 'Stok azaltıldı');
  } catch {
    toast.show('Stok güncellenemedi', 'error');
  }
};
</script>