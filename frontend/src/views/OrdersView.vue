<template>
  <AppLayout>
    <div class="section-header">
      <div class="section-title">Siparişler</div>
      <button class="btn btn-primary" @click="showForm = true">+ Yeni Sipariş</button>
    </div>

    <!-- Sipariş Formu -->
    <div v-if="showForm" class="form-card" style="margin-top:1rem">
      <h3 style="font-size:14px;font-weight:600">Yeni Sipariş Oluştur</h3>
      <div v-if="formError" class="error-msg">{{ formError }}</div>
      <div class="form-group">
        <label>Ürün</label>
        <select v-model="form.product_id">
          <option value="">Ürün seç</option>
          <option v-for="p in products" :key="p.id" :value="p.id">
            {{ p.name }} (Stok: {{ p.quantity }})
          </option>
        </select>
      </div>
      <div class="form-group">
        <label>Sipariş Tipi</label>
        <select v-model="form.type">
          <option value="incoming">📦 Gelen Sipariş (Satın Alma)</option>
          <option value="outgoing">🚚 Giden Sipariş (Satış)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Miktar</label>
        <input v-model.number="form.quantity" type="number" min="1" placeholder="0" />
      </div>
      <div class="form-group">
        <label>Not (isteğe bağlı)</label>
        <input v-model="form.note" placeholder="Tedarikçi adı, müşteri adı..." />
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" @click="handleCreate">Oluştur</button>
        <button class="btn btn-secondary" @click="showForm = false">İptal</button>
      </div>
    </div>

    <!-- Filtreler -->
    <div class="chips" style="margin-top:1rem">
      <div :class="['chip', filter === '' ? 'active' : '']" @click="filter = ''">Tümü</div>
      <div :class="['chip', filter === 'pending' ? 'active' : '']" @click="filter = 'pending'">Bekleyen</div>
      <div :class="['chip', filter === 'completed' ? 'active' : '']" @click="filter = 'completed'">Tamamlanan</div>
      <div :class="['chip', filter === 'cancelled' ? 'active' : '']" @click="filter = 'cancelled'">İptal</div>
    </div>

    <div v-if="error" class="error-msg" style="margin-top:1rem">{{ error }}</div>
    <div v-if="filteredOrders.length === 0" class="empty-state">Sipariş bulunamadı.</div>

    <!-- Sipariş Listesi -->
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:1rem">
      <div
        v-for="order in filteredOrders"
        :key="order.id"
        style="background:white;border:1px solid #ebebeb;border-radius:12px;padding:1rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap"
      >
        <div style="display:flex;align-items:center;gap:12px">
          <div
            :style="{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: order.type === 'incoming' ? '#dcfce7' : '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }"
          >
            {{ order.type === 'incoming' ? '📦' : '🚚' }}
          </div>
          <div>
            <div style="font-size:14px;font-weight:600;color:#1a1a2e">{{ order.product_name }}</div>
            <div style="font-size:12px;color:#9ca3af">
              {{ order.type === 'incoming' ? 'Gelen' : 'Giden' }} · {{ order.quantity }} adet
              <span v-if="order.note"> · {{ order.note }}</span>
            </div>
            <div style="font-size:11px;color:#9ca3af">{{ formatDate(order.created_at) }}</div>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:8px">
          <span :class="['stat-badge', statusBadge(order.status)]">
            {{ statusLabel(order.status) }}
          </span>
          <template v-if="order.status === 'pending'">
            <button class="btn" style="background:#dcfce7;color:#15803d;font-size:12px;padding:6px 12px" @click="handleComplete(order.id)">
              Tamamla
            </button>
            <button class="btn btn-danger" style="font-size:12px;padding:6px 12px" @click="handleCancel(order.id)">
              İptal
            </button>
          </template>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import { useToastStore } from '../stores/toast';
import api from '../api';

const toast = useToastStore();
const orders = ref<any[]>([]);
const products = ref<any[]>([]);
const error = ref('');
const formError = ref('');
const showForm = ref(false);
const filter = ref('');

const form = ref({ product_id: '', type: 'incoming', quantity: 1, note: '' });

const filteredOrders = computed(() =>
  filter.value ? orders.value.filter(o => o.status === filter.value) : orders.value
);

const statusLabel = (status: string) => {
  if (status === 'pending') return 'Bekliyor';
  if (status === 'completed') return 'Tamamlandı';
  return 'İptal';
};

const statusBadge = (status: string) => {
  if (status === 'pending') return 'badge-amber';
  if (status === 'completed') return 'badge-green';
  return 'badge-red';
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }) + ' ' + new Date(dateStr).toLocaleTimeString('tr-TR', {
    hour: '2-digit', minute: '2-digit'
  });
};

onMounted(async () => {
  try {
    const [ordersRes, productsRes] = await Promise.all([
      api.get('/orders'),
      api.get('/products')
    ]);
    orders.value = ordersRes.data;
    products.value = productsRes.data.products;
  } catch {
    error.value = 'Veriler yüklenemedi';
  }
});

const handleCreate = async () => {
  formError.value = '';
  if (!form.value.product_id || form.value.quantity < 1) {
    formError.value = 'Ürün ve miktar gerekli';
    return;
  }
  try {
    const res = await api.post('/orders', {
      product_id: Number(form.value.product_id),
      type: form.value.type,
      quantity: form.value.quantity,
      note: form.value.note || undefined
    });
    orders.value.unshift(res.data);
    showForm.value = false;
    form.value = { product_id: '', type: 'incoming', quantity: 1, note: '' };
    toast.show('Sipariş oluşturuldu');
  } catch (e: any) {
    formError.value = e.response?.data?.error || 'Bir hata oluştu';
  }
};

const handleComplete = async (id: number) => {
  try {
    const res = await api.patch(`/orders/${id}/complete`);
    const index = orders.value.findIndex(o => o.id === id);
    if (index !== -1) orders.value[index] = { ...orders.value[index], status: res.data.status };
    toast.show('Sipariş tamamlandı, stok güncellendi');
  } catch (e: any) {
    toast.show(e.response?.data?.error || 'İşlem başarısız', 'error');
  }
};

const handleCancel = async (id: number) => {
  try {
    await api.patch(`/orders/${id}/cancel`);
    const index = orders.value.findIndex(o => o.id === id);
    if (index !== -1) orders.value[index] = { ...orders.value[index], status: 'cancelled' };
    toast.show('Sipariş iptal edildi');
  } catch (e: any) {
    toast.show(e.response?.data?.error || 'İşlem başarısız', 'error');
  }
};
</script>