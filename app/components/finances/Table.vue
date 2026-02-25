<script setup lang="ts">
/**
 * Reusable Finance Table component.
 * Works in both full-page mode (/finances) and compact card mode (project detail).
 *
 * Props:
 *   records       — array of finance record objects
 *   loading       — whether data is still loading
 *   userNameMap   — map of email → display name
 *   projectMap    — map of project ID → project object (for customer name lookup)
 *   showProject   — show Project ID + Customer columns (default: true)
 *   compact       — compact mode for card embedding (default: false)
 *   perPage       — rows per page (default: 50, use smaller in compact)
 */
const props = withDefaults(defineProps<{
  records: any[]
  loading?: boolean
  userNameMap?: Record<string, string>
  projectMap?: Record<string, any>
  showProject?: boolean
  compact?: boolean
  perPage?: number
}>(), {
  loading: false,
  userNameMap: () => ({}),
  projectMap: () => ({}),
  showProject: true,
  compact: false,
  perPage: 50,
})

// ─── Search & Sort ──────────────────────────────────────────
const search = ref('')
const sortKey = ref('TimeStamp')
const sortDir = ref<'asc' | 'desc'>('desc')

function toggleSort(key: string) {
  if (key === '_customer') return
  if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = key; sortDir.value = 'desc' }
}

// ─── Helpers ────────────────────────────────────────────────
function resolveName(email: string): string {
  if (!email) return '—'
  return props.userNameMap[email.toLowerCase()] || email
}

