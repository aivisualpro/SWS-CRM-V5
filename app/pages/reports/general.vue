<script setup lang="ts">
import NumberFlow from '@number-flow/vue'
import { toast } from 'vue-sonner'

const { setHeader } = usePageHeader()
setHeader({ title: 'General Report', description: 'Project analytics & performance insights', icon: 'i-lucide-clipboard-list' })

const { projects, userNameMap, customerNameMap, salesReps, init } = useDashboardStore()
init()
const { user } = useAuth()

// ─── Filter State (multi-select arrays) ─────────────
const selStatuses = ref<string[]>([])
const selJobStatuses = ref<string[]>([])
const selBranches = ref<string[]>([])
const selTypes = ref<string[]>([])
const selPMs = ref<string[]>([])
const selSalesReps = ref<string[]>([])
const selEquipment = ref<string[]>([])
const selUtility = ref<string[]>([])
const selPermitTech = ref<string[]>([])
const dateFrom = ref('')
const dateTo = ref('')
const searchQuery = ref('')
const activeTab = ref('overview')
const sidebarCollapsed = ref(false)

// Per-filter search state
const filterSearch = reactive({ status: '', jobStatus: '', branch: '', type: '', pm: '', salesRep: '', equipment: '', utility: '', permitTech: '' })

// ─── Cascading filter options (each filter shows options from data filtered by ALL OTHER filters) ──
// Applies all filters EXCEPT the one identified by `excludeKey`
function filterExcluding(excludeKey: string): any[] {
  let recs = [...projects.value]
  if (excludeKey !== 'status' && selStatuses.value.length) recs = recs.filter(p => fieldMatchesAny(p['Project Status'], selStatuses.value))
  if (excludeKey !== 'jobStatus' && selJobStatuses.value.length) recs = recs.filter(p => fieldMatchesAny(p['Job Status'], selJobStatuses.value))
  if (excludeKey !== 'branch' && selBranches.value.length) recs = recs.filter(p => fieldMatchesAny(p['Branch Name'], selBranches.value))
  if (excludeKey !== 'type' && selTypes.value.length) recs = recs.filter(p => fieldMatchesAny(p['Project Type'], selTypes.value))
  if (excludeKey !== 'pm' && selPMs.value.length) recs = recs.filter(p => fieldMatchesAny(p['Project Manager'], selPMs.value))
  if (excludeKey !== 'salesRep' && selSalesReps.value.length) recs = recs.filter(p => fieldMatchesAny(p['Sales Rep'], selSalesReps.value))
  if (excludeKey !== 'equipment' && selEquipment.value.length) recs = recs.filter(p => fieldMatchesAny(p['Project Equipment'], selEquipment.value))
  if (excludeKey !== 'utility' && selUtility.value.length) recs = recs.filter(p => fieldMatchesAny(p['Utillity'], selUtility.value))
  if (excludeKey !== 'permitTech' && selPermitTech.value.length) recs = recs.filter(p => fieldMatchesAny(p['Permit Coordinator'], selPermitTech.value))
  if (dateFrom.value) { const f = new Date(dateFrom.value); f.setHours(0,0,0,0); recs = recs.filter(p => { const d = parseDate(p['TimeStamp']); return d && d >= f }) }
  if (dateTo.value) { const t = new Date(dateTo.value); t.setHours(23,59,59,999); recs = recs.filter(p => { const d = parseDate(p['TimeStamp']); return d && d <= t }) }
  return recs
}

// Title Case: "PENDING METERSPOT" → "Pending Meterspot", preserves known abbreviations
const _abbrevs = new Set(['pto', 'mpu', 'n/a', 'tbd', 'hvac', 'r&r', 'ntp', 'ahj', 'hoa'])
function titleCase(s: string): string {
  return s.toLowerCase().split(/(\s+)/).map(w => _abbrevs.has(w) ? w.toUpperCase() : (w.charAt(0).toUpperCase() + w.slice(1))).join('')
}

function splitCountSorted(records: any[], field: string): { value: string, count: number }[] {
  const counts: Record<string, number> = {}
  for (const p of records) {
    const raw = str(p[field]); if (!raw) continue
    raw.split(',').forEach(part => {
      const t = part.trim(); if (!t) return
      const key = t.toLowerCase()
      counts[key] = (counts[key] || 0) + 1
    })
  }
  return Object.entries(counts).map(([key, count]) => ({ value: titleCase(key), count })).sort((a, b) => a.value.localeCompare(b.value, undefined, { sensitivity: 'base' }))
}

function emailCountSorted(records: any[], field: string): { email: string, name: string, count: number }[] {
  const counts: Record<string, number> = {}
  for (const p of records) {
    const raw = str(p[field]); if (!raw) continue
    raw.split(',').forEach(part => {
      const t = part.trim(); if (!t) return
      const key = t.toLowerCase()
      counts[key] = (counts[key] || 0) + 1
    })
  }
  return Object.entries(counts).map(([key, count]) => {
    let name = userNameMap.value[key]
    if (!name) {
      const local = key.split('@')[0] || key
      name = local.replace(/[._-]/g, ' ').split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    } else {
      // Title case even mapped names: "ANGELA BIBAOCO" → "Angela Bibaoco"
      name = titleCase(name)
    }
    return { email: key, count, name }
  }).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

const statuses = computed(() => splitCountSorted(filterExcluding('status'), 'Project Status'))
const jobStatuses = computed(() => splitCountSorted(filterExcluding('jobStatus'), 'Job Status'))
const branches = computed(() => splitCountSorted(filterExcluding('branch'), 'Branch Name'))
const types = computed(() => splitCountSorted(filterExcluding('type'), 'Project Type'))
const equipments = computed(() => splitCountSorted(filterExcluding('equipment'), 'Project Equipment'))
const utilities = computed(() => splitCountSorted(filterExcluding('utility'), 'Utillity'))
const pms = computed(() => emailCountSorted(filterExcluding('pm'), 'Project Manager'))
const permitTechs = computed(() => emailCountSorted(filterExcluding('permitTech'), 'Permit Coordinator'))
const salesRepOpts = computed(() => {
  const recs = filterExcluding('salesRep')
  const counts: Record<string, number> = {}
  for (const p of recs) {
    const raw = str(p['Sales Rep']); if (!raw) continue
    raw.split(',').forEach(part => { const t = part.trim(); if (t) counts[t] = (counts[t] || 0) + 1 })
  }
  return Object.entries(counts).map(([rowId, count]) => {
    const sr = salesReps.value.find((r: any) => str(r['Row ID']) === rowId)
    const rawName = sr ? `${str(sr['First Name'])} ${str(sr['Last Name'])}`.trim() : rowId
    const name = titleCase(rawName || rowId)
    return { email: rowId, name, count }
  }).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
})

// Filtered options per filter search (now works with {value,count} or {email,name,count} objects)
function filteredOpts(options: { value: string, count: number }[], search: string) {
  if (!search.trim()) return options
  const q = search.toLowerCase()
  return options.filter(o => o.value.toLowerCase().includes(q))
}
function filteredEmailOpts(options: { email: string, name: string, count: number }[], search: string) {
  if (!search.trim()) return options
  const q = search.toLowerCase()
  return options.filter(o => o.name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q))
}

// Toggle helper for multi-select
const _filterRefs: Record<string, Ref<string[]>> = {
  status: selStatuses, jobStatus: selJobStatuses, branch: selBranches, type: selTypes, pm: selPMs,
  salesRep: selSalesReps, equipment: selEquipment, utility: selUtility, permitTech: selPermitTech,
}
function toggleFilter(key: string, val: string) {
  const arr = _filterRefs[key]
  if (!arr) return
  const idx = arr.value.indexOf(val)
  if (idx >= 0) arr.value = arr.value.filter(v => v !== val)
  else arr.value = [...arr.value, val]
}

// Check if a record's field (possibly comma-separated) matches any of the selected values
function fieldMatchesAny(fieldValue: string | undefined | null, selected: string[]): boolean {
  if (!selected.length) return true
  if (!fieldValue) return false
  const parts = str(fieldValue).split(',').map(s => s.trim().toLowerCase())
  return selected.some(sel => parts.some(part => part === sel.toLowerCase()))
}

