<template>
  <AppLayout>
    <div style="display:flex;flex-direction:column;gap:1.25rem;max-width:900px">

      <!-- Dosya Yükleme -->
      <div class="form-card" v-if="!previewData">
        <h2 style="font-size:16px;font-weight:600">Ürün İçe Aktar (CSV / Excel)</h2>
        <p style="font-size:13px;color:#6b7280">
          CSV veya Excel dosyanız <b>name, description, quantity, category, purchase_price, selling_price</b> kolonlarını içermelidir.
        </p>
        <div v-if="error" class="error-msg">{{ error }}</div>

        <input type="file" ref="fileInput" accept=".csv,.xlsx,.xls" @change="handleFileSelect" />

        <button class="btn btn-primary" :disabled="!selectedFile || uploading" @click="handleUpload">
          {{ uploading ? 'Yükleniyor...' : 'Yükle ve Önizle' }}
        </button>
      </div>

      <!-- İşleniyor -->
      <div class="form-card" v-if="processing">
        <h2 style="font-size:16px;font-weight:600">Dosya İşleniyor...</h2>
        <p style="font-size:13px;color:#6b7280">Worker dosyanızı analiz ediyor, lütfen bekleyin.</p>
      </div>

      <!-- Önizleme -->
      <div class="form-card" v-if="previewData">
        <h2 style="font-size:16px;font-weight:600">Önizleme</h2>

        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <div class="stat-badge" style="background:#e0f2fe;color:#0369a1">Toplam: {{ previewData.summary.total }}</div>
          <div class="stat-badge badge-green">Geçerli: {{ previewData.summary.valid }}</div>
          <div class="stat-badge badge-red">Hatalı: {{ previewData.summary.invalid }}</div>
          <div class="stat-badge badge-amber">Dosya İçi Tekrar: {{ previewData.summary.duplicateInFile }}</div>
          <div class="stat-badge" style="background:#ede9fe;color:#6d28d9">Veritabanında Var: {{ previewData.summary.duplicateInDb }}</div>
        </div>

        <!-- Duplicate stratejisi -->
        <div v-if="previewData.summary.duplicateInDb > 0" class="form-group">
          <label>Veritabanında zaten var olan ürünler için ne yapılsın?</label>
          <select v-model="duplicateStrategy">
            <option value="skip">Mevcut kayıtları atla</option>
            <option value="update">Mevcut kayıtları güncelle</option>
            <option value="createOnly">Sadece yeni kayıtları oluştur</option>
          </select>
        </div>

        <!-- Satır listesi -->
        <div style="max-height:400px;overflow-y:auto;border:1px solid #ebebeb;border-radius:8px">
          <table style="width:100%;font-size:12px;border-collapse:collapse">
            <thead style="position:sticky;top:0;background:#f4f4f6">
              <tr>
                <th style="padding:8px;text-align:left">Satır</th>
                <th style="padding:8px;text-align:left">Ürün Adı</th>
                <th style="padding:8px;text-align:left">Kategori</th>
                <th style="padding:8px;text-align:left">Stok</th>
                <th style="padding:8px;text-align:left">Durum</th>
                <th style="padding:8px;text-align:left">Not</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in previewData.rows" :key="row.rowNumber" style="border-top:1px solid #ebebeb">
                <td style="padding:8px">{{ row.rowNumber }}</td>
                <td style="padding:8px">{{ row.data.name }}</td>
                <td style="padding:8px">{{ row.data.category }}</td>
                <td style="padding:8px">{{ row.data.quantity }}</td>
                <td style="padding:8px">
                  <span v-if="row.status === 'valid'" class="stat-badge badge-green" style="font-size:10px">Geçerli</span>
                  <span v-else-if="row.status === 'invalid'" class="stat-badge badge-red" style="font-size:10px">Hatalı</span>
                  <span v-else-if="row.status === 'duplicate_in_file'" class="stat-badge badge-amber" style="font-size:10px">Dosya İçi Tekrar</span>
                  <span v-else-if="row.status === 'duplicate_in_db'" class="stat-badge" style="font-size:10px;background:#ede9fe;color:#6d28d9">Mevcut Kayıt</span>
                </td>
                <td style="padding:8px;color:#dc2626;font-size:11px">{{ row.errors.join(', ') }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" :disabled="committing || previewData.summary.valid + previewData.summary.duplicateInDb === 0" @click="handleCommit">
            {{ committing ? 'İşleniyor...' : 'Onayla ve İçe Aktar' }}
          </button>
          <button class="btn btn-secondary" @click="reset">Vazgeç</button>
        </div>
      </div>

      <!-- Sonuç -->
      <div class="form-card" v-if="resultData">
        <h2 style="font-size:16px;font-weight:600">İçe Aktarma Tamamlandı</h2>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <div class="stat-badge badge-green">Oluşturuldu: {{ resultData.created }}</div>
          <div class="stat-badge" style="background:#e0f2fe;color:#0369a1">Güncellendi: {{ resultData.updated }}</div>
          <div class="stat-badge badge-amber">Atlandı: {{ resultData.skipped }}</div>
          <div class="stat-badge badge-red" v-if="resultData.failedRows?.length">Başarısız: {{ resultData.failedRows.length }}</div>
        </div>
        <button class="btn btn-primary" @click="reset">Yeni İçe Aktarma</button>
      </div>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import { useToastStore } from '../stores/toast';
import api from '../api';

const toast = useToastStore();
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const uploading = ref(false);
const processing = ref(false);
const committing = ref(false);
const error = ref('');
const jobId = ref('');
const previewData = ref<any>(null);
const resultData = ref<any>(null);
const duplicateStrategy = ref('skip');

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  selectedFile.value = target.files?.[0] || null;
  error.value = '';
};

const handleUpload = async () => {
  if (!selectedFile.value) return;
  error.value = '';
  uploading.value = true;

  try {
    const formData = new FormData();
    formData.append('file', selectedFile.value);

    const res = await api.post('/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    jobId.value = res.data.jobId;
    uploading.value = false;
    processing.value = true;

    pollPreview();
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Yükleme başarısız';
    uploading.value = false;
  }
};

const pollPreview = async () => {
  try {
    const res = await api.get(`/import/preview/${jobId.value}`);
    if (res.data.status === 'processing') {
      setTimeout(pollPreview, 1000);
      return;
    }
    processing.value = false;
    if (res.data.error) {
      error.value = res.data.error;
      return;
    }
    previewData.value = res.data;
  } catch {
    processing.value = false;
    error.value = 'Önizleme alınamadı';
  }
};

const handleCommit = async () => {
  committing.value = true;
  try {
    await api.post('/import/commit', {
      jobId: jobId.value,
      duplicateStrategy: duplicateStrategy.value,
    });
    pollCommit();
  } catch {
    toast.show('İçe aktarma başlatılamadı', 'error');
    committing.value = false;
  }
};

const pollCommit = async () => {
  try {
    const res = await api.get(`/import/commit/${jobId.value}`);
    if (res.data.status === 'processing') {
      setTimeout(pollCommit, 1000);
      return;
    }
    committing.value = false;
    if (res.data.error) {
      toast.show(res.data.error, 'error');
      return;
    }
    resultData.value = res.data;
    previewData.value = null;
    toast.show('İçe aktarma tamamlandı');
  } catch {
    committing.value = false;
    toast.show('Sonuç alınamadı', 'error');
  }
};

const reset = () => {
  selectedFile.value = null;
  previewData.value = null;
  resultData.value = null;
  jobId.value = '';
  if (fileInput.value) fileInput.value.value = '';
};
</script>