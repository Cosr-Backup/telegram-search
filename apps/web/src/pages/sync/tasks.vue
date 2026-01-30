<script setup lang="ts">
import NProgress from 'nprogress'

import { getErrorMessage, useBridge, useChatStore, useSyncTaskStore } from '@tg-search/client'
import { CoreEventType } from '@tg-search/core'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import SyncVisualization from '../../components/SyncVisualization.vue'

import { Button } from '../../components/ui/Button'
import { Progress } from '../../components/ui/Progress'

const { t } = useI18n()
const router = useRouter()
const bridge = useBridge()
const chatsStore = useChatStore()
const { chats } = storeToRefs(chatsStore)
const syncTaskStore = useSyncTaskStore()
const { currentTask, currentTaskProgress, increase, chatStats, chatStatsLoading, etaSeconds } = storeToRefs(syncTaskStore)

// Currently focused chat id for stats
const activeChatId = ref<number | null>(null)

const activeChat = computed(() => {
  if (!activeChatId.value)
    return undefined
  return chats.value.find(chat => chat.id === activeChatId.value)
})

// Automatically switch active visualization to the currently syncing chat
watch(currentTask, (task) => {
  if (task && task.metadata?.chatIds?.length === 1) {
    const syncingChatId = Number(task.metadata.chatIds[0])
    if (activeChatId.value !== syncingChatId) {
      activeChatId.value = syncingChatId
    }
  }
}, { immediate: true })

// Fetch stats when active chat changes
watch(activeChatId, (chatId) => {
  if (!chatId) {
    chatStats.value = undefined
    chatStatsLoading.value = false
    return
  }

  chatStatsLoading.value = true
  bridge.sendEvent(CoreEventType.TakeoutStatsFetch, {
    chatId: chatId.toString(),
  })
}, { immediate: true })

// Format ETA string
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

// Check if task was cancelled
const isTaskCancelled = computed(() => {
  const task = currentTask.value
  return task?.lastError === 'Task aborted'
})

// Get i18n error message from raw error
const errorMessage = computed(() => {
  const task = currentTask.value
  if (!task?.rawError)
    return task?.lastError
  return getErrorMessage(task.rawError, (key: string, params?: Record<string, unknown>) => t(key, params || {}))
})

