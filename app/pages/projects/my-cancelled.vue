<script setup lang="ts">
import { toast } from 'vue-sonner'

// ─── Use global prefetched store ────────────────────────────
const {
  projects,
  userNameMap,
  customerNameMap,
  init,
  refresh,
} = useDashboardStore()
init()

// ─── Project Logs ───────────────────────────────────────────
const showLogsModal = ref(false)
const logsProjectId = ref('')
const logCounts = ref<Record<string, number>>({})
const loadedLogCounts = ref(false)

function openLogs(projectId: string) {
  logsProjectId.value = projectId
  showLogsModal.value = true
}

async function fetchLogCounts() {
  if (loadedLogCounts.value) return
  try {
    const data = await $fetch<{ success: boolean, counts: Record<string, number> }>('/api/bigquery/project-log-counts')
    if (data.success) logCounts.value = data.counts
    loadedLogCounts.value = true
  }
  catch { /* silent */ }
}

watch(() => projects.value.length, (len) => {
  if (len > 0 && !loadedLogCounts.value) fetchLogCounts()
}, { immediate: true })

const { setHeader } = usePageHeader()
setHeader({ title: 'Cancelled Projects', icon: 'i-lucide-folder-x' })

// ─── State ──────────────────────────────────────────────────
const search = ref('')
const CHUNK_SIZE = 30
const visibleCount = ref(CHUNK_SIZE)

const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

// Drive files modal
const showFilesModal = ref(false)
const filesModalProject = ref<any>(null)

function openFilesModal(project: any) {
  filesModalProject.value = project
  nextTick(() => {
    showFilesModal.value = true
  })
}

// ─── CRUD state ─────────────────────────────────────────────
const showProjectForm = ref(false)
const editingProject = ref<any>(null)
const showDeleteConfirm = ref(false)
const deletingProject = ref<any>(null)
const deleteLoading = ref(false)

function openCreateForm() {
  editingProject.value = null
  showProjectForm.value = true
}

function openEditForm(project: any) {
  editingProject.value = project
  showProjectForm.value = true
}

function openDeleteConfirm(project: any) {
  deletingProject.value = project
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!deletingProject.value) return
  deleteLoading.value = true
  try {
    await $fetch('/api/bigquery/projects', {
      method: 'DELETE',
      body: { projectId: deletingProject.value['Project ID'] },
    })
    toast.success('Project deleted')
    showDeleteConfirm.value = false
    refresh()
  }
  catch (e: any) {
    toast.error(e.data?.statusMessage || 'Failed to delete')
  }
  finally {
    deleteLoading.value = false
  }
}

function onProjectSaved() {
  refresh()
}

// ─── Sorting ────────────────────────────────────────────────
const sortBy = ref('TimeStamp')
const sortDir = ref<'asc' | 'desc'>('desc')

function toggleSort(col: string) {
  if (sortBy.value === col) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  }
  else {
    sortBy.value = col
    sortDir.value = 'asc'
  }
}

function sortIcon(col: string) {
  if (sortBy.value !== col) return 'i-lucide-chevrons-up-down'
  return sortDir.value === 'asc' ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
}