// ─── Parse helpers ──────────────────────────────────
// Unwrap BigQuery object values {value: "x"} → "x"
function str(val: any): string {
  if (!val) return ''
  if (typeof val === 'object' && val.value !== undefined) return String(val.value)
  return String(val)
}
function parseDate(val: any): Date | null {
  if (!val) return null
  try { const d = new Date(val?.value || val); return isNaN(d.getTime()) ? null : d } catch { return null }
}
function parsePrice(val: any): number {
  if (!val) return 0
  const raw = val?.value !== undefined ? val.value : val
  const n = Number.parseFloat(String(raw).replace(/[^0-9.-]/g, ''))
  return Number.isNaN(n) ? 0 : n
}
function fmt(n: number): string {
  const a = Math.abs(n)
  if (a >= 1e6) return `${n < 0 ? '-' : ''}$${(a / 1e6).toFixed(1)}M`
  if (a >= 1e3) return `${n < 0 ? '-' : ''}$${(a / 1e3).toFixed(0)}K`
  return `$${n.toLocaleString('en-US')}`
}
function fmtFull(n: number) { return `$${n.toLocaleString('en-US')}` }
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
function resolveCustomer(p: any): string { return customerNameMap.value[str(p['Customer ID'])] || str(p['Customer name']) || '—' }
function statusColor(s: string): string {
  const l = (s || '').toLowerCase()
  if (['complete', 'closed', 'rcvd', 'done', 'approved'].some(k => l.includes(k))) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
  if (['active', 'open', 'in progress', 'ongoing'].some(k => l.includes(k))) return 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400'
  if (['pending', 'new', 'tbd', 'submitted', 'waiting'].some(k => l.includes(k))) return 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400'
  if (['cancel', 'rejected', 'failed', 'n/a'].some(k => l.includes(k))) return 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400'
  return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
}

// ─── Filtered records ───────────────────────────────
const filteredProjects = computed(() => {
  let recs = [...projects.value]
  if (selStatuses.value.length) recs = recs.filter(p => fieldMatchesAny(p['Project Status'], selStatuses.value))
  if (selJobStatuses.value.length) recs = recs.filter(p => fieldMatchesAny(p['Job Status'], selJobStatuses.value))
  if (selBranches.value.length) recs = recs.filter(p => fieldMatchesAny(p['Branch Name'], selBranches.value))
  if (selTypes.value.length) recs = recs.filter(p => fieldMatchesAny(p['Project Type'], selTypes.value))
  if (selPMs.value.length) recs = recs.filter(p => fieldMatchesAny(p['Project Manager'], selPMs.value))
  if (selSalesReps.value.length) recs = recs.filter(p => fieldMatchesAny(p['Sales Rep'], selSalesReps.value))
  if (selEquipment.value.length) recs = recs.filter(p => fieldMatchesAny(p['Project Equipment'], selEquipment.value))
  if (selUtility.value.length) recs = recs.filter(p => fieldMatchesAny(p['Utillity'], selUtility.value))
  if (selPermitTech.value.length) recs = recs.filter(p => fieldMatchesAny(p['Permit Coordinator'], selPermitTech.value))
  if (dateFrom.value) { const f = new Date(dateFrom.value); f.setHours(0,0,0,0); recs = recs.filter(p => { const d = parseDate(p['TimeStamp']); return d && d >= f }) }
  if (dateTo.value) { const t = new Date(dateTo.value); t.setHours(23,59,59,999); recs = recs.filter(p => { const d = parseDate(p['TimeStamp']); return d && d <= t }) }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    recs = recs.filter(p => [p['Project ID'], p['Customer name'], p['Customer Address'], p['Project Manager'], p['Vendor Name'], p['Project Type'], p['Sales Rep']].filter(Boolean).some(v => String(v).toLowerCase().includes(q)))
  }
  return recs
})

// ─── KPI Cards ──────────────────────────────────────
const kpis = computed(() => {
  const ps = filteredProjects.value
  const total = ps.length
  const revenue = ps.reduce((s, p) => s + parsePrice(p['Project Price']), 0)
  const net = ps.reduce((s, p) => s + parsePrice(p['Project Net Amount']), 0)
  const avgVal = total > 0 ? Math.round(revenue / total) : 0
  const completed = ps.filter(p => { const s = (p['Project Status'] || '').toLowerCase(); return s.includes('complete') || s.includes('done') || s.includes('closed') }).length
  const compRate = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0
  const kw = ps.reduce((s, p) => s + (parseFloat(p['KW']) || 0), 0)
  return [
    { label: 'Total Revenue', value: revenue, prefix: '$', suffix: '', icon: 'i-lucide-trending-up', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Net Income', value: net, prefix: '$', suffix: '', icon: 'i-lucide-wallet', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Total Projects', value: total, prefix: '', suffix: '', icon: 'i-lucide-folder-kanban', color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { label: 'Avg Project Value', value: avgVal, prefix: '$', suffix: '', icon: 'i-lucide-bar-chart-3', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Completion Rate', value: compRate, prefix: '', suffix: '%', icon: 'i-lucide-check-circle', color: 'text-pink-500', bg: 'bg-pink-500/10' },
    { label: 'Total KW', value: Math.round(kw * 10) / 10, prefix: '', suffix: ' KW', icon: 'i-lucide-zap', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  ]
})

// ─── Charts Data ────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const monthlyTrend = computed(() => {
  const year = new Date().getFullYear()
  const mRev: Record<number, number> = {}, mNet: Record<number, number> = {}, mCnt: Record<number, number> = {}
  filteredProjects.value.forEach(p => {
    const d = parseDate(p['TimeStamp']); if (!d || d.getFullYear() !== year) return; const m = d.getMonth()
    mRev[m] = (mRev[m] || 0) + parsePrice(p['Project Price'])
    mNet[m] = (mNet[m] || 0) + parsePrice(p['Project Net Amount'])
    mCnt[m] = (mCnt[m] || 0) + 1
  })
  return MONTHS.map((month, i) => ({ month, revenue: Math.round(mRev[i] || 0), netIncome: Math.round(mNet[i] || 0), projects: mCnt[i] || 0 }))
})

const statusData = computed(() => {
  const g: Record<string, { count: number, revenue: number }> = {}
  filteredProjects.value.forEach(p => {
    const raw = str(p['Project Status']) || 'Unknown'
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
    const rev = parsePrice(p['Project Price'])
    parts.forEach(s => {
      if (!g[s]) g[s] = { count: 0, revenue: 0 }
      g[s].count++
      g[s].revenue += rev / parts.length
    })
  })
  return Object.entries(g).map(([name, d]) => ({ name, count: d.count, revenue: Math.round(d.revenue) })).sort((a, b) => b.revenue - a.revenue)
})
const statusMax = computed(() => statusData.value[0]?.revenue ?? 1)

const typeData = computed(() => {
  const g: Record<string, number> = {}
  filteredProjects.value.forEach(p => {
    const raw = str(p['Project Type']) || 'Other'
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
    const rev = parsePrice(p['Project Price'])
    parts.forEach(t => { g[t] = (g[t] || 0) + rev / parts.length })
  })
  return Object.entries(g).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value).slice(0, 6)
})

const branchData = computed(() => {
  const g: Record<string, { revenue: number, count: number }> = {}; let total = 0
  filteredProjects.value.forEach(p => {
    const b = str(p['Branch Name']) || 'Other'; const pr = parsePrice(p['Project Price'])
    if (!g[b]) g[b] = { revenue: 0, count: 0 }; g[b].revenue += pr; g[b].count++; total += pr
  })
  return Object.entries(g).map(([branch, d]) => ({ branch, revenue: Math.round(d.revenue), count: d.count, pct: total > 0 ? Math.round((d.revenue / total) * 100) : 0 })).sort((a, b) => b.revenue - a.revenue).slice(0, 6)
})

