<script setup lang="ts">
import { toast } from 'vue-sonner'

const { setHeader } = usePageHeader()
setHeader({ title: 'Project Chat', icon: 'i-lucide-message-circle' })

// ─── Auth ───────────────────────────────────────────────────
const { user: authUser } = useAuth()
const currentEmail = computed(() => (authUser.value?.email || '').toLowerCase())

// ─── Global store for lookups ───────────────────────────────
const store = useDashboardStore()
store.init()
const userNameMap = store.userNameMap
const projectMap = store.projectMap

function resolveName(email: string): string {
  if (!email) return ''
  return userNameMap.value[email.toLowerCase()] || email.split('@')[0] || email
}

function resolveProjectAddress(projectId: string): string {
  if (!projectId) return projectId
  const p = projectMap.value[projectId]
  if (!p) return projectId
  return p['Customer Address'] || p['Project Address'] || p['Address'] || projectId
}

// ─── State ──────────────────────────────────────────────────
const sidebarLoading = ref(true)
const chatLoading = ref(false)
const chatProjects = ref<any[]>([])
const activeProjectId = ref('')
const projectMessages = ref<any[]>([])
const searchQuery = ref('')
const chatAreaRef = ref<HTMLElement | null>(null)

// ─── Fetch project list for sidebar ─────────────────────────
async function fetchChatProjects() {
  sidebarLoading.value = true
  try {
    const data = await $fetch<{ success: boolean, projects: any[] }>('/api/bigquery/chat-projects')
    if (data.success) {
      chatProjects.value = data.projects
    }
  }
  catch { toast.error('Failed to load chat projects') }
  finally { sidebarLoading.value = false }
}

onMounted(fetchChatProjects)

// ─── Sidebar list ───────────────────────────────────────────
interface SidebarProject {
  projectId: string
  address: string
  status: string
  lastEmail: string
  lastMessage: string
  lastTime: Date
}

const sidebarList = computed<SidebarProject[]>(() => {
  return chatProjects.value
    .filter((p: any) => p['Project ID'])
    .map((p: any) => {
      const ts = p.TimeStamp?.value || p.TimeStamp
      const proj = projectMap.value[p['Project ID']]
      return {
        projectId: p['Project ID'],
        address: resolveProjectAddress(p['Project ID']),
        status: proj?.['Project Status'] || '',
        lastEmail: p.Email || '',
        lastMessage: p.Chat || '',
        lastTime: ts ? new Date(ts) : new Date(0),
      }
    })
    .sort((a, b) => b.lastTime.getTime() - a.lastTime.getTime())
})

const filteredProjects = computed(() => {
  if (!searchQuery.value.trim()) return sidebarList.value
  const q = searchQuery.value.toLowerCase()
  return sidebarList.value.filter(p =>
    p.address.toLowerCase().includes(q)
    || p.projectId.toLowerCase().includes(q)
    || p.lastMessage.toLowerCase().includes(q)
    || resolveName(p.lastEmail).toLowerCase().includes(q),
  )
})

// ─── Select project & load chats ────────────────────────────
async function selectProject(pid: string) {
  activeProjectId.value = pid
  chatLoading.value = true
  projectMessages.value = []
  try {
    const data = await $fetch<{ success: boolean, messages: any[] }>('/api/bigquery/project-chats', {
      params: { projectId: pid },
    })
    if (data.success) {
      projectMessages.value = data.messages.map((m: any) => {
        const ts = m.TimeStamp?.value || m['USA TimeStamp']?.value || m.TimeStamp
        return { ...m, _date: ts ? new Date(ts) : new Date(0) }
      }).sort((a, b) => a._date.getTime() - b._date.getTime())
    }
  }
  catch { toast.error('Failed to load chat messages') }
  finally {
    chatLoading.value = false
    nextTick(() => scrollToBottom())
  }
}

// Auto-select first project
watch(sidebarList, (list) => {
  if (list.length > 0 && !activeProjectId.value) {
    selectProject(list[0]!.projectId)
  }
}, { immediate: true })

// ─── People filter ──────────────────────────────────────────
const personFilter = ref('')

