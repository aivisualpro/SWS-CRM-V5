<script setup lang="ts">
const { setHeader } = usePageHeader()
const { salesReps, vendors, init } = useDashboardStore()
init()

const search = ref('')
const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

function resolveVendor(id: string): string {
  if (!id) return '—'
  const v = vendors.value.find((v: any) => v['Row ID'] === id)
  return v ? v['Vendor Name'] : id
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

watchEffect(() => {
  setHeader({ title: 'Sales Reps', icon: 'i-lucide-user-round-search', description: `${filteredReps.value.length} reps` })
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
    <!-- Teleport search to header -->
    <Teleport v-if="isMounted" to="#header-toolbar">
      <div class="flex items-center gap-2 w-full justify-end">
        <div class="relative max-w-[220px]">
          <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input v-model="search" placeholder="Search sales reps..." class="pl-8 h-8 text-sm" />
        </div>
        <p class="text-xs text-muted-foreground tabular-nums hidden lg:block whitespace-nowrap">
          {{ filteredReps.length }} record{{ filteredReps.length !== 1 ? 's' : '' }}
        </p>
      </div>
    </Teleport>

    <!-- Table -->
    <div class="flex-1 min-h-0 overflow-auto">
      <Table>
        <TableHeader class="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
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

<style scoped>
:deep([data-slot="table-container"]) {
  overflow: visible !important;
}
</style>
