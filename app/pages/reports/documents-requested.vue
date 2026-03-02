<script setup lang="ts">
import { toast } from 'vue-sonner'

const { setHeader } = usePageHeader()
setHeader({ title: 'Documents Requested Report', description: 'Analytics & insights across all document requests', icon: 'i-lucide-file-search' })

const store = useDashboardStore()
const { user } = useAuth()
await store.init()

const docRequests = computed(() => store.documentRequests.value || [])
const userNameMap = computed(() => store.userNameMap.value || {})

const activeTab = ref('overview')
const sidebarCollapsed = ref(false)

// Filters
const selDocTypes = ref<string[]>([])
const selStatuses = ref<string[]>([])
const selSources = ref<string[]>([])
const dateFrom = ref('')
const dateTo = ref('')

const filterSearch = reactive({ docType: '', status: '', source: '' })

// Template state
const showSaveDialog = ref(false)
const showTemplatesPanel = ref(false)
const templateName = ref('')
const savedTemplates = ref<any[]>([])
const loadingTemplates = ref(false)
const savingTemplate = ref(false)

// ─── Helpers ──────────────────────────────────
function str(val: any): string {
  if (!val) return ''
  if (typeof val === 'object' && val.value !== undefined) return String(val.value)
  return String(val)
}
const _abbrevs = new Set(['pto', 'mpu', 'n/a', 'tbd', 'hvac', 'r&r', 'ntp', 'ahj', 'hoa'])
function titleCase(s: string): string {
  return s.toLowerCase().split(/(\s+)/).map(w => _abbrevs.has(w) ? w.toUpperCase() : (w.charAt(0).toUpperCase() + w.slice(1))).join('')
}
function parseDate(val: any): Date | null {
  if (!val) return null
  try { const d = new Date(val?.value || val); return isNaN(d.getTime()) ? null : d } catch { return null }
}
function formatDate(val: any): string {
  if (!val) return '—'
  try { return new Date(val?.value || val).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) } catch { return '—' }
}
function resolveName(email: any): string {
  const e = str(email); if (!e) return '—'
  const mapped = userNameMap.value[e.toLowerCase()]
  if (mapped) return titleCase(mapped)
  const local = e.split('@')[0] || e
  return local.replace(/[._-]/g, ' ').split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
function statusColor(s: string): string {
  const l = (s || '').toLowerCase()
  if (['received', 'approved', 'complete', 'done', 'closed'].some(k => l.includes(k))) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
  if (['submitted', 'in progress', 'active', 'open'].some(k => l.includes(k))) return 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400'
  if (['requested', 'pending', 'new', 'waiting'].some(k => l.includes(k))) return 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400'
  if (['rejected', 'failed', 'cancelled', 'n/a'].some(k => l.includes(k))) return 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400'
  return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
}

// ─── Cascading Filters ──────────────────────────────
function fieldMatchesAny(fieldValue: any, selected: string[]): boolean {
  if (!selected.length) return true
  if (!fieldValue) return false
  return selected.some(sel => str(fieldValue).toLowerCase() === sel.toLowerCase())
}

function filterExcluding(excludeKey: string): any[] {
  let recs = [...docRequests.value]
  if (excludeKey !== 'docType' && selDocTypes.value.length) recs = recs.filter(p => fieldMatchesAny(p['Permit'], selDocTypes.value))
  if (excludeKey !== 'status' && selStatuses.value.length) recs = recs.filter(p => fieldMatchesAny(p['Status'], selStatuses.value))
  if (excludeKey !== 'source' && selSources.value.length) recs = recs.filter(p => selSources.value.includes(p._source))
  if (dateFrom.value) { const f = new Date(dateFrom.value); f.setHours(0,0,0,0); recs = recs.filter(p => { const d = parseDate(p['Requested'] || p['Last Edit TimeStamp']); return d && d >= f }) }
  if (dateTo.value) { const t = new Date(dateTo.value); t.setHours(23,59,59,999); recs = recs.filter(p => { const d = parseDate(p['Requested'] || p['Last Edit TimeStamp']); return d && d <= t }) }
  return recs
}

function splitCountSorted(records: any[], field: string): { value: string, count: number }[] {
  const counts: Record<string, number> = {}
  for (const p of records) {
    const raw = str(p[field]); if (!raw) continue
    const key = raw.toLowerCase()
    counts[key] = (counts[key] || 0) + 1
  }
  return Object.entries(counts).map(([key, count]) => ({ value: titleCase(key), count })).sort((a, b) => a.value.localeCompare(b.value, undefined, { sensitivity: 'base' }))
}

const docTypes = computed(() => splitCountSorted(filterExcluding('docType'), 'Permit'))
const statuses = computed(() => splitCountSorted(filterExcluding('status'), 'Status'))
const sources = computed(() => {
  const recs = filterExcluding('source')
  const counts: Record<string, number> = {}
  recs.forEach(p => { const s = p._source || 'unknown'; counts[s] = (counts[s] || 0) + 1 })
  return Object.entries(counts).map(([value, count]) => ({ value: titleCase(value), count })).sort((a, b) => a.value.localeCompare(b.value))
})

function filteredOpts(options: { value: string, count: number }[], search: string) {
  if (!search.trim()) return options
  const q = search.toLowerCase()
  return options.filter(o => o.value.toLowerCase().includes(q))
}

// Toggle
const _filterRefs: Record<string, Ref<string[]>> = { docType: selDocTypes, status: selStatuses, source: selSources }
function toggleFilter(key: string, val: string) {
  const arr = _filterRefs[key]; if (!arr) return
  const idx = arr.value.indexOf(val)
  if (idx >= 0) arr.value = arr.value.filter(v => v !== val)
  else arr.value = [...arr.value, val]
}

const filteredDocs = computed(() => {
  let recs = [...docRequests.value]
  if (selDocTypes.value.length) recs = recs.filter(p => fieldMatchesAny(p['Permit'], selDocTypes.value))
  if (selStatuses.value.length) recs = recs.filter(p => fieldMatchesAny(p['Status'], selStatuses.value))
  if (selSources.value.length) recs = recs.filter(p => selSources.value.includes(p._source))
  if (dateFrom.value) { const f = new Date(dateFrom.value); f.setHours(0,0,0,0); recs = recs.filter(p => { const d = parseDate(p['Requested'] || p['Last Edit TimeStamp']); return d && d >= f }) }
  if (dateTo.value) { const t = new Date(dateTo.value); t.setHours(23,59,59,999); recs = recs.filter(p => { const d = parseDate(p['Requested'] || p['Last Edit TimeStamp']); return d && d <= t }) }
  return recs
})

const hasActiveFilters = computed(() => selDocTypes.value.length || selStatuses.value.length || selSources.value.length || dateFrom.value || dateTo.value)
function resetFilters() { selDocTypes.value = []; selStatuses.value = []; selSources.value = []; dateFrom.value = ''; dateTo.value = '' }

// ─── KPIs & Charts ──────────────────────────────
const totalDocs = computed(() => filteredDocs.value.length)
const receivedCount = computed(() => filteredDocs.value.filter(p => { const v = str(p['Received']); return v && v !== '—' && v !== '' }).length)
const submittedCount = computed(() => filteredDocs.value.filter(p => { const v = str(p['Submitted']); return v && v !== '—' && v !== '' }).length)
const pendingCount = computed(() => totalDocs.value - receivedCount.value)
const receivedPct = computed(() => totalDocs.value > 0 ? Math.round((receivedCount.value / totalDocs.value) * 100) : 0)

const statusBreakdown = computed(() => {
  const g: Record<string, number> = {}
  filteredDocs.value.forEach(p => { const s = str(p['Status']) || 'Unknown'; g[s.toLowerCase()] = (g[s.toLowerCase()] || 0) + 1 })
  return Object.entries(g).map(([name, count]) => ({ name: titleCase(name), count })).sort((a, b) => b.count - a.count)
})

const typeBreakdown = computed(() => {
  const g: Record<string, number> = {}
  filteredDocs.value.forEach(p => { const t = str(p['Permit']) || 'Other'; g[t.toLowerCase()] = (g[t.toLowerCase()] || 0) + 1 })
  return Object.entries(g).map(([name, count]) => ({ name: titleCase(name), value: count })).sort((a, b) => b.value - a.value).slice(0, 10)
})

const monthlyTrend = computed(() => {
  const year = new Date().getFullYear()
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const mCnt: Record<number, number> = {}
  filteredDocs.value.forEach(p => {
    const d = parseDate(p['Requested'] || p['Last Edit TimeStamp']); if (!d || d.getFullYear() !== year) return
    mCnt[d.getMonth()] = (mCnt[d.getMonth()] || 0) + 1
  })
  return MONTHS.map((month, i) => ({ month, documents: mCnt[i] || 0 }))
})

const pipelineData = computed(() => {
  const stages = ['Requested', 'Submitted', 'Received']
  return stages.map(s => ({
    label: s,
    count: filteredDocs.value.filter(p => { const v = str(p[s]); return v && v !== '—' && v !== '' }).length,
    total: totalDocs.value,
    pct: totalDocs.value > 0 ? Math.round((filteredDocs.value.filter(p => { const v = str(p[s]); return v && v !== '—' && v !== '' }).length / totalDocs.value) * 100) : 0,
  }))
})

const avgTurnaround = computed(() => {
  let total = 0; let count = 0
  filteredDocs.value.forEach(p => {
    const req = parseDate(p['Requested']); const rcv = parseDate(p['Received'])
    if (req && rcv) { total += (rcv.getTime() - req.getTime()) / (1000 * 60 * 60 * 24); count++ }
  })
  return count > 0 ? Math.round(total / count) : 0
})

const topEditors = computed(() => {
  const g: Record<string, number> = {}
  filteredDocs.value.forEach(p => { const e = str(p['Last Edit By']); if (!e) return; g[e.toLowerCase()] = (g[e.toLowerCase()] || 0) + 1 })
  return Object.entries(g).map(([email, count]) => ({
    name: resolveName(email), email, count,
    avatar: resolveName(email).split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase(),
  })).sort((a, b) => b.count - a.count).slice(0, 8)
})

// ─── Data Table ──────────────────────────────
const sortKey = ref('Requested'); const sortDir = ref<'asc' | 'desc'>('desc')
function toggleSort(key: string) { if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'; else { sortKey.value = key; sortDir.value = 'desc' } }

const tableCols = [
  { key: 'Project ID', label: 'Project' }, { key: 'Permit', label: 'Document Type' }, { key: 'Status', label: 'Status' },
  { key: 'Requested', label: 'Requested' }, { key: 'Submitted', label: 'Submitted' }, { key: 'Received', label: 'Received' },
  { key: 'Revision', label: 'Rev' }, { key: 'Last Edit By', label: 'Last Edit By' }, { key: '_source', label: 'Source' },
]
const dateCols = ['Requested', 'Submitted', 'Received']

const sortedDocs = computed(() => {
  const arr = [...filteredDocs.value]
  const key = sortKey.value; const dir = sortDir.value === 'asc' ? 1 : -1
  arr.sort((a, b) => {
    let av: any = dateCols.includes(key) ? (parseDate(a[key])?.getTime() || 0) : (str(a[key]) || '')
    let bv: any = dateCols.includes(key) ? (parseDate(b[key])?.getTime() || 0) : (str(b[key]) || '')
    if (typeof av === 'string') av = av.toLowerCase()
    if (typeof bv === 'string') bv = bv.toLowerCase()
    return av < bv ? -dir : av > bv ? dir : 0
  })
  return arr
})

const PAGE_SIZE = 50
const visibleCount = ref(PAGE_SIZE)
const visible = computed(() => sortedDocs.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < sortedDocs.value.length)
const sentinelRef = ref<HTMLElement | null>(null)
watch(filteredDocs, () => { visibleCount.value = PAGE_SIZE })
onMounted(() => {
  if (!sentinelRef.value) return
  const obs = new IntersectionObserver(entries => { if (entries[0]?.isIntersecting && hasMore.value) visibleCount.value += PAGE_SIZE }, { rootMargin: '200px' })
  watch(sentinelRef, el => { if (el) obs.observe(el); else obs.disconnect() }, { immediate: true })
  loadTemplates()
})

// ─── Templates ──────────────────────────────
function getCurrentFilters() { return { docType: selDocTypes.value, status: selStatuses.value, source: selSources.value, dateFrom: dateFrom.value, dateTo: dateTo.value } }
function applyTemplate(t: any) {
  try { const f = typeof t.filters === 'string' ? JSON.parse(t.filters) : t.filters; selDocTypes.value = f.docType || []; selStatuses.value = f.status || []; selSources.value = f.source || []; dateFrom.value = f.dateFrom || ''; dateTo.value = f.dateTo || ''; toast.success(`Applied: ${t.name}`) } catch { toast.error('Failed to apply template') }
}
async function loadTemplates() {
  loadingTemplates.value = true
  try { const res = await $fetch<any>('/api/bigquery/filter-templates', { query: { route: '/reports/documents-requested', userEmail: user.value?.email } }); savedTemplates.value = res.templates || [] } catch {} finally { loadingTemplates.value = false }
}
async function saveTemplate() {
  if (!templateName.value.trim()) return; savingTemplate.value = true
  try { await $fetch('/api/bigquery/filter-templates', { method: 'POST', body: { name: templateName.value.trim(), route: '/reports/documents-requested', filters: getCurrentFilters(), userEmail: user.value?.email, userName: user.value?.name, isShared: false } }); toast.success('Template saved!'); templateName.value = ''; showSaveDialog.value = false; await loadTemplates() } catch { toast.error('Failed to save') } finally { savingTemplate.value = false }
}
async function deleteTemplate(id: string) {
  try { await $fetch('/api/bigquery/filter-templates', { method: 'DELETE', body: { id } }); toast.success('Deleted'); await loadTemplates() } catch { toast.error('Failed to delete') }
}

const donutColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#a855f7']
const barColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16']
const avatarColors = ['bg-blue-500/15 text-blue-600', 'bg-violet-500/15 text-violet-600', 'bg-emerald-500/15 text-emerald-600', 'bg-amber-500/15 text-amber-600', 'bg-rose-500/15 text-rose-600']
</script>

<template>
  <div class="w-full flex-1 min-h-0 overflow-hidden flex flex-col">
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <!-- Sidebar -->
      <div class="shrink-0 border-r bg-card/50 flex flex-col min-h-0 transition-all duration-300 overflow-hidden" :class="sidebarCollapsed ? 'w-[52px]' : 'w-[260px]'">
        <div class="flex items-center justify-between px-3 pt-3 pb-1">
          <p v-if="!sidebarCollapsed" class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Filters</p>
          <div class="flex items-center gap-1">
            <button v-if="!sidebarCollapsed" class="p-1 rounded-md hover:bg-muted transition-colors" title="Load Template" @click="showTemplatesPanel = !showTemplatesPanel"><Icon name="i-lucide-folder-open" class="size-3.5 text-muted-foreground" /></button>
            <button v-if="!sidebarCollapsed && hasActiveFilters" class="p-1 rounded-md hover:bg-muted transition-colors" title="Save Filters as Template" @click="showSaveDialog = true"><Icon name="i-lucide-save" class="size-3.5 text-muted-foreground" /></button>
            <button class="p-1 rounded-md hover:bg-muted transition-colors" @click="sidebarCollapsed = !sidebarCollapsed"><Icon :name="sidebarCollapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'" class="size-3.5 text-muted-foreground" /></button>
          </div>
        </div>

        <!-- Templates Panel -->
        <div v-if="showTemplatesPanel && !sidebarCollapsed" class="px-3 pb-2 space-y-1.5">
          <div class="flex items-center justify-between"><span class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Saved Templates</span><button class="text-[10px] text-muted-foreground hover:text-foreground" @click="showTemplatesPanel = false">×</button></div>
          <div v-if="loadingTemplates" class="text-center py-3"><Icon name="i-lucide-loader-2" class="size-4 animate-spin text-muted-foreground/40" /></div>
          <div v-else-if="savedTemplates.length === 0" class="text-center py-3 text-[10px] text-muted-foreground/50">No saved templates</div>
          <div v-else class="space-y-1 max-h-[150px] overflow-y-auto">
            <div v-for="t in savedTemplates" :key="t.id" class="group flex items-center gap-1.5 p-1.5 rounded-md hover:bg-muted cursor-pointer transition-colors" @click="applyTemplate(t)">
              <Icon name="i-lucide-bookmark" class="size-3 text-primary shrink-0" />
              <div class="flex-1 min-w-0"><p class="text-[11px] font-medium truncate">{{ t.name }}</p></div>
              <button class="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 transition-all" @click.stop="deleteTemplate(t.id)"><Icon name="i-lucide-trash-2" class="size-2.5 text-destructive" /></button>
            </div>
          </div>
          <Separator />
        </div>

        <div v-if="!sidebarCollapsed" class="flex flex-col gap-3.5 p-3 overflow-y-auto flex-1">
          <!-- Document Type -->
          <div class="space-y-1.5">
            <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
              <Icon name="i-lucide-file-text" class="size-3" />Document Type
              <Badge v-if="selDocTypes.length" variant="secondary" class="text-[9px] px-1 py-0 ml-auto">{{ selDocTypes.length }}</Badge>
            </label>
            <div class="relative"><Icon name="i-lucide-search" class="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40" /><input v-model="filterSearch.docType" placeholder="Search types…" class="w-full h-7 pl-7 pr-2 text-[11px] rounded-md border bg-background/50 outline-none focus:ring-1 focus:ring-primary/30 transition-all" /></div>
            <div class="max-h-[140px] overflow-y-auto space-y-0.5 rounded-lg border bg-background/50 p-1">
              <label v-for="opt in filteredOpts(docTypes, filterSearch.docType)" :key="opt.value" class="flex items-center gap-2 px-2 py-1 rounded-md text-[11px] cursor-pointer transition-colors hover:bg-muted" :class="selDocTypes.includes(opt.value) ? 'bg-primary/5 text-primary font-medium' : 'text-muted-foreground'">
                <input type="checkbox" :checked="selDocTypes.includes(opt.value)" class="size-3 rounded accent-primary cursor-pointer" @change="toggleFilter('docType', opt.value)" />
                <span class="truncate flex-1">{{ opt.value }}</span>
                <span class="text-[9px] tabular-nums text-muted-foreground/60 shrink-0">{{ opt.count }}</span>
              </label>
              <p v-if="filteredOpts(docTypes, filterSearch.docType).length === 0" class="text-[10px] text-muted-foreground/50 text-center py-2">No matches</p>
            </div>
          </div>
          <!-- Status -->
          <div class="space-y-1.5">
            <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
              <Icon name="i-lucide-circle-check" class="size-3" />Status
              <Badge v-if="selStatuses.length" variant="secondary" class="text-[9px] px-1 py-0 ml-auto">{{ selStatuses.length }}</Badge>
            </label>
            <div class="relative"><Icon name="i-lucide-search" class="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40" /><input v-model="filterSearch.status" placeholder="Search statuses…" class="w-full h-7 pl-7 pr-2 text-[11px] rounded-md border bg-background/50 outline-none focus:ring-1 focus:ring-primary/30 transition-all" /></div>
            <div class="max-h-[140px] overflow-y-auto space-y-0.5 rounded-lg border bg-background/50 p-1">
              <label v-for="opt in filteredOpts(statuses, filterSearch.status)" :key="opt.value" class="flex items-center gap-2 px-2 py-1 rounded-md text-[11px] cursor-pointer transition-colors hover:bg-muted" :class="selStatuses.includes(opt.value) ? 'bg-primary/5 text-primary font-medium' : 'text-muted-foreground'">
                <input type="checkbox" :checked="selStatuses.includes(opt.value)" class="size-3 rounded accent-primary cursor-pointer" @change="toggleFilter('status', opt.value)" />
                <span class="truncate flex-1">{{ opt.value }}</span>
                <span class="text-[9px] tabular-nums text-muted-foreground/60 shrink-0">{{ opt.count }}</span>
              </label>
              <p v-if="filteredOpts(statuses, filterSearch.status).length === 0" class="text-[10px] text-muted-foreground/50 text-center py-2">No matches</p>
            </div>
          </div>
          <!-- Source -->
          <div class="space-y-1.5">
            <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
              <Icon name="i-lucide-database" class="size-3" />Source
              <Badge v-if="selSources.length" variant="secondary" class="text-[9px] px-1 py-0 ml-auto">{{ selSources.length }}</Badge>
            </label>
            <div class="max-h-[100px] overflow-y-auto space-y-0.5 rounded-lg border bg-background/50 p-1">
              <label v-for="opt in sources" :key="opt.value" class="flex items-center gap-2 px-2 py-1 rounded-md text-[11px] cursor-pointer transition-colors hover:bg-muted" :class="selSources.includes(opt.value.toLowerCase()) ? 'bg-primary/5 text-primary font-medium' : 'text-muted-foreground'">
                <input type="checkbox" :checked="selSources.includes(opt.value.toLowerCase())" class="size-3 rounded accent-primary cursor-pointer" @change="toggleFilter('source', opt.value.toLowerCase())" />
                <span class="truncate flex-1">{{ opt.value }}</span>
                <span class="text-[9px] tabular-nums text-muted-foreground/60 shrink-0">{{ opt.count }}</span>
              </label>
            </div>
          </div>
          <Separator />
          <!-- Date Range -->
          <div class="space-y-1.5">
            <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5"><Icon name="i-lucide-calendar" class="size-3" />Date From</label>
            <input v-model="dateFrom" type="date" class="w-full h-8 px-2.5 text-xs rounded-lg border bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
          </div>
          <div class="space-y-1.5">
            <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5"><Icon name="i-lucide-calendar-check" class="size-3" />Date To</label>
            <input v-model="dateTo" type="date" class="w-full h-8 px-2.5 text-xs rounded-lg border bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
          </div>
          <Separator />
          <!-- Active Filters -->
          <div v-if="hasActiveFilters" class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Active Filters</span>
              <button class="text-[10px] text-primary hover:underline" @click="resetFilters">Clear All</button>
            </div>
            <div class="flex flex-wrap gap-1">
              <Badge v-for="s in selDocTypes" :key="'dt-'+s" variant="secondary" class="text-[10px] gap-1">{{ s }}<button class="ml-0.5 hover:text-destructive" @click="toggleFilter('docType', s)">×</button></Badge>
              <Badge v-for="s in selStatuses" :key="'st-'+s" variant="secondary" class="text-[10px] gap-1">{{ s }}<button class="ml-0.5 hover:text-destructive" @click="toggleFilter('status', s)">×</button></Badge>
              <Badge v-for="s in selSources" :key="'sr-'+s" variant="secondary" class="text-[10px] gap-1">{{ titleCase(s) }}<button class="ml-0.5 hover:text-destructive" @click="toggleFilter('source', s)">×</button></Badge>
              <Badge v-if="dateFrom" variant="secondary" class="text-[10px] gap-1">From: {{ dateFrom }}<button class="ml-0.5 hover:text-destructive" @click="dateFrom = ''">×</button></Badge>
              <Badge v-if="dateTo" variant="secondary" class="text-[10px] gap-1">To: {{ dateTo }}<button class="ml-0.5 hover:text-destructive" @click="dateTo = ''">×</button></Badge>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 min-w-0 flex flex-col overflow-auto p-4 gap-4">
        <!-- Tabs -->
        <div class="flex items-center gap-1 bg-muted/40 rounded-xl p-1 w-fit">
          <button v-for="t in [{id:'overview', label:'Overview', icon:'i-lucide-bar-chart-3'},{id:'data', label:'Data', icon:'i-lucide-table-2'}]" :key="t.id" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all" :class="activeTab === t.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'" @click="activeTab = t.id">
            <Icon :name="t.icon" class="size-3.5" />{{ t.label }}
          </button>
        </div>

        <!-- ═══ OVERVIEW TAB ═══ -->
        <template v-if="activeTab === 'overview'">
          <!-- KPIs -->
          <div class="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Card v-for="kpi in [
              { label: 'Total Documents', value: totalDocs, icon: 'i-lucide-file-search', color: 'text-blue-500' },
              { label: 'Received', value: receivedCount, icon: 'i-lucide-check-circle', color: 'text-emerald-500' },
              { label: 'Submitted', value: submittedCount, icon: 'i-lucide-send', color: 'text-violet-500' },
              { label: 'Pending', value: pendingCount, icon: 'i-lucide-clock', color: 'text-amber-500' },
              { label: 'Avg Turnaround', value: avgTurnaround + ' days', icon: 'i-lucide-timer', color: 'text-rose-500' },
            ]" :key="kpi.label" class="group">
              <CardContent class="p-4">
                <div class="flex items-center gap-3">
                  <div class="size-10 rounded-xl bg-muted/50 flex items-center justify-center group-hover:scale-110 transition-transform"><Icon :name="kpi.icon" :class="kpi.color" class="size-5" /></div>
                  <div><p class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{{ kpi.label }}</p><p class="text-xl font-bold tabular-nums">{{ kpi.value }}</p></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <!-- Charts -->
          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader class="pb-2"><CardTitle class="text-sm font-semibold">Documents by Type</CardTitle><CardDescription>Distribution of document request types</CardDescription></CardHeader>
              <CardContent><DonutChart :data="typeBreakdown" index="name" category="value" :colors="donutColors" :value-formatter="(v: number) => `${v}`" class="h-[200px]" /><div class="w-full mt-4 space-y-2"><div v-for="(t, i) in typeBreakdown" :key="t.name" class="flex items-center justify-between text-xs"><div class="flex items-center gap-2"><div class="size-2.5 rounded-full" :style="{ background: donutColors[i % donutColors.length] }" /><span class="text-muted-foreground truncate">{{ t.name }}</span></div><span class="font-semibold tabular-nums">{{ t.value }}</span></div></div></CardContent>
            </Card>
            <Card>
              <CardHeader class="pb-2"><CardTitle class="text-sm font-semibold">Monthly Documents ({{ new Date().getFullYear() }})</CardTitle><CardDescription>Documents requested per month</CardDescription></CardHeader>
              <CardContent><BarChart :data="monthlyTrend" index="month" :categories="['documents']" :colors="['#3b82f6']" :rounded-corners="6" class="h-[260px]" /></CardContent>
            </Card>
          </div>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <!-- Pipeline -->
            <Card>
              <CardHeader class="pb-2"><CardTitle class="text-sm font-semibold">Document Pipeline</CardTitle><CardDescription>Progress through stages</CardDescription></CardHeader>
              <CardContent><div class="space-y-4">
                <div v-for="(s, i) in pipelineData" :key="s.label" class="space-y-1.5">
                  <div class="flex items-center justify-between text-sm"><span class="font-medium">{{ s.label }}</span><span class="text-muted-foreground tabular-nums text-xs">{{ s.count }}/{{ s.total }} <span class="text-[10px]">({{ s.pct }}%)</span></span></div>
                  <div class="h-2.5 rounded-full bg-muted overflow-hidden"><div class="h-full rounded-full transition-all duration-1000" :style="{ width: `${s.pct}%`, background: barColors[i] }" /></div>
                </div>
              </div></CardContent>
            </Card>
            <!-- Top Editors -->
            <Card>
              <CardHeader class="pb-2"><CardTitle class="text-sm font-semibold">Most Active Editors</CardTitle><CardDescription>Users with most document edits</CardDescription></CardHeader>
              <CardContent><div class="space-y-2.5">
                <div v-for="(ed, i) in topEditors" :key="ed.email" class="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div class="size-8 rounded-lg flex items-center justify-center text-[11px] font-bold" :class="avatarColors[i % avatarColors.length]">{{ ed.avatar }}</div>
                  <div class="flex-1 min-w-0"><p class="text-sm font-medium truncate">{{ ed.name }}</p><p class="text-[10px] text-muted-foreground">{{ ed.count }} documents</p></div>
                  <Badge variant="secondary" class="text-[10px]">{{ ed.count }}</Badge>
                </div>
              </div></CardContent>
            </Card>
          </div>

          <!-- Status Pipeline -->
          <Card>
            <CardHeader class="pb-2"><CardTitle class="text-sm font-semibold">Status Pipeline</CardTitle><CardDescription>Documents by current status</CardDescription></CardHeader>
            <CardContent><div class="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3"><div v-for="(s, i) in statusBreakdown" :key="s.name" class="space-y-1.5"><div class="flex items-center justify-between text-sm"><div class="flex items-center gap-2"><div class="size-3 rounded" :style="{ background: barColors[i % barColors.length] }" /><span class="font-medium">{{ s.name }}</span></div><Badge variant="secondary" class="text-[10px] px-1.5 py-0">{{ s.count }}</Badge></div><div class="h-2 rounded-full bg-muted overflow-hidden"><div class="h-full rounded-full transition-all duration-1000" :style="{ width: `${Math.max((s.count / (statusBreakdown[0]?.count || 1)) * 100, 3)}%`, background: barColors[i % barColors.length] }" /></div></div></div></CardContent>
          </Card>
        </template>

        <!-- ═══ DATA TABLE TAB ═══ -->
        <template v-if="activeTab === 'data'">
          <Card class="flex-1">
            <CardContent class="p-0"><div class="flex-1 overflow-auto"><table class="w-full"><thead class="sticky top-0 z-10"><tr class="bg-muted/60 backdrop-blur-sm"><th v-for="col in tableCols" :key="col.key" class="text-left font-semibold text-muted-foreground select-none transition-colors border-b whitespace-nowrap px-3 py-2.5 text-xs cursor-pointer hover:text-foreground" @click="toggleSort(col.key)"><div class="flex items-center gap-1"><span>{{ col.label }}</span><Icon v-if="sortKey === col.key" :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-3 text-primary shrink-0" /></div></th></tr></thead>
              <tbody><tr v-for="(rec, idx) in visible" :key="idx" class="border-b border-border/20 hover:bg-muted/15 transition-colors"><td v-for="col in tableCols" :key="col.key" class="whitespace-nowrap px-3 py-2 text-xs">
                <NuxtLink v-if="col.key === 'Project ID'" :to="`/projects/${str(rec['Project ID'])}`" class="text-primary hover:underline font-mono text-[11px]">{{ str(rec['Project ID']) }}</NuxtLink>
                <template v-else-if="col.key === 'Status'"><Badge v-if="rec['Status']" variant="outline" :class="statusColor(str(rec['Status']))" class="text-[10px]">{{ titleCase(str(rec['Status'])) }}</Badge><span v-else class="text-muted-foreground/40">—</span></template>
                <template v-else-if="col.key === 'Permit'"><Badge v-if="rec['Permit']" variant="secondary" class="text-[10px]">{{ titleCase(str(rec['Permit'])) }}</Badge><span v-else class="text-muted-foreground/40">—</span></template>
                <template v-else-if="dateCols.includes(col.key)">{{ formatDate(rec[col.key]) }}</template>
                <template v-else-if="col.key === 'Last Edit By'">{{ resolveName(rec[col.key]) }}</template>
                <template v-else-if="col.key === '_source'"><Badge :variant="rec._source === 'active' ? 'default' : 'secondary'" class="text-[10px]">{{ titleCase(rec._source || '') }}</Badge></template>
                <span v-else>{{ str(rec[col.key]) || '—' }}</span>
              </td></tr>
              <tr v-if="visible.length === 0"><td :colspan="tableCols.length" class="text-center py-12 text-muted-foreground"><div class="flex flex-col items-center gap-2"><div class="size-12 rounded-xl bg-muted/30 flex items-center justify-center"><Icon name="i-lucide-search-x" class="size-6 text-muted-foreground/20" /></div><p class="text-xs">No matching documents</p><Button v-if="hasActiveFilters" variant="outline" size="sm" class="text-xs mt-1" @click="resetFilters"><Icon name="i-lucide-x" class="size-3 mr-1" />Clear Filters</Button></div></td></tr></tbody></table>
              <div v-if="hasMore" ref="sentinelRef" class="flex items-center justify-center py-3 shrink-0"><Icon name="i-lucide-loader-2" class="size-4 animate-spin text-muted-foreground/40" /><span class="text-[10px] text-muted-foreground/40 ml-2">Loading more…</span></div>
            </div></CardContent>
          </Card>
        </template>
      </div>
    </div>
  </div>

  <!-- Save Template Dialog -->
  <Dialog v-model:open="showSaveDialog">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2"><div class="size-8 rounded-lg bg-primary/10 flex items-center justify-center"><Icon name="i-lucide-save" class="size-4 text-primary" /></div>Save Filter Template</DialogTitle>
        <DialogDescription class="text-sm">Save your current filter selections as a reusable template.</DialogDescription>
      </DialogHeader>
      <div class="space-y-3 mt-2">
        <div class="space-y-1.5"><label class="text-xs font-medium">Template Name</label><Input v-model="templateName" placeholder="e.g. Pending Docs Only" class="h-9" @keydown.enter="saveTemplate" /></div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <Button variant="outline" size="sm" :disabled="savingTemplate" @click="showSaveDialog = false">Cancel</Button>
        <Button size="sm" :disabled="!templateName.trim() || savingTemplate" @click="saveTemplate"><Icon v-if="savingTemplate" name="i-lucide-loader-2" class="size-3.5 mr-1 animate-spin" /><Icon v-else name="i-lucide-save" class="size-3.5 mr-1" />Save Template</Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
