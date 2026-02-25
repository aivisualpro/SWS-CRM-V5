<script setup lang="ts">
import { toast } from 'vue-sonner'

const props = defineProps<{
  open: boolean
  project?: any // null for create, filled for edit
  customerId?: string // pre-fill when adding from customer page
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  customerAddress?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': []
}>()

const isOpen = computed({
  get: () => props.open,
  set: (v: boolean) => emit('update:open', v),
})

const isEdit = computed(() => !!props.project)
const saving = ref(false)

// ─── Form fields ──────────────────────────────────────────
const form = ref({
  customerName: '',
  customerAddress: '',
  branchName: '',
  projectFolder: '',
  vendorName: '',
  projectType: 'Solar',
  jobStatus: 'In Progress',
  projectStatus: 'NEW JOB',
  projectManager: '',
  projectManagerVA: '',
  financeManager: '',
  financeManagerVA: '',
  engineer: '',
  permitCoordinator: '',
  salesRep: '',
  projectEquipment: '',
  panelsAmount: '',
  kw: '',
  watt: '',
  utility: '',
  solarEquipment: '',
  inverterType: '',
  batteriesQty: '',
  projectPrice: '',
  contractPrice: '',
  projectNetAmount: '',
  ahj: '',
  jurisdiction: '',
  customerId: '',
  customerEmail: '',
  customerPhone: '',
  createBy: '',
})

// ─── Dropdowns ──────────────────────────────────────────
const users = ref<any[]>([])
const customers = ref<any[]>([])

async function loadOptions() {
  const [userData, custData] = await Promise.all([
    $fetch<{ success: boolean, users: any[] }>('/api/bigquery/users').catch(() => ({ success: false, users: [] })),
    $fetch<{ success: boolean, customers: any[] }>('/api/bigquery/customers').catch(() => ({ success: false, customers: [] })),
  ])
  if (userData.success) users.value = userData.users.filter((u: any) => u.Email && u.Status !== false)
  if (custData.success) customers.value = custData.customers
}

const userOptions = computed(() =>
  users.value.map((u: any) => ({
    value: u.Email,
    label: [u['First Name'], u['Last Name']].filter(Boolean).join(' ') || u.Email,
  })),
)

const customerOptions = computed(() =>
  customers.value.map((c: any) => ({
    value: c['Customer ID'],
    label: [c['First Name'], c['Last Name']].filter(Boolean).join(' ') || c['Customer ID'],
    email: c.Email || '',
    phone: c.Phone || '',
    address: c.Address || c['Customer Address'] || '',
  })),
)

const projectTypes = ['Solar', 'R&R', 'Home Improvement', 'REMOVAL', 'Battery', 'MPU']
const jobStatuses = ['In Progress', 'Closed', 'Cancelled', 'T/S', 'Pending Final Payment']
const projectStatuses = ['NEW JOB', 'Completed', 'NO APPROVAL', 'On Hold', 'Troubleshooting', 'JOB CANCELED', 'Job Cancelled']
const branches = ['SWS', 'RNVT', 'MOD', 'DSC', 'BSP']

