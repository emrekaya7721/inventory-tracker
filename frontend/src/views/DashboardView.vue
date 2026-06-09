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
        <div class="stat-label">Bekleyen Sipariş</div>
        <div class="stat-value">{{ orderStats.pending }}</div>
        <div class="stat-badge badge-amber">İşlem bekliyor</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Toplam Gelir</div>
        <div class="stat-value" style="font-size:18px;color:#15803d">{{ formatMoney(financial.total_income) }}</div>
        <div class="stat-badge badge-green">Satışlar</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Toplam Gider</div>
        <div class="stat-value" style="font-size:18px;color:#dc2626">{{ formatMoney(financial.total_expense) }}</div>
        <div class="stat-badge badge-red">Alımlar</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Net Kar</div>
        <div class="stat-value" style="font-size:18px" :style="{ color: financial.net >= 0 ? '#15803d' : '#dc2626' }">
          {{ formatMoney(financial.net) }}
        </div>
        <div :class="['stat-badge', financial.net >= 0 ? 'badge-green' : 'badge-red']">
          {{ financial.net >= 0 ? 'Karda' : 'Zararda' }}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tamamlanan Sipariş</div>
        <div class="stat-value">{{ orderStats.completed }}</div>
        <div class="stat-badge badge-green">Başarılı</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <!-- Kategori dağılımı -->
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

      <!-- Son siparişler -->
      <div style="background:white;border:1px solid #ebebeb;border-radius:12px;padding:1.25rem">
        <div class="section-title" style="margin-bottom:1rem">Son Siparişler</div>
        <div v-if="recentOrders.length === 0" class="empty-state" style="padding:1rem">Henüz sipariş yok.</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <div
            v-for="order in recentOrders"
            :key="order.id"
            style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:#f9f9fb;border-radius:8px"
          >
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:16px">{{ order.type === 'incoming' ? '📦' : '🚚' }}</span>
              <div>
                <div style="font-size:13px;font-weight:500;color:#1a1a2e">{{ order.product_name }}</div>
                <div style="font-size:11px;color:#9ca3af">{{ order.quantity }} adet</div>
              </div>
            </div>
            <span :class="['stat-badge', order.status === 'completed' ? 'badge-green' : order.status === 'cancelled' ? 'badge-red' : 'badge-amber']">
              {{ order.status === 'completed' ? 'Tamamlandı' : order.status === 'cancelled' ? 'İptal' : 'Bekliyor' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Kritik stok -->
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
const orders = ref<any[]>([]);
const financial = ref({ total_income: 0, total_expense: 0, net: 0 });

const stats = computed(() => {
  const total = products.value.length;
  const outOfStock = products.value.filter(p => p.quantity === 0).length;
  const lowStock = products.value.filter(p => p.quantity > 0 && p.quantity <= 5).length;
  const byCategory: Record<string, number> = {};
  products.value.forEach(p => { byCategory[p.category] = (byCategory[p.category] || 0) + 1; });
  const lowStockProducts = products.value.filter(p => p.quantity <= 5);
  return { total, outOfStock, lowStock, categories: Object.keys(byCategory).length, byCategory, lowStockProducts };
});

const orderStats = computed(() => ({
  pending: orders.value.filter(o => o.status === 'pending').length,
  completed: orders.value.filter(o => o.status === 'completed').length,
}));

const recentOrders = computed(() => orders.value.slice(0, 5));

const maxCount = computed(() => Math.max(...Object.values(stats.value.byCategory as Record<string, number>), 1));
const barWidth = (count: number) => `${(count / maxCount.value) * 100}%`;

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(amount || 0);
};

onMounted(async () => {
  const [prodRes, orderRes, txRes] = await Promise.all([
    api.get('/products'),
    api.get('/orders'),
    api.get('/transactions')
  ]);
  products.value = prodRes.data.products;
  orders.value = orderRes.data;
  financial.value = txRes.data.summary;
});
</script>