const chatPeople = computed(() => {
  const emailSet = new Set<string>()
  for (const msg of projectMessages.value) {
    // Collect from Email (sender)
    if (msg.Email) emailSet.add(msg.Email.trim().toLowerCase())
    // Collect from tag
    if (msg.tag) {
      for (const e of msg.tag.split(',')) {
        const t = e.trim().toLowerCase()
        if (t) emailSet.add(t)
      }
    }
    // Collect from Users
    if (msg.Users) {
      for (const e of msg.Users.split(',')) {
        const t = e.trim().toLowerCase()
        if (t) emailSet.add(t)
      }
    }
  }
  return Array.from(emailSet).sort((a, b) => resolveName(a).localeCompare(resolveName(b)))
})

// Reset person filter when switching projects
watch(activeProjectId, () => { personFilter.value = '' })

// ─── Visible messages (reverse infinite scroll) ─────────────
const BATCH_SIZE = 50
const visibleFromEnd = ref(BATCH_SIZE)

const filteredMessages = computed(() => {
  if (!personFilter.value) return projectMessages.value
  const p = personFilter.value.toLowerCase()
  return projectMessages.value.filter(m => {
    // Check sender (who sent this message)
    if ((m.Email || '').toLowerCase() === p) return true
    // Check tag (who was tagged/mentioned in this message)
    if (m.tag) {
      const tagEmails = m.tag.split(',').map((e: string) => e.trim().toLowerCase())
      if (tagEmails.includes(p)) return true
    }
    return false
  })
})

const visibleMessages = computed(() => {
  const total = filteredMessages.value.length
  const start = Math.max(0, total - visibleFromEnd.value)
  return filteredMessages.value.slice(start)
})

const hasOlderMessages = computed(() => visibleFromEnd.value < filteredMessages.value.length)

function loadOlder() {
  if (hasOlderMessages.value) {
    // Remember scroll position to prevent jump
    const el = chatAreaRef.value
    const prevHeight = el?.scrollHeight || 0
    visibleFromEnd.value += BATCH_SIZE
    nextTick(() => {
      if (el) {
        const newHeight = el.scrollHeight
        el.scrollTop = newHeight - prevHeight
      }
    })
  }
}

// Reset visible count when switching projects or filter
watch(activeProjectId, () => { visibleFromEnd.value = BATCH_SIZE })
watch(personFilter, () => { visibleFromEnd.value = BATCH_SIZE })

// Sentinel observer for scroll-up loading
const sentinelRef = ref<HTMLElement | null>(null)
let _observer: IntersectionObserver | null = null

onMounted(() => {
  _observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting && hasOlderMessages.value && !chatLoading.value) {
      loadOlder()
    }
  }, { rootMargin: '100px' })
})

onUnmounted(() => { _observer?.disconnect() })

watch(sentinelRef, (el) => {
  _observer?.disconnect()
  if (el) _observer?.observe(el)
})

// ─── Helpers ────────────────────────────────────────────────
function scrollToBottom() {
  if (chatAreaRef.value) {
    chatAreaRef.value.scrollTop = chatAreaRef.value.scrollHeight
  }
}

function isCurrentUser(email: string): boolean {
  if (!email || !currentEmail.value) return false
  return email.toLowerCase() === currentEmail.value
}

function getInitials(name: string) {
  return name.split(/[\s@]/).filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const avatarColors = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-pink-500',
  'bg-cyan-500', 'bg-orange-500', 'bg-lime-500', 'bg-fuchsia-500',
]

function getAvatarColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m`
  if (diffHr < 24) return `${diffHr}h`
  if (diffDay < 7) return `${diffDay}d`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateLabel(date: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
}

function shouldShowDateSeparator(messages: any[], idx: number): boolean {
  if (idx === 0) return true
  const prev = messages[idx - 1]._date
  const curr = messages[idx]._date
  return prev.toDateString() !== curr.toDateString()
}

const activeAddress = computed(() => {
  if (!activeProjectId.value) return ''
  return resolveProjectAddress(activeProjectId.value)
})

// ─── Status icon mapping ──────────────────────────────────────
function statusIcon(status: string): { icon: string, bg: string, text: string } {
  const s = (status || '').toUpperCase()
  if (s.includes('ATTENTION')) return { icon: 'i-lucide-alert-triangle', bg: 'bg-red-500/15', text: 'text-red-500' }
  if (s.includes('PLAN CORRECTION')) return { icon: 'i-lucide-pencil-ruler', bg: 'bg-orange-500/15', text: 'text-orange-500' }
  if (s.includes('MPU INSTALL')) return { icon: 'i-lucide-plug-zap', bg: 'bg-amber-500/15', text: 'text-amber-500' }
  if (s.includes('BATT INSTALL')) return { icon: 'i-lucide-battery-charging', bg: 'bg-yellow-500/15', text: 'text-yellow-600' }
  if (s.includes('COMPLETION') && s.includes('CORRECTION')) return { icon: 'i-lucide-wrench', bg: 'bg-orange-500/15', text: 'text-orange-500' }
  if (s.includes('PENDING FINAL RESULT')) return { icon: 'i-lucide-clipboard-check', bg: 'bg-sky-500/15', text: 'text-sky-500' }
  if (s.includes('PENDING FINAL') || s === 'PENDING FINAL') return { icon: 'i-lucide-flag', bg: 'bg-blue-500/15', text: 'text-blue-500' }
  if (s.includes('PTO SUBMISSION')) return { icon: 'i-lucide-send', bg: 'bg-indigo-500/15', text: 'text-indigo-500' }
  if (s.includes('PENDING PTO')) return { icon: 'i-lucide-clock', bg: 'bg-violet-500/15', text: 'text-violet-500' }
  if (s.includes('START UP')) return { icon: 'i-lucide-rocket', bg: 'bg-emerald-500/15', text: 'text-emerald-500' }
  if (s.includes('STUCCO') || s.includes('WALL REPAIR')) return { icon: 'i-lucide-hard-hat', bg: 'bg-amber-600/15', text: 'text-amber-600' }
  if (s.includes('ON HOLD')) return { icon: 'i-lucide-pause-circle', bg: 'bg-zinc-500/15', text: 'text-zinc-500' }
  if (s.includes('TROUBLESHOOT')) return { icon: 'i-lucide-search-code', bg: 'bg-rose-500/15', text: 'text-rose-500' }
  if (s.includes('COMPLETED') && s.includes('MONITOR')) return { icon: 'i-lucide-monitor-check', bg: 'bg-teal-500/15', text: 'text-teal-500' }
  if (s.includes('COMPLETED') || s === 'COMPLETED') return { icon: 'i-lucide-check-circle-2', bg: 'bg-emerald-500/15', text: 'text-emerald-500' }
  if (s.includes('SITE INSPECTION')) return { icon: 'i-lucide-scan-search', bg: 'bg-cyan-500/15', text: 'text-cyan-500' }
  if (s.includes('NO APPROVAL')) return { icon: 'i-lucide-shield-x', bg: 'bg-red-600/15', text: 'text-red-600' }
  if (s.includes('NEW JOB')) return { icon: 'i-lucide-sparkles', bg: 'bg-fuchsia-500/15', text: 'text-fuchsia-500' }
  if (s.includes('PENDING LAYOUT')) return { icon: 'i-lucide-layout-grid', bg: 'bg-purple-500/15', text: 'text-purple-500' }
  if (s.includes('PENDING PLANS') || s.includes('PENDING PLAN')) return { icon: 'i-lucide-file-text', bg: 'bg-blue-500/15', text: 'text-blue-500' }
  if (s.includes('PERMIT') || s.includes('PLANCHECK')) return { icon: 'i-lucide-stamp', bg: 'bg-lime-600/15', text: 'text-lime-600' }
  if (s.includes('METERSPOT')) return { icon: 'i-lucide-gauge', bg: 'bg-pink-500/15', text: 'text-pink-500' }
  if (s.includes('FIRE APPROVAL')) return { icon: 'i-lucide-flame', bg: 'bg-red-500/15', text: 'text-red-500' }
  if (s.includes('PENDING')) return { icon: 'i-lucide-hourglass', bg: 'bg-amber-500/15', text: 'text-amber-500' }
  return { icon: 'i-lucide-folder', bg: 'bg-zinc-500/15', text: 'text-zinc-400' }
}
// ─── Compose ─────────────────────────────────────────────
const composeMessage = ref('')
const sending = ref(false)

async function sendMessage() {
  if (!composeMessage.value.trim() || !activeProjectId.value || sending.value) return
  sending.value = true
  try {
    await $fetch('/api/bigquery/send-chat', {
      method: 'POST',
      body: {
        projectId: activeProjectId.value,
        email: authUser.value?.email || '',
        message: composeMessage.value.trim(),
        chatId: activeProjectId.value,
        users: chatPeople.value.join(','),
      },
    })
    // Add message optimistically
    const now = new Date()
    projectMessages.value.push({
      MessageID: `temp-${Date.now()}`,
      ChatID: activeProjectId.value,
      'Project ID': activeProjectId.value,
      Email: authUser.value?.email || '',
      Chat: composeMessage.value.trim(),
      TimeStamp: { value: now.toISOString() },
      _date: now,
      _source: 'active',
    })
    composeMessage.value = ''
    nextTick(() => scrollToBottom())
  }
  catch {
    toast.error('Failed to send message')
  }
  finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="flex h-[calc(100dvh-54px-3rem)] overflow-hidden rounded-xl border border-border/50 bg-background">

    <!-- ═══════════ LEFT SIDEBAR — Project List ═══════════ -->
    <div class="w-[300px] shrink-0 border-r border-border/50 flex flex-col bg-card/40">
      <!-- Search -->
      <div class="p-3 border-b border-border/30">
        <div class="relative">
          <Icon name="lucide:search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
          <Input
            v-model="searchQuery"
            placeholder="Search projects…"
            class="pl-8 h-9 bg-muted/40 border-border/40 focus:bg-background transition-colors"
          />
        </div>
      </div>

      <!-- Loading -->
      <div v-if="sidebarLoading" class="flex-1 flex items-center justify-center">
        <div class="flex flex-col items-center gap-2">
          <Icon name="i-lucide-loader-2" class="size-6 animate-spin text-primary" />
          <p class="text-xs text-muted-foreground">Loading projects…</p>
        </div>
      </div>

      <!-- Project List -->
      <div v-else class="flex-1 overflow-y-auto chat-scrollbar">
        <div
          v-for="proj in filteredProjects"
          :key="proj.projectId"
          class="flex items-center gap-3 px-3 py-3 cursor-pointer transition-all duration-200 border-b border-border/20"
          :class="activeProjectId === proj.projectId
            ? 'bg-primary/8 border-l-2 border-l-primary'
            : 'hover:bg-muted/40 border-l-2 border-l-transparent'"
          @click="selectProject(proj.projectId)"
        >
          <div class="shrink-0">
            <TooltipProvider :delay-duration="200">
              <Tooltip>
                <TooltipTrigger as-child>
                  <div
                    class="size-10 rounded-lg flex items-center justify-center transition-transform hover:scale-110 cursor-default"
                    :class="statusIcon(proj.status).bg"
                  >
                    <Icon :name="statusIcon(proj.status).icon" class="size-5" :class="statusIcon(proj.status).text" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" :side-offset="8">
                  <p class="text-xs font-medium">{{ proj.status || 'Unknown' }}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold truncate max-w-[160px]">
                {{ proj.address }}
              </span>
              <span class="text-[10px] text-muted-foreground shrink-0 ml-2">{{ formatRelativeTime(proj.lastTime) }}</span>
            </div>
            <p class="text-xs truncate text-muted-foreground mt-0.5">
              <span class="font-medium">{{ resolveName(proj.lastEmail) }}:</span>
              {{ proj.lastMessage }}
            </p>
          </div>
        </div>

        <!-- Empty -->
        <div v-if="filteredProjects.length === 0" class="flex flex-col items-center justify-center py-16 text-center px-6">
          <Icon name="i-lucide-message-circle" class="size-10 text-muted-foreground/30 mb-3" />
          <p class="text-sm text-muted-foreground">No project chats found</p>
          <p class="text-xs text-muted-foreground/60 mt-1">Try a different search</p>
        </div>
      </div>

      <!-- Count -->
      <div class="px-3 py-2 border-t border-border/30 bg-muted/20">
        <span class="text-[10px] text-muted-foreground">{{ sidebarList.length }} projects with chats</span>
      </div>
    </div>

    <!-- ═══════════ CHAT AREA ═══════════ -->
    <div class="flex-1 flex flex-col min-w-0">
      <template v-if="activeProjectId">
        <!-- Chat Header -->
        <div class="flex items-center justify-between gap-3 px-5 py-3 border-b border-border/50 bg-card/30 backdrop-blur-sm">
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="size-9 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
              :class="getAvatarColor(activeProjectId)"
            >
              {{ getInitials(activeAddress) }}
            </div>
            <div class="min-w-0">
              <h3 class="text-sm font-semibold leading-tight truncate">{{ activeAddress }}</h3>
              <p class="text-[11px] text-muted-foreground truncate">
                {{ projectMessages.length }} messages ·
                <NuxtLink :to="`/projects/${activeProjectId}`" class="text-primary hover:underline font-mono">
                  {{ activeProjectId }}
                </NuxtLink>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <!-- People filter -->
            <select
              v-if="chatPeople.length > 0"
              v-model="personFilter"
              class="h-8 px-2 pr-7 rounded-md border border-border/40 bg-muted/40 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/30 transition-all appearance-none cursor-pointer max-w-[180px] truncate"
              style="background-image: url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%239ca3af%27 stroke-width=%272%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 6px center;"
            >
              <option value="">All People</option>
              <option v-for="email in chatPeople" :key="email" :value="email">
                {{ resolveName(email) }}
              </option>
            </select>
            <Button variant="ghost" size="icon" class="size-8 text-muted-foreground hover:text-foreground" @click="selectProject(activeProjectId)">
              <Icon name="lucide:refresh-cw" class="size-4" :class="{ 'animate-spin': chatLoading }" />
            </Button>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="chatLoading" class="flex-1 flex items-center justify-center">
          <div class="flex flex-col items-center gap-2">
            <Icon name="i-lucide-loader-2" class="size-6 animate-spin text-primary" />
            <p class="text-xs text-muted-foreground">Loading messages…</p>
          </div>
        </div>

        <!-- Messages Area -->
        <div v-else ref="chatAreaRef" class="flex-1 overflow-y-auto px-5 py-4 space-y-1 chat-scrollbar bg-gradient-to-b from-background to-muted/10">
          <!-- Load older sentinel (at top) -->
          <div v-if="hasOlderMessages" ref="sentinelRef" class="flex items-center justify-center py-3">
            <button class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/30 text-xs text-muted-foreground hover:bg-muted transition-colors" @click="loadOlder">
              <Icon name="i-lucide-arrow-up" class="size-3" />
              Load older messages
            </button>
          </div>

          <template v-for="(msg, idx) in visibleMessages" :key="msg.MessageID || idx">
            <!-- Date separator -->
            <div v-if="shouldShowDateSeparator(visibleMessages, idx)" class="flex items-center justify-center py-3">
              <span class="px-3 py-1 text-[10px] font-semibold text-muted-foreground bg-muted/60 rounded-full border border-border/30 uppercase tracking-wider">
                {{ formatDateLabel(msg._date) }}
              </span>
            </div>

            <!-- Message bubble — RIGHT if current user, LEFT if others -->
            <div
              class="flex items-end gap-2 message-appear"
              :class="isCurrentUser(msg.Email) ? 'justify-end' : 'justify-start'"
              :style="{ animationDelay: `${Math.min(idx, 20) * 15}ms` }"
            >
              <!-- Avatar (left side only, for other users) -->
              <template v-if="!isCurrentUser(msg.Email)">
                <div
                  v-if="idx === 0 || visibleMessages[idx - 1]?.Email !== msg.Email || isCurrentUser(visibleMessages[idx - 1]?.Email)"
                  class="shrink-0 mb-1"
                >
                  <Avatar class="size-7">
                    <AvatarFallback
                      :class="getAvatarColor(msg.Email || '')"
                      class="text-[8px] font-bold text-white"
                    >
                      {{ getInitials(resolveName(msg.Email)) }}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div v-else class="w-7 shrink-0" />
              </template>

              <!-- Bubble -->
              <div class="relative max-w-[70%] group">
                <!-- Sender label -->
                <div
                  v-if="!isCurrentUser(msg.Email) && (idx === 0 || visibleMessages[idx - 1]?.Email !== msg.Email || isCurrentUser(visibleMessages[idx - 1]?.Email))"
                  class="pl-1 pb-0.5"
                >
                  <span class="text-[11px] font-semibold text-foreground">{{ resolveName(msg.Email) }}</span>
                </div>

                <div
                  class="rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm"
                  :class="isCurrentUser(msg.Email)
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted/70 border border-border/30 text-foreground rounded-bl-md'"
                >
                  <!-- Attachment -->
                  <div v-if="msg.Attachment" class="flex items-center gap-2 mb-1.5">
                    <div class="flex items-center justify-center size-8 rounded-lg shrink-0" :class="isCurrentUser(msg.Email) ? 'bg-primary-foreground/20' : 'bg-primary/10'">
                      <Icon name="lucide:paperclip" class="size-3.5" :class="isCurrentUser(msg.Email) ? 'text-primary-foreground' : 'text-primary'" />
                    </div>
                    <a
                      v-if="msg.Attachment.startsWith('http')"
                      :href="msg.Attachment"
                      target="_blank"
                      class="text-xs underline truncate max-w-[200px]"
                      :class="isCurrentUser(msg.Email) ? 'text-primary-foreground/80' : 'text-primary'"
                    >
                      Attachment
                    </a>
                    <span v-else class="text-xs truncate" :class="isCurrentUser(msg.Email) ? 'text-primary-foreground/70' : 'text-muted-foreground'">{{ msg.Attachment }}</span>
                  </div>

                  <!-- Chat text -->
                  <template v-if="msg.Chat">{{ msg.Chat }}</template>

                  <!-- Time -->
                  <div class="flex items-center gap-1 mt-1 -mb-0.5" :class="isCurrentUser(msg.Email) ? 'justify-end text-primary-foreground/50' : 'justify-end text-muted-foreground/50'">
                    <span class="text-[9px]">{{ formatTime(msg._date) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Empty -->
          <div v-if="projectMessages.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
            <Icon name="i-lucide-message-circle" class="size-10 text-muted-foreground/20 mb-3" />
            <p class="text-sm text-muted-foreground">No messages</p>
          </div>
        </div>

        <!-- Compose bar -->
        <div class="px-4 py-3 border-t border-border/50 bg-card/30">
          <div class="flex items-end gap-2">
            <div class="flex-1 relative">
              <textarea
                v-model="composeMessage"
                placeholder="Type a message…"
                rows="1"
                class="w-full resize-none rounded-xl border border-border/40 bg-muted/30 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all placeholder:text-muted-foreground/50"
                style="max-height: 120px; min-height: 40px;"
                @keydown.enter.exact.prevent="sendMessage"
                @input="(e: Event) => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px' }"
              />
            </div>
            <Button
              size="icon"
              class="size-10 rounded-xl shrink-0"
              :disabled="!composeMessage.trim() || sending"
              @click="sendMessage"
            >
              <Icon v-if="sending" name="i-lucide-loader-2" class="size-4 animate-spin" />
              <Icon v-else name="i-lucide-send" class="size-4" />
            </Button>
          </div>
        </div>
      </template>

      <!-- No project selected -->
      <div v-else class="flex-1 flex items-center justify-center">
        <div class="flex flex-col items-center gap-3 text-center">
          <div class="size-16 rounded-2xl bg-primary/5 flex items-center justify-center">
            <Icon name="i-lucide-message-circle" class="size-8 text-primary/40" />
          </div>
          <p class="text-sm font-medium text-muted-foreground">Select a project</p>
          <p class="text-xs text-muted-foreground/60">Choose a project from the sidebar to view its chat</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.chat-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.chat-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.15);
  border-radius: 999px;
}
.chat-scrollbar::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.3);
}

.message-appear {
  animation: msg-slide-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes msg-slide-in {
  0% {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