function getCustomerName(projectId: string): string {
  const p = props.projectMap[projectId]
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

// ─── Columns ────────────────────────────────────────────────
const columns = computed(() => {
  const cols = [
    ...(props.showProject
      ? [
          { key: 'Project ID', label: 'Project ID', sortable: true },
          { key: '_customer', label: 'Customer', sortable: false },
        ]
      : []),
    { key: 'Finance Company', label: 'Finance Co.', sortable: true },
    { key: 'Finance Type', label: 'Type', sortable: true },
    { key: 'Finance Terms', label: 'Terms', sortable: true },
    { key: 'Loan Amount', label: 'Loan Amt', sortable: true },
    { key: 'DF', label: 'DF', sortable: true },
    { key: 'Net Loan Amount', label: 'Net Amount', sortable: true },
    { key: 'Finance Status', label: 'Status', sortable: true },
    { key: 'Fund Date', label: 'Fund Date', sortable: true },
    { key: 'RTF', label: 'RTF', sortable: true },
    { key: 'Create By', label: 'Created By', sortable: true },
  ]
  return cols
})

// ─── Filter, Sort, Paginate ─────────────────────────────────
const filtered = computed(() => {
  if (!search.value.trim()) return props.records
  const q = search.value.toLowerCase()
  return props.records.filter(r =>
    (r['Project ID'] || '').toLowerCase().includes(q)
    || (r['Finance Company'] || '').toLowerCase().includes(q)
    || (r['Finance Type'] || '').toLowerCase().includes(q)
    || (r['Loan ID'] || '').toLowerCase().includes(q)
    || (r['Finance Status'] || '').toLowerCase().includes(q)
    || (r['Finance Terms'] || '').toLowerCase().includes(q)
    || (getCustomerName(r['Project ID']) || '').toLowerCase().includes(q)
  )
})

const sorted = computed(() => {
  const arr = [...filtered.value]
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

const page = ref(1)
const totalPages = computed(() => Math.ceil(sorted.value.length / props.perPage))
const paginated = computed(() => {
  const start = (page.value - 1) * props.perPage
  return sorted.value.slice(start, start + props.perPage)
})
watch(() => search.value, () => { page.value = 1 })
watch(() => props.records, () => { page.value = 1 })

// ─── Cell value getter ──────────────────────────────────────
function cellValue(rec: any, col: { key: string }): string {
  const k = col.key
  if (k === '_customer') return getCustomerName(rec['Project ID']) || '—'
  if (k === 'Loan Amount' || k === 'Net Loan Amount' || k === 'Dealer Amount') return rec[k] ? formatCurrency(rec[k]) : '—'
  if (k === 'DF') return rec[k] != null ? `${rec[k]}%` : '—'
  if (k === 'Fund Date') return rec[k] ? formatDate(rec[k]) : '—'
  if (k === 'Create By') return rec[k] ? resolveName(rec[k]) : '—'
  return rec[k] || '—'
}
</script>

<template>
  <div class="finance-table-wrap" :class="{ 'finance-table-compact': compact }">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <Icon name="i-lucide-loader-2" class="size-6 animate-spin text-primary" />
    </div>

    <!-- Empty -->
    <div v-else-if="records.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
      <div class="size-12 rounded-xl bg-muted/40 flex items-center justify-center mb-3">
        <Icon name="i-lucide-banknote" class="size-6 text-muted-foreground/25" />
      </div>
      <p class="text-xs text-muted-foreground/60">No finance records found</p>
    </div>

    <!-- Table -->
    <div v-else class="flex flex-col h-full">
      <!-- Search (compact mode has inline search) -->
      <div v-if="compact && records.length > 1" class="px-1 pb-2 shrink-0">
        <div class="relative">
          <Icon name="i-lucide-search" class="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40" />
          <input
            v-model="search"
            placeholder="Search…"
            class="w-full h-7 pl-7 pr-2 text-[11px] rounded-md border bg-background/50 outline-none focus:ring-1 focus:ring-primary/30 transition-all"
          />
        </div>
      </div>

      <!-- Scrollable table -->
      <div class="flex-1 overflow-auto">
        <table class="w-full">
          <thead class="sticky top-0 z-10">
            <tr class="bg-muted/60 backdrop-blur-sm">
              <th
                v-for="col in columns"
                :key="col.key"
                class="text-left font-semibold text-muted-foreground select-none transition-colors border-b whitespace-nowrap"
                :class="[
                  compact ? 'px-2 py-1.5 text-[10px]' : 'px-3 py-2.5 text-xs',
                  col.sortable ? 'cursor-pointer hover:text-foreground' : '',
                ]"
                @click="col.sortable && toggleSort(col.key)"
              >
                <div class="flex items-center gap-1">
                  <span>{{ col.label }}</span>
                  <Icon
                    v-if="sortKey === col.key"
                    :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
                    class="size-3 text-primary shrink-0"
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(rec, idx) in paginated"
              :key="rec['Record ID'] || idx"
              class="border-b border-border/20 hover:bg-muted/15 transition-colors"
            >
              <td
                v-for="col in columns"
                :key="col.key"
                class="whitespace-nowrap"
                :class="compact ? 'px-2 py-1.5 text-[10px]' : 'px-3 py-2 text-xs'"
              >
                <!-- Project ID as link -->
                <NuxtLink
                  v-if="col.key === 'Project ID'"
                  :to="`/projects/${rec['Project ID']}`"
                  class="text-primary hover:underline font-mono"
                  :class="compact ? 'text-[10px]' : 'text-[11px]'"
                >
                  {{ rec['Project ID'] }}
                </NuxtLink>

                <!-- Status badge -->
                <template v-else-if="col.key === 'Finance Status'">
                  <Badge v-if="rec['Finance Status']" variant="outline" :class="statusColor(rec['Finance Status'])" class="text-[10px]">
                    {{ rec['Finance Status'] }}
                  </Badge>
                  <span v-else class="text-muted-foreground/40">—</span>
                </template>

                <!-- Currency columns -->
                <span
                  v-else-if="['Loan Amount', 'Net Loan Amount', 'Dealer Amount'].includes(col.key)"
                  class="font-medium tabular-nums"
                >
                  {{ cellValue(rec, col) }}
                </span>

                <!-- DF percentage -->
                <span v-else-if="col.key === 'DF'" class="tabular-nums">{{ cellValue(rec, col) }}</span>

                <!-- Date columns -->
                <span v-else-if="col.key === 'Fund Date'" class="tabular-nums">{{ cellValue(rec, col) }}</span>

                <!-- Finance Company (bold) -->
                <span v-else-if="col.key === 'Finance Company'" class="font-medium">{{ cellValue(rec, col) }}</span>

                <!-- Default -->
                <span v-else class="truncate max-w-[150px] block">{{ cellValue(rec, col) }}</span>
              </td>
            </tr>

            <!-- No results -->
            <tr v-if="paginated.length === 0">
              <td :colspan="columns.length" class="text-center py-8 text-muted-foreground">
                <Icon name="i-lucide-search-x" class="size-6 mx-auto mb-1.5 text-muted-foreground/15" />
                <p class="text-xs">No matching records</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between border-t bg-card/30 shrink-0" :class="compact ? 'px-2 py-1.5' : 'px-4 py-2.5'">
        <span class="text-muted-foreground" :class="compact ? 'text-[9px]' : 'text-[11px]'">
          {{ page }}/{{ totalPages }} · {{ filtered.length.toLocaleString() }}
        </span>
        <div class="flex items-center gap-1">
          <button
            :disabled="page <= 1"
            class="size-6 rounded flex items-center justify-center border text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            @click="page--"
          >
            <Icon name="i-lucide-chevron-left" class="size-3" />
          </button>
          <button
            :disabled="page >= totalPages"
            class="size-6 rounded flex items-center justify-center border text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            @click="page++"
          >
            <Icon name="i-lucide-chevron-right" class="size-3" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.finance-table-wrap {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
