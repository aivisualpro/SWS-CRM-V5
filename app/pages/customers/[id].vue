<script setup lang="ts">
import { toast } from 'vue-sonner'

const route = useRoute()
const customerId = computed(() => route.params.id as string)

const { setHeader } = usePageHeader()
setHeader({ title: 'Customer Details', icon: 'i-lucide-user' })

// ─── State ──────────────────────────────────────────────────
const customer = ref<any>(null)
const projects = ref<any[]>([])
const loadingCustomer = ref(true)
const loadingProjects = ref(true)
const error = ref('')

// Teleport mount check
const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

// ─── Fetch Customer ─────────────────────────────────────────
async function fetchCustomer() {
  loadingCustomer.value = true
  error.value = ''
  try {
    const data = await $fetch<{ success: boolean, customers: any[] }>('/api/bigquery/customers')
    if (data.success) {
      customer.value = data.customers.find((c: any) => c['Customer ID'] === customerId.value) || null
      if (!customer.value) error.value = 'Customer not found'
    }
  }
  catch (e: any) {
    error.value = e.data?.statusMessage || e.message || 'Failed to load customer'
    toast.error('Failed to load customer')
  }
  finally {
    loadingCustomer.value = false
  }
}

// ─── Fetch Related Projects ─────────────────────────────────
async function fetchProjects() {
  loadingProjects.value = true
  try {
    const data = await $fetch<{ success: boolean, projects: any[] }>('/api/bigquery/projects')
    if (data.success) {
      projects.value = data.projects.filter((p: any) => p['Customer ID'] === customerId.value)
    }
  }
  catch {
    // Silently fail — projects section will just show empty
  }
  finally {
    loadingProjects.value = false
  }
}

onMounted(() => {
  fetchCustomer()
  fetchProjects()
})

// ─── Helpers ────────────────────────────────────────────────
function getFullName(c: any): string {
  return [c?.['First Name'], c?.['Last Name']].filter(Boolean).join(' ') || '—'
}

function getInitials(c: any): string {
  const f = c?.['First Name'] || '?'
  const l = c?.['Last Name'] || '?'
  return `${f[0]}${l[0]}`.toUpperCase()
}

function formatPhone(value?: string): string {
  if (!value) return '—'
  const digits = value.replace(/\D/g, '')
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  return value
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
  if (['completed', 'complete', 'done', 'finished', 'approved'].some(k => s.includes(k)))
    return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
  if (['in progress', 'active', 'ongoing', 'started'].some(k => s.includes(k)))
    return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
  if (['pending', 'waiting', 'hold', 'scheduled'].some(k => s.includes(k)))
    return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
  if (['cancelled', 'canceled', 'rejected', 'failed'].some(k => s.includes(k)))
    return 'bg-red-500/10 text-red-600 border-red-500/20'
  return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
}

// Detail fields for left panel
const detailFields = computed(() => {
  if (!customer.value) return []
  const c = customer.value
  return [
    { label: 'Customer ID', value: c['Customer ID'], icon: 'i-lucide-hash' },
    { label: 'Email', value: c.Email, icon: 'i-lucide-mail', isEmail: true },
    { label: 'Phone', value: formatPhone(c.Phone), icon: 'i-lucide-phone' },
    { label: 'Mobile', value: formatPhone(c.Mobile), icon: 'i-lucide-smartphone' },
    { label: 'Address', value: c.Address || c['Customer Address'], icon: 'i-lucide-map-pin' },
    { label: 'Unit #', value: c['Unit #'], icon: 'i-lucide-building' },
    { label: 'Secondary Name', value: [c['Secondary Name'], c['Secondary Last Name']].filter(Boolean).join(' '), icon: 'i-lucide-user-plus' },
    { label: 'Senior Citizen', value: c.seniorCitizen === 'Y' || c.seniorCitizen === 'Yes' ? 'Yes' : 'No', icon: 'i-lucide-heart-handshake' },
    { label: 'Created By', value: c['Create By'], icon: 'i-lucide-user-check' },
    { label: 'Created', value: formatDate(c.TimeStamp), icon: 'i-lucide-calendar' },
  ].filter(f => f.value && f.value !== '—')
})

