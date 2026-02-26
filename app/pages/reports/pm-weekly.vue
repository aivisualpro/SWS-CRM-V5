<script setup lang="ts">
const { setHeader } = usePageHeader()
setHeader({ title: 'PM Weekly Report', icon: 'i-lucide-calendar-range', description: 'Project manager weekly performance report' })

// ─── Store ──────────────────────────────────────────────────
const { projects, notes, userNameMap, customerNameMap, init, refresh } = useDashboardStore()
init()

const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

// ─── Filters ────────────────────────────────────────────────
const now = new Date()
const monday = new Date(now)
monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
monday.setHours(0, 0, 0, 0)
const sunday = new Date(monday)
sunday.setDate(monday.getDate() + 6)
sunday.setHours(23, 59, 59, 999)

const filterDateFrom = ref(monday.toISOString().slice(0, 10))
const filterDateTo = ref(sunday.toISOString().slice(0, 10))
const filterProjectStatus = ref('')
const filterJobStatus = ref('')
const filterBranch = ref('')

const filtersActive = computed(() =>
  filterProjectStatus.value || filterJobStatus.value || filterBranch.value
  || filterDateFrom.value !== monday.toISOString().slice(0, 10)
  || filterDateTo.value !== sunday.toISOString().slice(0, 10),
)

function resetFilters() {
  filterDateFrom.value = monday.toISOString().slice(0, 10)
  filterDateTo.value = sunday.toISOString().slice(0, 10)
  filterProjectStatus.value = ''
  filterJobStatus.value = ''
  filterBranch.value = ''
}

// ─── Unique values for dropdowns ────────────────────────────
function uniqueSorted(key: string) {
  const vals = new Set<string>()
  for (const p of projects.value) {
    const v = p[key]
    if (v && typeof v === 'string') vals.add(v)
  }
  return Array.from(vals).sort()
}

const projectStatuses = computed(() => uniqueSorted('Project Status'))
const jobStatuses = computed(() => uniqueSorted('Job Status'))
const branches = computed(() => uniqueSorted('Branch Name'))

// ─── Parse helpers ──────────────────────────────────────────
function parseDate(val: any): Date | null {
  if (!val) return null
  try {
    const d = new Date(val?.value || val)
    return isNaN(d.getTime()) ? null : d
  }
  catch { return null }
}

function parsePrice(val: any): number {
  if (!val) return 0
  const n = Number.parseFloat(String(val).replace(/[^0-9.-]/g, ''))
  return Number.isNaN(n) ? 0 : n
}

// ─── Filtered projects ─────────────────────────────────────
const filteredProjects = computed(() => {
  let list = projects.value

  // Date filter
  if (filterDateFrom.value || filterDateTo.value) {
    const from = filterDateFrom.value ? new Date(filterDateFrom.value + 'T00:00:00') : null
    const to = filterDateTo.value ? new Date(filterDateTo.value + 'T23:59:59') : null
    list = list.filter((p: any) => {
      const d = parseDate(p.TimeStamp)
      if (!d) return false
      if (from && d < from) return false
      if (to && d > to) return false
      return true
    })
  }
  if (filterProjectStatus.value) {
    list = list.filter((p: any) => p['Project Status'] === filterProjectStatus.value)
  }
  if (filterJobStatus.value) {
    list = list.filter((p: any) => p['Job Status'] === filterJobStatus.value)
  }
  if (filterBranch.value) {
    list = list.filter((p: any) => p['Branch Name'] === filterBranch.value)
  }
  return list
})

// ─── Summary stats ──────────────────────────────────────────
const summary = computed(() => {
  const ps = filteredProjects.value
  const total = ps.length
  const totalRevenue = ps.reduce((s, p) => s + parsePrice(p['Project Price']), 0)
  const avgValue = total > 0 ? Math.round(totalRevenue / total) : 0

  const completed = ps.filter(p => {
    const s = (p['Project Status'] || '').toLowerCase()
    return s.includes('complete') || s.includes('closed') || s.includes('done')
  }).length

  const cancelled = ps.filter(p => {
    const s = (p['Project Status'] || '').toLowerCase()
    return s.includes('cancel')
  }).length

  const active = total - completed - cancelled

  // Unique PMs
  const pms = new Set<string>()
  ps.forEach(p => { if (p['Project Manager']) pms.add(p['Project Manager']) })

  // Unique branches
  const branchSet = new Set<string>()
  ps.forEach(p => { if (p['Branch Name']) branchSet.add(p['Branch Name']) })

  // Total KW
  const totalKW = ps.reduce((s, p) => s + (Number(p.KW) || 0), 0)

  // Total panels
  const totalPanels = ps.reduce((s, p) => s + (Number(p['Panels Amount']) || 0), 0)

  return { total, totalRevenue, avgValue, completed, cancelled, active, pms: pms.size, branches: branchSet.size, totalKW: Math.round(totalKW * 100) / 100, totalPanels }
})