// ─── Init form ──────────────────────────────────────────
watch(isOpen, (open) => {
  if (open) {
    loadOptions()
    if (isEdit.value && props.project) {
      const p = props.project
      form.value = {
        customerName: p['Customer name'] || '',
        customerAddress: p['Customer Address'] || '',
        branchName: p['Branch Name'] || '',
        projectFolder: p['Project Folder'] || '',
        vendorName: p['Vendor Name'] || '',
        projectType: p['Project Type'] || 'Solar',
        jobStatus: p['Job Status'] || 'In Progress',
        projectStatus: p['Project Status'] || 'NEW JOB',
        projectManager: p['Project Manager'] || '',
        projectManagerVA: p['Project Manager VA'] || '',
        financeManager: p['Finance Manager'] || '',
        financeManagerVA: p['Finance Manager VA'] || '',
        engineer: p.Engineer || '',
        permitCoordinator: p['Permit Coordinator'] || '',
        salesRep: p['Sales Rep'] || '',
        projectEquipment: p['Project Equipment'] || '',
        panelsAmount: p['Panels Amount'] || '',
        kw: p.KW || '',
        watt: p.Watt || '',
        utility: p.Utillity || '',
        solarEquipment: p['Solar Equipment'] || '',
        inverterType: p['Inverter Type'] || '',
        batteriesQty: p['Batteries Qty'] || '',
        projectPrice: p['Project Price'] || '',
        contractPrice: p['Contract Price'] || '',
        projectNetAmount: p['Project Net Amount'] || '',
        ahj: p.AHJ || '',
        jurisdiction: p.Jurisdiction || '',
        customerId: p['Customer ID'] || '',
        customerEmail: p['Customer Email'] || '',
        customerPhone: p['Customer Phone'] || '',
        createBy: p['Create By'] || '',
      }
    }
    else {
      // Reset for create
      form.value = {
        customerName: props.customerName || '',
        customerAddress: props.customerAddress || '',
        branchName: 'SWS',
        projectFolder: '',
        vendorName: '',
        projectType: 'Solar',
        jobStatus: 'In Progress',
        projectStatus: 'NEW JOB',
        projectManager: '',
        projectManagerVA: '',
        financeManager: '',
        financeManagerVA: '',
        engineer: '',
        permitCoordinator: '',
        salesRep: '',
        projectEquipment: '',
        panelsAmount: '',
        kw: '',
        watt: '',
        utility: '',
        solarEquipment: '',
        inverterType: '',
        batteriesQty: '',
        projectPrice: '',
        contractPrice: '',
        projectNetAmount: '',
        ahj: '',
        jurisdiction: '',
        customerId: props.customerId || '',
        customerEmail: props.customerEmail || '',
        customerPhone: props.customerPhone || '',
        createBy: '',
      }
    }
  }
})

function onCustomerChange(custId: string) {
  const cust = customerOptions.value.find(c => c.value === custId)
  if (cust) {
    form.value.customerEmail = cust.email
    form.value.customerPhone = cust.phone
    form.value.customerAddress = cust.address
    form.value.customerName = cust.label
  }
}

// ─── Save ──────────────────────────────────────────────
async function save() {
  saving.value = true
  try {
    if (isEdit.value) {
      await $fetch('/api/bigquery/projects', {
        method: 'PUT',
        body: { ...form.value, projectId: props.project['Project ID'] },
      })
      toast.success('Project updated!')
    }
    else {
      await $fetch('/api/bigquery/projects', {
        method: 'POST',
        body: form.value,
      })
      toast.success('Project created!')
    }
    isOpen.value = false
    emit('saved')
  }
  catch (e: any) {
    toast.error(e.data?.statusMessage || 'Failed to save project')
  }
  finally {
    saving.value = false
  }
}

// ─── Form sections ─────────────────────────────────────
interface FormField {
  key: string
  label: string
  type: string
  options?: string[]
}

