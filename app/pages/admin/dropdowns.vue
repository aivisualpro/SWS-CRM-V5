<script setup lang="ts">
import { toast } from 'vue-sonner'

const { setHeader } = usePageHeader()
setHeader({ title: 'Dropdowns', icon: 'i-lucide-list-collapse' })

// ─── Store ──────────────────────────────────────────────────
const store = useDashboardStore()
store.init()

// ─── State ──────────────────────────────────────────────────
const dropdowns = computed(() => [...store.dropdowns.value])
const search = ref('')
const CHUNK_SIZE = 30
const visibleCount = ref(CHUNK_SIZE)

// CRUD state
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const editingDropdown = ref<any>(null)
const deletingDropdown = ref<any>(null)
const saving = ref(false)
const formData = ref<Record<string, string>>({})

// Teleport mount check
const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

// ─── Sorting ────────────────────────────────────────────────
const sortBy = ref('name')
const sortDir = ref<'asc' | 'desc'>('asc')

function toggleSort(col: string) {
  if (sortBy.value === col) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortBy.value = col; sortDir.value = 'asc' }
}

function sortIcon(col: string) {
  if (sortBy.value !== col) return 'i-lucide-chevrons-up-down'
  return sortDir.value === 'asc' ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
}

// ─── Options ────────────────────────────────────────────────
const colors = [
  '#1F6F5F', '#FEFD99', '#FF3737', '#E87F24', '#3852B4', '#F13E93',
  '#FE81D4', '#547792', '#4C8CE4', '#8C5A3C', '#B500B2', '#088395',
  '#1A3263', '#BBCB2E'
]

const lucideIcons = [
  // General & App Navigation
  "i-lucide-activity", "i-lucide-add", "i-lucide-alarm-clock", "i-lucide-alert-circle", "i-lucide-alert-octagon", "i-lucide-alert-triangle", "i-lucide-arrow-down", "i-lucide-arrow-left", "i-lucide-arrow-right", "i-lucide-arrow-up", "i-lucide-bell", "i-lucide-book", "i-lucide-bookmark", "i-lucide-calendar", "i-lucide-check", "i-lucide-check-circle", "i-lucide-chevron-down", "i-lucide-chevron-left", "i-lucide-chevron-right", "i-lucide-chevron-up", "i-lucide-circle", "i-lucide-clipboard", "i-lucide-clock", "i-lucide-cloud", "i-lucide-cog", "i-lucide-command", "i-lucide-compass", "i-lucide-copy", "i-lucide-database", "i-lucide-edit", "i-lucide-external-link", "i-lucide-eye", "i-lucide-eye-off", "i-lucide-file", "i-lucide-file-text", "i-lucide-filter", "i-lucide-flag", "i-lucide-folder", "i-lucide-folder-open", "i-lucide-folder-tree", "i-lucide-globe", "i-lucide-hash", "i-lucide-heart", "i-lucide-help-circle", "i-lucide-home", "i-lucide-image", "i-lucide-info", "i-lucide-key", "i-lucide-layout", "i-lucide-link", "i-lucide-list", "i-lucide-lock", "i-lucide-mail", "i-lucide-map-pin", "i-lucide-map-pinned", "i-lucide-map", "i-lucide-menu", "i-lucide-message-circle", "i-lucide-message-square", "i-lucide-minus", "i-lucide-moon", "i-lucide-more-horizontal", "i-lucide-more-vertical", "i-lucide-paperclip", "i-lucide-pause", "i-lucide-phone", "i-lucide-phone-call", "i-lucide-pie-chart", "i-lucide-play", "i-lucide-plus", "i-lucide-printer", "i-lucide-refresh-cw", "i-lucide-search", "i-lucide-send", "i-lucide-settings", "i-lucide-share", "i-lucide-share-2", "i-lucide-star", "i-lucide-sun", "i-lucide-tag", "i-lucide-trash", "i-lucide-trash-2", "i-lucide-user", "i-lucide-users", "i-lucide-user-cog", "i-lucide-video", "i-lucide-wifi", "i-lucide-x", "i-lucide-x-circle", "i-lucide-zoom-in", "i-lucide-zoom-out", "i-lucide-list-collapse",

  // Business, Financial & Admin
  "i-lucide-banknote", "i-lucide-briefcase", "i-lucide-calculator", "i-lucide-credit-card", "i-lucide-badge-dollar-sign", "i-lucide-circle-dollar-sign", "i-lucide-wallet", "i-lucide-landmark", "i-lucide-receipt", "i-lucide-building-2", "i-lucide-building", "i-lucide-store", "i-lucide-bar-chart", "i-lucide-line-chart", "i-lucide-trending-up", "i-lucide-file-spreadsheet", "i-lucide-clipboard-list", "i-lucide-clipboard-check", "i-lucide-contact", "i-lucide-award", "i-lucide-medal", "i-lucide-shield", "i-lucide-shield-check", "i-lucide-shield-alert",

  // Technical, Construction & Solar (Crew, Tech, Install, Troubleshoot)
  "i-lucide-hard-hat", "i-lucide-hammer", "i-lucide-wrench", "i-lucide-pen-tool", "i-lucide-ruler", "i-lucide-brush", "i-lucide-zap", "i-lucide-battery", "i-lucide-battery-charging", "i-lucide-panel-top", "i-lucide-plug", "i-lucide-factory", "i-lucide-warehouse", "i-lucide-truck", "i-lucide-code", "i-lucide-terminal", "i-lucide-server", "i-lucide-network", "i-lucide-cpu", "i-lucide-microscope", "i-lucide-laptop", "i-lucide-smartphone", "i-lucide-tablet", "i-lucide-camera", "i-lucide-scan",

  // Commerce & Logistics
  "i-lucide-shopping-bag", "i-lucide-shopping-cart", "i-lucide-ticket", "i-lucide-gavel", "i-lucide-headset", "i-lucide-download", "i-lucide-upload", "i-lucide-package", "i-lucide-package-check", "i-lucide-box"
]

