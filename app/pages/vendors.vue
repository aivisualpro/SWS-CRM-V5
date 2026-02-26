<script setup lang="ts">
import { toast } from 'vue-sonner'

const { setHeader } = usePageHeader()
setHeader({ title: 'Vendors', icon: 'i-lucide-building-2' })

const loading = ref(true)
const vendors = ref<any[]>([])
const search = ref('')

async function fetchVendors() {
  loading.value = true
  try {
    const data = await $fetch<{ success: boolean, vendors: any[] }>('/api/bigquery/vendors')
    if (data.success) vendors.value = data.vendors
  }
  catch { toast.error('Failed to load vendors') }
  finally { loading.value = false }
}

onMounted(fetchVendors)

const filteredVendors = computed(() => {
  if (!search.value.trim()) return vendors.value
  const q = search.value.toLowerCase()
  return vendors.value.filter(v =>
    (v['Vendor Name'] || '').toLowerCase().includes(q)
    || (v.Branch || '').toLowerCase().includes(q)
    || (v['Vendor Email'] || '').toLowerCase().includes(q)
    || (v['Vendor Phone'] || '').toLowerCase().includes(q)
    || (v['Vendor Contact Person'] || '').toLowerCase().includes(q),
  )
})

const columns = [
  { key: 'Vendor Name', label: 'Vendor Name', width: '250px' },
  { key: 'Branch', label: 'Branch', width: '160px' },
  { key: 'Vendor Contact Person', label: 'Contact Person', width: '200px' },
  { key: 'Vendor Email', label: 'Email', width: '250px' },
  { key: 'Vendor Phone', label: 'Phone', width: '160px' },
]
</script>

<template>
  <div class="flex flex-col h-[calc(100dvh-54px)]">
    <!-- Header bar -->
    <div class="flex items-center justify-between gap-4 px-5 py-3 border-b border-border/50 bg-card/30 backdrop-blur-sm shrink-0">
      <div class="flex items-center gap-3">
        <div class="size-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
          <Icon name="i-lucide-building-2" class="size-4.5 text-white" />
        </div>
        <div>
          <h2 class="text-sm font-bold">Vendors</h2>
          <p class="text-[11px] text-muted-foreground">{{ filteredVendors.length }} vendors</p>
        </div>
      </div>
      <div class="relative">
        <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50" />
        <input
          v-model="search"
          placeholder="Search vendors…"
          class="h-8 w-[260px] pl-8 pr-3 rounded-lg border border-border/50 bg-muted/30 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="flex flex-col items-center gap-2">
        <Icon name="i-lucide-loader-2" class="size-7 animate-spin text-primary" />
        <p class="text-xs text-muted-foreground">Loading vendors…</p>
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
          <TableRow v-for="(vendor, idx) in filteredVendors" :key="vendor['Row ID'] || idx" class="hover:bg-muted/30 transition-colors">
            <TableCell v-for="col in columns" :key="col.key">
              <template v-if="col.key === 'Vendor Email' && vendor[col.key]">
                <a :href="`mailto:${vendor[col.key]}`" class="text-primary hover:underline text-xs">{{ vendor[col.key] }}</a>
              </template>
              <template v-else-if="col.key === 'Vendor Phone' && vendor[col.key]">
                <a :href="`tel:${vendor[col.key]}`" class="text-primary hover:underline text-xs">{{ vendor[col.key] }}</a>
              </template>
              <template v-else-if="col.key === 'Branch' && vendor[col.key]">
                <div class="flex flex-wrap gap-1">
                  <Badge v-for="b in vendor[col.key].split(',')" :key="b" variant="outline" class="text-[9px]">{{ b.trim() }}</Badge>
                </div>
              </template>
              <template v-else>
                <span class="text-xs" :class="vendor[col.key] ? '' : 'text-muted-foreground/40'">{{ vendor[col.key] || '—' }}</span>
              </template>
            </TableCell>
          </TableRow>
          <TableRow v-if="filteredVendors.length === 0">
            <TableCell :colspan="columns.length" class="text-center py-12">
              <Icon name="i-lucide-building-2" class="size-8 text-muted-foreground/20 mb-2 mx-auto" />
              <p class="text-sm text-muted-foreground">No vendors found</p>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