const sections: { title: string, icon: string, fields: FormField[] }[] = [
  {
    title: 'General',
    icon: 'i-lucide-folder-kanban',
    fields: [
      { key: 'projectType', label: 'Project Type', type: 'select', options: projectTypes },
      { key: 'branchName', label: 'Branch', type: 'select', options: branches },
      { key: 'jobStatus', label: 'Job Status', type: 'select', options: jobStatuses },
      { key: 'projectStatus', label: 'Project Status', type: 'select', options: projectStatuses },
    ],
  },
  {
    title: 'Customer',
    icon: 'i-lucide-user',
    fields: [
      { key: 'customerId', label: 'Customer', type: 'customer' },
      { key: 'customerName', label: 'Customer Name', type: 'text' },
      { key: 'customerEmail', label: 'Customer Email', type: 'text' },
      { key: 'customerPhone', label: 'Customer Phone', type: 'text' },
      { key: 'customerAddress', label: 'Address', type: 'text' },
    ],
  },
  {
    title: 'Team',
    icon: 'i-lucide-users',
    fields: [
      { key: 'projectManager', label: 'Project Manager', type: 'user' },
      { key: 'projectManagerVA', label: 'PM VA', type: 'user' },
      { key: 'financeManager', label: 'Finance Manager', type: 'user' },
      { key: 'financeManagerVA', label: 'Finance Manager VA', type: 'user' },
      { key: 'engineer', label: 'Engineer', type: 'user' },
      { key: 'permitCoordinator', label: 'Permit Coordinator', type: 'user' },
      { key: 'salesRep', label: 'Sales Rep', type: 'user' },
    ],
  },
  {
    title: 'Equipment',
    icon: 'i-lucide-cpu',
    fields: [
      { key: 'projectEquipment', label: 'Project Equipment', type: 'text' },
      { key: 'panelsAmount', label: 'Panels Amount', type: 'text' },
      { key: 'kw', label: 'KW', type: 'text' },
      { key: 'watt', label: 'Watt', type: 'text' },
      { key: 'utility', label: 'Utility', type: 'text' },
      { key: 'solarEquipment', label: 'Solar Equipment', type: 'text' },
      { key: 'inverterType', label: 'Inverter Type', type: 'text' },
      { key: 'batteriesQty', label: 'Batteries Qty', type: 'text' },
    ],
  },
  {
    title: 'Financial',
    icon: 'i-lucide-banknote',
    fields: [
      { key: 'projectPrice', label: 'Project Price', type: 'text' },
      { key: 'contractPrice', label: 'Contract Price', type: 'text' },
      { key: 'projectNetAmount', label: 'Net Amount', type: 'text' },
      { key: 'vendorName', label: 'Vendor', type: 'text' },
    ],
  },
  {
    title: 'Location & Permits',
    icon: 'i-lucide-map-pin',
    fields: [
      { key: 'ahj', label: 'AHJ', type: 'text' },
      { key: 'jurisdiction', label: 'Jurisdiction', type: 'text' },
      { key: 'projectFolder', label: 'Google Drive Link', type: 'text' },
    ],
  },
]
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
      <!-- Header -->
      <div class="px-6 py-4 border-b flex items-center gap-3 shrink-0">
        <div class="size-10 rounded-xl flex items-center justify-center" :class="isEdit ? 'bg-blue-500/10' : 'bg-emerald-500/10'">
          <Icon :name="isEdit ? 'i-lucide-pencil' : 'i-lucide-plus'" class="size-5" :class="isEdit ? 'text-blue-500' : 'text-emerald-500'" />
        </div>
        <div>
          <DialogTitle class="text-lg font-semibold">
            {{ isEdit ? 'Edit Project' : 'New Project' }}
          </DialogTitle>
          <DialogDescription class="text-xs text-muted-foreground">
            {{ isEdit ? `Editing project ${project?.['Project ID']}` : 'Fill in the details to create a new project' }}
          </DialogDescription>
        </div>
      </div>

      <!-- Scrollable Form -->
      <div class="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        <div v-for="section in sections" :key="section.title">
          <div class="flex items-center gap-2 mb-3">
            <Icon :name="section.icon" class="size-4 text-muted-foreground" />
            <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{{ section.title }}</h3>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div v-for="field in section.fields" :key="field.key" :class="field.key === 'customerAddress' ? 'col-span-2' : ''">
              <label class="text-[11px] font-medium text-muted-foreground block mb-1 ml-0.5">{{ field.label }}</label>

              <!-- Select dropdown -->
              <select
                v-if="field.type === 'select'"
                v-model="(form as any)[field.key]"
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
              </select>

              <!-- User dropdown -->
              <select
                v-else-if="field.type === 'user'"
                v-model="(form as any)[field.key]"
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">
                  Select...
                </option>
                <option v-for="u in userOptions" :key="u.value" :value="u.value">{{ u.label }}</option>
              </select>

              <!-- Customer dropdown -->
              <div v-else-if="field.type === 'customer'">
                <select
                  v-model="(form as any)[field.key]"
                  class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  :disabled="!!customerId"
                  @change="onCustomerChange(($event.target as HTMLSelectElement).value)"
                >
                  <option value="">
                    Select customer...
                  </option>
                  <option v-for="c in customerOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
                </select>
              </div>

              <!-- Text input -->
              <Input
                v-else
                v-model="(form as any)[field.key]"
                :placeholder="field.label"
                class="h-9"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t flex items-center justify-end gap-2 shrink-0">
        <Button variant="outline" size="sm" :disabled="saving" @click="isOpen = false">
          Cancel
        </Button>
        <Button size="sm" :disabled="saving" @click="save">
          <Icon v-if="saving" name="i-lucide-loader-2" class="mr-1 size-3.5 animate-spin" />
          <Icon v-else :name="isEdit ? 'i-lucide-check' : 'i-lucide-plus'" class="mr-1 size-3.5" />
          {{ isEdit ? 'Update Project' : 'Create Project' }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