// ─── Sorting ────────────────────────────────────────────────
const search = ref('')
const sortBy = ref('TimeStamp')
const sortDir = ref<'asc' | 'desc'>('desc')

function toggleSort(col: string) {
  if (sortBy.value === col) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortBy.value = col; sortDir.value = 'asc' }
}

function sortIcon(col: string) {
  if (sortBy.value !== col) return 'i-lucide-chevrons-up-down'
  return sortDir.value === 'asc' ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
}

// ─── Column definitions (matching PDF report) ──────────────
const columns = [
  { key: 'Customer Address', label: 'Project Address', width: '300px' },
  { key: 'Job Status', label: 'Job Status', width: '100px' },
  { key: 'Project Status', label: 'Project Status', width: '140px' },
  { key: 'SSA Status', label: 'SSA', width: '100px' },
  { key: 'Solar Install Status', label: 'Solar Install', width: '110px' },
  { key: 'Final Status', label: 'Final', width: '100px' },
  { key: 'PTO Status', label: 'PTO', width: '100px' },
  { key: 'Completion Date', label: 'Start-Up / Monitor', width: '130px' },
]

// ─── Computed table data ────────────────────────────────────
const searchedProjects = computed(() => {
  if (!search.value) return filteredProjects.value
  const q = search.value.toLowerCase()
  return filteredProjects.value.filter((p: any) => {
    return [p['Project ID'], p['Customer name'], p['Customer Address'], p['Project Manager'], p['Job Status'], p['Project Status'], p['Branch Name'], p['Engineer'], p['Vendor Name']]
      .filter(Boolean).some(v => String(v).toLowerCase().includes(q))
  })
})

