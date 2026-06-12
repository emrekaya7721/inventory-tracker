<template>
  <AppLayout>
    <div class="stats-grid" style="margin-bottom:1.25rem">
      <div class="stat-card">
        <div class="stat-label">Toplam Gelir</div>
        <div class="stat-value" style="color:#15803d">{{ formatMoney(summary.total_income) }}</div>
        <div class="stat-badge badge-green">Satışlar</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Toplam Gider</div>
        <div class="stat-value" style="color:#dc2626">{{ formatMoney(summary.total_expense) }}</div>
        <div class="stat-badge badge-red">Alımlar</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Net Kar</div>
        <div class="stat-value" :style="{ color: summary.net >= 0 ? '#15803d' : '#dc2626' }">
          {{ formatMoney(summary.net) }}
        </div>
        <div :class="['stat-badge', summary.net >= 0 ? 'badge-green' : 'badge-red']">
          {{ summary.net >= 0 ? 'Karda' : 'Zararda' }}
        </div>
      </div>
    </div>

    <div style="background:white;border:1px solid #ebebeb;border-radius:12px;padding:1.25rem">
      <div class="section-title" style="margin-bottom:1rem">İşlem Geçmişi</div>
      <button class="btn btn-secondary" @click="downloadFile('csv')" style="font-size:13px">📄 CSV İndir</button>
      <<button class="btn btn-secondary" @click="downloadFile('pdf')" style="font-size:13px">📄 PDF İndir</button>
<button class="btn btn-secondary" @click="downloadFile('excel')" style="font-size:13px">📥 Excel İndir</button>
      <div v-if="error" class="error-msg">{{ error }}</div>
      <div v-if="transactions.length === 0 && !error" class="empty-state">
        Henüz işlem yok. Sipariş tamamlayınca burada görünür.
      </div>

      <div style="display:flex;flex-direction:column;gap:8px">
        <div
          v-for="tx in transactions"
          :key="tx.id"
          style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f9f9fb;border-radius:8px;border:1px solid #ebebeb"
        >
          <div style="display:flex;align-items:center;gap:12px">
            <div
              :style="{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: tx.type === 'income' ? '#dcfce7' : '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px'
              }"
            >
              {{ tx.type === 'income' ? '💰' : '🛒' }}
            </div>
            <div>
              <div style="font-size:13px;font-weight:500;color:#1a1a2e">{{ tx.description }}</div>
              <div style="font-size:11px;color:#9ca3af">{{ formatDate(tx.created_at) }}</div>
            </div>
          </div>
          <div
            :style="{
              fontSize: '14px',
              fontWeight: '600',
              color: tx.type === 'income' ? '#15803d' : '#dc2626'
            }"
          >
            {{ tx.type === 'income' ? '+' : '-' }}{{ formatMoney(tx.amount) }}
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import api from '../api';
import { useToastStore } from '../stores/toast';

const toast = useToastStore();
const transactions = ref<any[]>([]);
const summary = ref({ total_income: 0, total_expense: 0, net: 0 });
const error = ref('');

onMounted(async () => {
  try {
    const res = await api.get('/transactions');
    transactions.value = res.data.transactions;
    summary.value = res.data.summary;
  } catch {
    error.value = 'Veriler yüklenemedi';
  }
});

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(amount);
};
const downloadFile = async (type: 'pdf' | 'excel' | 'csv') => {
  try {
    const res = await api.get(`/files/products/${type}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    const ext = type === 'pdf' ? 'pdf' : type === 'csv' ? 'csv' : 'xlsx';
    link.setAttribute('download', `urunler.${ext}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.show(`${type.toUpperCase()} indiriliyor...`);
  } catch {
    toast.show('Dosya indirilemedi', 'error');
  }
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }) + ' ' + new Date(dateStr).toLocaleTimeString('tr-TR', {
    hour: '2-digit', minute: '2-digit'
  });
};
</script>