<script setup lang="ts">
import type { SyncOptions } from '@tg-search/core'

import NProgress from 'nprogress'

import { useAccountStore, useBridge, useChatStore, useSyncTaskStore } from '@tg-search/client'
import { CoreEventType } from '@tg-search/core'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import ChatSelector from '../../components/ChatSelector.vue'
import SyncOptionsComponent from '../../components/SyncOptions.vue'
import Dialog from '../../components/ui/Dialog.vue'

import { Button } from '../../components/ui/Button'

const { t } = useI18n()
const router = useRouter()
const bridge = useBridge()
const { accountSettings } = storeToRefs(useAccountStore())
const chatsStore = useChatStore()
const { chats, folders } = storeToRefs(chatsStore)
const syncTaskStore = useSyncTaskStore()
const { currentTask, currentTaskProgress, increase } = storeToRefs(syncTaskStore)

const selectedChats = ref<number[]>([])
const syncOptions = ref<SyncOptions>({})
const activeChatId = ref<number | null>(null)
const showAdvanced = ref(false)

const effectiveSyncOptions = computed<SyncOptions>(() => ({
  ...syncOptions.value,
  syncMedia: accountSettings.value?.sync?.syncMedia ?? true,
  maxMediaSize: accountSettings.value?.sync?.maxMediaSize ?? 0,
}))

// Default to incremental sync
if (increase.value === undefined || increase.value === null) {
  increase.value = true
}

const isTaskInProgress = computed(() => {
  return !!currentTask.value && currentTaskProgress.value >= 0 && currentTaskProgress.value < 100
})

const isButtonDisabled = computed(() => {
  return selectedChats.value.length === 0 || isTaskInProgress.value
})

const isSelectAllDisabled = computed(() => {
  return isTaskInProgress.value || chats.value.length === 0
})

const allChatIds = computed(() => chats.value.map(c => c.id))

const isAllSelected = computed(() => {
  const allIds = allChatIds.value
  if (allIds.length === 0 || selectedChats.value.length !== allIds.length) {
    return false
  }
  const selectedSet = new Set(selectedChats.value)
  return allIds.every(id => selectedSet.has(id))
})

const SELECT_ALL_WARNING_THRESHOLD = 50
const isSelectAllDialogOpen = ref(false)
const selectAllCount = ref<number>(0)
const isSelectAllWarning = ref<boolean>(false)

function handleSelectAll() {
  const allIds = allChatIds.value
  const allSelected = isAllSelected.value

  selectedChats.value = allSelected ? [] : allIds

  if (!allSelected) {
    const count = allIds.length
    selectAllCount.value = count
    isSelectAllWarning.value = count >= SELECT_ALL_WARNING_THRESHOLD
    isSelectAllDialogOpen.value = true
  }
}

function handleSync() {
  increase.value = true
  bridge.sendEvent(CoreEventType.TakeoutRun, {
    chatIds: selectedChats.value.map(id => id.toString()),
    increase: true,
    syncOptions: effectiveSyncOptions.value,
  })

  NProgress.start()
  router.push('/sync/tasks')
}

function handleResync() {
  increase.value = false
  bridge.sendEvent(CoreEventType.TakeoutRun, {
    chatIds: selectedChats.value.map(id => id.toString()),
    increase: false,
    syncOptions: effectiveSyncOptions.value,
  })

  NProgress.start()
  router.push('/sync/tasks')
}

watch(currentTaskProgress, (progress) => {
  if (progress === 100) {
    toast.success(t('sync.syncCompleted'))
    NProgress.done()
    increase.value = true
  }
})
</script>

