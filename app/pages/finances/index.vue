<script setup lang="ts">
import { toast } from 'vue-sonner'

const { setHeader } = usePageHeader()
setHeader({ title: 'Finances', icon: 'i-lucide-banknote' })

const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

// ─── State ──────────────────────────────────────────────────
const financeRecords = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const activeFilter = ref('')

// Lookups
const userNameMap = ref<Record<string, string>>({})
const projectMap = ref<Record<string, any>>({})

// ─── Fetch ──────────────────────────────────────────────────
async function fetchAll() {
  loading.value = true
  try {
    const [finData, userData, projData] = await Promise.all([
      $fetch<{ success: boolean, finance: any[] }>('/api/bigquery/project-finance'),
      $fetch<{ success: boolean, users: any[] }>('/api/bigquery/users').catch(() => ({ success: false, users: [] })),
      $fetch<{ success: boolean, projects: any[] }>('/api/bigquery/projects').catch(() => ({ success: false, projects: [] })),
    ])
    if (finData.success) financeRecords.value = finData.finance
    if (userData.success) {
      userNameMap.value = Object.fromEntries(
        userData.users.filter((u: any) => u.Email).map((u: any) => [
          u.Email.toLowerCase(),
          [u['First Name'], u['Last Name']].filter(Boolean).join(' ') || u.Email,
        ]),
      )
    }
    if (projData.success) {
      projectMap.value = Object.fromEntries(
        projData.projects.filter((p: any) => p['Project ID']).map((p: any) => [p['Project ID'], p]),
      )
    }
  }
  catch (e: any) {
    toast.error('Failed to load finance data')
  }
  finally { loading.value = false }
}

onMounted(fetchAll)

// ─── Unique companies ───────────────────────────────────────
const companies = computed(() => {
  const set = new Set<string>()
  for (const r of financeRecords.value) {
    const c = r['Finance Company']
    if (c) set.add(c)
  }
  return Array.from(set).sort()
})

// ─── Filtered records ───────────────────────────────────────
const filteredRecords = computed(() => {
  let records = financeRecords.value
  if (activeFilter.value) {
    records = records.filter(r => r['Finance Company'] === activeFilter.value)
  }
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    records = records.filter(r =>
      (r['Project ID'] || '').toLowerCase().includes(q)
      || (r['Finance Company'] || '').toLowerCase().includes(q)
      || (r['Finance Type'] || '').toLowerCase().includes(q)
      || (r['Loan ID'] || '').toLowerCase().includes(q)
      || (r['Finance Status'] || '').toLowerCase().includes(q)
      || (r['Finance Terms'] || '').toLowerCase().includes(q)
      || (getCustomerName(r['Project ID']) || '').toLowerCase().includes(q)
    )
  }
  return records
})

// ─── Helpers ────────────────────────────────────────────────
function resolveName(email: string): string {
  if (!email) return '—'
  return userNameMap.value[email.toLowerCase()] || email
}

function getCustomerName(projectId: string): string {
  const p = projectMap.value[projectId]
  return p?.['Customer name'] || ''
}