const existingTypes = computed(() => {
  const types = new Set<string>()
  dropdowns.value.forEach(d => { if (d.Type) types.add(d.Type) })
  return [...types].sort((a, b) => a.localeCompare(b))
})

const isTypeOpen = ref(false)
const typeSearch = ref('')
const isIconOpen = ref(false)
const iconSearch = ref('')

// ─── CRUD Handlers ──────────────────────────────────────────
function openCreate() {
  editingDropdown.value = null
  formData.value = { name: '', type: '', color: '', icon: '' }
  typeSearch.value = ''
  iconSearch.value = ''
  isTypeOpen.value = false
  isIconOpen.value = false
  showDialog.value = true
}

function openEdit(item: any) {
  editingDropdown.value = item
  formData.value = {
    rowId: item.ROWID || '',
    name: item.Name || '',
    type: item.Type || '',
    color: item.Color || '',
    icon: item.Icon || '',
  }
  typeSearch.value = ''
  iconSearch.value = ''
  isTypeOpen.value = false
  isIconOpen.value = false
  showDialog.value = true
}

async function handleSave() {
  const isEdit = !!editingDropdown.value

  // Close dialog immediately
  showDialog.value = false
  toast.info(`Saving dropdown in background...`)

  // Run silently in background
  $fetch('/api/bigquery/dropdowns', { method: isEdit ? 'PUT' : 'POST', body: formData.value })
    .then(() => {
      toast.success(isEdit ? 'Dropdown updated successfully' : 'Dropdown created successfully')
      store.refresh()
    })
    .catch((e: any) => {
      toast.error(e.data?.statusMessage || 'Failed to save dropdown')
    })
}

function confirmDelete(item: any) {
  deletingDropdown.value = item
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deletingDropdown.value) return
  
  const rowId = deletingDropdown.value.ROWID

  // Close dialog immediately
  showDeleteDialog.value = false
  deletingDropdown.value = null
  toast.info(`Deleting dropdown in background...`)

  // Run silently in background
  $fetch('/api/bigquery/dropdowns', { method: 'DELETE', body: { rowId } })
    .then(() => {
      toast.success('Dropdown deleted successfully')
      store.refresh()
    })
    .catch((e: any) => {
      toast.error(e.data?.statusMessage || 'Failed to delete dropdown')
    })
}

