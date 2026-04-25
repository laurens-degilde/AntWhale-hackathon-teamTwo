<script setup>
import { ref, onMounted } from 'vue'
import { fetchBackend } from './api.js'

const message = ref('')
const loading = ref(false)
const error = ref(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    message.value = await fetchBackend()
  } catch (err) {
    error.value = err.message
    message.value = ''
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <main class="card">
    <h1>AntWhale</h1>
    <p class="hint">Calling <code>GET /api/backend</code></p>

    <div v-if="loading" class="state">Loading…</div>
    <div v-else-if="error" class="state error">Error: {{ error }}</div>
    <div v-else class="state success">{{ message }}</div>

    <button :disabled="loading" @click="load">Reload</button>
  </main>
</template>

<style scoped>
.card {
  max-width: 480px;
  margin: 4rem auto;
  padding: 2rem;
  font-family: system-ui, -apple-system, sans-serif;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  text-align: center;
}
h1 {
  margin: 0 0 0.5rem;
}
.hint {
  color: #6b7280;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}
code {
  background: #f3f4f6;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}
.state {
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 1rem;
}
.success {
  background: #ecfdf5;
  color: #065f46;
}
.error {
  background: #fef2f2;
  color: #991b1b;
}
button {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: white;
  font-size: 1rem;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