<template>
  <div class="h-full flex flex-col bg-background/50">
    <!-- Header -->
    <header class="flex items-center justify-between border-b bg-background px-8 py-4">
      <div class="flex flex-col">
        <h1 class="text-xl font-bold tracking-tight">
          {{ t('sync.selectChats') }}
        </h1>
        <p class="text-xs text-muted-foreground">
          {{ t('sync.syncPrompt') }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <Button
          v-if="isTaskInProgress"
          icon="i-lucide-activity"
          variant="outline"
          class="rounded-full"
          @click="router.push('/sync/tasks')"
        >
          {{ t('sync.viewTasks') }}
        </Button>
        <template v-else>
          <Button
            variant="ghost"
            size="sm"
            class="rounded-full text-muted-foreground hover:text-foreground"
            @click="showAdvanced = !showAdvanced"
          >
            <span :class="showAdvanced ? 'i-lucide-settings-2' : 'i-lucide-settings'" class="mr-2 h-4 w-4" />
            {{ showAdvanced ? t('common.hide') : t('sync.syncOptions') }}
          </Button>

          <div class="mx-1 h-4 w-px bg-border" />

          <Button
            icon="i-lucide-refresh-cw"
            variant="default"
            class="rounded-full shadow-sm"
            :disabled="isButtonDisabled"
            @click="handleSync"
          >
            {{ t('sync.incrementalSync') }}
          </Button>

          <Button
            icon="i-lucide-rotate-ccw"
            variant="outline"
            class="rounded-full"
            :disabled="isButtonDisabled"
            @click="handleResync"
          >
            {{ t('sync.resync') }}
          </Button>
        </template>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-hidden">
      <div class="h-full flex flex-col md:flex-row">
        <!-- Chat Selection Area -->
        <div class="min-w-0 flex flex-1 flex-col p-6 lg:p-8">
          <div class="mb-6 flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm text-primary font-medium">
                <span class="i-lucide-check-circle h-4 w-4" />
                {{ t('sync.selectedChats', { count: selectedChats.length }) }}
              </div>

              <button
                class="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                :disabled="isSelectAllDisabled"
                @click="handleSelectAll"
              >
                <span :class="isAllSelected ? 'i-lucide-check-square' : 'i-lucide-square'" class="h-4 w-4" />
                {{ isAllSelected ? t('sync.deselectAll') : t('sync.selectAll') }}
              </button>
            </div>
          </div>

          <ChatSelector
            v-model:selected-chats="selectedChats"
            v-model:active-chat-id="activeChatId"
            :chats="chats"
            :folders="folders"
          />
        </div>

        <!-- Options Sidebar (Collapsible) -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          leave-active-class="transition-all duration-200 ease-in"
          enter-from-class="opacity-0 translate-x-12 w-0"
          leave-to-class="opacity-0 translate-x-12 w-0"
        >
          <aside v-if="showAdvanced" class="w-full overflow-y-auto border-l bg-card p-6 lg:w-96 md:w-80 lg:p-8">
            <div class="mb-6 flex items-center justify-between">
              <h2 class="text-sm text-muted-foreground font-semibold tracking-wider uppercase">
                {{ t('sync.syncOptions') }}
              </h2>
              <Button variant="ghost" size="icon" @click="showAdvanced = false">
                <span class="i-lucide-x h-4 w-4" />
              </Button>
            </div>
            <SyncOptionsComponent v-model="syncOptions" />
          </aside>
        </Transition>
      </div>
    </main>

    <!-- Select All Reminder Dialog -->
    <Dialog v-model="isSelectAllDialogOpen" max-width="28rem">
      <div class="p-2">
        <div class="mb-6 flex items-start gap-4">
          <div
            class="h-10 w-10 flex shrink-0 items-center justify-center rounded-full"
            :class="isSelectAllWarning ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'"
          >
            <span :class="isSelectAllWarning ? 'i-lucide-alert-triangle' : 'i-lucide-info'" class="h-5 w-5" />
          </div>
          <div class="space-y-1">
            <h3 class="text-lg font-semibold leading-none">
              {{ isSelectAllWarning ? t('common.warning') : t('common.info') }}
            </h3>
            <p class="text-sm text-muted-foreground leading-relaxed">
              {{ isSelectAllWarning
                ? t('sync.selectAllWarning', { count: selectAllCount })
                : t('sync.selectAllInfo', { count: selectAllCount })
              }}
            </p>
          </div>
        </div>

        <div class="flex justify-end">
          <Button
            size="sm"
            class="rounded-full px-6"
            @click="isSelectAllDialogOpen = false"
          >
            {{ t('sync.dismiss') }}
          </Button>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
/* Custom transitions if needed */
</style>