// ─── Computed ───────────────────────────────────────────────
const activeType = ref('')

const typeGroups = computed(() => {
  const counts = new Map<string, number>()
  dropdowns.value.forEach(d => {
    if (d.Type) counts.set(d.Type, (counts.get(d.Type) || 0) + 1)
  })
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name))
})
const totalDropdownsCount = computed(() => dropdowns.value.length)

const filteredDropdowns = computed(() => {
  let result = dropdowns.value

  if (activeType.value) {
    result = result.filter((d: any) => d.Type === activeType.value)
  }

  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter((d: any) =>
      Object.values(d).filter(Boolean).some(val => String(val).toLowerCase().includes(q))
    )
  }

  return result
})

const COL_FIELD: Record<string, string> = {
  name: 'Name',
  type: 'Type',
  color: 'Color',
  icon: 'Icon',
}

const sortedDropdowns = computed(() => {
  const arr = [...filteredDropdowns.value]
  const field = COL_FIELD[sortBy.value] || sortBy.value
  return arr.sort((a, b) => {
    const av = String(a[field] ?? '').toLowerCase()
    const bv = String(b[field] ?? '').toLowerCase()
    const cmp = av.localeCompare(bv)
    return sortDir.value === 'asc' ? cmp : -cmp
  })
})

const visibleDropdowns = computed(() => sortedDropdowns.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < sortedDropdowns.value.length)

watch(search, () => { visibleCount.value = CHUNK_SIZE })

// Infinite scroll
const sentinelRef = ref<HTMLElement | null>(null)
onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && hasMore.value) visibleCount.value += CHUNK_SIZE
    },
    { threshold: 0.1 },
  )
  watch(sentinelRef, (el) => { if (el) observer.observe(el) }, { immediate: true })
  onUnmounted(() => observer.disconnect())
})
</script>

