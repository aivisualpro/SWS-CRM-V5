<script setup lang="ts">
import { toast } from 'vue-sonner'

const { setHeader } = usePageHeader()
setHeader({ title: 'Notifications', icon: 'i-lucide-bell' })

const store = useDashboardStore()
store.init()

const loading = ref(true)
const notifications = ref<any[]>([])
const search = ref('')
const filterType = ref('')

async function fetchNotifications() {
  loading.value = true
  try {
    const data = await $fetch<{ success: boolean, notifications: any[] }>('/api/bigquery/notifications', {
      params: { limit: 1000 },
    })
    if (data.success) notifications.value = data.notifications
  }
  catch { toast.error('Failed to load notifications') }
  finally { loading.value = false }
}

onMounted(fetchNotifications)

// Unique notification types
const notificationTypes = computed(() => {
  const types = new Set<string>()
  for (const n of notifications.value) {
    if (n['Notification Type']) types.add(n['Notification Type'])
  }
  return Array.from(types).sort()
})

function formatDate(value: any): string {
  if (!value) return '—'
  try {
    const v = value?.value || value
    const d = new Date(v)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }
  catch { return String(value) }
}

function relativeTime(value: any): string {
  if (!value) return ''
  const v = value?.value || value
  const d = new Date(v)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMs / 3600000)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffMs / 86400000)
  if (diffDay < 7) return `${diffDay}d ago`
  return formatDate(value)
}

function colorClass(color: string): string {
  const c = (color || '').toLowerCase()
  if (c === 'red' || c === 'error') return 'bg-red-500/10 text-red-500 border-red-500/20'
  if (c === 'yellow' || c === 'warning') return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
  if (c === 'green' || c === 'success') return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
  if (c === 'blue' || c === 'info') return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
  if (c === 'orange') return 'bg-orange-500/10 text-orange-600 border-orange-500/20'
  if (c === 'purple') return 'bg-purple-500/10 text-purple-600 border-purple-500/20'
  return 'bg-muted text-muted-foreground'
}

function typeIcon(type: string): string {
  const t = (type || '').toLowerCase()
  if (t.includes('note')) return 'i-lucide-sticky-note'
  if (t.includes('chat')) return 'i-lucide-message-circle'
  if (t.includes('event')) return 'i-lucide-calendar-days'
  if (t.includes('permit')) return 'i-lucide-clipboard-check'
  if (t.includes('payment') || t.includes('finance')) return 'i-lucide-banknote'
  if (t.includes('ticket')) return 'i-lucide-ticket'
  if (t.includes('project')) return 'i-lucide-folder-kanban'
  if (t.includes('task')) return 'i-lucide-calendar-check-2'
  return 'i-lucide-bell'
}

const filteredNotifications = computed(() => {
  let list = notifications.value
  if (filterType.value) {
    list = list.filter(n => n['Notification Type'] === filterType.value)
  }
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(n =>
      (n['Notification Type'] || '').toLowerCase().includes(q)
      || (n.When || '').toLowerCase().includes(q)
      || (n.Header || '').toLowerCase().includes(q)
      || (n['Project Address'] || '').toLowerCase().includes(q)
      || (n['Project #'] || '').toLowerCase().includes(q)
      || (n.Note || '').toLowerCase().includes(q)
      || (n['Notify to'] || '').toLowerCase().includes(q)
      || (n.Priority || '').toLowerCase().includes(q),
    )
  }
  return list
})

// Infinite scroll
const CHUNK = 50
const visibleCount = ref(CHUNK)
const visibleNotifications = computed(() => filteredNotifications.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < filteredNotifications.value.length)

watch([search, filterType], () => { visibleCount.value = CHUNK })

const sentinelRef = ref<HTMLElement | null>(null)
onMounted(() => {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting && hasMore.value) visibleCount.value += CHUNK
  }, { threshold: 0.1 })
  watch(sentinelRef, (el) => { if (el) observer.observe(el) }, { immediate: true })
  onUnmounted(() => observer.disconnect())
})
</script>

