<template>
  <AppLayout>
    <div class="section-header">
      <div class="chips">
        <div :class="['chip', selectedCategory === '' ? 'active' : '']" @click="selectedCategory = ''; currentPage = 1">Tümü</div>
        <div
          v-for="cat in categories" :key="cat"
          :class="['chip', selectedCategory === cat ? 'active' : '']"
          @click="selectedCategory = cat; currentPage = 1"
        >{{ cat }}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <div class="search-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="search" placeholder="Ürün ara..." @input="currentPage = 1" />
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

        <div style="height:0.5px;background:#ebebeb"></div>

        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:11px;color:#9ca3af">Alış</span>
          <span style="font-size:13px;font-weight:500;color:#6b7280">{{ formatMoney(product.purchase_price) }}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:11px;color:#9ca3af">Satış</span>
          <span style="font-size:15px;font-weight:600;color:#534AB7">{{ formatMoney(product.selling_price) }}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:11px;color:#9ca3af">Kar</span>
          <span :style="{ fontSize:'12px', fontWeight:'500', color: (product.selling_price - product.purchase_price) >= 0 ? '#15803d' : '#dc2626' }">
            {{ formatMoney(product.selling_price - product.purchase_price) }}
          </span>
        </div>

        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-size:11px;color:#9ca3af">Stok</span>
            <span :style="{ fontSize:'13px', fontWeight:'500', color: product.quantity === 0 ? '#dc2626' : product.quantity <= 5 ? '#d97706' : '#1a1a2e' }">
              {{ product.quantity }} adet
            </span>
          </div>
          <div class="stock-bar-bg">
            <div :class="['stock-bar', stockBarClass(product)]" :style="{ width: stockBarWidth(product) }"></div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:11px;color:#9ca3af">{{ formatDate(product.created_at) }}</span>
          <span v-if="product.quantity === 0" class="stat-badge badge-red">Tükendi</span>
          <span v-else-if="product.quantity <= 5" class="stat-badge badge-amber">⚠️ Kritik</span>
        </div>

        <div style="height:0.5px;background:#ebebeb"></div>

        <div class="card-actions" style="flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:6px;background:#f4f4f6;border-radius:8px;padding:4px 8px;border:1px solid #ebebeb">
            <button class="btn" style="padding:2px 8px;font-size:16px;font-weight:600;background:white;border:1px solid #ebebeb;border-radius:6px;min-width:28px" @click="updateStock(product.id, -1)">−</button>
            <span style="font-size:13px;font-weight:600;min-width:20px;text-align:center">{{ product.quantity }}</span>
            <button class="btn" style="padding:2px 8px;font-size:16px;font-weight:600;background:white;border:1px solid #ebebeb;border-radius:6px;min-width:28px" @click="updateStock(product.id, +1)">+</button>
          </div>
          <router-link :to="`/products/${product.id}/edit`" class="btn btn-secondary" style="font-size:11px;padding:5px 10px">Düzenle</router-link>
          <router-link :to="`/products/${product.id}/movements`" class="btn btn-secondary" style="font-size:11px;padding:5px 10px">Geçmiş</router-link>
          <button class="btn btn-danger" style="font-size:11px;padding:5px 10px" @click="handleDelete(product.id)">Sil</button>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.totalPages > 1" style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:1.5rem">
      <button
        class="btn btn-secondary"
        style="font-size:12px;padding:6px 12px"
        :disabled="!pagination.hasPrev"
        @click="changePage(currentPage - 1)"
      >← Önceki</button>

      <div style="display:flex;gap:4px">
        <button
          v-for="p in pageNumbers"
          :key="p"
          :class="['btn', p === currentPage ? 'btn-primary' : 'btn-secondary']"
          style="font-size:12px;padding:6px 12px;min-width:36px"
          @click="changePage(p)"
        >{{ p }}</button>
      </div>

      <button
        class="btn btn-secondary"
        style="font-size:12px;padding:6px 12px"
        :disabled="!pagination.hasNext"
        @click="changePage(currentPage + 1)"
      >Sonraki →</button>
    </div>

    <div v-if="pagination.total > 0" style="text-align:center;font-size:12px;color:#9ca3af;margin-top:0.5rem">
      Toplam {{ pagination.total }} ürün — Sayfa {{ currentPage }} / {{ pagination.totalPages }}
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import { useToastStore } from '../stores/toast';
import api from '../api';

const products = ref<any[]>([]);
const error = ref('');
const selectedCategory = ref('');
const search = ref('');
const toast = useToastStore();
const currentPage = ref(1);
const pagination = ref({
  page: 1, limit: 9, total: 0, totalPages: 1, hasNext: false, hasPrev: false
});

const categories = computed(() => [...new Set(products.value.map(p => p.category))]);

const filteredProducts = computed(() =>
  products.value
    .filter(p => !selectedCategory.value || p.category === selectedCategory.value)
    .filter(p => !search.value || p.name.toLowerCase().includes(search.value.toLowerCase()))
);

const pageNumbers = computed(() => {
  const pages = [];
  const total = pagination.value.totalPages;
  const current = currentPage.value;
  let start = Math.max(1, current - 2);
  let end = Math.min(total, current + 2);
  if (end - start < 4) {
    if (start === 1) end = Math.min(total, start + 4);
    else start = Math.max(1, end - 4);
  }
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
});

const productClass = (p: any) => {
  if (p.quantity === 0) return 'out-of-stock';
  if (p.quantity <= 5) return 'low-stock';
  return '';
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

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
};

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount || 0);
};

const loadProducts = async () => {
  try {
    const res = await api.get(`/products?page=${currentPage.value}&limit=9`);
    products.value = res.data.products;
    pagination.value = res.data.pagination;
  } catch { error.value = 'Ürünler yüklenemedi'; }
};

const changePage = (page: number) => {
  currentPage.value = page;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

watch(currentPage, () => loadProducts());

onMounted(() => loadProducts());

const handleDelete = async (id: number) => {
  if (!confirm('Ürünü silmek istediğine emin misin?')) return;
  try {
    await api.delete(`/products/${id}`);
    toast.show('Ürün silindi');
    loadProducts();
  } catch { toast.show('Silme işlemi başarısız', 'error'); }
};

const updateStock = async (id: number, change: number) => {
  try {
    const res = await api.patch(`/products/${id}/stock`, { change });
    const index = products.value.findIndex(p => p.id === id);
    if (index !== -1) products.value[index] = res.data;
    toast.show(change > 0 ? 'Stok artırıldı' : 'Stok azaltıldı');
  } catch { toast.show('Stok güncellenemedi', 'error'); }
};
</script>