// ─── Column definitions ─────────────────────────────────────
const columns = [
  { key: 'Project ID', label: 'Project ID', width: '110px' },
  { key: 'Customer name', label: 'Customer', width: '160px' },
  { key: 'Customer Address', label: 'Address', width: '350px' },
  { key: 'Branch Name', label: 'Branch', width: '80px' },
  { key: 'Project Type', label: 'Type', width: '80px' },
  { key: 'Job Status', label: 'Job Status', width: '100px' },
  { key: 'Project Status', label: 'Project Status', width: '120px' },
  { key: 'Project Manager', label: 'PM', width: '140px' },
  { key: 'Project Manager VA', label: 'PM VA', width: '140px' },
  { key: 'Finance Manager', label: 'Finance Mgr', width: '140px' },
  { key: 'Engineer', label: 'Engineer', width: '130px' },
  { key: 'Permit Coordinator', label: 'Permit Coord.', width: '140px' },
  { key: 'Vendor Name', label: 'Vendor', width: '120px' },
  { key: 'Project Equipment', label: 'Equipment', width: '150px' },
  { key: 'Panels Amount', label: 'Panels', width: '70px' },
  { key: 'KW', label: 'KW', width: '60px' },
  { key: 'Watt', label: 'Watt', width: '60px' },
  { key: 'Utillity', label: 'Utility', width: '100px' },
  { key: 'Solar Equipment', label: 'Solar Equip.', width: '120px' },
  { key: 'Inverter Type', label: 'Inverter', width: '100px' },
  { key: 'Batteries Qty', label: 'Batteries', width: '80px' },
  { key: 'SSA Status', label: 'SSA Status', width: '90px' },
  { key: 'Solar Install Status', label: 'Solar Install', width: '100px' },
  { key: 'MPU Installed Status', label: 'MPU Status', width: '100px' },
  { key: 'Battery Installed Status', label: 'Battery Status', width: '100px' },
  { key: 'Completion Status', label: 'Completion', width: '100px' },
  { key: 'Final Status', label: 'Final', width: '90px' },
  { key: 'PTO Status', label: 'PTO Status', width: '90px' },
  { key: 'Fire Approval Needed', label: 'Fire Approval', width: '100px' },
  { key: 'Project Price', label: 'Price', width: '100px' },
  { key: 'Contract Price', label: 'Contract $', width: '100px' },
  { key: 'Project Net Amount', label: 'Net Amount', width: '100px' },
  { key: 'Project Start', label: 'Start Date', width: '100px' },
  { key: 'Project End', label: 'End Date', width: '100px' },
  { key: 'Completion Date', label: 'Completion', width: '100px' },
  { key: 'Final Date', label: 'Final Date', width: '100px' },
  { key: 'PM Approve Project', label: 'PM Approved', width: '100px' },
  { key: 'Finance Ready', label: 'Finance Ready', width: '100px' },
  { key: 'PTO Request', label: 'PTO Request', width: '100px' },
  { key: 'PTO Submitted', label: 'PTO Submitted', width: '100px' },
  { key: 'PTO Received', label: 'PTO Received', width: '100px' },
  { key: 'AHJ', label: 'AHJ', width: '100px' },
  { key: 'Jurisdiction', label: 'Jurisdiction', width: '120px' },

  { key: 'Create By', label: 'Created By', width: '130px' },
  { key: 'TimeStamp', label: 'Created', width: '110px' },
]

// Base-filtered projects (before tab & search)
const baseProjects = computed(() => {
  return projects.value.filter((p: any) => {
    const jobStatus = String(p['Job Status'] || '').toLowerCase()
    if (jobStatus !== 'cancelled') return false
    if (p['TempDeleted'] === true || p['TempDeleted'] === 'true') return false
    return true
  })
})

// ─── Project Status Tabs ────────────────────────────────────
const activeTab = ref('All')

function getProjectStatuses(p: any): string[] {
  const raw = String(p['Project Status'] || '').trim()
  if (!raw) return ['Unknown']
  return raw.split(',').map((s: string) => s.trim()).filter(Boolean)
}

const projectStatusTabs = computed(() => {
  const counts: Record<string, number> = {}
  for (const p of baseProjects.value) {
    for (const s of getProjectStatuses(p)) {
      counts[s] = (counts[s] || 0) + 1
    }
  }
  const sorted = Object.entries(counts).sort(([a], [b]) => {
    if (a === 'Unknown') return 1
    if (b === 'Unknown') return -1
    return a.localeCompare(b)
  })
  return [
    { label: 'All', count: baseProjects.value.length },
    ...sorted.map(([label, count]) => ({ label, count })),
  ]
})

watch(activeTab, () => { visibleCount.value = CHUNK_SIZE })