const localizedTaskMessage = computed(() => {
  const msg = currentTask.value?.lastMessage || ''
  if (!msg)
    return ''

  const processedMatch = msg.match(/^Processed\s+(\d+)\/(\d+)\s+messages$/i)
  if (processedMatch) {
    const processed = Number(processedMatch[1])
    const total = Number(processedMatch[2])
    return t('sync.processedMessages', { processed, total })
  }

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

function handleAbort() {
  if (currentTask.value) {
    bridge.sendEvent(CoreEventType.TakeoutTaskAbort, {
      taskId: currentTask.value.taskId,
    })
  }
  else {
    toast.error(t('sync.noInProgressTask'))
  }
}

watch(currentTaskProgress, (progress) => {
  if (progress === 100) {
    toast.success(t('sync.syncCompleted'))
    NProgress.done()
    increase.value = true
  }
  else if (progress < 0 && currentTask.value?.lastError) {
    if (isTaskCancelled.value) {
      NProgress.done()
      currentTask.value = undefined
    }
    else {
      NProgress.done()
    }
  }
  else if (progress >= 0 && progress < 100) {
    NProgress.set(progress / 100)
  }
})
</script>

<template>
  <div class="h-full flex flex-col bg-background/50">
    <!-- Header -->
    <header class="flex items-center justify-between border-b bg-background px-8 py-4">
      <div class="flex items-center gap-4">
        <Button
          icon="i-lucide-arrow-left"
          size="sm"
          class="rounded-full"
          :aria-label="t('sync.goToSelection')"
          @click="router.push('/sync')"
        />
        <div class="flex flex-col">
          <h1 class="text-xl font-bold tracking-tight">
            {{ t('sync.tasks') }}
          </h1>
          <p class="text-xs text-muted-foreground">
            {{ currentTask ? t('sync.syncing') : t('sync.noActiveTasks') }}
          </p>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto p-6 lg:p-10">
      <div class="mx-auto max-w-5xl w-full">
        <!-- Active Task Cards -->
        <div v-if="currentTask" class="space-y-4">
          <div class="grid gap-4 md:grid-cols-3">
            <div
              class="flex items-start gap-4 border rounded-2xl bg-card p-4"
              :class="currentTask?.lastError ? 'border-destructive/30 bg-destructive/5' : 'border-primary/20'"
            >
              <div
                class="h-10 w-10 flex items-center justify-center rounded-full"
                :class="currentTask?.lastError ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'"
              >
                <div v-if="currentTask?.lastError" class="i-lucide-alert-circle h-5 w-5" />
                <div v-else class="i-lucide-loader-2 h-5 w-5 animate-spin" />
              </div>
              <div class="space-y-1">
                <h2 class="text-base font-semibold">
                  {{ currentTask?.lastError ? t('sync.syncFailed') : (activeChat?.name || t('sync.syncing')) }}
                </h2>
                <p v-if="currentTask?.lastError" class="text-sm text-destructive">
                  {{ errorMessage }}
                </p>
                <p v-else-if="localizedTaskMessage" class="text-sm text-muted-foreground">
                  {{ localizedTaskMessage }}
                </p>
                <p v-if="!currentTask?.lastError && etaMessage" class="text-xs text-primary">
                  {{ etaMessage }}
                </p>
              </div>
            </div>

            <div
              class="border rounded-2xl bg-card p-4"
              :class="currentTask?.lastError ? 'border-border/60 opacity-60' : 'border-border/80'"
            >
              <div class="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{{ t('common.progress') }}</span>
                <span class="text-foreground font-medium">{{ Math.round(currentTaskProgress) }}%</span>
              </div>
              <Progress :progress="currentTaskProgress" class="h-2.5 rounded-full" />
              <div class="mt-3 text-xs text-muted-foreground">
                {{ currentTask?.lastError ? t('sync.syncFailed') : t('sync.syncing') }}
              </div>
            </div>

            <div class="border rounded-2xl bg-card p-4">
              <div class="text-xs text-muted-foreground">
                {{ t('sync.actions') }}
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <Button
                  v-if="currentTask?.lastError"
                  icon="i-lucide-x"
                  size="sm"
                  class="rounded-full px-5"
                  @click="syncTaskStore.currentTask = undefined"
                >
                  {{ t('sync.dismiss') }}
                </Button>
                <Button
                  v-else
                  icon="i-lucide-ban"
                  size="sm"
                  class="border-destructive/30 rounded-full px-5 text-destructive hover:bg-destructive/10"
                  @click="handleAbort"
                >
                  {{ t('sync.cancel') }}
                </Button>
                <Button
                  icon="i-lucide-list"
                  size="sm"
                  class="rounded-full px-4 text-muted-foreground hover:text-foreground"
                  @click="router.push('/sync')"
                >
                  {{ t('sync.goToSelection') }}
                </Button>
              </div>
            </div>
          </div>

          <!-- Visualization Section -->
          <div v-if="!currentTask?.lastError" class="border rounded-2xl bg-card p-4">
            <div class="mb-4 flex items-center gap-2 text-sm font-semibold">
              <span class="i-lucide-bar-chart-3 h-4 w-4 text-primary" />
              {{ t('sync.liveStats') || 'Live Stats' }}
            </div>
            <SyncVisualization
              :stats="chatStats"
              :loading="chatStatsLoading"
              :chat-label="activeChat ? (activeChat.name || t('chatSelector.chat', { id: activeChat.id })) : ''"
            />
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-else
          class="flex flex-col items-center justify-center py-20 text-center space-y-6"
        >
          <div class="h-24 w-24 flex items-center justify-center rounded-full bg-muted/50">
            <span class="i-lucide-clipboard-check h-12 w-12 text-muted-foreground" />
          </div>
          <div class="space-y-2">
            <h2 class="text-2xl font-bold tracking-tight">
              {{ t('sync.noActiveTasks') }}
            </h2>
            <p class="mx-auto max-w-xs text-muted-foreground">
              {{ t('sync.startNewSync') }}
            </p>
          </div>
          <Button
            icon="i-lucide-list"
            class="rounded-full px-8 shadow-lg"
            @click="router.push('/sync')"
          >
            {{ t('sync.goToSelection') }}
          </Button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Smooth transitions for progress and cards */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}
</style>
