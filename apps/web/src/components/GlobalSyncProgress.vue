<script setup lang="ts">
import { useSyncTaskStore } from '@tg-search/client'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const syncTaskStore = useSyncTaskStore()
const { currentTask, currentTaskProgress, etaSeconds } = storeToRefs(syncTaskStore)

const etaMessage = computed(() => {
  if (etaSeconds.value === null || etaSeconds.value === undefined)
    return ''

  const minutes = Math.floor(etaSeconds.value / 60)
  const seconds = etaSeconds.value % 60

  if (minutes > 0) {
    return t('sync.etaTime', { minutes, seconds })
  }
  return t('sync.etaSeconds', { seconds })
})

const localizedTaskMessage = computed(() => {
  const msg = currentTask.value?.lastMessage || ''
  if (!msg)
    return ''

  // Parse progress message: "Processed 123/456 messages"
  const processedMatch = msg.match(/^Processed\s+(\d+)\/(\d+)\s+messages$/i)
  if (processedMatch) {
    const processed = Number(processedMatch[1])
    const total = Number(processedMatch[2])
    return t('sync.processedMessages', { processed, total })
  }

  // Map known status messages
  switch (msg) {
    case 'Init takeout session':
      return t('sync.initTakeoutSession')
    case 'Get messages':
      return t('sync.getMessages')
    case 'Starting incremental sync':
      return t('sync.startingIncrementalSync')
    case 'Incremental sync completed':
      return t('sync.incrementalSyncCompleted')
    default:
      return msg
  }
})
</script>

<template>
  <div
    v-if="currentTask && !currentTask.lastError && currentTaskProgress < 100"
    class="sticky top-0 z-20 w-full border-b bg-card px-4 py-2 shadow-sm"
  >
    <div class="mb-1 flex items-center justify-between gap-4 text-sm">
      <div class="flex items-center gap-2 text-muted-foreground">
        <div class="i-lucide-loader-2 h-4 w-4 animate-spin text-primary" />
        <span class="text-foreground font-medium">{{ localizedTaskMessage }}</span>
      </div>
      <div class="text-xs text-muted-foreground font-mono">
        {{ etaMessage }}
      </div>
    </div>
    <div class="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <div
        class="h-full bg-primary transition-all duration-300 ease-out"
        :style="{ width: `${currentTaskProgress}%` }"
      />
    </div>
  </div>
</template>