<template>
  <div class="flex flex-col h-[calc(100dvh-54px)]">
    <!-- Header bar -->
    <div class="flex items-center justify-between gap-4 px-5 py-3 border-b border-border/50 bg-card/30 backdrop-blur-sm shrink-0">
      <div class="flex items-center gap-3">
        <div class="size-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <Icon name="i-lucide-bell" class="size-4.5 text-white" />
        </div>
        <div>
          <h2 class="text-sm font-bold">Notifications</h2>
          <p class="text-[11px] text-muted-foreground">{{ filteredNotifications.length }} notifications</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <select
          v-model="filterType"
          class="h-8 px-2 pr-7 rounded-lg border border-border/50 bg-muted/30 text-xs outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer max-w-[200px]"
          style="background-image: url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%239ca3af%27 stroke-width=%272%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 6px center;"
        >
          <option value="">All Types</option>
          <option v-for="t in notificationTypes" :key="t" :value="t">{{ t }}</option>
        </select>
        <div class="relative">
          <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50" />
          <input
            v-model="search"
            placeholder="Search…"
            class="h-8 w-[220px] pl-8 pr-3 rounded-lg border border-border/50 bg-muted/30 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="flex flex-col items-center gap-2">
        <Icon name="i-lucide-loader-2" class="size-7 animate-spin text-primary" />
        <p class="text-xs text-muted-foreground">Loading notifications…</p>
      </div>
    </div>

    <!-- Notification list -->
    <div v-else class="flex-1 overflow-auto">
      <div class="max-w-4xl mx-auto px-4 py-4 space-y-2">
        <div
          v-for="(n, idx) in visibleNotifications"
          :key="n['Row ID'] || idx"
          class="flex items-start gap-3 p-3 rounded-xl border border-border/30 hover:border-border/60 hover:bg-muted/20 transition-all group"
        >
          <!-- Icon -->
          <div class="size-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5" :class="colorClass(n.Color)">
            <Icon :name="typeIcon(n['Notification Type'])" class="size-4" />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <Badge variant="outline" class="text-[9px] font-semibold" :class="colorClass(n.Color)">
                {{ n['Notification Type'] || 'Notification' }}
              </Badge>
              <Badge v-if="n.Priority" variant="outline" class="text-[9px] bg-red-500/10 text-red-500 border-red-500/20">
                {{ n.Priority }}
              </Badge>
              <span class="text-[10px] text-muted-foreground/60 ml-auto shrink-0">{{ relativeTime(n['USA TimeStamp'] || n.TimeStamp) }}</span>
            </div>

            <p v-if="n.Header" class="text-xs font-semibold leading-snug mb-0.5 whitespace-pre-line line-clamp-2">{{ n.Header }}</p>
            <p v-else-if="n.When" class="text-xs font-semibold leading-snug mb-0.5 whitespace-pre-line line-clamp-2">{{ n.When }}</p>

            <div class="flex items-center gap-3 mt-1 flex-wrap">
              <NuxtLink
                v-if="n['Project #']"
                :to="`/projects/${n['Project #']}`"
                class="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                @click.stop
              >
                <Icon name="i-lucide-folder-kanban" class="size-2.5" />
                {{ n['Project Address'] || n['Project #'] }}
              </NuxtLink>
              <span v-if="n['Notify to']" class="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Icon name="i-lucide-at-sign" class="size-2.5" />
                {{ n['Notify to'] }}
              </span>
              <span v-if="n.Note" class="text-[10px] text-muted-foreground truncate max-w-[200px]">{{ n.Note }}</span>
            </div>
          </div>
        </div>

        <!-- Empty -->
        <div v-if="filteredNotifications.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
          <Icon name="i-lucide-bell-off" class="size-10 text-muted-foreground/20 mb-3" />
          <p class="text-sm text-muted-foreground">No notifications found</p>
        </div>

        <!-- Load more sentinel -->
        <div v-if="hasMore" ref="sentinelRef" class="flex items-center justify-center py-4">
          <Icon name="i-lucide-loader-2" class="size-4 animate-spin text-muted-foreground/40" />
        </div>
      </div>
    </div>
  </div>
</template>