<template>
  <div class="w-full flex-1 flex flex-row min-h-0 overflow-hidden bg-background">
    
    <!-- Sub Sidebar -->
    <div class="w-56 shrink-0 border-r flex flex-col bg-muted/10">
      <div class="p-3 border-b flex-shrink-0">
        <h2 class="text-sm font-semibold tracking-tight px-1">Dropdown Types</h2>
      </div>
      <div class="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
        <button
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm transition-colors"
          :class="activeType === '' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'"
          @click="activeType = ''"
        >
          <span>All Types</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-background/50 border">{{ totalDropdownsCount }}</span>
        </button>
        <button
          v-for="group in typeGroups"
          :key="group.name"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm transition-colors"
          :class="activeType === group.name ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'"
          @click="activeType = group.name"
        >
          <span class="truncate pr-2">{{ group.name }}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-background/50 border shrink-0">{{ group.count }}</span>
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0">
      <Teleport v-if="isMounted" to="#header-toolbar">
        <div class="flex items-center gap-2 w-full justify-end">
          <div class="relative max-w-[220px]">
            <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input v-model="search" placeholder="Search dropdowns..." class="pl-8 h-8 text-sm" />
          </div>
          <p class="text-xs text-muted-foreground tabular-nums hidden lg:block whitespace-nowrap">
            {{ filteredDropdowns.length }} record{{ filteredDropdowns.length !== 1 ? 's' : '' }}
          </p>
          <Button variant="ghost" size="sm" class="h-8" @click="store.refresh()">
            <Icon name="i-lucide-refresh-cw" class="size-3.5" />
          </Button>
          <Button size="sm" class="h-8" @click="openCreate">
            <Icon name="i-lucide-plus" class="mr-1 size-3.5" />
            Add Dropdown
          </Button>
        </div>
      </Teleport>

      <div class="flex-1 min-h-0 overflow-auto p-4 md:p-6 bg-muted/5">
        <div v-if="visibleDropdowns.length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
          <div
            v-for="(item, idx) in visibleDropdowns"
            :key="item.ROWID || idx"
            class="group relative flex flex-col items-center justify-center p-5 text-center rounded-xl bg-card border shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            :style="item.Color ? { borderColor: `${item.Color}40` } : {}"
          >
            <!-- Actions -->
            <div class="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" class="size-7 h-7 w-7 rounded-sm" @click="openEdit(item)">
                <Icon name="i-lucide-pencil" class="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" class="size-7 h-7 w-7 rounded-sm text-destructive hover:text-destructive" @click="confirmDelete(item)">
                <Icon name="i-lucide-trash-2" class="size-3.5" />
              </Button>
            </div>
            
            <!-- Icon Bubble -->
            <div
              class="size-14 rounded-full flex items-center justify-center mb-3 mt-2 shadow-sm border"
              :class="!item.Color ? 'bg-secondary border-border' : 'border-transparent'"
              :style="item.Color ? { backgroundColor: `${item.Color}15`, color: item.Color, borderColor: `${item.Color}30` } : {}"
            >
              <Icon :name="item.Icon || 'i-lucide-list-collapse'" class="size-6" :class="!item.Color ? 'opacity-50' : ''" />
            </div>

            <!-- Title & Type -->
            <h4 class="font-semibold text-sm leading-tight break-words w-full px-2" :style="{ color: item.Color || 'inherit' }">{{ item.Name || '—' }}</h4>
            <p v-if="!activeType && item.Type" class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-1.5">{{ item.Type }}</p>
          </div>
        </div>

        <div v-else class="flex flex-col items-center justify-center h-full text-muted-foreground">
          <Icon name="i-lucide-inbox" class="size-12 mb-3 opacity-20" />
          <p>No dropdowns found</p>
          <Button size="sm" variant="outline" class="mt-4" @click="openCreate">
            <Icon name="i-lucide-plus" class="mr-1 size-4" />
            Add Dropdown
          </Button>
        </div>

        <div v-if="hasMore" ref="sentinelRef" class="h-10 mt-6 flex justify-center text-xs text-muted-foreground">
          <Icon name="i-lucide-loader-2" class="size-4 animate-spin" />
        </div>
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <Dialog v-model:open="showDialog">
      <DialogContent class="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{{ editingDropdown ? 'Edit' : 'New' }} Dropdown</DialogTitle>
          <DialogDescription class="sr-only">
            {{ editingDropdown ? 'Edit' : 'Create' }} a dropdown item
          </DialogDescription>
        </DialogHeader>
        <form class="space-y-5" @submit.prevent="handleSave">
          <div class="space-y-4">
            <!-- Name -->
            <div class="space-y-1.5">
              <Label for="name" class="text-xs">Name</Label>
              <Input id="name" v-model="formData.name" type="text" placeholder="Enter name" required />
            </div>

            <!-- Type combobox -->
            <div class="space-y-1.5">
              <Label class="text-xs">Type</Label>
              <div class="relative">
                <button type="button" @click="isTypeOpen = !isTypeOpen; isIconOpen = false" class="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <span class="truncate">{{ formData.type || 'Select or add type...' }}</span>
                  <Icon name="i-lucide-chevron-down" class="size-4 opacity-50" />
                </button>
                <div v-if="isTypeOpen" class="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
                  <div class="flex items-center px-2 pb-1 border-b mb-1 mt-1">
                    <Icon name="i-lucide-search" class="size-3 mr-2 opacity-50" />
                    <input v-model="typeSearch" class="flex h-8 w-full bg-transparent text-sm outline-none" placeholder="Search or add..." />
                  </div>
                  <div class="max-h-[200px] overflow-y-auto overflow-x-hidden">
                    <button
                      v-for="opt in existingTypes.filter(t => t.toLowerCase().includes(typeSearch.toLowerCase()))"
                      :key="opt"
                      type="button"
                      @click="formData.type = opt; isTypeOpen = false; typeSearch = ''"
                      class="w-full text-left px-2 py-1.5 text-sm hover:bg-muted transition-colors rounded-sm flex items-center justify-between"
                    >
                      <span class="truncate">{{ opt }}</span>
                      <Icon v-if="formData.type === opt" name="i-lucide-check" class="size-3 text-primary" />
                    </button>
                    <!-- Add new feature -->
                    <button
                      v-if="typeSearch && !existingTypes.includes(typeSearch)"
                      type="button"
                      @click="formData.type = typeSearch; isTypeOpen = false; typeSearch = ''"
                      class="w-full text-left px-2 py-1.5 text-sm text-primary hover:bg-muted transition-colors rounded-sm flex items-center"
                    >
                      <Icon name="i-lucide-plus" class="size-3 mr-2" />
                      Add "{{ typeSearch }}"
                    </button>
                    <div v-if="!typeSearch && existingTypes.length === 0" class="px-2 py-3 text-xs text-muted-foreground text-center">No types found. Type to add one.</div>
                  </div>
                </div>
                <div v-if="isTypeOpen" class="fixed inset-0 z-40" @click="isTypeOpen = false"></div>
              </div>
            </div>

            <!-- Color Palette -->
            <div class="space-y-1.5">
              <Label class="text-xs">Color</Label>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="color in colors"
                  :key="color"
                  type="button"
                  @click="formData.color = color"
                  class="size-7 rounded-md border-2 transition-transform hover:scale-110"
                  :class="formData.color === color ? 'border-foreground shadow-sm scale-110' : 'border-transparent shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]'"
                  :style="{ backgroundColor: color }"
                />
              </div>
            </div>

            <!-- Icon combobox -->
            <div class="space-y-1.5">
              <Label class="text-xs">Icon</Label>
              <div class="relative">
                <button type="button" @click="isIconOpen = !isIconOpen; isTypeOpen = false" class="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <div class="flex items-center gap-2 truncate">
                    <Icon v-if="formData.icon" :name="formData.icon" class="size-4 opacity-70 shrink-0" />
                    <span class="truncate">{{ formData.icon || 'Select icon...' }}</span>
                  </div>
                  <Icon name="i-lucide-chevron-down" class="size-4 opacity-50 shrink-0" />
                </button>
                <div v-if="isIconOpen" class="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
                  <div class="flex items-center px-2 pb-1 border-b mb-1 mt-1">
                    <Icon name="i-lucide-search" class="size-3 mr-2 opacity-50" />
                    <input v-model="iconSearch" class="flex h-8 w-full bg-transparent text-sm outline-none" placeholder="Search icons..." />
                  </div>
                  <div class="max-h-[220px] overflow-y-auto grid grid-cols-6 gap-1 p-2">
                    <button
                      v-for="icon in lucideIcons.filter(i => i.toLowerCase().includes(iconSearch.toLowerCase()))"
                      :key="icon"
                      type="button"
                      @click="formData.icon = icon; isIconOpen = false; iconSearch = ''"
                      :title="icon.replace('i-lucide-', '')"
                      class="flex flex-col items-center justify-center p-2 rounded-md hover:bg-muted transition-colors border"
                      :class="formData.icon === icon ? 'bg-primary/10 border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'"
                    >
                      <Icon :name="icon" class="size-5" />
                    </button>
                    <div v-if="lucideIcons.filter(i => i.toLowerCase().includes(iconSearch.toLowerCase())).length === 0" class="col-span-6 px-2 py-6 text-xs text-muted-foreground text-center">No icons match search.</div>
                  </div>
                </div>
                <div v-if="isIconOpen" class="fixed inset-0 z-40" @click="isIconOpen = false"></div>
              </div>
            </div>

          </div>
          <DialogFooter class="pt-2">
            <Button variant="outline" type="button" @click="showDialog = false">Cancel</Button>
            <Button type="submit" :disabled="saving">
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-1 size-4 animate-spin" />
              {{ editingDropdown ? 'Update' : 'Create' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Dropdown Item?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the <strong>{{ deletingDropdown?.Name }}</strong> dropdown option. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleDelete">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<style scoped>
</style>
