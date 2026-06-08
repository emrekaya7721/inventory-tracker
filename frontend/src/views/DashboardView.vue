<template>
  <AppLayout>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Toplam Ürün</div>
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-badge badge-purple">{{ stats.categories }} kategori</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tükenen Stok</div>
        <div class="stat-value">{{ stats.outOfStock }}</div>
        <div class="stat-badge badge-red">Dikkat</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Kritik Stok</div>
        <div class="stat-value">{{ stats.lowStock }}</div>
        <div class="stat-badge badge-amber">≤5 adet</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Kategoriler</div>
        <div class="stat-value">{{ stats.categories }}</div>
        <div class="stat-badge badge-green">Aktif</div>
      </div>
    </div>

    <div style="background:white;border:1px solid #ebebeb;border-radius:12px;padding:1.25rem">
      <div class="section-title" style="margin-bottom:1rem">Kategoriye Göre Dağılım</div>
      <div class="category-list">
        <div v-for="(count, category) in stats.byCategory" :key="category" class="category-row">
          <span class="cat-name">{{ category }}</span>
          <div class="bar-container">
            <div class="bar" :style="{ width: barWidth(count as number) }"></div>
          </div>
          <span class="cat-count">{{ count }}</span>
        </div>
      </div>
    </div>

    <div v-if="stats.lowStockProducts.length > 0">
      <div class="section-header" style="margin-bottom:0.75rem">
        <div class="section-title">⚠️ Kritik Stok Ürünleri</div>
      </div>
      <div class="product-grid">
        <div
          v-for="product in stats.lowStockProducts"
          :key="product.id"
          :class="['product-card', product.quantity === 0 ? 'out-of-stock' : 'low-stock']"
        >
          <div class="product-card-header">
            <div>
              <div class="product-name">{{ product.name }}</div>
              <div class="product-desc">{{ product.category }}</div>
            </div>
            <span :class="['stat-badge', product.quantity === 0 ? 'badge-red' : 'badge-amber']">
              {{ product.quantity === 0 ? 'Tükendi' : 'Kritik' }}
            </span>
          </div>
          <div class="stock-row">
            <span class="stock-label">Stok</span>
            <div class="stock-bar-bg">
              <div :class="['stock-bar', product.quantity === 0 ? 'empty' : 'low']" style="width:15%"></div>
            </div>
            <span class="stock-num">{{ product.quantity }}</span>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import api from '../api';

const products = ref<any[]>([]);

const stats = computed(() => {
  const total = products.value.length;
  const outOfStock = products.value.filter(p => p.quantity === 0).length;
  const lowStock = products.value.filter(p => p.quantity > 0 && p.quantity <= 5).length;
  const byCategory: Record<string, number> = {};
  products.value.forEach(p => { byCategory[p.category] = (byCategory[p.category] || 0) + 1; });
  const lowStockProducts = products.value.filter(p => p.quantity <= 5);
  return { total, outOfStock, lowStock, categories: Object.keys(byCategory).length, byCategory, lowStockProducts };
});

const maxCount = computed(() => Math.max(...Object.values(stats.value.byCategory as Record<string, number>), 1));
const barWidth = (count: number) => `${(count / maxCount.value) * 100}%`;

onMounted(async () => {
  const res = await api.get('/products');
  products.value = res.data;
});
</script>