<template>
  <AppLayout>
    <div style="display:flex;flex-direction:column;gap:1.25rem">

      <!-- Gelir/Gider Bar Grafiği -->
      <div style="background:white;border:1px solid #ebebeb;border-radius:12px;padding:1.25rem">
        <div class="section-title" style="margin-bottom:1.25rem">Gelir / Gider Analizi</div>
        <div v-if="barChartData.labels.length === 0" class="empty-state">
          Henüz işlem yok. Sipariş tamamlayınca grafik oluşur.
        </div>
        <div v-else style="height:300px;position:relative">
          <Bar :data="barChartData" :options="barOptions" />
        </div>
      </div>

      <!-- Stok Değişim Çizgi Grafiği -->
      <div style="background:white;border:1px solid #ebebeb;border-radius:12px;padding:1.25rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem">
          <div class="section-title">Stok Değişim Grafiği</div>
          <select v-model="selectedProduct" style="font-size:13px;padding:6px 10px;border:1px solid #ebebeb;border-radius:8px;outline:none">
            <option value="">Ürün seç...</option>
            <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div v-if="!selectedProduct" class="empty-state">Grafik görmek için ürün seçin.</div>
        <div v-else-if="lineChartData.labels.length === 0" class="empty-state">Bu ürün için stok hareketi yok.</div>
        <div v-else style="height:300px;position:relative">
          <Line :data="lineChartData" :options="lineOptions" />
        </div>
      </div>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import api from '../api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'vue-chartjs';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const transactions = ref<any[]>([]);
const movements = ref<any[]>([]);
const products = ref<any[]>([]);
const selectedProduct = ref('');

// Bar chart verisi — aylık gelir/gider
const barChartData = computed(() => {
  const map: Record<string, { gelir: number; gider: number }> = {};

  transactions.value.forEach(tx => {
    const month = new Date(tx.created_at).toLocaleDateString('tr-TR', {
      month: 'short', year: 'numeric'
    });
    if (!map[month]) map[month] = { gelir: 0, gider: 0 };
    if (tx.type === 'income') map[month].gelir += parseFloat(tx.amount);
    else map[month].gider += parseFloat(tx.amount);
  });

  const labels = Object.keys(map);
  return {
    labels,
    datasets: [
      {
        label: 'Gelir',
        data: labels.map(l => Math.round(map[l].gelir)),
        backgroundColor: '#534AB7',
        borderRadius: 6,
      },
      {
        label: 'Gider',
        data: labels.map(l => Math.round(map[l].gider)),
        backgroundColor: '#ef4444',
        borderRadius: 6,
      }
    ]
  };
});

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' as const },
    tooltip: {
      callbacks: {
        label: (ctx: any) => `${ctx.dataset.label}: ₺${ctx.raw.toLocaleString('tr-TR')}`
      }
    }
  },
  scales: {
    y: {
      ticks: {
        callback: (value: any) => `₺${value.toLocaleString('tr-TR')}`
      }
    }
  }
};

// Line chart verisi — stok değişimi
const lineChartData = computed(() => {
  const sorted = [...movements.value].reverse();
  return {
    labels: sorted.map(m =>
      new Date(m.created_at).toLocaleDateString('tr-TR', {
        day: '2-digit', month: '2-digit'
      })
    ),
    datasets: [
      {
        label: 'Stok',
        data: sorted.map(m => m.quantity_after),
        borderColor: '#534AB7',
        backgroundColor: 'rgba(83, 74, 183, 0.1)',
        borderWidth: 2,
        pointBackgroundColor: '#534AB7',
        pointRadius: 4,
        fill: true,
        tension: 0.3,
      }
    ]
  };
});

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' as const },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { stepSize: 1 }
    }
  }
};

onMounted(async () => {
  const [txRes, prodRes] = await Promise.all([
    api.get('/transactions'),
    api.get('/products'),
  ]);
  transactions.value = txRes.data.transactions;
  products.value = prodRes.data.products;
});

watch(selectedProduct, async (id) => {
  if (!id) return;
  const res = await api.get(`/products/${id}/movements`);
  movements.value = res.data;
});
</script>