const sortedProjects = computed(() => {
  const arr = [...searchedProjects.value]
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

// Infinite scroll
const CHUNK = 30
const visibleCount = ref(CHUNK)
const visibleProjects = computed(() => sortedProjects.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < sortedProjects.value.length)

watch([search, filterDateFrom, filterDateTo, filterProjectStatus, filterJobStatus, filterBranch], () => { visibleCount.value = CHUNK })

const sentinelRef = ref<HTMLElement | null>(null)
onMounted(() => {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting && hasMore.value) visibleCount.value += CHUNK
  }, { threshold: 0.1 })
  watch(sentinelRef, (el) => { if (el) observer.observe(el) }, { immediate: true })
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
  if (Number.isNaN(n)) return String(value)
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
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

const emailColumns = ['Project Manager', 'Project Manager VA', 'Finance Manager', 'Finance Manager VA', 'Engineer', 'Permit Coordinator', 'Create By']
const statusColumns = ['Job Status', 'Project Status', 'SSA Status', 'Solar Install Status', 'MPU Installed Status', 'Battery Installed Status', 'Completion Status', 'Final Status', 'PTO Status', 'Fire Approval Needed']
const dateColumns = ['Project Start', 'Project End', 'Completion Date', 'Final Date', 'PM Approve Project', 'Finance Ready', 'PTO Request', 'PTO Submitted', 'PTO Received', 'TimeStamp']
const currencyColumns = ['Project Price', 'Contract Price', 'Project Net Amount']

// Sidebar collapsed
const sidebarCollapsed = ref(false)

// ─── PDF Download ───────────────────────────────────────────
function formatDateShort(val: any): string {
  if (!val) return ''
  try {
    const v = val?.value || val
    const d = new Date(v)
    if (isNaN(d.getTime())) return ''
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
  }
  catch { return '' }
}

function downloadPDF() {
  const rows = sortedProjects.value
  const today = new Date()
  const reportDate = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}-${today.getFullYear()}`

  // Build notes lookup: ProjectId → sorted notes
  const notesMap: Record<string, { date: string, text: string }[]> = {}
  for (const n of notes.value) {
    const pid = n.ProjectId
    if (!pid) continue
    const noteText = (n.Note || '').trim()
    if (!noteText) continue
    if (!notesMap[pid]) notesMap[pid] = []
    const ts = n['Time Stamp']
    const dateStr = formatDateShort(ts) || ''
    notesMap[pid].push({ date: dateStr, text: noteText })
  }
  // Sort each project's notes by date descending
  for (const pid of Object.keys(notesMap)) {
    notesMap[pid]!.sort((a, b) => {
      if (!a.date || !b.date) return 0
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
  }

  function escapeHtml(str: string) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  function getProjectNotes(projectId: string): string {
    const entries = notesMap[projectId]
    if (!entries || entries.length === 0) return ''
    return entries.map(e => {
      const cleaned = escapeHtml(e.text).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
      return e.date ? `${e.date} - ${cleaned}` : cleaned
    }).join('\n')
  }

  const tableRows = rows.map(p => {
    const pid = p['Project ID'] || ''
    const projectNotes = getProjectNotes(pid)
    return `
    <tr>
      <td>${escapeHtml(p['Customer Address'] || p['Project Address'] || '\u2014')}</td>
      <td>${escapeHtml(p['Job Status'] || '')}</td>
      <td>${escapeHtml(p['Project Status'] || '')}</td>
      <td>${formatDateShort(p['SSA Status'] === 'Completed' ? p['Project Start'] : null) || escapeHtml(p['SSA Status'] || '')}</td>
      <td>${formatDateShort(p['Solar Install Status'] === 'Completed' ? p['Project End'] : null) || escapeHtml(p['Solar Install Status'] || '')}</td>
      <td>${formatDateShort(p['Final Date']) || escapeHtml(p['Final Status'] || '')}</td>
      <td>${formatDateShort(p['PTO Received']) || escapeHtml(p['PTO Status'] || '')}</td>
      <td>${formatDateShort(p['Completion Date']) || ''}</td>
      <td class="notes-cell">${projectNotes ? `<div class="notes-content">${escapeHtml(projectNotes).replace(/\n/g, '<br>')}</div>` : ''}</td>
    </tr>
  `}).join('')

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>PM Weekly Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; padding: 30px 40px; color: #111; font-size: 11px; }
  h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .subtitle { font-size: 12px; font-weight: 600; margin-bottom: 2px; }
  .report-date { font-size: 11px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f4f6f8; font-weight: 600; font-size: 10px; text-align: left; padding: 6px 8px; border: 1px solid #d0d5dd; white-space: nowrap; }
  td { padding: 5px 8px; border: 1px solid #d0d5dd; font-size: 10px; vertical-align: top; }
  tr:nth-child(even) { background: #fafbfc; }
  .notes-cell { max-width: 280px; }
  .notes-content { font-size: 9px; line-height: 1.4; color: #333; white-space: pre-line; }
  @media print {
    body { padding: 20px; }
    @page { size: landscape; margin: 12mm; }
  }
</style>
</head><body>
<h1>Project Weekly Report</h1>
<p class="subtitle">Report Date: ${reportDate}</p>
<p class="report-date">Period: ${filterDateFrom.value || 'All'} to ${filterDateTo.value || 'All'}${filterBranch.value ? ' \u2022 Branch: ' + filterBranch.value : ''}${filterProjectStatus.value ? ' \u2022 Status: ' + filterProjectStatus.value : ''}${filterJobStatus.value ? ' \u2022 Job: ' + filterJobStatus.value : ''} \u2022 Total: ${rows.length} projects</p>
<table>
  <thead>
    <tr>
      <th style="min-width:160px">Project Address</th>
      <th>Job Status</th>
      <th>Project Status</th>
      <th>SSA</th>
      <th>Solar Install</th>
      <th>Final</th>
      <th>PTO</th>
      <th>Start-Up / Monitor</th>
      <th style="min-width:200px">Project Notes</th>
    </tr>
  </thead>
  <tbody>${tableRows}</tbody>
</table>
</body></html>`

  const w = window.open('', '_blank')
  if (w) {
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 400)
  }
}
</script>