const pmLeaderboard = computed(() => {
  const g: Record<string, { revenue: number, count: number, completed: number }> = {}
  filteredProjects.value.forEach(p => {
    const pm = str(p['Project Manager']); if (!pm) return
    if (!g[pm]) g[pm] = { revenue: 0, count: 0, completed: 0 }; g[pm].revenue += parsePrice(p['Project Price']); g[pm].count++
    const s = str(p['Project Status']).toLowerCase()
    if (s.includes('complete') || s.includes('done') || s.includes('closed')) g[pm].completed++
  })
  return Object.entries(g).map(([email, d]) => ({
    name: resolveName(email), email, revenue: Math.round(d.revenue), count: d.count,
    rate: d.count > 0 ? Math.round((d.completed / d.count) * 100) : 0,
    avatar: (resolveName(email)).split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase(),
  })).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
})

const jobStatusData = computed(() => {
  const g: Record<string, number> = {}
  filteredProjects.value.forEach(p => { const s = str(p['Job Status']) || 'Unknown'; g[s] = (g[s] || 0) + 1 })
  return Object.entries(g).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
})

const topProjects = computed(() => {
  return [...filteredProjects.value].sort((a, b) => parsePrice(b['Project Price']) - parsePrice(a['Project Price'])).slice(0, 10).map(p => ({
    id: str(p['Project ID']), customer: resolveCustomer(p), branch: str(p['Branch Name']) || '—', type: str(p['Project Type']) || '—',
    price: parsePrice(p['Project Price']), net: parsePrice(p['Project Net Amount']), status: str(p['Project Status']) || '—',
    pm: resolveName(str(p['Project Manager'])), start: formatDate(p['Project Start']),
  }))
})

const equipmentData = computed(() => {
  const g: Record<string, { count: number, kw: number }> = {}
  filteredProjects.value.forEach(p => {
    const eq = str(p['Solar Equipment']) || str(p['Project Equipment']) || 'Unknown'; if (!g[eq]) g[eq] = { count: 0, kw: 0 }; g[eq].count++; g[eq].kw += parseFloat(str(p['KW'])) || 0
  })
  return Object.entries(g).map(([name, d]) => ({ name, count: d.count, kw: Math.round(d.kw * 10) / 10 })).sort((a, b) => b.count - a.count).slice(0, 8)
})

const ptoData = computed(() => {
  const buckets = [
    { label: 'PTO Request', field: 'PTO Request' }, { label: 'PTO Submitted', field: 'PTO Submitted' },
    { label: 'PTO Received', field: 'PTO Received' }, { label: 'Finance Ready', field: 'Finance Ready' },
    { label: 'PM Approved', field: 'PM Approve Project' },
  ]
  return buckets.map(b => {
    const filled = filteredProjects.value.filter(p => { const v = str(p[b.field]); return v && v !== '—' && v !== '' }).length
    return { label: b.label, filled, total: filteredProjects.value.length, pct: filteredProjects.value.length > 0 ? Math.round((filled / filteredProjects.value.length) * 100) : 0 }
  })
})

