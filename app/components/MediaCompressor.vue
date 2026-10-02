<script setup lang="ts">
import { useMediaCompression, type MediaKind } from '~/composables/useMediaCompression'

const {
  tasks,
  addFiles,
  removeTask,
  clearFinished,
  compressImages,
  compressVideos,
  importImagesFromCsv,
  downloadTasksAsZip
} = useMediaCompression()

const mode = ref<MediaKind>('image')
const isDragging = ref(false)
const isProcessing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const csvInput = ref<HTMLInputElement | null>(null)
const isImportingCsv = ref(false)
const csvImportSummary = ref('')
const isZipping = ref(false)

// per-mode output settings — each mode remembers its own choice, per the brief
const imageFormat = ref<'webp' | 'jpeg' | 'png' | 'avif'>('webp')
const imageQuality = ref(80)
const videoFormat = ref<'mp4' | 'webm'>('mp4')
const videoCrf = ref(28)
const videoPreset = ref('fast')

const accept = computed(() => (mode.value === 'image' ? 'image/*' : 'video/*'))

const visibleTasks = computed(() => tasks.value.filter(t => t.kind === mode.value))

function onFilesPicked(fileList: FileList | null) {
  if (!fileList || fileList.length === 0) return
  addFiles(Array.from(fileList), mode.value)
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  onFilesPicked(e.dataTransfer?.files ?? null)
}

async function onCsvPicked(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  mode.value = 'image'
  isImportingCsv.value = true
  csvImportSummary.value = ''
  try {
    const { found, added, skipped } = await importImagesFromCsv(file)
    csvImportSummary.value = found === 0
      ? 'No links found in that CSV.'
      : `Found ${found} link${found === 1 ? '' : 's'} — added ${added} image${added === 1 ? '' : 's'}${skipped ? `, skipped ${skipped}` : ''}.`
  } catch {
    csvImportSummary.value = 'Could not read that CSV file.'
  } finally {
    isImportingCsv.value = false
  }
}

async function downloadAllAsZip() {
  const doneIds = visibleTasks.value.filter(t => t.status === 'done').map(t => t.id)
  if (!doneIds.length) return
  isZipping.value = true
  try {
    await downloadTasksAsZip(doneIds, `compressed-${mode.value}s.zip`)
  } finally {
    isZipping.value = false
  }
}

async function compressAll() {
  const queued = visibleTasks.value.filter(t => t.status === 'queued').map(t => t.id)
  if (queued.length === 0) return
  isProcessing.value = true
  if (mode.value === 'image') {
    await compressImages(queued, { format: imageFormat.value, quality: imageQuality.value })
  } else {
    await compressVideos(queued, { format: videoFormat.value, crf: videoCrf.value, preset: videoPreset.value })
  }
  isProcessing.value = false
}