function formatCurrency(value: any): string {
  if (!value && value !== 0) return '—'
  const n = Number.parseFloat(String(value).replace(/[^0-9.-]/g, ''))
  if (Number.isNaN(n)) return String(value)
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function formatDate(value: any): string {
  if (!value) return '—'
  try {
    const d = new Date(value?.value || value)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }
  catch { return String(value) }
}

function statusColor(status: string): string {
  const s = (status || '').toLowerCase()
  if (['completed', 'complete', 'done', 'approved', 'funded', 'rcvd', 'yes'].some(k => s.includes(k)))
    return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
  if (['in progress', 'active', 'ongoing', 'open'].some(k => s.includes(k)))
    return 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400'
  if (['pending', 'waiting', 'hold', 'new', 'submitted'].some(k => s.includes(k)))
    return 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400'
  if (['cancelled', 'canceled', 'rejected', 'failed', 'expired'].some(k => s.includes(k)))
    return 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400'
  return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
}

// ─── Sort ───────────────────────────────────────────────────
const sortKey = ref('TimeStamp')
const sortDir = ref<'asc' | 'desc'>('desc')
function toggleSort(key: string) {
  if (sortKey.value === key) { sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc' }
  else { sortKey.value = key; sortDir.value = 'desc' }
}
const sortedRecords = computed(() => {
  const arr = [...filteredRecords.value]
  const key = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return arr.sort((a, b) => {
    let av = a[key] ?? ''
    let bv = b[key] ?? ''
    if (av?.value) av = av.value
    if (bv?.value) bv = bv.value
    if (typeof av === 'string') av = av.toLowerCase()
    if (typeof bv === 'string') bv = bv.toLowerCase()
    if (av < bv) return -1 * dir
    if (av > bv) return 1 * dir
    return 0
  })
})

// Pagination
const page = ref(1)
const perPage = 50
const totalPages = computed(() => Math.ceil(sortedRecords.value.length / perPage))
const paginatedRecords = computed(() => {
  const start = (page.value - 1) * perPage
  return sortedRecords.value.slice(start, start + perPage)
})
watch([search, activeFilter], () => { page.value = 1 })

// Table columns
const columns = [
  { key: 'Project ID', label: 'Project ID', width: 'w-[100px]' },
  { key: '_customer', label: 'Customer', width: 'w-[140px]' },
  { key: 'Finance Company', label: 'Finance Co.', width: 'w-[120px]' },
  { key: 'Finance Type', label: 'Type', width: 'w-[80px]' },
  { key: 'Finance Terms', label: 'Terms', width: 'w-[150px]' },
  { key: 'Loan Amount', label: 'Loan Amt', width: 'w-[100px]' },
  { key: 'DF', label: 'DF', width: 'w-[50px]' },
  { key: 'Net Loan Amount', label: 'Net Amount', width: 'w-[100px]' },
  { key: 'Finance Status', label: 'Status', width: 'w-[100px]' },
  { key: 'Fund Date', label: 'Fund Date', width: 'w-[100px]' },
  { key: 'RTF', label: 'RTF', width: 'w-[60px]' },
  { key: 'Create By', label: 'Created By', width: 'w-[120px]' },
]
</script>

<template>
  <FinancesLayout :active-filter="activeFilter" :companies="companies" @update:active-filter="activeFilter = $event">
    <div class="w-full flex-1 flex flex-col min-h-0">
      <!-- Toolbar -->
      <Teleport v-if="isMounted" to="#header-toolbar">
        <div class="flex items-center gap-2">
          <div class="relative">
            <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50" />
            <Input
              v-model="search"
              placeholder="Search finances…"
              class="h-8 pl-8 w-[220px] text-xs"
            />
          </div>
          <Badge variant="secondary" class="text-xs h-7 px-2.5">
            {{ filteredRecords.length.toLocaleString() }} records
          </Badge>
        </div>
      </Teleport>

      <!-- Loading -->
      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <div class="flex flex-col items-center gap-3">
          <Icon name="i-lucide-loader-2" class="size-8 animate-spin text-primary" />
          <p class="text-sm text-muted-foreground">Loading finance data…</p>
        </div>
      </div>

      <!-- Table -->
      <div v-else class="flex-1 min-h-0 flex flex-col">
        <div class="flex-1 overflow-auto">
          <table class="w-full text-xs">
            <thead class="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <tr>
                <th
                  v-for="col in columns"
                  :key="col.key"
                  :class="col.width"
                  class="text-left px-3 py-2.5 font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors border-b"
                  @click="col.key !== '_customer' && toggleSort(col.key)"
                >
                  <div class="flex items-center gap-1">
                    <span>{{ col.label }}</span>
                    <Icon
                      v-if="sortKey === col.key"
                      :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
                      class="size-3 text-primary"
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(rec, idx) in paginatedRecords"
                :key="rec['Record ID'] || idx"
                class="border-b border-border/30 hover:bg-muted/20 transition-colors group"
              >
                <!-- Project ID -->
                <td class="px-3 py-2">
                  <NuxtLink :to="`/projects/${rec['Project ID']}`" class="text-primary hover:underline font-mono text-[11px]">
                    {{ rec['Project ID'] }}
                  </NuxtLink>
                </td>
                <!-- Customer Name -->
                <td class="px-3 py-2 truncate max-w-[140px]">{{ getCustomerName(rec['Project ID']) || '—' }}</td>
                <!-- Finance Company -->
                <td class="px-3 py-2 font-medium">{{ rec['Finance Company'] || '—' }}</td>
                <!-- Type -->
                <td class="px-3 py-2">{{ rec['Finance Type'] || '—' }}</td>
                <!-- Terms -->
                <td class="px-3 py-2 truncate max-w-[150px]">{{ rec['Finance Terms'] || '—' }}</td>
                <!-- Loan Amount -->
                <td class="px-3 py-2 font-medium tabular-nums">{{ rec['Loan Amount'] ? formatCurrency(rec['Loan Amount']) : '—' }}</td>
                <!-- DF -->
                <td class="px-3 py-2 tabular-nums">{{ rec['DF'] != null ? `${rec['DF']}%` : '—' }}</td>
                <!-- Net Amount -->
                <td class="px-3 py-2 font-medium tabular-nums">{{ rec['Net Loan Amount'] ? formatCurrency(rec['Net Loan Amount']) : '—' }}</td>
                <!-- Status -->
                <td class="px-3 py-2">
                  <Badge v-if="rec['Finance Status']" variant="outline" :class="statusColor(rec['Finance Status'])" class="text-[10px]">
                    {{ rec['Finance Status'] }}
                  </Badge>
                  <span v-else class="text-muted-foreground">—</span>
                </td>
                <!-- Fund Date -->
                <td class="px-3 py-2 tabular-nums">{{ rec['Fund Date'] ? formatDate(rec['Fund Date']) : '—' }}</td>
                <!-- RTF -->
                <td class="px-3 py-2">{{ rec['RTF'] || '—' }}</td>
                <!-- Created By -->
                <td class="px-3 py-2 truncate max-w-[120px]">{{ rec['Create By'] ? resolveName(rec['Create By']) : '—' }}</td>
              </tr>
              <tr v-if="paginatedRecords.length === 0">
                <td :colspan="columns.length" class="text-center py-12 text-muted-foreground">
                  <Icon name="i-lucide-search-x" class="size-8 mx-auto mb-2 text-muted-foreground/20" />
                  <p class="text-sm">No finance records found</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-between px-4 py-2.5 border-t bg-card/50 shrink-0">
          <span class="text-[11px] text-muted-foreground">
            Page {{ page }} of {{ totalPages }} · {{ filteredRecords.length.toLocaleString() }} total
          </span>
          <div class="flex items-center gap-1">
            <Button variant="outline" size="sm" class="h-7 text-xs" :disabled="page <= 1" @click="page--">
              <Icon name="i-lucide-chevron-left" class="size-3.5" />
            </Button>
            <Button variant="outline" size="sm" class="h-7 text-xs" :disabled="page >= totalPages" @click="page++">
              <Icon name="i-lucide-chevron-right" class="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </FinancesLayout>
</template>