// ─── Computed ───────────────────────────────────────────────
const filteredProjects = computed(() => {
  let list = baseProjects.value

  // Tab filter
  if (activeTab.value !== 'All') {
    list = list.filter((p: any) => getProjectStatuses(p).includes(activeTab.value))
  }

  // Search filter
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter((p: any) => {
      const searchable = [
        p['Project ID'], p['Customer name'], p['Customer Address'],
        p['City'], p['Project Type'], p['Job Status'], p['Project Status'],
        p['Project Manager'], p['Engineer'], p['Vendor Name'],
      ].filter(Boolean)
      return searchable.some(v => String(v).toLowerCase().includes(q))
    })
  }
  return list
})

const sortedProjects = computed(() => {
  const arr = [...filteredProjects.value]
  const col = sortBy.value
  return arr.sort((a, b) => {
    let av = a[col] ?? ''
    let bv = b[col] ?? ''
    if (av && typeof av === 'object' && av.value) av = av.value
    if (bv && typeof bv === 'object' && bv.value) bv = bv.value
    av = String(av).toLowerCase()
    bv = String(bv).toLowerCase()
    const cmp = av.localeCompare(bv)
    return sortDir.value === 'asc' ? cmp : -cmp
  })
})

const visibleProjects = computed(() => sortedProjects.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < sortedProjects.value.length)

watch(search, () => { visibleCount.value = CHUNK_SIZE })

// Infinite scroll
const sentinelRef = ref<HTMLElement | null>(null)
onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && hasMore.value) {
        visibleCount.value += CHUNK_SIZE
      }
    },
    { threshold: 0.1 },
  )
  watch(sentinelRef, (el) => {
    if (el) observer.observe(el)
  }, { immediate: true })
  onUnmounted(() => observer.disconnect())
})

// ─── Helpers ────────────────────────────────────────────────
function formatDate(value: any): string {
  if (!value) return '—'
  try {
    const v = value?.value || value
    const d = new Date(v)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }
  catch { return String(value) }
}

function formatCurrency(value: any): string {
  if (!value && value !== 0) return '—'
  const n = Number(value)
  if (isNaN(n)) return String(value)
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)
}

function cellValue(row: any, key: string): string {
  const val = row[key]
  if (val === null || val === undefined || val === '') return '—'
  if (typeof val === 'object' && val.value) return formatDate(val)
  return String(val)
}

function statusColor(status: string) {
  const s = (status || '').toLowerCase()
  if (s.includes('complete') || s.includes('closed') || s.includes('rcvd')) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
  if (s.includes('pending') || s.includes('new') || s.includes('tbd')) return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
  if (s.includes('cancel') || s.includes('n/a')) return 'bg-red-500/10 text-red-500 border-red-500/20'
  if (s.includes('open') || s.includes('active') || s.includes('in progress')) return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
  return 'bg-muted text-muted-foreground'
}

function resolveName(email: string): string {
  if (!email) return '—'
  return userNameMap.value[email.toLowerCase()] || email
}

function resolveCustomer(project: any): string {
  const id = project['Customer ID']
  if (!id) return '—'
  return customerNameMap.value[id] || id
}

const emailColumns = [
  'Project Manager', 'Project Manager VA', 'Finance Manager',
  'Finance Manager VA', 'Engineer', 'Permit Coordinator', 'Create By',
]
const statusColumns = [
  'Job Status', 'Project Status', 'SSA Status', 'Solar Install Status',
  'MPU Installed Status', 'Battery Installed Status', 'Completion Status',
  'Final Status', 'PTO Status', 'Fire Approval Needed',
]
const dateColumns = [
  'Project Start', 'Project End', 'Completion Date', 'Final Date',
  'PM Approve Project', 'Finance Ready', 'PTO Request', 'PTO Submitted',
  'PTO Received', 'TimeStamp',
]
const currencyColumns = ['Project Price', 'Contract Price', 'Project Net Amount']

// ─── Highlight project on return from detail page ──────────
const highlightId = ref('')
const router = useRouter()