function formatBytes(bytes?: number) {
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(1)} ${units[i]}`
}
</script>

<template>
  <div class="flume-page">
    <div class="flume-container">
      <!-- Header: eyebrow + underline bar, straight from the deck's title treatment -->
      <header class="flume-header">
        <p class="flume-eyebrow">
          Flume Digital Marketing
        </p>
        <div class="flume-rule" />
        <h1 class="flume-h1">
          MEDIA COMPRESSOR
        </h1>
        <p class="flume-sub">
          Shrink images and video without leaving your browser tab.
        </p>
      </header>

      <!-- Mode toggle -->
      <div
        class="flume-toggle"
        role="tablist"
        aria-label="Media type"
      >
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'image'"
          class="flume-toggle-btn"
          :class="{ 'is-active': mode === 'image' }"
          @click="mode = 'image'"
        >
          Images
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'video'"
          class="flume-toggle-btn"
          :class="{ 'is-active': mode === 'video' }"
          @click="mode = 'video'"
        >
          Video
        </button>
      </div>

      <!-- Output settings, specific to the active mode -->
      <section class="flume-card flume-settings">
        <template v-if="mode === 'image'">
          <label class="flume-field">
            <span>Output format</span>
            <select
              v-model="imageFormat"
              class="flume-select"
            >
              <option value="webp">WebP</option>
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="avif">AVIF</option>
            </select>
          </label>
          <label class="flume-field flume-field-wide">
            <span>Quality — {{ imageQuality }}</span>
            <input
              v-model.number="imageQuality"
              type="range"
              min="10"
              max="100"
              class="flume-range"
            >
          </label>
        </template>

        <template v-else>
          <label class="flume-field">
            <span>Output format</span>
            <select
              v-model="videoFormat"
              class="flume-select"
            >
              <option value="mp4">MP4 (H.264)</option>
              <option value="webm">WebM (VP9)</option>
            </select>
          </label>
          <label class="flume-field flume-field-wide">
            <span>Quality (CRF — lower is better) — {{ videoCrf }}</span>
            <input
              v-model.number="videoCrf"
              type="range"
              min="18"
              max="40"
              class="flume-range"
            >
          </label>
          <label class="flume-field">
            <span>Encode speed</span>
            <select
              v-model="videoPreset"
              class="flume-select"
            >
              <option value="ultrafast">Ultrafast</option>
              <option value="fast">Fast</option>
              <option value="medium">Medium</option>
              <option value="slow">Slow (smaller file)</option>
            </select>
          </label>
        </template>
      </section>

      <!-- Dropzone -->
      <section
        class="flume-dropzone"
        :class="{ 'is-dragging': isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onDrop"
        @click="fileInput?.click()"
      >
        <input
          ref="fileInput"
          type="file"
          multiple
          :accept="accept"
          class="sr-only"
          @change="onFilesPicked(($event.target as HTMLInputElement).files)"
        >
        <p class="flume-dropzone-title">
          Drop {{ mode === 'image' ? 'images' : 'videos' }} here
        </p>
        <p class="flume-dropzone-sub">
          or click to browse — multiple files run at the same time
        </p>
      </section>

      <!-- CSV import: pulls image links out of a spreadsheet export -->
      <section
        v-if="mode === 'image'"
        class="flume-csv"
      >
        <input
          ref="csvInput"
          type="file"
          accept=".csv,text/csv"
          class="sr-only"
          @change="onCsvPicked"
        >
        <button
          type="button"
          class="flume-btn flume-btn-ghost"
          :disabled="isImportingCsv"
          @click="csvInput?.click()"
        >
          {{ isImportingCsv ? 'Importing…' : 'Import image links from CSV' }}
        </button>
        <p
          v-if="csvImportSummary"
          class="flume-csv-summary"
        >
          {{ csvImportSummary }}
        </p>
      </section>

      <!-- File list -->
      <section
        v-if="visibleTasks.length"
        class="flume-list"
      >
        <div class="flume-list-header">
          <button
            type="button"
            class="flume-btn flume-btn-primary"
            :disabled="isProcessing"
            @click="compressAll"
          >
            {{ isProcessing ? 'Compressing…' : `Compress all (${visibleTasks.filter(t => t.status === 'queued').length})` }}
          </button>
          <button
            type="button"
            class="flume-btn flume-btn-ghost"
            :disabled="isZipping || !visibleTasks.some(t => t.status === 'done')"
            @click="downloadAllAsZip"
          >
            {{ isZipping ? 'Zipping…' : 'Download all (.zip)' }}
          </button>
          <button
            type="button"
            class="flume-btn flume-btn-ghost"
            @click="clearFinished"
          >
            Clear finished
          </button>
        </div>

        <div
          v-for="(task, i) in visibleTasks"
          :key="task.id"
          class="flume-task"
          :class="`flume-cycle-${i % 6}`"
        >
          <div class="flume-task-accent" />
          <div class="flume-task-body">
            <div class="flume-task-top">
              <span class="flume-task-name">{{ task.file.name }}</span>
              <span class="flume-task-size">{{ formatBytes(task.file.size) }}</span>
            </div>

            <div class="flume-progress-track">
              <div
                class="flume-progress-fill"
                :class="{ 'is-error': task.status === 'error' }"
                :style="{ width: `${task.progress}%` }"
              />
            </div>

            <div class="flume-task-bottom">
              <span
                class="flume-status"
                :class="`flume-status-${task.status}`"
              >
                {{ task.status === 'queued' ? 'Waiting' : task.status === 'uploading' ? `${task.progress}%` : task.status === 'done' ? 'Done' : 'Failed' }}
              </span>
              <span
                v-if="task.status === 'error'"
                class="flume-error-msg"
              >{{ task.errorMessage }}</span>
              <a
                v-if="task.status === 'done'"
                :href="task.resultUrl"
                :download="`compressed-${task.resultName ?? task.file.name}`"
                class="flume-download"
              >
                Download ({{ formatBytes(task.resultSize) }})
              </a>
              <button
                type="button"
                class="flume-remove"
                @click="removeTask(task.id)"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.flume-page {
  min-height: 100dvh;
  background: var(--flume-charcoal);
  color: var(--flume-white);
  font-family: Arial, Helvetica, sans-serif;
  padding: 3rem 1.5rem 6rem;
  overflow-x: hidden;
}

.flume-container {
  max-width: 760px;
  margin: 0 auto;
}

.flume-eyebrow {
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  color: var(--flume-muted);
  margin: 0 0 0.6rem;
}

.flume-rule {
  width: 88px;
  height: 4px;
  background: var(--flume-rich-purple);
  margin-bottom: 1.25rem;
}

.flume-h1 {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 800;
  letter-spacing: 0.01em;
  margin: 0 0 0.5rem;
  text-transform: uppercase;
}

.flume-sub {
  color: var(--flume-muted);
  margin: 0 0 2.5rem;
  font-size: 1rem;
}

.flume-toggle {
  display: inline-flex;
  background: var(--flume-charcoal-raised);
  border-radius: 999px;
  padding: 4px;
  margin-bottom: 1.5rem;
}

.flume-toggle-btn {
  border: none;
  background: transparent;
  color: var(--flume-muted);
  font-family: inherit;
  font-weight: 700;
  font-size: 0.875rem;
  padding: 0.6rem 1.5rem;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.flume-toggle-btn.is-active {
  background: var(--flume-rich-purple);
  color: var(--flume-white);
}

.flume-card {
  background: var(--flume-charcoal-raised);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.flume-settings {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.flume-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--flume-muted);
  flex: 1 1 160px;
}

.flume-field-wide {
  flex: 2 1 240px;
}

.flume-select {
  background: var(--flume-charcoal);
  color: var(--flume-white);
  border: 1px solid #4a4a52;
  border-radius: 8px;
  padding: 0.55rem 0.75rem;
  font-family: inherit;
  font-size: 0.9rem;
}

.flume-range {
  accent-color: var(--flume-mellow-purple);
}

.flume-dropzone {
  border: 2px dashed #55555c;
  border-radius: 16px;
  padding: 3rem 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
  margin-bottom: 2rem;
}

.flume-dropzone.is-dragging,
.flume-dropzone:hover {
  border-color: var(--flume-mellow-purple);
  background: rgba(165, 128, 255, 0.06);
}

.flume-dropzone-title {
  font-weight: 700;
  font-size: 1.1rem;
  margin: 0 0 0.35rem;
}

.flume-dropzone-sub {
  color: var(--flume-muted);
  font-size: 0.85rem;
  margin: 0;
}

.flume-csv {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: -1.25rem;
  margin-bottom: 2rem;
}

.flume-csv-summary {
  color: var(--flume-muted);
  font-size: 0.85rem;
  margin: 0;
}

.flume-list-header {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.flume-btn {
  font-family: inherit;
  font-weight: 700;
  font-size: 0.875rem;
  border-radius: 999px;
  padding: 0.7rem 1.5rem;
  border: none;
  cursor: pointer;
}

.flume-btn-primary {
  background: var(--flume-rich-purple);
  color: var(--flume-white);
}

.flume-btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.flume-btn-ghost {
  background: transparent;
  color: var(--flume-muted);
  border: 1px solid #4a4a52;
}

.flume-task {
  display: flex;
  background: var(--flume-charcoal-raised);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.flume-task-accent {
  width: 5px;
  background: var(--accent);
  flex-shrink: 0;
}

.flume-task-body {
  padding: 1rem 1.25rem;
  flex: 1;
  min-width: 0;
}

.flume-task-top {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.flume-task-name {
  font-weight: 700;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.flume-task-size {
  color: var(--flume-muted);
  font-size: 0.8rem;
  flex-shrink: 0;
}

.flume-progress-track {
  height: 6px;
  border-radius: 999px;
  background: #4a4a52;
  overflow: hidden;
  margin-bottom: 0.6rem;
}

.flume-progress-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.2s ease;
}

.flume-progress-fill.is-error {
  background: #ff5c5c;
}

.flume-task-bottom {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.8rem;
}

.flume-status-queued { color: var(--flume-muted); }
.flume-status-uploading { color: var(--flume-mellow-blue); }
.flume-status-done { color: var(--flume-mint); font-weight: 700; }
.flume-status-error { color: #ff5c5c; font-weight: 700; }

.flume-error-msg {
  color: #ff8f8f;
}

.flume-download {
  color: var(--flume-lime);
  font-weight: 700;
  text-decoration: none;
  margin-left: auto;
}

.flume-download:hover {
  text-decoration: underline;
}

.flume-remove {
  background: none;
  border: none;
  color: var(--flume-muted);
  font-family: inherit;
  cursor: pointer;
  font-size: 0.8rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
