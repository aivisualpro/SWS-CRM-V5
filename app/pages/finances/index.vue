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
  catch {
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

// ─── Filtered by sidebar ────────────────────────────────────
const filteredRecords = computed(() => {
  if (!activeFilter.value) return financeRecords.value
  return financeRecords.value.filter(r => r['Finance Company'] === activeFilter.value)
})
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

      <!-- Shared Finance Table Component -->
      <FinancesTable
        :records="filteredRecords"
        :loading="loading"
        :user-name-map="userNameMap"
        :project-map="projectMap"
        :show-project="true"
        :compact="false"
        :per-page="50"
      />
    </div>
  </FinancesLayout>
</template>