function scrollAndHighlight(id: string) {
  highlightId.value = id
  const idx = sortedProjects.value.findIndex((p: any) => p['Project ID'] === id)
  if (idx >= 0 && idx >= visibleCount.value) {
    visibleCount.value = idx + CHUNK_SIZE
  }
  if (!document.getElementById('row-highlight-style')) {
    const style = document.createElement('style')
    style.id = 'row-highlight-style'
    style.textContent = `
      @keyframes rowHighlightPulse {
        0%   { background-color: hsla(160,84%,39%,0.06); }
        50%  { background-color: hsla(160,84%,39%,0.20); }
        100% { background-color: hsla(160,84%,39%,0.06); }
      }
    `
    document.head.appendChild(style)
  }
  nextTick(() => {
    requestAnimationFrame(() => {
      let retries = 0
      const tryScroll = () => {
        const el = document.getElementById(`project-row-${id}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.style.cssText = [
            'animation: rowHighlightPulse 0.8s ease-in-out 4 !important',
            'background-color: hsla(160,84%,39%,0.12) !important',
            'box-shadow: inset 3px 0 0 hsl(160,84%,39%), inset 0 0 0 1px hsla(160,84%,39%,0.3) !important',
            'transition: none !important',
          ].join(';')
          setTimeout(() => {
            el.style.cssText = ''
            highlightId.value = ''
          }, 3200)
        }
        else if (retries < 20) {
          retries++
          setTimeout(tryScroll, 100)
        }
      }
      tryScroll()
    })
  })
}

const stopRouterAfter = router.afterEach(() => {
  const id = sessionStorage.getItem('highlight-project')
  if (id) {
    sessionStorage.removeItem('highlight-project')
    if (sortedProjects.value.length > 0) {
      scrollAndHighlight(id)
    }
    else {
      const stop = watch(sortedProjects, (list) => {
        if (list.length > 0) {
          stop()
          scrollAndHighlight(id)
        }
      })
    }
  }
})

onMounted(() => {
  const id = sessionStorage.getItem('highlight-project')
  if (id) {
    sessionStorage.removeItem('highlight-project')
    if (sortedProjects.value.length > 0) {
      scrollAndHighlight(id)
    }
    else {
      const stop = watch(sortedProjects, (list) => {
        if (list.length > 0) {
          stop()
          scrollAndHighlight(id)
        }
      })
    }
  }
})

onUnmounted(() => stopRouterAfter())
</script>

<template>
  <ProjectsLayout>
    <div class="w-full flex-1 flex flex-col min-h-0">
      <!-- Teleport search + actions to header -->
      <Teleport v-if="isMounted" to="#header-toolbar">
        <div class="flex items-center gap-2 w-full justify-end">
          <div class="relative max-w-[220px]">
            <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input v-model="search" placeholder="Search projects..." class="pl-8 h-8 text-sm" />
          </div>
          <p class="text-xs text-muted-foreground tabular-nums hidden lg:block whitespace-nowrap">
            {{ filteredProjects.length }} record{{ filteredProjects.length !== 1 ? 's' : '' }}
          </p>
          <Button variant="ghost" size="sm" class="h-8" @click="refresh()">
            <Icon name="i-lucide-refresh-cw" class="size-3.5" />
          </Button>
          <Button size="sm" class="h-8" @click="openCreateForm">
            <Icon name="i-lucide-plus" class="size-3.5 mr-1" />
            Add Project
          </Button>
        </div>
      </Teleport>

      <!-- Project Status Tabs -->
      <div class="shrink-0 border-b px-4 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
        <button
          v-for="tab in projectStatusTabs"
          :key="tab.label"
          class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
          :class="activeTab === tab.label
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
          @click="activeTab = tab.label"
        >
          {{ tab.label }}
          <span
            class="ml-1 text-[10px] tabular-nums"
            :class="activeTab === tab.label ? 'opacity-80' : 'opacity-50'"
          >
            {{ tab.count }}
          </span>
        </button>
      </div>

      <!-- Data Table -->
      <div class="flex-1 min-h-0 overflow-auto">
        <Table>
          <TableHeader class="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
            <TableRow class="border-b-0">
              <TableHead
                v-for="col in columns"
                :key="col.key"
                class="bg-card cursor-pointer select-none whitespace-nowrap"
                :style="{ minWidth: col.width }"
                @click="toggleSort(col.key)"
              >
                <div class="flex items-center gap-1">
                  {{ col.label }}
                  <Icon :name="sortIcon(col.key)" class="size-3 opacity-60" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            <TableRow
              v-for="(project, idx) in visibleProjects"
              :id="`project-row-${project['Project ID']}`"
              :key="project['Project ID'] || idx"
              class="group cursor-pointer transition-all duration-200"
              :class="highlightId === project['Project ID'] ? '' : 'hover:bg-muted/50'"
              @click="navigateTo(`/projects/${project['Project ID']}`)"
            >
              <TableCell v-for="col in columns" :key="col.key">

                <!-- Status badges -->
                <template v-if="col.key === 'Project Status'">
                  <div v-if="project[col.key] && project[col.key] !== '—'" class="flex flex-wrap gap-1">
                    <Badge
                      v-for="(s, si) in project[col.key].split(',').map((v: string) => v.trim()).filter(Boolean)"
                      :key="si"
                      variant="outline"
                      :class="statusColor(s)"
                      class="text-[10px] whitespace-nowrap"
                    >
                      {{ s }}
                    </Badge>
                  </div>
                  <span v-else class="text-muted-foreground/40">—</span>
                </template>
                <template v-else-if="statusColumns.includes(col.key)">
                  <Badge
                    v-if="project[col.key] && project[col.key] !== '—'"
                    variant="outline"
                    :class="statusColor(project[col.key])"
                    class="text-[10px] whitespace-nowrap"
                  >
                    {{ project[col.key] }}
                  </Badge>
                  <span v-else class="text-muted-foreground/40">—</span>
                </template>

                <!-- Date fields -->
                <template v-else-if="dateColumns.includes(col.key)">
                  <span class="text-muted-foreground text-sm whitespace-nowrap">
                    {{ formatDate(project[col.key]) }}
                  </span>
                </template>

                <!-- Currency fields -->
                <template v-else-if="currencyColumns.includes(col.key)">
                  <span class="text-sm tabular-nums whitespace-nowrap">
                    {{ formatCurrency(project[col.key]) }}
                  </span>
                </template>

                <!-- Project ID with Logs & Folder icons -->
                <template v-else-if="col.key === 'Project ID'">
                  <div class="flex items-center gap-1.5">
                    <button
                      class="group/log relative flex items-center justify-center size-6 rounded-md transition-all duration-200 hover:bg-violet-500/10 hover:shadow-sm"
                      title="View change history"
                      @click.stop="openLogs(project['Project ID'])"
                    >
                      <Icon name="i-lucide-history" class="size-3.5 text-muted-foreground/50 group-hover/log:text-violet-600 dark:group-hover/log:text-violet-400 transition-colors" />
                      <span
                        v-if="project['Project ID'] && (logCounts[project['Project ID']] ?? 0) > 0"
                        class="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-violet-500 text-white text-[8px] font-bold flex items-center justify-center leading-none tabular-nums"
                      >
                        {{ (logCounts[project['Project ID']!] ?? 0) > 99 ? '99+' : logCounts[project['Project ID']!] }}
                      </span>
                    </button>
                    <button
                      v-if="project['Project Folder']"
                      class="group/folder relative flex items-center justify-center size-7 rounded-lg transition-all duration-200 hover:bg-[#1da462]/15 hover:shadow-md hover:shadow-emerald-500/10"
                      title="View files in Google Drive"
                      @click.stop="openFilesModal(project)"
                    >
                      <svg class="size-4.5 transition-all duration-200 group-hover/folder:scale-110" viewBox="0 0 24 24" fill="none">
                        <path d="M4.5 19.5l3-5.25H21l-3 5.25H4.5z" fill="#1da462" opacity=".7" />
                        <path d="M12 4.5L4.5 17.25l3 2.25L15 7.5 12 4.5z" fill="#1da462" opacity=".85" />
                        <path d="M21 15l-4.5-7.5L13.5 9l4.5 7.5L21 15z" fill="#1da462" />
                      </svg>
                    </button>
                    <span class="font-mono text-xs">{{ project['Project ID'] || '—' }}</span>
                  </div>
                </template>

                <!-- Customer name with avatar -->
                <template v-else-if="col.key === 'Customer name'">
                  <div class="flex items-center gap-2">
                    <Avatar class="size-6 border shrink-0">
                      <AvatarFallback class="text-[9px] font-medium bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-blue-700 dark:text-blue-300">
                        {{ resolveCustomer(project).substring(0, 2).toUpperCase() }}
                      </AvatarFallback>
                    </Avatar>
                    <span class="font-medium truncate max-w-[130px]">{{ resolveCustomer(project) }}</span>
                  </div>
                </template>

                <!-- Email → Name columns -->
                <template v-else-if="emailColumns.includes(col.key)">
                  <span class="text-sm whitespace-nowrap">{{ resolveName(project[col.key]) }}</span>
                </template>

                <!-- Address truncated -->
                <template v-else-if="col.key === 'Customer Address'">
                  <span class="truncate max-w-[320px] block" :title="project['Customer Address']">
                    {{ project['Customer Address'] || '—' }}
                  </span>
                </template>

                <!-- Default text -->
                <template v-else>
                  <span class="text-sm whitespace-nowrap">{{ cellValue(project, col.key) }}</span>
                </template>
              </TableCell>
            </TableRow>

            <!-- Empty State -->
            <TableRow v-if="visibleProjects.length === 0">
              <TableCell :colspan="columns.length" class="h-32 text-center">
                <div class="flex flex-col items-center gap-2 text-muted-foreground">
                  <Icon name="i-lucide-folder-x" class="size-8" />
                  <p>No cancelled projects found</p>
                </div>
              </TableCell>
            </TableRow>

            <!-- Infinite scroll sentinel -->
            <tr v-if="hasMore" ref="sentinelRef">
              <td :colspan="columns.length" class="h-10 text-center text-xs text-muted-foreground">
                Loading more…
              </td>
            </tr>
          </TableBody>
        </Table>
      </div>
    </div>

    <!-- Google Drive Files Modal -->
    <CustomerFilesModal
      v-if="filesModalProject"
      :key="filesModalProject['Project ID']"
      v-model:open="showFilesModal"
      :customer-name="resolveCustomer(filesModalProject) + ' — ' + (filesModalProject['Project ID'] || '')"
      :drive-link="filesModalProject['Project Folder'] || ''"
    />

    <!-- Project Form Dialog (Create / Edit) -->
    <ProjectFormDialog
      v-model:open="showProjectForm"
      :project="editingProject"
      @saved="onProjectSaved"
    />

    <!-- Delete Confirmation -->
    <Dialog v-model:open="showDeleteConfirm">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <div class="size-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <Icon name="i-lucide-alert-triangle" class="size-4 text-red-500" />
            </div>
            Delete Project
          </DialogTitle>
          <DialogDescription class="text-sm">
            Are you sure you want to delete project
            <span class="font-mono font-semibold">{{ deletingProject?.['Project ID'] }}</span>?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div class="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" :disabled="deleteLoading" @click="showDeleteConfirm = false">
            Cancel
          </Button>
          <Button variant="destructive" size="sm" :disabled="deleteLoading" @click="confirmDelete">
            <Icon v-if="deleteLoading" name="i-lucide-loader-2" class="mr-1 size-3.5 animate-spin" />
            <Icon v-else name="i-lucide-trash-2" class="mr-1 size-3.5" />
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Project Logs Modal -->
    <ProjectsLogsModal
      v-model:open="showLogsModal"
      :project-id="logsProjectId"
    />
  </ProjectsLayout>
</template>

<style scoped>
:deep([data-slot="table-container"]) {
  overflow: visible !important;
}
</style>
