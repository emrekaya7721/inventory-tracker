<template>
  <AppLayout>
    <div style="margin-bottom:1rem">
      <router-link to="/products" class="btn btn-secondary" style="font-size:13px">← Ürünlere Dön</router-link>
    </div>

    <div style="background:white;border:1px solid #ebebeb;border-radius:12px;padding:1.25rem">
      <div class="section-header" style="margin-bottom:1.25rem">
        <div>
          <div class="section-title">{{ productName }} — Stok Geçmişi</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:2px">Son 50 hareket</div>
        </div>
        <div style="font-size:13px;color:#374151">
          Güncel Stok: <strong>{{ currentStock }}</strong>
        </div>
      </div>

      <div v-if="error" class="error-msg">{{ error }}</div>
      <div v-if="movements.length === 0 && !error" class="empty-state">Henüz stok hareketi yok.</div>

      <div v-else style="display:flex;flex-direction:column;gap:8px">
        <div
          v-for="movement in movements"
          :key="movement.id"
          style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f9f9fb;border-radius:8px;border:1px solid #ebebeb"
        >
          <div style="display:flex;align-items:center;gap:12px">
            <div
              :style="{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: movement.change > 0 ? '#dcfce7' : '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: '600',
                color: movement.change > 0 ? '#15803d' : '#dc2626'
              }"
            >
              {{ movement.change > 0 ? '+' : '−' }}
            </div>
            <div>
              <div style="font-size:13px;font-weight:500;color:#1a1a2e">
                {{ movement.change > 0 ? 'Stok Eklendi' : 'Stok Azaltıldı' }}
                <span :style="{ color: movement.change > 0 ? '#15803d' : '#dc2626', marginLeft: '4px' }">
                  {{ movement.change > 0 ? '+' + movement.change : movement.change }}
                </span>
              </div>
              <div v-if="movement.note" style="font-size:12px;color:#9ca3af">{{ movement.note }}</div>
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:12px;font-weight:600;color:#374151">{{ movement.quantity_after }} adet</div>
            <div style="font-size:11px;color:#9ca3af">{{ formatDate(movement.created_at) }}</div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import AppLayout from '../components/AppLayout.vue';
import api from '../api';

const route = useRoute();
const movements = ref<any[]>([]);
const productName = ref('');
const currentStock = ref(0);
const error = ref('');

onMounted(async () => {
  try {
    const [movRes, prodRes] = await Promise.all([
      api.get(`/products/${route.params.id}/movements`),
      api.get('/products')
    ]);
    movements.value = movRes.data;
    const product = prodRes.data.products.find((p: any) => p.id === Number(route.params.id));
    if (product) {
      productName.value = product.name;
      currentStock.value = product.quantity;
    }
  } catch {
    error.value = 'Geçmiş yüklenemedi';
  }
});

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
};
</script>