// Project stats
const projectStats = computed(() => {
  const total = projects.value.length
  const completed = projects.value.filter((p: any) => {
    const s = (p['Project Status'] || '').toLowerCase()
    return s.includes('completed') || s.includes('complete') || s.includes('done')
  }).length
  const inProgress = projects.value.filter((p: any) => {
    const s = (p['Project Status'] || '').toLowerCase()
    return s.includes('progress') || s.includes('active') || s.includes('started')
  }).length
  const totalPrice = projects.value.reduce((sum: number, p: any) => {
    const price = Number.parseFloat(String(p['Project Price'] || '0').replace(/[^0-9.-]/g, ''))
    return sum + (Number.isNaN(price) ? 0 : price)
  }, 0)
  return { total, completed, inProgress, totalPrice }
})

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

// ─── Project CRUD ──────────────────────────────────────────
const showProjectForm = ref(false)

function openCreateProject() {
  showProjectForm.value = true
}

function onProjectSaved() {
  fetchProjects()
}
</script>

<template>
  <CustomersLayout active-filter="">
    <div class="w-full flex-1 flex flex-col min-h-0">
      <!-- Teleport back button + title to header -->
      <Teleport v-if="isMounted" to="#header-toolbar">
        <div class="flex items-center gap-2 w-full justify-end">
          <Button variant="ghost" size="sm" class="h-8" @click="navigateTo('/customers')">
            <Icon name="i-lucide-arrow-left" class="mr-1 size-3.5" />
            Back to Customers
          </Button>
        </div>
      </Teleport>

      <!-- Error State -->
      <div v-if="error" class="flex-1 flex items-center justify-center">
        <Card class="border-destructive p-8 max-w-md">
          <div class="flex flex-col items-center gap-4 text-center">
            <div class="size-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <Icon name="i-lucide-alert-triangle" class="size-8 text-destructive" />
            </div>
            <div>
              <p class="font-semibold text-lg">{{ error }}</p>
              <p class="text-sm text-muted-foreground mt-1">The customer you're looking for might not exist.</p>
            </div>
            <div class="flex gap-2">
              <Button variant="outline" @click="navigateTo('/customers')">
                <Icon name="i-lucide-arrow-left" class="mr-1 size-4" />
                Go Back
              </Button>
              <Button @click="fetchCustomer(); fetchProjects()">
                <Icon name="i-lucide-refresh-cw" class="mr-1 size-4" />
                Retry
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <!-- Loading -->
      <div v-else-if="loadingCustomer" class="flex-1 flex items-center justify-center">
        <div class="flex flex-col items-center gap-3">
          <Icon name="i-lucide-loader-2" class="size-8 animate-spin text-muted-foreground" />
          <p class="text-sm text-muted-foreground">Loading customer details…</p>
        </div>
      </div>

      <!-- Main Content -->
      <div v-else-if="customer" class="flex-1 min-h-0 overflow-auto">
        <div class="p-6 space-y-6">
          <!-- Top: Customer Header Card -->
          <div class="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
            <!-- Gradient accent bar -->
            <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-indigo-500" />

            <div class="p-6 pt-7">
              <div class="flex items-start gap-5">
                <!-- Large Avatar -->
                <div class="size-20 rounded-2xl bg-gradient-to-br from-blue-500/20 via-violet-500/15 to-indigo-500/20 border border-blue-500/10 flex items-center justify-center shrink-0 shadow-sm">
                  <span class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ getInitials(customer) }}</span>
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <h1 class="text-2xl font-bold tracking-tight">{{ getFullName(customer) }}</h1>
                      <div class="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                        <span v-if="customer.Email" class="flex items-center gap-1.5">
                          <Icon name="i-lucide-mail" class="size-3.5" />
                          {{ customer.Email }}
                        </span>
                        <span v-if="customer.Phone" class="flex items-center gap-1.5">
                          <Icon name="i-lucide-phone" class="size-3.5" />
                          {{ formatPhone(customer.Phone) }}
                        </span>
                        <span v-if="customer.Address || customer['Customer Address']" class="flex items-center gap-1.5">
                          <Icon name="i-lucide-map-pin" class="size-3.5" />
                          <span class="truncate max-w-[300px]">{{ customer.Address || customer['Customer Address'] }}</span>
                        </span>
                      </div>
                    </div>

                    <Badge variant="outline" class="shrink-0" :class="customer.seniorCitizen === 'Y' || customer.seniorCitizen === 'Yes' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'">
                      {{ customer.seniorCitizen === 'Y' || customer.seniorCitizen === 'Yes' ? 'Senior Citizen' : 'Active' }}
                    </Badge>
                  </div>

                  <!-- Quick Stats -->
                  <div class="grid grid-cols-4 gap-4 mt-5">
                    <div class="rounded-xl bg-muted/50 border px-4 py-3 text-center">
                      <p class="text-2xl font-bold tabular-nums">{{ projectStats.total }}</p>
                      <p class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">Total Projects</p>
                    </div>
                    <div class="rounded-xl bg-muted/50 border px-4 py-3 text-center">
                      <p class="text-2xl font-bold tabular-nums text-blue-600">{{ projectStats.inProgress }}</p>
                      <p class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">In Progress</p>
                    </div>
                    <div class="rounded-xl bg-muted/50 border px-4 py-3 text-center">
                      <p class="text-2xl font-bold tabular-nums text-emerald-600">{{ projectStats.completed }}</p>
                      <p class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">Completed</p>
                    </div>
                    <div class="rounded-xl bg-muted/50 border px-4 py-3 text-center">
                      <p class="text-2xl font-bold tabular-nums">{{ formatCurrency(projectStats.totalPrice) }}</p>
                      <p class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">Total Value</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Two-Column Layout: Details + Projects -->
          <div class="grid grid-cols-12 gap-6">
            <!-- LEFT: Customer Details -->
            <div class="col-span-4 space-y-4">
              <div class="rounded-xl border bg-card shadow-sm">
                <div class="px-5 py-4 border-b">
                  <h2 class="text-sm font-semibold flex items-center gap-2">
                    <Icon name="i-lucide-contact" class="size-4 text-muted-foreground" />
                    Customer Information
                  </h2>
                </div>
                <div class="divide-y">
                  <div
                    v-for="field in detailFields"
                    :key="field.label"
                    class="flex items-start gap-3 px-5 py-3.5 group hover:bg-muted/30 transition-colors"
                  >
                    <div class="size-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/10 transition-colors">
                      <Icon :name="field.icon" class="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div class="min-w-0">
                      <p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">{{ field.label }}</p>
                      <a v-if="field.isEmail" :href="`mailto:${field.value}`" class="text-sm font-medium text-blue-600 hover:underline break-all">
                        {{ field.value }}
                      </a>
                      <p v-else class="text-sm font-medium break-words">{{ field.value }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Quick Actions -->
              <div class="rounded-xl border bg-card shadow-sm p-4 space-y-2">
                <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quick Actions</h3>
                <Button v-if="customer['Customer Files']" variant="outline" class="w-full justify-start h-9 text-sm" @click="navigateTo(customer['Customer Files'])">
                  <Icon name="i-lucide-folder-open" class="mr-2 size-4 text-emerald-600" />
                  View Google Drive Files
                </Button>
                <Button v-if="customer.Email" variant="outline" class="w-full justify-start h-9 text-sm" :as="'a'" :href="`mailto:${customer.Email}`">
                  <Icon name="i-lucide-mail" class="mr-2 size-4 text-blue-600" />
                  Send Email
                </Button>
                <Button v-if="customer.Phone" variant="outline" class="w-full justify-start h-9 text-sm" :as="'a'" :href="`tel:${customer.Phone}`">
                  <Icon name="i-lucide-phone" class="mr-2 size-4 text-violet-600" />
                  Call Customer
                </Button>
              </div>
            </div>

            <!-- RIGHT: Related Projects -->
            <div class="col-span-8">
              <div class="rounded-xl border bg-card shadow-sm">
                <div class="px-5 py-4 border-b flex items-center justify-between">
                  <h2 class="text-sm font-semibold flex items-center gap-2">
                    <Icon name="i-lucide-folder-kanban" class="size-4 text-muted-foreground" />
                    Related Projects
                    <Badge variant="secondary" class="text-[10px] h-5 px-1.5 tabular-nums">
                      {{ projects.length }}
                    </Badge>
                  </h2>
                  <Button size="sm" class="h-7 text-xs" @click="openCreateProject">
                    <Icon name="i-lucide-plus" class="size-3 mr-1" />
                    Add Project
                  </Button>
                </div>

                <!-- Projects Loading -->
                <div v-if="loadingProjects" class="p-6 space-y-3">
                  <Skeleton class="h-20 w-full rounded-lg" />
                  <Skeleton class="h-20 w-full rounded-lg" />
                  <Skeleton class="h-20 w-3/4 rounded-lg" />
                </div>

                <!-- No Projects -->
                <div v-else-if="projects.length === 0" class="p-12 text-center">
                  <div class="size-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto">
                    <Icon name="i-lucide-folder-x" class="size-7 text-muted-foreground/50" />
                  </div>
                  <p class="mt-4 font-medium text-muted-foreground">No projects found</p>
                  <p class="text-sm text-muted-foreground/60 mt-1">This customer doesn't have any associated projects yet.</p>
                </div>

                <!-- Projects List -->
                <div v-else class="divide-y">
                  <div
                    v-for="project in projects"
                    :key="project['Project ID']"
                    class="px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer group"
                    @click="navigateTo(`/projects/all-projects?search=${project['Project ID']}`)"
                  >
                    <div class="flex items-start justify-between gap-4">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2.5">
                          <span class="font-mono text-xs font-medium text-primary/80 bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                            {{ project['Project ID'] }}
                          </span>
                          <Badge v-if="project['Project Status']" variant="outline" :class="statusColor(project['Project Status'])">
                            {{ project['Project Status'] }}
                          </Badge>
                          <Badge v-if="project['Job Status']" variant="outline" :class="statusColor(project['Job Status'])">
                            {{ project['Job Status'] }}
                          </Badge>
                        </div>

                        <div class="mt-2.5 grid grid-cols-3 gap-x-6 gap-y-1.5 text-sm">
                          <div v-if="project['Project Type']" class="flex items-center gap-1.5 text-muted-foreground">
                            <Icon name="i-lucide-wrench" class="size-3 shrink-0" />
                            <span class="truncate">{{ project['Project Type'] }}</span>
                          </div>
                          <div v-if="project['Branch Name']" class="flex items-center gap-1.5 text-muted-foreground">
                            <Icon name="i-lucide-building-2" class="size-3 shrink-0" />
                            <span class="truncate">{{ project['Branch Name'] }}</span>
                          </div>
                          <div v-if="project['Project Manager']" class="flex items-center gap-1.5 text-muted-foreground">
                            <Icon name="i-lucide-user" class="size-3 shrink-0" />
                            <span class="truncate">{{ project['Project Manager'] }}</span>
                          </div>
                          <div v-if="project['Customer Address']" class="flex items-center gap-1.5 text-muted-foreground col-span-2">
                            <Icon name="i-lucide-map-pin" class="size-3 shrink-0" />
                            <span class="truncate">{{ project['Customer Address'] }}</span>
                          </div>
                          <div v-if="project['Project Equipment']" class="flex items-center gap-1.5 text-muted-foreground">
                            <Icon name="i-lucide-cpu" class="size-3 shrink-0" />
                            <span class="truncate">{{ project['Project Equipment'] }}</span>
                          </div>
                        </div>

                        <!-- Dates row -->
                        <div class="mt-2 flex items-center gap-4 text-xs text-muted-foreground/60">
                          <span v-if="project['Project Start']" class="flex items-center gap-1">
                            <Icon name="i-lucide-calendar" class="size-3" />
                            Start: {{ formatDate(project['Project Start']) }}
                          </span>
                          <span v-if="project['Project End']" class="flex items-center gap-1">
                            <Icon name="i-lucide-calendar-check" class="size-3" />
                            End: {{ formatDate(project['Project End']) }}
                          </span>
                        </div>
                      </div>

                      <!-- Right: Price & Arrow -->
                      <div class="flex flex-col items-end gap-2 shrink-0">
                        <p v-if="project['Project Price']" class="font-semibold tabular-nums text-sm">
                          {{ formatCurrency(Number.parseFloat(String(project['Project Price'] || '0').replace(/[^0-9.-]/g, ''))) }}
                        </p>
                        <div v-if="project.KW" class="flex items-center gap-1 text-xs text-muted-foreground">
                          <Icon name="i-lucide-zap" class="size-3 text-amber-500" />
                          {{ project.KW }} KW
                        </div>
                        <Icon name="i-lucide-chevron-right" class="size-4 text-muted-foreground/30 group-hover:text-primary/60 transition-colors mt-1" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Project Form Dialog -->
    <ProjectFormDialog
      v-model:open="showProjectForm"
      :customer-id="customer?.['Customer ID'] || ''"
      :customer-name="getFullName(customer)"
      :customer-email="customer?.Email || ''"
      :customer-phone="customer?.Phone || ''"
      :customer-address="customer?.Address || customer?.['Customer Address'] || ''"
      @saved="onProjectSaved"
    />
  </CustomersLayout>
</template>

<style scoped>
:deep([data-slot="table-container"]) {
  overflow: visible !important;
}
</style>