// ─── Table ──────────────────────────────────────────
const sortKey = ref('TimeStamp'); const sortDir = ref<'asc' | 'desc'>('desc')
function toggleSort(k: string) { if (sortKey.value === k) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'; else { sortKey.value = k; sortDir.value = 'desc' } }
const tableCols = [
  { key: 'Project ID', label: 'Project ID' }, { key: 'Customer name', label: 'Customer' }, { key: 'Branch Name', label: 'Branch' },
  { key: 'Project Type', label: 'Type' }, { key: 'Job Status', label: 'Job Status' }, { key: 'Project Status', label: 'Status' },
  { key: 'Project Manager', label: 'PM' }, { key: 'Project Price', label: 'Price' }, { key: 'Project Net Amount', label: 'Net' },
  { key: 'KW', label: 'KW' }, { key: 'Project Start', label: 'Start' }, { key: 'TimeStamp', label: 'Created' },
]
const dateCols = ['Project Start', 'Project End', 'TimeStamp', 'Completion Date']
const currCols = ['Project Price', 'Contract Price', 'Project Net Amount']
const emailCols = ['Project Manager']
const statusCols = ['Job Status', 'Project Status']

const sorted = computed(() => {
  const arr = [...filteredProjects.value]; const k = sortKey.value; const dir = sortDir.value === 'asc' ? 1 : -1
  return arr.sort((a, b) => { let av = a[k] ?? '', bv = b[k] ?? ''; if (av?.value) av = av.value; if (bv?.value) bv = bv.value; if (typeof av === 'string') av = av.toLowerCase(); if (typeof bv === 'string') bv = bv.toLowerCase(); return av < bv ? -1 * dir : av > bv ? 1 * dir : 0 })
})
const perPage = 50; const visibleCount = ref(perPage)
const visible = computed(() => sorted.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < sorted.value.length)
function loadMore() { if (hasMore.value) visibleCount.value += perPage }
watch(() => filteredProjects.value, () => { visibleCount.value = perPage })
const sentinelRef = ref<HTMLElement | null>(null); let _obs: IntersectionObserver | null = null
onMounted(() => { _obs = new IntersectionObserver(e => { if (e[0]?.isIntersecting && hasMore.value) loadMore() }, { rootMargin: '200px' }) })
onUnmounted(() => { _obs?.disconnect() })
watch(sentinelRef, el => { _obs?.disconnect(); if (el) _obs?.observe(el) })

function resetFilters() { selStatuses.value = []; selJobStatuses.value = []; selBranches.value = []; selTypes.value = []; selPMs.value = []; selSalesReps.value = []; selEquipment.value = []; selUtility.value = []; selPermitTech.value = []; dateFrom.value = ''; dateTo.value = ''; searchQuery.value = ''; Object.keys(filterSearch).forEach(k => (filterSearch as any)[k] = '') }
const hasActiveFilters = computed(() => selStatuses.value.length || selJobStatuses.value.length || selBranches.value.length || selTypes.value.length || selPMs.value.length || selSalesReps.value.length || selEquipment.value.length || selUtility.value.length || selPermitTech.value.length || dateFrom.value || dateTo.value || searchQuery.value)

// ─── Filter Templates (save/load from BigQuery) ─────
const savedTemplates = ref<any[]>([])
const showSaveDialog = ref(false)
const showTemplatesPanel = ref(false)
const templateName = ref('')
const savingTemplate = ref(false)
const loadingTemplates = ref(false)

function getCurrentFilters() {
  return {
    selStatuses: selStatuses.value, selJobStatuses: selJobStatuses.value, selBranches: selBranches.value,
    selTypes: selTypes.value, selPMs: selPMs.value, selSalesReps: selSalesReps.value,
    selEquipment: selEquipment.value, selUtility: selUtility.value, selPermitTech: selPermitTech.value,
    dateFrom: dateFrom.value, dateTo: dateTo.value,
  }
}

function applyTemplate(t: any) {
  try {
    const f = typeof t.filters === 'string' ? JSON.parse(t.filters) : t.filters
    selStatuses.value = f.selStatuses || []; selJobStatuses.value = f.selJobStatuses || []
    selBranches.value = f.selBranches || []; selTypes.value = f.selTypes || []
    selPMs.value = f.selPMs || []; selSalesReps.value = f.selSalesReps || []
    selEquipment.value = f.selEquipment || []; selUtility.value = f.selUtility || []
    selPermitTech.value = f.selPermitTech || []
    dateFrom.value = f.dateFrom || ''; dateTo.value = f.dateTo || ''
    showTemplatesPanel.value = false
    toast.success(`Template "${t.name}" applied`)
  } catch { toast.error('Failed to apply template') }
}

async function loadTemplates() {
  if (!user.value?.email) return
  loadingTemplates.value = true
  try {
    const data = await $fetch<{ success: boolean, templates: any[] }>('/api/bigquery/filter-templates', {
      query: { route: '/reports/general', userEmail: user.value.email },
    })
    if (data.success) savedTemplates.value = data.templates
  } catch { /* silent */ } finally { loadingTemplates.value = false }
}

async function saveTemplate() {
  if (!templateName.value.trim() || !user.value?.email) return
  savingTemplate.value = true
  try {
    await $fetch('/api/bigquery/filter-templates', {
      method: 'POST',
      body: {
        name: templateName.value.trim(),
        route: '/reports/general',
        filters: getCurrentFilters(),
        userEmail: user.value.email,
        userName: user.value.name || user.value.email,
        isShared: false,
      },
    })
    toast.success('Template saved!')
    showSaveDialog.value = false; templateName.value = ''
    loadTemplates()
  } catch { toast.error('Failed to save template') } finally { savingTemplate.value = false }
}

async function deleteTemplate(id: string) {
  try {
    await $fetch('/api/bigquery/filter-templates', { method: 'DELETE', body: { id } })
    toast.success('Template deleted')
    savedTemplates.value = savedTemplates.value.filter(t => t.id !== id)
  } catch { toast.error('Failed to delete template') }
}

onMounted(() => loadTemplates())

const barColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16']
const donutColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4']
const avatarColors = ['bg-violet-500/15 text-violet-600 dark:text-violet-400', 'bg-pink-500/15 text-pink-600 dark:text-pink-400', 'bg-blue-500/15 text-blue-600 dark:text-blue-400', 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', 'bg-amber-500/15 text-amber-600 dark:text-amber-400', 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400', 'bg-rose-500/15 text-rose-600 dark:text-rose-400', 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400']
</script>

<template>
  <div class="w-full flex-1 min-h-0 flex">
    <!-- ═══ SUB SIDEBAR ═══ -->
    <div class="shrink-0 border-r bg-card/50 flex flex-col min-h-0 transition-all duration-300 overflow-hidden" :class="sidebarCollapsed ? 'w-[52px]' : 'w-[260px]'">
      <div class="flex items-center justify-between px-3 pt-3 pb-1">
        <p v-if="!sidebarCollapsed" class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Filters</p>
        <div class="flex items-center gap-1">
          <button v-if="!sidebarCollapsed" class="p-1 rounded-md hover:bg-muted transition-colors" title="Load Template" @click="showTemplatesPanel = !showTemplatesPanel">
            <Icon name="i-lucide-folder-open" class="size-3.5 text-muted-foreground" />
          </button>
          <button v-if="!sidebarCollapsed && hasActiveFilters" class="p-1 rounded-md hover:bg-muted transition-colors" title="Save Filters as Template" @click="showSaveDialog = true">
            <Icon name="i-lucide-save" class="size-3.5 text-muted-foreground" />
          </button>
          <button class="p-1 rounded-md hover:bg-muted transition-colors" @click="sidebarCollapsed = !sidebarCollapsed">
            <Icon :name="sidebarCollapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'" class="size-3.5 text-muted-foreground" />
          </button>
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
        <!-- Project Status -->
        <div class="space-y-1.5">
          <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
            <Icon name="i-lucide-activity" class="size-3" />Project Status
            <Badge v-if="selStatuses.length" variant="secondary" class="text-[9px] px-1 py-0 ml-auto">{{ selStatuses.length }}</Badge>
          </label>
          <div class="relative">
            <Icon name="i-lucide-search" class="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40" />
            <input v-model="filterSearch.status" placeholder="Search statuses…" class="w-full h-7 pl-7 pr-2 text-[11px] rounded-md border bg-background/50 outline-none focus:ring-1 focus:ring-primary/30 transition-all" />
          </div>
          <div class="max-h-[140px] overflow-y-auto space-y-0.5 rounded-lg border bg-background/50 p-1">
            <label v-for="opt in filteredOpts(statuses, filterSearch.status)" :key="opt.value" class="flex items-center gap-2 px-2 py-1 rounded-md text-[11px] cursor-pointer transition-colors hover:bg-muted" :class="selStatuses.includes(opt.value) ? 'bg-primary/5 text-primary font-medium' : 'text-muted-foreground'">
              <input type="checkbox" :checked="selStatuses.includes(opt.value)" class="size-3 rounded accent-primary cursor-pointer" @change="toggleFilter('status', opt.value)" />
              <span class="truncate flex-1">{{ opt.value }}</span>
              <span class="text-[9px] tabular-nums text-muted-foreground/60 shrink-0">{{ opt.count }}</span>
            </label>
            <p v-if="filteredOpts(statuses, filterSearch.status).length === 0" class="text-[10px] text-muted-foreground/50 text-center py-2">No matches</p>
          </div>
        </div>
        <!-- Job Status -->
        <div class="space-y-1.5">
          <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
            <Icon name="i-lucide-briefcase" class="size-3" />Job Status
            <Badge v-if="selJobStatuses.length" variant="secondary" class="text-[9px] px-1 py-0 ml-auto">{{ selJobStatuses.length }}</Badge>
          </label>
          <div class="relative">
            <Icon name="i-lucide-search" class="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40" />
            <input v-model="filterSearch.jobStatus" placeholder="Search job statuses…" class="w-full h-7 pl-7 pr-2 text-[11px] rounded-md border bg-background/50 outline-none focus:ring-1 focus:ring-primary/30 transition-all" />
          </div>
          <div class="max-h-[140px] overflow-y-auto space-y-0.5 rounded-lg border bg-background/50 p-1">
            <label v-for="opt in filteredOpts(jobStatuses, filterSearch.jobStatus)" :key="opt.value" class="flex items-center gap-2 px-2 py-1 rounded-md text-[11px] cursor-pointer transition-colors hover:bg-muted" :class="selJobStatuses.includes(opt.value) ? 'bg-primary/5 text-primary font-medium' : 'text-muted-foreground'">
              <input type="checkbox" :checked="selJobStatuses.includes(opt.value)" class="size-3 rounded accent-primary cursor-pointer" @change="toggleFilter('jobStatus', opt.value)" />
              <span class="truncate flex-1">{{ opt.value }}</span>
              <span class="text-[9px] tabular-nums text-muted-foreground/60 shrink-0">{{ opt.count }}</span>
            </label>
            <p v-if="filteredOpts(jobStatuses, filterSearch.jobStatus).length === 0" class="text-[10px] text-muted-foreground/50 text-center py-2">No matches</p>
          </div>
        </div>
        <!-- Branch -->
        <div class="space-y-1.5">
          <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
            <Icon name="i-lucide-git-branch" class="size-3" />Branch
            <Badge v-if="selBranches.length" variant="secondary" class="text-[9px] px-1 py-0 ml-auto">{{ selBranches.length }}</Badge>
          </label>
          <div class="relative">
            <Icon name="i-lucide-search" class="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40" />
            <input v-model="filterSearch.branch" placeholder="Search branches…" class="w-full h-7 pl-7 pr-2 text-[11px] rounded-md border bg-background/50 outline-none focus:ring-1 focus:ring-primary/30 transition-all" />
          </div>
          <div class="max-h-[140px] overflow-y-auto space-y-0.5 rounded-lg border bg-background/50 p-1">
            <label v-for="opt in filteredOpts(branches, filterSearch.branch)" :key="opt.value" class="flex items-center gap-2 px-2 py-1 rounded-md text-[11px] cursor-pointer transition-colors hover:bg-muted" :class="selBranches.includes(opt.value) ? 'bg-primary/5 text-primary font-medium' : 'text-muted-foreground'">
              <input type="checkbox" :checked="selBranches.includes(opt.value)" class="size-3 rounded accent-primary cursor-pointer" @change="toggleFilter('branch', opt.value)" />
              <span class="truncate flex-1">{{ opt.value }}</span>
              <span class="text-[9px] tabular-nums text-muted-foreground/60 shrink-0">{{ opt.count }}</span>
            </label>
            <p v-if="filteredOpts(branches, filterSearch.branch).length === 0" class="text-[10px] text-muted-foreground/50 text-center py-2">No matches</p>
          </div>
        </div>
        <!-- Project Type -->
        <div class="space-y-1.5">
          <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
            <Icon name="i-lucide-layers" class="size-3" />Project Type
            <Badge v-if="selTypes.length" variant="secondary" class="text-[9px] px-1 py-0 ml-auto">{{ selTypes.length }}</Badge>
          </label>
          <div class="relative">
            <Icon name="i-lucide-search" class="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40" />
            <input v-model="filterSearch.type" placeholder="Search types…" class="w-full h-7 pl-7 pr-2 text-[11px] rounded-md border bg-background/50 outline-none focus:ring-1 focus:ring-primary/30 transition-all" />
          </div>
          <div class="max-h-[140px] overflow-y-auto space-y-0.5 rounded-lg border bg-background/50 p-1">
            <label v-for="opt in filteredOpts(types, filterSearch.type)" :key="opt.value" class="flex items-center gap-2 px-2 py-1 rounded-md text-[11px] cursor-pointer transition-colors hover:bg-muted" :class="selTypes.includes(opt.value) ? 'bg-primary/5 text-primary font-medium' : 'text-muted-foreground'">
              <input type="checkbox" :checked="selTypes.includes(opt.value)" class="size-3 rounded accent-primary cursor-pointer" @change="toggleFilter('type', opt.value)" />
              <span class="truncate flex-1">{{ opt.value }}</span>
              <span class="text-[9px] tabular-nums text-muted-foreground/60 shrink-0">{{ opt.count }}</span>
            </label>
            <p v-if="filteredOpts(types, filterSearch.type).length === 0" class="text-[10px] text-muted-foreground/50 text-center py-2">No matches</p>
          </div>
        </div>
        <!-- Project Manager -->
        <div class="space-y-1.5">
          <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
            <Icon name="i-lucide-user" class="size-3" />Project Manager
            <Badge v-if="selPMs.length" variant="secondary" class="text-[9px] px-1 py-0 ml-auto">{{ selPMs.length }}</Badge>
          </label>
          <div class="relative">
            <Icon name="i-lucide-search" class="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40" />
            <input v-model="filterSearch.pm" placeholder="Search managers…" class="w-full h-7 pl-7 pr-2 text-[11px] rounded-md border bg-background/50 outline-none focus:ring-1 focus:ring-primary/30 transition-all" />
          </div>
          <div class="max-h-[140px] overflow-y-auto space-y-0.5 rounded-lg border bg-background/50 p-1">
            <label v-for="pm in filteredEmailOpts(pms, filterSearch.pm)" :key="pm.email" class="flex items-center gap-2 px-2 py-1 rounded-md text-[11px] cursor-pointer transition-colors hover:bg-muted" :class="selPMs.includes(pm.email) ? 'bg-primary/5 text-primary font-medium' : 'text-muted-foreground'">
              <input type="checkbox" :checked="selPMs.includes(pm.email)" class="size-3 rounded accent-primary cursor-pointer" @change="toggleFilter('pm', pm.email)" />
              <span class="truncate flex-1">{{ pm.name }}</span>
              <span class="text-[9px] tabular-nums text-muted-foreground/60 shrink-0">{{ pm.count }}</span>
            </label>
            <p v-if="filteredEmailOpts(pms, filterSearch.pm).length === 0" class="text-[10px] text-muted-foreground/50 text-center py-2">No matches</p>
          </div>
        </div>

        <!-- Sales Rep -->
        <div class="space-y-1.5">
          <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
            <Icon name="i-lucide-user-round-search" class="size-3" />Sales Rep
            <Badge v-if="selSalesReps.length" variant="secondary" class="text-[9px] px-1 py-0 ml-auto">{{ selSalesReps.length }}</Badge>
          </label>
          <div class="relative"><Icon name="i-lucide-search" class="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40" /><input v-model="filterSearch.salesRep" placeholder="Search reps…" class="w-full h-7 pl-7 pr-2 text-[11px] rounded-md border bg-background/50 outline-none focus:ring-1 focus:ring-primary/30 transition-all" /></div>
          <div class="max-h-[140px] overflow-y-auto space-y-0.5 rounded-lg border bg-background/50 p-1">
            <label v-for="sr in filteredEmailOpts(salesRepOpts, filterSearch.salesRep)" :key="sr.email" class="flex items-center gap-2 px-2 py-1 rounded-md text-[11px] cursor-pointer transition-colors hover:bg-muted" :class="selSalesReps.includes(sr.email) ? 'bg-primary/5 text-primary font-medium' : 'text-muted-foreground'">
              <input type="checkbox" :checked="selSalesReps.includes(sr.email)" class="size-3 rounded accent-primary cursor-pointer" @change="toggleFilter('salesRep', sr.email)" />
              <span class="truncate flex-1">{{ sr.name }}</span>
              <span class="text-[9px] tabular-nums text-muted-foreground/60 shrink-0">{{ sr.count }}</span>
            </label>
            <p v-if="filteredEmailOpts(salesRepOpts, filterSearch.salesRep).length === 0" class="text-[10px] text-muted-foreground/50 text-center py-2">No matches</p>
          </div>
        </div>
        <!-- Equipment -->
        <div class="space-y-1.5">
          <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
            <Icon name="i-lucide-wrench" class="size-3" />Equipment
            <Badge v-if="selEquipment.length" variant="secondary" class="text-[9px] px-1 py-0 ml-auto">{{ selEquipment.length }}</Badge>
          </label>
          <div class="relative"><Icon name="i-lucide-search" class="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40" /><input v-model="filterSearch.equipment" placeholder="Search equipment…" class="w-full h-7 pl-7 pr-2 text-[11px] rounded-md border bg-background/50 outline-none focus:ring-1 focus:ring-primary/30 transition-all" /></div>
          <div class="max-h-[140px] overflow-y-auto space-y-0.5 rounded-lg border bg-background/50 p-1">
            <label v-for="opt in filteredOpts(equipments, filterSearch.equipment)" :key="opt.value" class="flex items-center gap-2 px-2 py-1 rounded-md text-[11px] cursor-pointer transition-colors hover:bg-muted" :class="selEquipment.includes(opt.value) ? 'bg-primary/5 text-primary font-medium' : 'text-muted-foreground'">
              <input type="checkbox" :checked="selEquipment.includes(opt.value)" class="size-3 rounded accent-primary cursor-pointer" @change="toggleFilter('equipment', opt.value)" />
              <span class="truncate flex-1">{{ opt.value }}</span>
              <span class="text-[9px] tabular-nums text-muted-foreground/60 shrink-0">{{ opt.count }}</span>
            </label>
            <p v-if="filteredOpts(equipments, filterSearch.equipment).length === 0" class="text-[10px] text-muted-foreground/50 text-center py-2">No matches</p>
          </div>
        </div>
        <!-- Utility -->
        <div class="space-y-1.5">
          <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
            <Icon name="i-lucide-plug-zap" class="size-3" />Utility
            <Badge v-if="selUtility.length" variant="secondary" class="text-[9px] px-1 py-0 ml-auto">{{ selUtility.length }}</Badge>
          </label>
          <div class="relative"><Icon name="i-lucide-search" class="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40" /><input v-model="filterSearch.utility" placeholder="Search utilities…" class="w-full h-7 pl-7 pr-2 text-[11px] rounded-md border bg-background/50 outline-none focus:ring-1 focus:ring-primary/30 transition-all" /></div>
          <div class="max-h-[140px] overflow-y-auto space-y-0.5 rounded-lg border bg-background/50 p-1">
            <label v-for="opt in filteredOpts(utilities, filterSearch.utility)" :key="opt.value" class="flex items-center gap-2 px-2 py-1 rounded-md text-[11px] cursor-pointer transition-colors hover:bg-muted" :class="selUtility.includes(opt.value) ? 'bg-primary/5 text-primary font-medium' : 'text-muted-foreground'">
              <input type="checkbox" :checked="selUtility.includes(opt.value)" class="size-3 rounded accent-primary cursor-pointer" @change="toggleFilter('utility', opt.value)" />
              <span class="truncate flex-1">{{ opt.value }}</span>
              <span class="text-[9px] tabular-nums text-muted-foreground/60 shrink-0">{{ opt.count }}</span>
            </label>
            <p v-if="filteredOpts(utilities, filterSearch.utility).length === 0" class="text-[10px] text-muted-foreground/50 text-center py-2">No matches</p>
          </div>
        </div>
        <!-- Permit Tech -->
        <div class="space-y-1.5">
          <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
            <Icon name="i-lucide-file-check" class="size-3" />Permit Tech
            <Badge v-if="selPermitTech.length" variant="secondary" class="text-[9px] px-1 py-0 ml-auto">{{ selPermitTech.length }}</Badge>
          </label>
          <div class="relative"><Icon name="i-lucide-search" class="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40" /><input v-model="filterSearch.permitTech" placeholder="Search permit techs…" class="w-full h-7 pl-7 pr-2 text-[11px] rounded-md border bg-background/50 outline-none focus:ring-1 focus:ring-primary/30 transition-all" /></div>
          <div class="max-h-[140px] overflow-y-auto space-y-0.5 rounded-lg border bg-background/50 p-1">
            <label v-for="pt in filteredEmailOpts(permitTechs, filterSearch.permitTech)" :key="pt.email" class="flex items-center gap-2 px-2 py-1 rounded-md text-[11px] cursor-pointer transition-colors hover:bg-muted" :class="selPermitTech.includes(pt.email) ? 'bg-primary/5 text-primary font-medium' : 'text-muted-foreground'">
              <input type="checkbox" :checked="selPermitTech.includes(pt.email)" class="size-3 rounded accent-primary cursor-pointer" @change="toggleFilter('permitTech', pt.email)" />
              <span class="truncate flex-1">{{ pt.name }}</span>
              <span class="text-[9px] tabular-nums text-muted-foreground/60 shrink-0">{{ pt.count }}</span>
            </label>
            <p v-if="filteredEmailOpts(permitTechs, filterSearch.permitTech).length === 0" class="text-[10px] text-muted-foreground/50 text-center py-2">No matches</p>
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
            <Badge v-for="s in selStatuses" :key="'st-'+s" variant="secondary" class="text-[10px] gap-1">{{ s }}<button class="ml-0.5 hover:text-destructive" @click="toggleFilter('status', s)">×</button></Badge>
            <Badge v-for="s in selJobStatuses" :key="'js-'+s" variant="secondary" class="text-[10px] gap-1">{{ s }}<button class="ml-0.5 hover:text-destructive" @click="toggleFilter('jobStatus', s)">×</button></Badge>
            <Badge v-for="s in selBranches" :key="'br-'+s" variant="secondary" class="text-[10px] gap-1">{{ s }}<button class="ml-0.5 hover:text-destructive" @click="toggleFilter('branch', s)">×</button></Badge>
            <Badge v-for="s in selTypes" :key="'ty-'+s" variant="secondary" class="text-[10px] gap-1">{{ s }}<button class="ml-0.5 hover:text-destructive" @click="toggleFilter('type', s)">×</button></Badge>
            <Badge v-for="s in selPMs" :key="'pm-'+s" variant="secondary" class="text-[10px] gap-1">{{ resolveName(s) }}<button class="ml-0.5 hover:text-destructive" @click="toggleFilter('pm', s)">×</button></Badge>
            <Badge v-for="s in selSalesReps" :key="'sr-'+s" variant="secondary" class="text-[10px] gap-1">{{ resolveName(s) }}<button class="ml-0.5 hover:text-destructive" @click="toggleFilter('salesRep', s)">×</button></Badge>
            <Badge v-for="s in selEquipment" :key="'eq-'+s" variant="secondary" class="text-[10px] gap-1">{{ s }}<button class="ml-0.5 hover:text-destructive" @click="toggleFilter('equipment', s)">×</button></Badge>
            <Badge v-for="s in selUtility" :key="'ut-'+s" variant="secondary" class="text-[10px] gap-1">{{ s }}<button class="ml-0.5 hover:text-destructive" @click="toggleFilter('utility', s)">×</button></Badge>
            <Badge v-for="s in selPermitTech" :key="'pt-'+s" variant="secondary" class="text-[10px] gap-1">{{ resolveName(s) }}<button class="ml-0.5 hover:text-destructive" @click="toggleFilter('permitTech', s)">×</button></Badge>
            <Badge v-if="dateFrom" variant="secondary" class="text-[10px] gap-1">From: {{ dateFrom }}<button class="ml-0.5 hover:text-destructive" @click="dateFrom = ''">×</button></Badge>
            <Badge v-if="dateTo" variant="secondary" class="text-[10px] gap-1">To: {{ dateTo }}<button class="ml-0.5 hover:text-destructive" @click="dateTo = ''">×</button></Badge>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="mt-auto pt-3 space-y-2">
          <Separator />
          <div class="rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-transparent p-3 space-y-2 border border-primary/10">
            <div class="flex items-center gap-2"><div class="size-7 rounded-lg bg-primary/15 flex items-center justify-center"><Icon name="i-lucide-activity" class="size-3.5 text-primary" /></div><div><p class="text-[10px] text-muted-foreground">Filtered Results</p><p class="text-sm font-bold tabular-nums">{{ filteredProjects.length.toLocaleString() }}</p></div></div>
            <div class="flex items-center gap-2"><div class="size-7 rounded-lg bg-emerald-500/15 flex items-center justify-center"><Icon name="i-lucide-dollar-sign" class="size-3.5 text-emerald-600" /></div><div><p class="text-[10px] text-muted-foreground">Total Value</p><p class="text-sm font-bold tabular-nums">{{ fmt(filteredProjects.reduce((s, p) => s + parsePrice(p['Project Price']), 0)) }}</p></div></div>
          </div>
        </div>
      </div>

      <!-- Collapsed icons -->
      <div v-else class="flex flex-col items-center gap-2 py-3 flex-1">
        <div class="p-1.5 rounded-md" :class="selStatuses.length ? 'bg-primary/10' : ''"><Icon name="i-lucide-activity" class="size-3.5 text-muted-foreground" /></div>
        <div class="p-1.5 rounded-md" :class="selBranches.length ? 'bg-primary/10' : ''"><Icon name="i-lucide-git-branch" class="size-3.5 text-muted-foreground" /></div>
        <div class="p-1.5 rounded-md" :class="selTypes.length ? 'bg-primary/10' : ''"><Icon name="i-lucide-layers" class="size-3.5 text-muted-foreground" /></div>
        <div class="p-1.5 rounded-md" :class="dateFrom || dateTo ? 'bg-primary/10' : ''"><Icon name="i-lucide-calendar" class="size-3.5 text-muted-foreground" /></div>
      </div>
    </div>

    <!-- ═══ MAIN CONTENT ═══ -->
    <div class="flex-1 min-w-0 min-h-0 flex flex-col overflow-auto">
      <div class="flex flex-col gap-5 p-4">
        <!-- Header Bar -->
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-1 border rounded-lg p-1 bg-muted/30 w-fit">
            <button v-for="tab in [{ id: 'overview', label: 'Overview', icon: 'i-lucide-layout-dashboard' }, { id: 'analytics', label: 'Analytics', icon: 'i-lucide-bar-chart-3' }, { id: 'data', label: 'Data Table', icon: 'i-lucide-table' }]" :key="tab.id" class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all" :class="activeTab === tab.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'" @click="activeTab = tab.id">
              <Icon :name="tab.icon" class="size-3.5" />{{ tab.label }}
            </button>
          </div>
          <div class="flex items-center gap-2">
            <div class="relative"><Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50" /><Input v-model="searchQuery" placeholder="Search projects…" class="h-8 pl-8 w-[220px] text-xs" /></div>
            <Badge variant="secondary" class="text-xs h-7 px-2.5">{{ filteredProjects.length.toLocaleString() }} projects</Badge>
          </div>
        </div>

        <!-- KPI Cards -->
        <div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Card v-for="(kpi, i) in kpis" :key="i" class="group hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
            <CardContent class="p-4 space-y-2">
              <div class="flex items-center justify-between"><div class="flex items-center justify-center rounded-lg p-1.5 transition-transform group-hover:scale-110" :class="kpi.bg"><Icon :name="kpi.icon" class="size-3.5" :class="kpi.color" /></div></div>
              <div><p class="text-xl font-bold tabular-nums leading-tight">{{ kpi.prefix }}<NumberFlow :value="kpi.value" :format="{ notation: kpi.value > 99999 ? 'compact' : 'standard', maximumFractionDigits: 1 }" />{{ kpi.suffix }}</p><p class="text-[10px] text-muted-foreground mt-0.5">{{ kpi.label }}</p></div>
            </CardContent>
          </Card>
        </div>

        <!-- ═══ OVERVIEW TAB ═══ -->
        <template v-if="activeTab === 'overview'">
          <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card class="lg:col-span-2">
              <CardHeader class="pb-2"><div class="flex items-center justify-between"><div><CardTitle class="text-sm font-semibold">Monthly Revenue Trend</CardTitle><CardDescription>Revenue vs Net Income ({{ new Date().getFullYear() }})</CardDescription></div></div></CardHeader>
              <CardContent><AreaChart :data="monthlyTrend" index="month" :categories="['revenue', 'netIncome']" :colors="['#8b5cf6', '#10b981']" :y-formatter="(v: number | Date) => `$${(Number(v) / 1000).toFixed(0)}K`" class="h-[280px]" :show-legend="true" /></CardContent>
            </Card>
            <Card>
              <CardHeader class="pb-2"><CardTitle class="text-sm font-semibold">Revenue by Type</CardTitle><CardDescription>Project type distribution</CardDescription></CardHeader>
              <CardContent class="flex flex-col items-center">
                <DonutChart :data="typeData" index="name" category="value" :colors="donutColors" :value-formatter="(v: number) => fmt(v)" class="h-[180px]" />
                <div class="w-full mt-4 space-y-2"><div v-for="(t, i) in typeData" :key="t.name" class="flex items-center justify-between text-xs"><div class="flex items-center gap-2"><div class="size-2.5 rounded-full" :style="{ background: donutColors[i % donutColors.length] }" /><span class="text-muted-foreground truncate">{{ t.name }}</span></div><span class="font-semibold tabular-nums">{{ fmt(t.value) }}</span></div></div>
              </CardContent>
            </Card>
          </div>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader class="pb-2"><CardTitle class="text-sm font-semibold">Project Status Pipeline</CardTitle><CardDescription>Revenue by project status</CardDescription></CardHeader>
              <CardContent><div class="space-y-3"><div v-for="(s, i) in statusData" :key="s.name" class="space-y-1.5"><div class="flex items-center justify-between text-sm"><div class="flex items-center gap-2"><div class="size-3 rounded" :style="{ background: barColors[i % barColors.length] }" /><span class="font-medium">{{ s.name }}</span><Badge variant="secondary" class="text-[10px] px-1.5 py-0">{{ s.count }}</Badge></div><span class="font-semibold tabular-nums">{{ fmt(s.revenue) }}</span></div><div class="h-6 rounded-lg overflow-hidden bg-muted/50 relative"><div class="h-full rounded-lg transition-all duration-1000 flex items-center px-3" :style="{ width: `${Math.max((s.revenue / statusMax) * 100, 3)}%`, background: barColors[i % barColors.length] }"><span v-if="(s.revenue / statusMax) * 100 > 10" class="text-white text-[10px] font-semibold">{{ Math.round((s.revenue / statusMax) * 100) }}%</span></div></div></div></div></CardContent>
            </Card>
            <Card>
              <CardHeader class="pb-2"><CardTitle class="text-sm font-semibold">Revenue by Branch</CardTitle><CardDescription>Branch performance breakdown</CardDescription></CardHeader>
              <CardContent><div class="space-y-4"><div v-for="r in branchData" :key="r.branch" class="space-y-1.5"><div class="flex items-center justify-between text-sm"><span class="font-medium">{{ r.branch }}</span><span class="text-muted-foreground tabular-nums">{{ fmt(r.revenue) }} <span class="text-[10px]">({{ r.pct }}%)</span></span></div><div class="h-2 rounded-full bg-muted overflow-hidden"><div class="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-1000" :style="{ width: `${r.pct}%` }" /></div></div></div></CardContent>
            </Card>
          </div>

          <!-- Top Projects -->
          <Card>
            <CardHeader class="pb-2"><div class="flex items-center justify-between"><div><CardTitle class="text-sm font-semibold">Top Projects by Value</CardTitle><CardDescription>Highest revenue projects</CardDescription></div><Badge variant="secondary" class="text-xs">{{ topProjects.length }} projects</Badge></div></CardHeader>
            <CardContent class="p-0">
              <Table><TableHeader><TableRow><TableHead>Project ID</TableHead><TableHead>Customer</TableHead><TableHead>Branch</TableHead><TableHead>Type</TableHead><TableHead class="text-right">Price</TableHead><TableHead class="text-right">Net</TableHead><TableHead>Status</TableHead><TableHead>PM</TableHead><TableHead>Start</TableHead></TableRow></TableHeader>
                <TableBody><TableRow v-for="(p, i) in topProjects" :key="p.id + i"><TableCell><NuxtLink :to="`/projects/${p.id}`" class="text-primary hover:underline font-mono text-[11px]">{{ p.id }}</NuxtLink></TableCell><TableCell class="text-sm">{{ p.customer }}</TableCell><TableCell class="text-sm">{{ p.branch }}</TableCell><TableCell class="text-sm">{{ p.type }}</TableCell><TableCell class="text-right font-semibold tabular-nums text-sm">{{ fmtFull(p.price) }}</TableCell><TableCell class="text-right tabular-nums text-sm">{{ fmtFull(p.net) }}</TableCell><TableCell><Badge variant="outline" :class="statusColor(p.status)" class="text-[10px]">{{ p.status }}</Badge></TableCell><TableCell class="text-sm">{{ p.pm }}</TableCell><TableCell class="text-sm tabular-nums">{{ p.start }}</TableCell></TableRow></TableBody>
              </Table>
            </CardContent>
          </Card>
        </template>

        <!-- ═══ ANALYTICS TAB ═══ -->
        <template v-if="activeTab === 'analytics'">
          <Card>
            <CardHeader class="pb-2"><div class="flex items-center justify-between"><div><CardTitle class="text-sm font-semibold">Project Manager Leaderboard</CardTitle><CardDescription>Performance ranking by revenue managed</CardDescription></div><Badge variant="secondary" class="text-xs">{{ pmLeaderboard.length }} managers</Badge></div></CardHeader>
            <CardContent class="p-0">
              <Table><TableHeader><TableRow><TableHead class="w-12">Rank</TableHead><TableHead>Manager</TableHead><TableHead class="text-right">Revenue</TableHead><TableHead class="text-center">Projects</TableHead><TableHead>Completion Rate</TableHead><TableHead class="text-right">Avg. Project</TableHead></TableRow></TableHeader>
                <TableBody><TableRow v-for="(rep, i) in pmLeaderboard" :key="rep.email"><TableCell><div class="flex items-center justify-center size-6 rounded-full text-[10px] font-bold" :class="i < 3 ? 'bg-amber-500/15 text-amber-600' : 'bg-muted text-muted-foreground'">{{ i + 1 }}</div></TableCell><TableCell><div class="flex items-center gap-2.5"><div class="flex items-center justify-center rounded-full size-8 text-xs font-bold" :class="avatarColors[i % avatarColors.length]">{{ rep.avatar }}</div><p class="text-sm font-medium">{{ rep.name }}</p></div></TableCell><TableCell class="text-right font-semibold tabular-nums">{{ fmtFull(rep.revenue) }}</TableCell><TableCell class="text-center tabular-nums">{{ rep.count }}</TableCell><TableCell><div class="flex items-center gap-2"><div class="flex-1 h-2 rounded-full bg-muted overflow-hidden"><div class="h-full rounded-full transition-all" :class="rep.rate >= 80 ? 'bg-emerald-500' : rep.rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'" :style="{ width: `${rep.rate}%` }" /></div><span class="text-xs font-medium tabular-nums w-8 text-right">{{ rep.rate }}%</span></div></TableCell><TableCell class="text-right tabular-nums text-sm text-muted-foreground">{{ rep.count > 0 ? fmt(Math.round(rep.revenue / rep.count)) : '—' }}</TableCell></TableRow></TableBody>
              </Table>
            </CardContent>
          </Card>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader class="pb-2"><CardTitle class="text-sm font-semibold">Job Status Distribution</CardTitle><CardDescription>Projects by job status</CardDescription></CardHeader>
              <CardContent><BarChart :data="jobStatusData" index="name" :categories="['count']" :colors="['#3b82f6']" :rounded-corners="6" class="h-[260px]" /></CardContent>
            </Card>
            <Card>
              <CardHeader class="pb-2"><CardTitle class="text-sm font-semibold">Project Milestone Completion</CardTitle><CardDescription>Percentage of projects with milestone dates filled</CardDescription></CardHeader>
              <CardContent><div class="space-y-3"><div v-for="(m, i) in ptoData" :key="m.label" class="space-y-1.5"><div class="flex items-center justify-between text-sm"><div class="flex items-center gap-2"><div class="size-2.5 rounded-full" :style="{ background: barColors[i % barColors.length] }" /><span class="font-medium">{{ m.label }}</span></div><div class="flex items-center gap-2"><Badge variant="secondary" class="text-[10px]">{{ m.filled }}/{{ m.total }}</Badge><span class="font-semibold tabular-nums text-sm">{{ m.pct }}%</span></div></div><div class="h-2 rounded-full bg-muted overflow-hidden"><div class="h-full rounded-full transition-all duration-700" :style="{ width: `${m.pct}%`, background: barColors[i % barColors.length] }" /></div></div></div></CardContent>
            </Card>
          </div>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader class="pb-2"><CardTitle class="text-sm font-semibold">Solar Equipment Usage</CardTitle><CardDescription>Equipment distribution across projects</CardDescription></CardHeader>
              <CardContent><div class="space-y-3"><div v-for="(e, i) in equipmentData" :key="e.name" class="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/30 transition-colors"><div class="flex items-center gap-2.5"><div class="size-8 rounded-lg flex items-center justify-center text-[10px] font-bold" :class="avatarColors[i % avatarColors.length]">{{ e.name.slice(0, 2).toUpperCase() }}</div><div><p class="text-sm font-medium truncate max-w-[180px]">{{ e.name }}</p><p class="text-[10px] text-muted-foreground">{{ e.count }} projects · {{ e.kw }} KW</p></div></div><Badge variant="secondary" class="text-[10px]">{{ e.count }}</Badge></div></div></CardContent>
            </Card>
            <Card>
              <CardHeader class="pb-2"><CardTitle class="text-sm font-semibold">Monthly Project Count</CardTitle><CardDescription>New projects per month</CardDescription></CardHeader>
              <CardContent><BarChart :data="monthlyTrend" index="month" :categories="['projects']" :colors="['#10b981']" :rounded-corners="6" class="h-[260px]" /></CardContent>
            </Card>
          </div>
        </template>

        <!-- ═══ DATA TABLE TAB ═══ -->
        <template v-if="activeTab === 'data'">
          <Card class="flex-1">
            <CardContent class="p-0"><div class="flex-1 overflow-auto"><table class="w-full"><thead class="sticky top-0 z-10"><tr class="bg-muted/60 backdrop-blur-sm"><th v-for="col in tableCols" :key="col.key" class="text-left font-semibold text-muted-foreground select-none transition-colors border-b whitespace-nowrap px-3 py-2.5 text-xs cursor-pointer hover:text-foreground" @click="toggleSort(col.key)"><div class="flex items-center gap-1"><span>{{ col.label }}</span><Icon v-if="sortKey === col.key" :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-3 text-primary shrink-0" /></div></th></tr></thead>
              <tbody><tr v-for="(rec, idx) in visible" :key="rec['Project ID'] || idx" class="border-b border-border/20 hover:bg-muted/15 transition-colors cursor-pointer" @click="navigateTo(`/projects/${rec['Project ID']}`)"><td v-for="col in tableCols" :key="col.key" class="whitespace-nowrap px-3 py-2 text-xs">
                <NuxtLink v-if="col.key === 'Project ID'" :to="`/projects/${rec['Project ID']}`" class="text-primary hover:underline font-mono text-[11px]" @click.stop>{{ rec['Project ID'] }}</NuxtLink>
                <template v-else-if="statusCols.includes(col.key)"><Badge v-if="rec[col.key]" variant="outline" :class="statusColor(rec[col.key])" class="text-[10px]">{{ rec[col.key] }}</Badge><span v-else class="text-muted-foreground/40">—</span></template>
                <span v-else-if="currCols.includes(col.key)" class="font-medium tabular-nums">{{ rec[col.key] ? `$${Number(rec[col.key]).toLocaleString()}` : '—' }}</span>
                <span v-else-if="dateCols.includes(col.key)" class="tabular-nums">{{ formatDate(rec[col.key]) }}</span>
                <span v-else-if="emailCols.includes(col.key)">{{ resolveName(rec[col.key]) }}</span>
                <span v-else-if="col.key === 'Customer name'" class="font-medium">{{ resolveCustomer(rec) }}</span>
                <span v-else class="truncate max-w-[150px] block">{{ rec[col.key] || '—' }}</span>
              </td></tr>
              <tr v-if="visible.length === 0"><td :colspan="tableCols.length" class="text-center py-12 text-muted-foreground"><div class="flex flex-col items-center gap-2"><div class="size-12 rounded-xl bg-muted/30 flex items-center justify-center"><Icon name="i-lucide-search-x" class="size-6 text-muted-foreground/20" /></div><p class="text-xs">No matching projects</p><Button v-if="hasActiveFilters" variant="outline" size="sm" class="text-xs mt-1" @click="resetFilters"><Icon name="i-lucide-x" class="size-3 mr-1" />Clear Filters</Button></div></td></tr></tbody></table>
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
        <DialogTitle class="flex items-center gap-2">
          <div class="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="i-lucide-save" class="size-4 text-primary" />
          </div>
          Save Filter Template
        </DialogTitle>
        <DialogDescription class="text-sm">
          Save your current filter selections as a reusable template. You can load it anytime from the sidebar.
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-3 mt-2">
        <div class="space-y-1.5">
          <label class="text-xs font-medium">Template Name</label>
          <Input v-model="templateName" placeholder="e.g. Active Solar Projects" class="h-9" @keydown.enter="saveTemplate" />
        </div>
        <div v-if="hasActiveFilters" class="rounded-lg border p-2.5 bg-muted/30 space-y-1">
          <p class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Filters to save</p>
          <div class="flex flex-wrap gap-1">
            <Badge v-if="selStatuses.length" variant="secondary" class="text-[9px]">{{ selStatuses.length }} statuses</Badge>
            <Badge v-if="selJobStatuses.length" variant="secondary" class="text-[9px]">{{ selJobStatuses.length }} job statuses</Badge>
            <Badge v-if="selBranches.length" variant="secondary" class="text-[9px]">{{ selBranches.length }} branches</Badge>
            <Badge v-if="selTypes.length" variant="secondary" class="text-[9px]">{{ selTypes.length }} types</Badge>
            <Badge v-if="selPMs.length" variant="secondary" class="text-[9px]">{{ selPMs.length }} PMs</Badge>
            <Badge v-if="selSalesReps.length" variant="secondary" class="text-[9px]">{{ selSalesReps.length }} reps</Badge>
            <Badge v-if="selEquipment.length" variant="secondary" class="text-[9px]">{{ selEquipment.length }} equipment</Badge>
            <Badge v-if="selUtility.length" variant="secondary" class="text-[9px]">{{ selUtility.length }} utilities</Badge>
            <Badge v-if="selPermitTech.length" variant="secondary" class="text-[9px]">{{ selPermitTech.length }} permit techs</Badge>
            <Badge v-if="dateFrom" variant="secondary" class="text-[9px]">Date from</Badge>
            <Badge v-if="dateTo" variant="secondary" class="text-[9px]">Date to</Badge>
          </div>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <Button variant="outline" size="sm" :disabled="savingTemplate" @click="showSaveDialog = false">Cancel</Button>
        <Button size="sm" :disabled="!templateName.trim() || savingTemplate" @click="saveTemplate">
          <Icon v-if="savingTemplate" name="i-lucide-loader-2" class="size-3.5 mr-1 animate-spin" />
          <Icon v-else name="i-lucide-save" class="size-3.5 mr-1" />
          Save Template
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