<template>
  <div class="w-full flex-1 min-h-0 flex">
    <!-- Teleport search to header -->
    <Teleport v-if="isMounted" to="#header-toolbar">
      <div class="flex items-center gap-2 w-full justify-end">
        <div class="relative max-w-[220px]">
          <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input v-model="search" placeholder="Search projects..." class="pl-8 h-8 text-sm" />
        </div>
        <p class="text-xs text-muted-foreground tabular-nums hidden lg:block whitespace-nowrap">
          {{ searchedProjects.length }} record{{ searchedProjects.length !== 1 ? 's' : '' }}
        </p>
        <Button variant="ghost" size="sm" class="h-8" @click="refresh()">
          <Icon name="i-lucide-refresh-cw" class="size-3.5" />
        </Button>
      </div>
    </Teleport>

    <!-- ═══ Left Panel: Filters + Summary ═══ -->
    <div
      class="shrink-0 border-r bg-card/50 flex flex-col min-h-0 transition-all duration-200"
      :class="sidebarCollapsed ? 'w-12' : 'w-[280px]'"
    >
      <!-- Header with collapse & reset -->
      <div class="flex items-center gap-2 px-3 py-2.5 border-b border-border/40">
        <template v-if="!sidebarCollapsed">
          <Icon name="i-lucide-sliders-horizontal" class="size-3.5 text-primary" />
          <span class="text-xs font-semibold">Filters & Summary</span>
        </template>
        <div class="flex items-center gap-1 ml-auto">
          <button
            v-if="filtersActive && !sidebarCollapsed"
            class="size-6 rounded-md flex items-center justify-center hover:bg-destructive/10 transition-colors"
            title="Reset all filters"
            @click="resetFilters"
          >
            <Icon name="i-lucide-rotate-ccw" class="size-3.5 text-destructive" />
          </button>
          <button
            class="size-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
            @click="sidebarCollapsed = !sidebarCollapsed"
          >
            <Icon :name="sidebarCollapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'" class="size-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <!-- Scrollable content -->
      <div v-if="!sidebarCollapsed" class="flex-1 overflow-y-auto p-3 pr-5 pb-8 space-y-5">
        <!-- Filters section -->
        <div class="space-y-3">
          <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filters</h3>

          <!-- Date From -->
          <div class="space-y-1">
            <label class="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Icon name="i-lucide-calendar" class="size-3" />
              Date From
            </label>
            <Input v-model="filterDateFrom" type="date" class="h-8 text-xs" />
          </div>

          <!-- Date To -->
          <div class="space-y-1">
            <label class="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Icon name="i-lucide-calendar-check" class="size-3" />
              Date To
            </label>
            <Input v-model="filterDateTo" type="date" class="h-8 text-xs" />
          </div>

          <!-- Project Status -->
          <div class="space-y-1">
            <label class="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Icon name="i-lucide-activity" class="size-3" />
              Project Status
            </label>
            <select
              v-model="filterProjectStatus"
              class="w-full h-8 px-2 pr-7 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
              style="background-image: url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%239ca3af%27 stroke-width=%272%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 6px center;"
            >
              <option value="">All Statuses</option>
              <option v-for="s in projectStatuses" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <!-- Job Status -->
          <div class="space-y-1">
            <label class="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Icon name="i-lucide-briefcase" class="size-3" />
              Job Status
            </label>
            <select
              v-model="filterJobStatus"
              class="w-full h-8 px-2 pr-7 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
              style="background-image: url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%239ca3af%27 stroke-width=%272%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 6px center;"
            >
              <option value="">All Job Statuses</option>
              <option v-for="s in jobStatuses" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <!-- Branch -->
          <div class="space-y-1">
            <label class="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Icon name="i-lucide-git-branch" class="size-3" />
              Branch
            </label>
            <select
              v-model="filterBranch"
              class="w-full h-8 px-2 pr-7 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
              style="background-image: url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%239ca3af%27 stroke-width=%272%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 6px center;"
            >
              <option value="">All Branches</option>
              <option v-for="b in branches" :key="b" :value="b">{{ b }}</option>
            </select>
          </div>

          <!-- Download PDF -->
          <Button
            size="sm"
            class="w-full h-8 text-xs"
            @click="downloadPDF"
          >
            <Icon name="i-lucide-file-down" class="size-3 mr-1.5" />
            Download PDF
          </Button>
        </div>

        <!-- Divider -->
        <div class="h-px bg-border/50" />

        <!-- Quick Summary -->
        <div class="space-y-3">
          <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Summary</h3>

          <div class="grid grid-cols-2 gap-2">
            <!-- Total Projects -->
            <div class="rounded-xl border bg-gradient-to-br from-blue-500/5 to-blue-500/10 p-3">
              <p class="text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">{{ summary.total }}</p>
              <p class="text-[10px] text-muted-foreground">Total Projects</p>
            </div>
            <!-- Revenue -->
            <div class="rounded-xl border bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 p-3">
              <p class="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{{ fmtCompact(summary.totalRevenue) }}</p>
              <p class="text-[10px] text-muted-foreground">Revenue</p>
            </div>
            <!-- Active -->
            <div class="rounded-xl border bg-gradient-to-br from-amber-500/5 to-amber-500/10 p-3">
              <p class="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">{{ summary.active }}</p>
              <p class="text-[10px] text-muted-foreground">Active</p>
            </div>
            <!-- Completed -->
            <div class="rounded-xl border bg-gradient-to-br from-violet-500/5 to-violet-500/10 p-3">
              <p class="text-lg font-bold tabular-nums text-violet-600 dark:text-violet-400">{{ summary.completed }}</p>
              <p class="text-[10px] text-muted-foreground">Completed</p>
            </div>
          </div>

          <!-- Extra metrics -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground flex items-center gap-1.5">
                <Icon name="i-lucide-x-circle" class="size-3 text-red-400" />
                Cancelled
              </span>
              <span class="font-semibold tabular-nums text-red-500">{{ summary.cancelled }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground flex items-center gap-1.5">
                <Icon name="i-lucide-dollar-sign" class="size-3 text-emerald-400" />
                Avg. Value
              </span>
              <span class="font-semibold tabular-nums">{{ fmtCompact(summary.avgValue) }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground flex items-center gap-1.5">
                <Icon name="i-lucide-users" class="size-3 text-blue-400" />
                Project Managers
              </span>
              <span class="font-semibold tabular-nums">{{ summary.pms }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground flex items-center gap-1.5">
                <Icon name="i-lucide-git-branch" class="size-3 text-purple-400" />
                Branches
              </span>
              <span class="font-semibold tabular-nums">{{ summary.branches }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground flex items-center gap-1.5">
                <Icon name="i-lucide-zap" class="size-3 text-amber-400" />
                Total KW
              </span>
              <span class="font-semibold tabular-nums">{{ summary.totalKW.toLocaleString() }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground flex items-center gap-1.5">
                <Icon name="i-lucide-layout-grid" class="size-3 text-cyan-400" />
                Total Panels
              </span>
              <span class="font-semibold tabular-nums">{{ summary.totalPanels.toLocaleString() }}</span>
            </div>
          </div>

          <!-- Completion bar -->
          <div v-if="summary.total > 0" class="space-y-1.5">
            <div class="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Completion Rate</span>
              <span class="font-semibold">{{ summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0 }}%</span>
            </div>
            <div class="h-2 rounded-full bg-muted overflow-hidden">
              <div
                class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                :style="{ width: `${summary.total > 0 ? (summary.completed / summary.total) * 100 : 0}%` }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ Right Panel: Table (same as all-projects) ═══ -->
    <div class="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
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
              :key="project['Project ID'] || idx"
              class="group cursor-pointer hover:bg-muted/50 transition-colors"
              @click="navigateTo(`/projects/${project['Project ID']}`)"
            >
              <TableCell v-for="col in columns" :key="col.key">
                <!-- Status badges -->
                <template v-if="statusColumns.includes(col.key)">
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

                <!-- Project ID -->
                <template v-else-if="col.key === 'Project ID'">
                  <span class="font-mono text-xs">{{ project['Project ID'] || '—' }}</span>
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

                <!-- Email → Name -->
                <template v-else-if="emailColumns.includes(col.key)">
                  <span class="text-sm whitespace-nowrap">{{ resolveName(project[col.key]) }}</span>
                </template>

                <!-- Address truncated -->
                <template v-else-if="col.key === 'Customer Address'">
                  <span class="truncate max-w-[320px] block" :title="project['Customer Address']">
                    {{ project['Customer Address'] || '—' }}
                  </span>
                </template>

                <!-- Default -->
                <template v-else>
                  <span class="text-sm whitespace-nowrap">{{ cellValue(project, col.key) }}</span>
                </template>
              </TableCell>
            </TableRow>

            <!-- Empty State -->
            <TableRow v-if="visibleProjects.length === 0">
              <TableCell :colspan="columns.length" class="h-32 text-center">
                <div class="flex flex-col items-center gap-2 text-muted-foreground">
                  <Icon name="i-lucide-inbox" class="size-8" />
                  <p>No projects match your filters</p>
                  <Button v-if="filtersActive" size="sm" variant="outline" @click="resetFilters">
                    <Icon name="i-lucide-rotate-ccw" class="mr-1 size-3.5" />
                    Reset Filters
                  </Button>
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
  </div>
</template>

<style scoped>
:deep([data-slot="table-container"]) {
  overflow: visible !important;
}
</style>
