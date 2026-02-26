<script setup lang="ts">
import { toast } from 'vue-sonner'

const { setHeader } = usePageHeader()
setHeader({ title: 'Sales Reps', icon: 'i-lucide-user-round-search' })

const loading = ref(true)
const salesReps = ref<any[]>([])
const vendorsMap = ref<Record<string, string>>({})
const search = ref('')

async function fetchData() {
  loading.value = true
  try {
    const [repData, vendorData] = await Promise.all([
      $fetch<{ success: boolean, salesReps: any[] }>('/api/bigquery/sales-reps'),
      $fetch<{ success: boolean, vendors: any[] }>('/api/bigquery/vendors'),
    ])
    if (repData.success) salesReps.value = repData.salesReps
    if (vendorData.success) {
      vendorsMap.value = Object.fromEntries(
        vendorData.vendors.filter((v: any) => v['Row ID']).map((v: any) => [v['Row ID'], v['Vendor Name']]),
      )
    }
  }
  catch { toast.error('Failed to load sales reps') }
  finally { loading.value = false }
}

onMounted(fetchData)

function resolveVendor(id: string): string {
  return vendorsMap.value[id] || id || '—'
}

const filteredReps = computed(() => {
  if (!search.value.trim()) return salesReps.value
  const q = search.value.toLowerCase()
  return salesReps.value.filter(r =>
    (r['First Name'] || '').toLowerCase().includes(q)
    || (r['Last Name'] || '').toLowerCase().includes(q)
    || (r.Email || '').toLowerCase().includes(q)
    || (r.Phone || '').toLowerCase().includes(q)
    || resolveVendor(r.Vendor).toLowerCase().includes(q),
  )
})

const columns = [
  { key: 'First Name', label: 'First Name', width: '160px' },
  { key: 'Last Name', label: 'Last Name', width: '160px' },
  { key: 'Email', label: 'Email', width: '280px' },
  { key: 'Phone', label: 'Phone', width: '160px' },
  { key: 'Vendor', label: 'Vendor', width: '220px' },
]
</script>

<template>
  <div class="flex flex-col h-[calc(100dvh-54px)]">
    <!-- Header bar -->
    <div class="flex items-center justify-between gap-4 px-5 py-3 border-b border-border/50 bg-card/30 backdrop-blur-sm shrink-0">
      <div class="flex items-center gap-3">
        <div class="size-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center">
          <Icon name="i-lucide-user-round-search" class="size-4.5 text-white" />
        </div>
        <div>
          <h2 class="text-sm font-bold">Sales Reps</h2>
          <p class="text-[11px] text-muted-foreground">{{ filteredReps.length }} reps</p>
        </div>
      </div>
      <div class="relative">
        <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50" />
        <input
          v-model="search"
          placeholder="Search sales reps…"
          class="h-8 w-[260px] pl-8 pr-3 rounded-lg border border-border/50 bg-muted/30 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="flex flex-col items-center gap-2">
        <Icon name="i-lucide-loader-2" class="size-7 animate-spin text-primary" />
        <p class="text-xs text-muted-foreground">Loading sales reps…</p>
      </div>
    </div>

    <!-- Table -->
    <div v-else class="flex-1 overflow-auto">
      <Table>
        <TableHeader class="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
          <TableRow>
            <TableHead v-for="col in columns" :key="col.key" :style="{ width: col.width, minWidth: col.width }" class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {{ col.label }}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="(rep, idx) in filteredReps" :key="rep['Row ID'] || idx" class="hover:bg-muted/30 transition-colors">
            <TableCell v-for="col in columns" :key="col.key">
              <template v-if="col.key === 'Email' && rep.Email">
                <a :href="`mailto:${rep.Email}`" class="text-primary hover:underline text-xs">{{ rep.Email }}</a>
              </template>
              <template v-else-if="col.key === 'Phone' && rep.Phone">
                <a :href="`tel:${rep.Phone}`" class="text-primary hover:underline text-xs">{{ rep.Phone }}</a>
              </template>
              <template v-else-if="col.key === 'Vendor'">
                <Badge variant="outline" class="text-[10px]">{{ resolveVendor(rep.Vendor) }}</Badge>
              </template>
              <template v-else>
                <span class="text-xs font-medium" :class="rep[col.key] ? '' : 'text-muted-foreground/40'">{{ rep[col.key] || '—' }}</span>
              </template>
            </TableCell>
          </TableRow>
          <TableRow v-if="filteredReps.length === 0">
            <TableCell :colspan="columns.length" class="text-center py-12">
              <Icon name="i-lucide-user-round-search" class="size-8 text-muted-foreground/20 mb-2 mx-auto" />
              <p class="text-sm text-muted-foreground">No sales reps found</p>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
