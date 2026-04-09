<script setup lang="ts">
import { toast } from 'vue-sonner'

const { setHeader } = usePageHeader()
setHeader({ title: 'Users', icon: 'i-lucide-user-cog' })

// ─── State ──────────────────────────────────────────────────
const search = ref('')
const CHUNK_SIZE = 30
const visibleCount = ref(CHUNK_SIZE)
const activeRole = ref('')

// CRUD state
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const editingUser = ref<any>(null)
const deletingUser = ref<any>(null)
const saving = ref(false)
const formData = ref<Record<string, any>>({})

// Teleport mount check
const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

// ─── Use global prefetched store ────────────────────────────
const { users, roles, vendors, dropdowns, init, refresh } = useDashboardStore()
init()

// ─── Form Fields ─────────────────────────────────────────────
const formFields = [
  { key: 'firstName', label: 'First Name', placeholder: 'John' },
  { key: 'lastName', label: 'Last Name', placeholder: 'Doe' },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'john@example.com' },
  { key: 'phone', label: 'Phone', type: 'phone', placeholder: '(555) 000-0000' },
  { key: 'role', label: 'Role', type: 'role-select' },
  { key: 'secondaryRole', label: 'Secondary Role', type: 'sec-role-select' },
  { key: 'vendors', label: 'Vendors', type: 'vendor-multi-select' },
  { key: 'department', label: 'Department', type: 'department-select' },
  { key: 'branch', label: 'Branch', type: 'branch-multi-select' },
  {
    key: 'status', label: 'Status', type: 'select', options: [
      { label: 'Active', value: 'true' },
      { label: 'Inactive', value: 'false' },
    ],
  },
]



// ─── Searchable Dropdowns State ─────────────────────────────
const isRoleOpen = ref(false)
const roleSearch = ref('')

const isSecRoleOpen = ref(false)
const secRoleSearch = ref('')

const isVendorsOpen = ref(false)
const vendorsSearch = ref('')

const rolesStoreOptions = computed(() => {
  return [...new Set((roles.value || []).map((r: any) => r.Role).filter(Boolean))].sort()
})

const vendorOptions = computed(() => {
  return [...new Set((vendors.value || []).map((v: any) => v['Vendor Name']).filter(Boolean))].sort()
})

const branchOptions = computed(() => {
  return [...new Set((dropdowns.value || []).filter((d: any) => d.Type?.toLowerCase() === 'branch').map((d: any) => d.Name).filter(Boolean))].sort()
})

const departmentOptions = computed(() => {
  return [...new Set((dropdowns.value || []).filter((d: any) => d.Type?.toLowerCase() === 'department').map((d: any) => d.Name).filter(Boolean))].sort()
})

const isDeptOpen = ref(false)
const deptSearch = ref('')

const isBranchOpen = ref(false)
const branchSearch = ref('')

// ─── CRUD Handlers ──────────────────────────────────────────
function openCreate() {
  editingUser.value = null
  formData.value = {}
  formFields.forEach(f => {
    if (f.key === 'vendors' || f.key === 'branch') { formData.value[f.key] = [] }
    else { formData.value[f.key] = f.type === 'select' ? 'true' : '' }
  })
  showDialog.value = true
}

function openEdit(user: any) {
  editingUser.value = user
  formData.value = {
    firstName: user['First Name'] || '',
    lastName: user['Last Name'] || '',
    email: user.Email || '',
    phone: user.Phone || '',
    role: user.Role || '',
    secondaryRole: user['Secondary Role'] || '',
    vendors: resolveVendorNamesArray(user.Vendors),
    department: resolveDropdownNamesArray(user.Department || '', 'department')[0] || '',
    branch: resolveDropdownNamesArray(user.Branch || '', 'branch'),
    status: user.Status === true || user.Status === 'true' ? 'true' : 'false',
  }
  showDialog.value = true
}

async function handleSave() {
  if (formData.value.role && formData.value.secondaryRole && formData.value.role === formData.value.secondaryRole) {
    toast.error('Role and Secondary Role cannot be the same')
    return
  }

  const payload = {
    ...formData.value,
    vendors: Array.isArray(formData.value.vendors) ? formData.value.vendors.join(', ') : '',
    branch: Array.isArray(formData.value.branch) ? formData.value.branch.join(', ') : '',
  }
  
  const isEdit = !!editingUser.value

  // Close dialog immediately
  showDialog.value = false
  toast.info(`Saving user in background...`)

  // Run silently in background
  $fetch('/api/bigquery/users', { method: isEdit ? 'PUT' : 'POST', body: payload })
    .then(() => {
      toast.success(isEdit ? 'User updated successfully' : 'User created successfully')
      refresh()
    })
    .catch((e: any) => {
      toast.error(e.data?.statusMessage || 'Failed to save user')
    })
}

function confirmDelete(user: any) {
  deletingUser.value = user
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deletingUser.value) return
  
  const email = deletingUser.value.Email

  // Close dialog immediately
  showDeleteDialog.value = false
  deletingUser.value = null
  toast.info(`Deleting user in background...`)

  // Run silently in background
  $fetch('/api/bigquery/users', {
    method: 'DELETE',
    body: { email },
  })
    .then(() => {
      toast.success('User deleted successfully')
      refresh()
    })
    .catch((e: any) => {
      toast.error(e.data?.statusMessage || 'Failed to delete user')
    })
}

// ─── Sorting ───────────────────────────────────────────────
const sortBy = ref('fullName')
const sortDir = ref<'asc' | 'desc'>('asc')

function toggleSort(col: string) {
  if (sortBy.value === col) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortBy.value = col; sortDir.value = 'asc' }
}

function sortIcon(col: string) {
  if (sortBy.value !== col) return 'i-lucide-chevrons-up-down'
  return sortDir.value === 'asc' ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
}

// ─── Computed ───────────────────────────────────────────────
// Extract unique roles from users data
const uniqueRoles = computed(() => {
  const counts = new Map<string, number>()
  users.value.forEach((u: any) => {
    if (u.Role) {
      counts.set(u.Role, (counts.get(u.Role) || 0) + 1)
    }
  })
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

const totalUsersCount = computed(() => users.value.length)

const filteredUsers = computed(() => {
  let result = users.value

  // Filter by active role
  if (activeRole.value) {
    result = result.filter((u: any) => u.Role === activeRole.value)
  }

  // Filter by search
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter((u: any) => {
      const fullName = [u['First Name'], u['Last Name']].filter(Boolean).join(' ')
      return [...Object.values(u), fullName].filter(Boolean).some(val => String(val).toLowerCase().includes(q))
    })
  }

  return result
})

const USER_COL_FIELD: Record<string, string> = {
  fullName: 'First Name',
  email: 'Email',
  phone: 'Phone',
  role: 'Role',
  secondaryRole: 'Secondary Role',
  vendors: 'Vendors',
  department: 'Department',
  branch: 'Branch',
  status: 'Status',
}

const sortedUsers = computed(() => {
  const arr = [...filteredUsers.value]
  const field = USER_COL_FIELD[sortBy.value] || sortBy.value
  return arr.sort((a, b) => {
    let av = ''
    let bv = ''
    if (sortBy.value === 'fullName') {
      av = [a['First Name'], a['Last Name']].filter(Boolean).join(' ').toLowerCase()
      bv = [b['First Name'], b['Last Name']].filter(Boolean).join(' ').toLowerCase()
    }
    else {
      av = String(a[field] ?? '').toLowerCase()
      bv = String(b[field] ?? '').toLowerCase()
    }
    const cmp = av.localeCompare(bv)
    return sortDir.value === 'asc' ? cmp : -cmp
  })
})

const visibleUsers = computed(() => sortedUsers.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < sortedUsers.value.length)

watch(search, () => { visibleCount.value = CHUNK_SIZE })
watch(activeRole, () => { visibleCount.value = CHUNK_SIZE })

// Infinite scroll
const sentinelRef = ref<HTMLElement | null>(null)
onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && hasMore.value) {
        visibleCount.value += CHUNK_SIZE
      }
    },
    { threshold: 0.1 },
  )
  watch(sentinelRef, (el) => {
    if (el) observer.observe(el)
  }, { immediate: true })
  onUnmounted(() => observer.disconnect())
})

// ─── Helpers ────────────────────────────────────────────────
function getInitials(first?: string, last?: string): string {
  return `${(first || '?')[0]}${(last || '?')[0]}`.toUpperCase()
}

function getFullName(u: any): string {
  return [u['First Name'], u['Last Name']].filter(Boolean).join(' ') || '—'
}

function formatPhone(value?: string): string {
  if (!value) return '—'
  const digits = value.replace(/\D/g, '')
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  return value
}

function formatPhoneInput(value: string | number | undefined | null): string {
  if (!value) return ''
  const digits = String(value).replace(/\D/g, '').slice(0, 10)
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

function handlePhoneInput(e: Event, key: string) {
  const input = e.target as HTMLInputElement
  const formatted = formatPhoneInput(input.value)
  input.value = formatted // force underlying DOM explicitly
  formData.value[key] = formatted
}

function statusLabel(u: any): boolean {
  return u.Status === true || u.Status === 'true'
}

function getDropdownInfo(type: string, name: string) {
  if (!type || !name || !dropdowns.value) return null
  return dropdowns.value.find((d: any) => d.Type?.toLowerCase() === type.toLowerCase() && d.Name?.toLowerCase() === name.toLowerCase()) || null
}

function resolveVendorNamesArray(vendorStr: string): string[] {
  if (!vendorStr) return []
  // vendors.value is from the global store, so it is accessible here inside the setup scope
  const vStore = useDashboardStore().vendors.value
  return vendorStr.split(',').map(s => {
    const part = s.trim()
    const found = vStore?.find((v: any) => v['Row ID'] === part)
    return found ? found['Vendor Name'] : part
  }).filter(Boolean)
}

function resolveDropdownNamesArray(str: string, type: string): string[] {
  if (!str) return []
  const dStore = useDashboardStore().dropdowns.value
  return str.split(',').map(s => {
    const part = s.trim()
    const found = dStore?.find((d: any) => d.Type?.toLowerCase() === type.toLowerCase() && d.ROWID === part)
    return found ? found.Name : part
  }).filter(Boolean)
}
</script>

<template>
  <AdminLayout :roles="uniqueRoles" v-model:active-role="activeRole" :total-count="totalUsersCount">
    <div class="w-full flex-1 flex flex-col min-h-0">
      <!-- Teleport search + actions to header -->
      <Teleport v-if="isMounted" to="#header-toolbar">
        <div class="flex items-center gap-2 w-full justify-end">
          <div class="relative max-w-[220px]">
            <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input v-model="search" placeholder="Search users..." class="pl-8 h-8 text-sm" />
          </div>
          <p class="text-xs text-muted-foreground tabular-nums hidden lg:block whitespace-nowrap">
            {{ filteredUsers.length }} record{{ filteredUsers.length !== 1 ? 's' : '' }}
          </p>
          <Button variant="ghost" size="sm" class="h-8" @click="refresh()">
            <Icon name="i-lucide-refresh-cw" class="size-3.5" />
          </Button>
          <Button size="sm" class="h-8" @click="openCreate">
            <Icon name="i-lucide-plus" class="mr-1 size-3.5" />
            Add User
          </Button>
        </div>
      </Teleport>

      <!-- Data Table -->
      <div class="flex-1 min-h-0 overflow-auto">
        <Table>
          <TableHeader class="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
            <TableRow class="border-b-0">
              <TableHead class="min-w-[180px] bg-card cursor-pointer select-none" @click="toggleSort('fullName')">
                <div class="flex items-center gap-1">Full Name <Icon :name="sortIcon('fullName')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[190px] bg-card cursor-pointer select-none" @click="toggleSort('email')">
                <div class="flex items-center gap-1">Email <Icon :name="sortIcon('email')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[140px] bg-card cursor-pointer select-none" @click="toggleSort('phone')">
                <div class="flex items-center gap-1">Phone <Icon :name="sortIcon('phone')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[130px] bg-card cursor-pointer select-none" @click="toggleSort('role')">
                <div class="flex items-center gap-1">Role <Icon :name="sortIcon('role')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[150px] bg-card cursor-pointer select-none" @click="toggleSort('secondaryRole')">
                <div class="flex items-center gap-1">Secondary Role <Icon :name="sortIcon('secondaryRole')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[120px] bg-card cursor-pointer select-none" @click="toggleSort('vendors')">
                <div class="flex items-center gap-1">Vendors <Icon :name="sortIcon('vendors')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[140px] bg-card cursor-pointer select-none" @click="toggleSort('department')">
                <div class="flex items-center gap-1">Department <Icon :name="sortIcon('department')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[120px] bg-card cursor-pointer select-none" @click="toggleSort('branch')">
                <div class="flex items-center gap-1">Branch <Icon :name="sortIcon('branch')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[100px] bg-card cursor-pointer select-none" @click="toggleSort('status')">
                <div class="flex items-center gap-1">Status <Icon :name="sortIcon('status')" class="size-3 opacity-60" /></div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="(user, idx) in visibleUsers"
              :key="user.Email || idx"
              class="group"
            >
              <!-- Full Name -->
              <TableCell>
                <div class="flex items-center gap-2">
                  <Avatar class="size-7 border shrink-0">
                    <AvatarFallback class="text-[10px] font-medium bg-gradient-to-br from-violet-500/20 to-indigo-500/20 text-violet-700 dark:text-violet-300">
                      {{ getInitials(user['First Name'], user['Last Name']) }}
                    </AvatarFallback>
                  </Avatar>
                  <span class="font-medium">{{ getFullName(user) }}</span>
                </div>
              </TableCell>

              <!-- Email -->
              <TableCell>
                <span class="text-muted-foreground text-sm">{{ user.Email || '—' }}</span>
              </TableCell>

              <!-- Phone -->
              <TableCell>{{ formatPhone(user.Phone) }}</TableCell>

              <!-- Role -->
              <TableCell>
                <Badge v-if="user.Role" variant="outline" class="bg-blue-500/10 text-blue-600 border-blue-500/20">
                  {{ user.Role }}
                </Badge>
                <span v-else class="text-muted-foreground">—</span>
              </TableCell>

              <!-- Secondary Role -->
              <TableCell class="text-muted-foreground text-sm">{{ user['Secondary Role'] || '—' }}</TableCell>

              <!-- Vendors -->
              <TableCell class="text-muted-foreground text-sm">{{ resolveVendorNamesArray(user.Vendors).join(', ') || '—' }}</TableCell>

              <!-- Department -->
              <TableCell>
                <template v-if="user.Department">
                  <Badge 
                    v-if="getDropdownInfo('department', resolveDropdownNamesArray(user.Department, 'department')[0] || user.Department)" 
                    variant="outline" 
                    class="gap-1.5 border"
                    :style="getDropdownInfo('department', resolveDropdownNamesArray(user.Department, 'department')[0] || user.Department).Color ? { 
                      backgroundColor: `${getDropdownInfo('department', resolveDropdownNamesArray(user.Department, 'department')[0] || user.Department).Color}15`,
                      color: getDropdownInfo('department', resolveDropdownNamesArray(user.Department, 'department')[0] || user.Department).Color,
                      borderColor: `${getDropdownInfo('department', resolveDropdownNamesArray(user.Department, 'department')[0] || user.Department).Color}30`
                    } : {}"
                  >
                    <Icon :name="getDropdownInfo('department', resolveDropdownNamesArray(user.Department, 'department')[0] || user.Department).Icon || 'i-lucide-building'" class="size-3 shrink-0" />
                    {{ resolveDropdownNamesArray(user.Department, 'department')[0] || user.Department }}
                  </Badge>
                  <span v-else class="text-sm">{{ resolveDropdownNamesArray(user.Department, 'department')[0] || user.Department }}</span>
                </template>
                <span v-else class="text-muted-foreground">—</span>
              </TableCell>

              <!-- Branch -->
              <TableCell>{{ resolveDropdownNamesArray(user.Branch, 'branch').join(', ') || '—' }}</TableCell>

              <!-- Status -->
              <TableCell>
                <Badge
                  v-if="statusLabel(user)"
                  variant="outline"
                  class="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                >
                  Active
                </Badge>
                <Badge v-else variant="outline" class="bg-zinc-500/10 text-zinc-500 border-zinc-500/20">
                  Inactive
                </Badge>
              </TableCell>
            </TableRow>

            <!-- Empty State -->
            <TableRow v-if="visibleUsers.length === 0">
              <TableCell :colspan="9" class="h-32 text-center">
                <div class="flex flex-col items-center gap-2 text-muted-foreground">
                  <Icon name="i-lucide-inbox" class="size-8" />
                  <p>No users found</p>
                  <Button size="sm" variant="outline" @click="openCreate">
                    <Icon name="i-lucide-plus" class="mr-1 size-4" />
                    Add User
                  </Button>
                </div>
              </TableCell>
            </TableRow>

            <!-- Infinite scroll sentinel -->
            <tr v-if="hasMore" ref="sentinelRef">
              <td :colspan="9" class="h-10 text-center text-xs text-muted-foreground">
                Loading more…
              </td>
            </tr>
          </TableBody>
        </Table>
      </div>

      <!-- Create/Edit Dialog -->
      <Dialog v-model:open="showDialog">
        <DialogContent class="sm:max-w-[800px] h-[90vh] flex flex-col p-6">
          <DialogHeader class="shrink-0">
            <DialogTitle>{{ editingUser ? 'Edit' : 'New' }} User</DialogTitle>
            <DialogDescription class="sr-only">
              {{ editingUser ? 'Edit' : 'Create' }} a user record
            </DialogDescription>
          </DialogHeader>
          <form class="flex flex-col flex-1 min-h-0 overflow-hidden" @submit.prevent="handleSave">
            <div class="flex-1 overflow-y-auto px-1 py-2 mb-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div v-for="field in formFields" :key="field.key" class="space-y-1.5">
                <Label :for="field.key" class="text-xs">{{ field.label }}</Label>
                <Select v-if="field.type === 'select'" v-model="formData[field.key]">
                  <SelectTrigger>
                    <SelectValue :placeholder="`Select ${field.label.toLowerCase()}`" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="opt in field.options" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <!-- Searchable Role Dropdown -->
                <div v-else-if="field.type === 'role-select'" class="relative">
                  <button type="button" @click="isRoleOpen = !isRoleOpen; roleSearch = ''" class="flex items-center justify-between w-full h-9 px-3 py-1 border rounded-md shadow-sm text-sm bg-transparent">
                    <span :class="!formData[field.key] ? 'text-muted-foreground' : ''">{{ formData[field.key] || 'Select Role...' }}</span>
                    <Icon name="i-lucide-chevron-down" class="size-3.5 opacity-50" />
                  </button>
                  <div v-if="isRoleOpen" class="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md p-1">
                    <div class="flex items-center px-2 pb-1 border-b mb-1">
                      <Icon name="i-lucide-search" class="size-3 mr-2 opacity-50" />
                      <input v-model="roleSearch" class="flex h-8 w-full bg-transparent text-sm outline-none" placeholder="Search role..." />
                    </div>
                    <div class="max-h-[350px] overflow-y-auto">
                      <button v-for="opt in rolesStoreOptions.filter(o => o.toLowerCase().includes(roleSearch.toLowerCase()) && o !== formData.secondaryRole)" :key="opt" type="button" @click="formData[field.key] = opt; isRoleOpen = false" class="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded-sm transition-colors">
                        {{ opt }}
                      </button>
                      <div v-if="!rolesStoreOptions.filter(o => o.toLowerCase().includes(roleSearch.toLowerCase()) && o !== formData.secondaryRole).length" class="text-xs text-muted-foreground py-2 text-center">No roles found</div>
                    </div>
                  </div>
                  <div v-if="isRoleOpen" class="fixed inset-0 z-40" @click="isRoleOpen = false"></div>
                </div>

                <!-- Searchable Secondary Role Dropdown -->
                <div v-else-if="field.type === 'sec-role-select'" class="relative">
                  <button type="button" @click="isSecRoleOpen = !isSecRoleOpen; secRoleSearch = ''" class="flex items-center justify-between w-full h-9 px-3 py-1 border rounded-md shadow-sm text-sm bg-transparent">
                    <span :class="!formData[field.key] ? 'text-muted-foreground' : ''">{{ formData[field.key] || 'Select Secondary Role...' }}</span>
                    <Icon name="i-lucide-chevron-down" class="size-3.5 opacity-50" />
                  </button>
                  <div v-if="isSecRoleOpen" class="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md p-1">
                    <div class="flex items-center px-2 pb-1 border-b mb-1">
                      <Icon name="i-lucide-search" class="size-3 mr-2 opacity-50" />
                      <input v-model="secRoleSearch" class="flex h-8 w-full bg-transparent text-sm outline-none" placeholder="Search secondary..." />
                    </div>
                    <div class="max-h-[350px] overflow-y-auto">
                      <button type="button" @click="formData[field.key] = ''; isSecRoleOpen = false" class="w-full text-left px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-sm transition-colors">
                        None
                      </button>
                      <button v-for="opt in rolesStoreOptions.filter(o => o.toLowerCase().includes(secRoleSearch.toLowerCase()) && o !== formData.role)" :key="opt" type="button" @click="formData[field.key] = opt; isSecRoleOpen = false" class="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded-sm transition-colors">
                        {{ opt }}
                      </button>
                      <div v-if="!rolesStoreOptions.filter(o => o.toLowerCase().includes(secRoleSearch.toLowerCase()) && o !== formData.role).length" class="text-xs text-muted-foreground py-2 text-center">No roles found</div>
                    </div>
                  </div>
                  <div v-if="isSecRoleOpen" class="fixed inset-0 z-40" @click="isSecRoleOpen = false"></div>
                </div>

                <!-- Vendors Multi-select Dropdown -->
                <div v-else-if="field.type === 'vendor-multi-select'" class="relative sm:col-span-2">
                  <button type="button" @click="isVendorsOpen = !isVendorsOpen; vendorsSearch = ''" class="flex items-center justify-between w-full min-h-[36px] px-3 py-1 border rounded-md shadow-sm text-sm bg-transparent">
                    <div class="flex flex-wrap gap-1 items-center overflow-hidden h-full">
                      <template v-if="formData[field.key]?.length">
                        <span v-for="v in formData[field.key]" :key="v" class="inline-flex items-center bg-primary/10 text-primary border-primary/20 border px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap font-medium">
                          {{ v }}
                          <span class="ml-1 hover:text-red-500 cursor-pointer transition-colors" @click.stop="formData[field.key] = formData[field.key].filter((x: string) => x !== v)">
                            <Icon name="i-lucide-x" class="size-2.5" />
                          </span>
                        </span>
                      </template>
                      <span v-else class="text-muted-foreground">Select Vendors...</span>
                    </div>
                    <Icon name="i-lucide-chevron-down" class="size-3.5 opacity-50 shrink-0 ml-2" />
                  </button>
                  <div v-if="isVendorsOpen" class="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-1">
                    <div class="flex items-center px-2 pb-1 border-b mb-1">
                      <Icon name="i-lucide-search" class="size-3 mr-2 opacity-50" />
                      <input v-model="vendorsSearch" class="flex h-8 w-full bg-transparent text-sm outline-none" placeholder="Search vendors..." />
                    </div>
                    <div class="max-h-[350px] overflow-y-auto">
                      <button v-for="opt in vendorOptions.filter(o => o.toLowerCase().includes(vendorsSearch.toLowerCase()))" :key="opt" type="button" @click="formData[field.key].includes(opt) ? formData[field.key] = formData[field.key].filter((x: string) => x !== opt) : formData[field.key].push(opt)" class="w-full flex items-center justify-between px-2 py-1.5 text-sm hover:bg-muted rounded-sm transition-colors">
                        <span class="truncate">{{ opt }}</span>
                        <div class="size-3.5 rounded border flex items-center justify-center shrink-0 ml-2 shadow-sm" :class="formData[field.key].includes(opt) ? 'bg-primary border-primary text-primary-foreground' : 'border-input'">
                          <Icon v-if="formData[field.key].includes(opt)" name="i-lucide-check" class="size-2.5" />
                        </div>
                      </button>
                      <div v-if="!vendorOptions.filter(o => o.toLowerCase().includes(vendorsSearch.toLowerCase())).length" class="text-xs text-muted-foreground py-3 text-center">No vendors match your search.</div>
                    </div>
                  </div>
                  <div v-if="isVendorsOpen" class="fixed inset-0 z-40" @click="isVendorsOpen = false"></div>
                </div>

                <!-- Department Single Select Dropdown -->
                <div v-else-if="field.type === 'department-select'" class="relative">
                  <button type="button" @click="isDeptOpen = !isDeptOpen; deptSearch = ''" class="flex items-center justify-between w-full h-9 px-3 py-1 border rounded-md shadow-sm text-sm bg-transparent">
                    <span :class="!formData[field.key] ? 'text-muted-foreground' : ''">{{ formData[field.key] || 'Select Department...' }}</span>
                    <Icon name="i-lucide-chevron-down" class="size-3.5 opacity-50" />
                  </button>
                  <div v-if="isDeptOpen" class="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md p-1">
                    <div class="flex items-center px-2 pb-1 border-b mb-1">
                      <Icon name="i-lucide-search" class="size-3 mr-2 opacity-50" />
                      <input v-model="deptSearch" class="flex h-8 w-full bg-transparent text-sm outline-none" placeholder="Search department..." />
                    </div>
                    <div class="max-h-[350px] overflow-y-auto">
                      <button type="button" @click="formData[field.key] = ''; isDeptOpen = false" class="w-full text-left px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-sm transition-colors">
                        None
                      </button>
                      <button v-for="opt in departmentOptions.filter(o => o.toLowerCase().includes(deptSearch.toLowerCase()))" :key="opt" type="button" @click="formData[field.key] = opt; isDeptOpen = false" class="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded-sm transition-colors">
                        {{ opt }}
                      </button>
                      <div v-if="!departmentOptions.filter(o => o.toLowerCase().includes(deptSearch.toLowerCase())).length" class="text-xs text-muted-foreground py-2 text-center">No departments found</div>
                    </div>
                  </div>
                  <div v-if="isDeptOpen" class="fixed inset-0 z-40" @click="isDeptOpen = false"></div>
                </div>

                <!-- Branch Multi-select Dropdown -->
                <div v-else-if="field.type === 'branch-multi-select'" class="relative sm:col-span-2">
                  <button type="button" @click="isBranchOpen = !isBranchOpen; branchSearch = ''" class="flex items-center justify-between w-full min-h-[36px] px-3 py-1 border rounded-md shadow-sm text-sm bg-transparent">
                    <div class="flex flex-wrap gap-1 items-center overflow-hidden h-full">
                      <template v-if="formData[field.key]?.length">
                        <span v-for="v in formData[field.key]" :key="v" class="inline-flex items-center bg-primary/10 text-primary border-primary/20 border px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap font-medium">
                          {{ v }}
                          <span class="ml-1 hover:text-red-500 cursor-pointer transition-colors" @click.stop="formData[field.key] = formData[field.key].filter((x: string) => x !== v)">
                            <Icon name="i-lucide-x" class="size-2.5" />
                          </span>
                        </span>
                      </template>
                      <span v-else class="text-muted-foreground">Select Branch...</span>
                    </div>
                    <Icon name="i-lucide-chevron-down" class="size-3.5 opacity-50 shrink-0 ml-2" />
                  </button>
                  <div v-if="isBranchOpen" class="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-1">
                    <div class="flex items-center px-2 pb-1 border-b mb-1">
                      <Icon name="i-lucide-search" class="size-3 mr-2 opacity-50" />
                      <input v-model="branchSearch" class="flex h-8 w-full bg-transparent text-sm outline-none" placeholder="Search branch..." />
                    </div>
                    <div class="max-h-[350px] overflow-y-auto">
                      <button v-for="opt in branchOptions.filter(o => o.toLowerCase().includes(branchSearch.toLowerCase()))" :key="opt" type="button" @click="formData[field.key].includes(opt) ? formData[field.key] = formData[field.key].filter((x: string) => x !== opt) : formData[field.key].push(opt)" class="w-full flex items-center justify-between px-2 py-1.5 text-sm hover:bg-muted rounded-sm transition-colors">
                        <span class="truncate">{{ opt }}</span>
                        <div class="size-3.5 rounded border flex items-center justify-center shrink-0 ml-2 shadow-sm" :class="formData[field.key].includes(opt) ? 'bg-primary border-primary text-primary-foreground' : 'border-input'">
                          <Icon v-if="formData[field.key].includes(opt)" name="i-lucide-check" class="size-2.5" />
                        </div>
                      </button>
                      <div v-if="!branchOptions.filter(o => o.toLowerCase().includes(branchSearch.toLowerCase())).length" class="text-xs text-muted-foreground py-3 text-center">No branches match your search.</div>
                    </div>
                  </div>
                  <div v-if="isBranchOpen" class="fixed inset-0 z-40" @click="isBranchOpen = false"></div>
                </div>

                  <Input
                    v-else-if="field.type === 'phone'"
                    :id="field.key"
                    :model-value="formData[field.key]"
                    @input="handlePhoneInput($event, field.key)"
                    type="tel"
                    maxlength="14"
                    :placeholder="field.placeholder"
                  />

                  <Input
                    v-else
                    :id="field.key"
                    v-model="formData[field.key]"
                    :type="field.type || 'text'"
                    :placeholder="field.placeholder"
                    :disabled="!!editingUser && field.key === 'email'"
                  />
                </div>
              </div>
            </div>
            <DialogFooter class="shrink-0 pt-2 border-t mt-auto">
              <Button variant="outline" type="button" @click="showDialog = false">Cancel</Button>
              <Button type="submit" :disabled="saving">
                <Icon v-if="saving" name="i-lucide-loader-2" class="mr-1 size-4 animate-spin" />
                {{ editingUser ? 'Update' : 'Create' }}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <!-- Delete Confirmation -->
      <AlertDialog v-model:open="showDeleteDialog">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{{ getFullName(deletingUser || {}) }}</strong>
              ({{ deletingUser?.Email }}). This action cannot be undone.
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
  </AdminLayout>
</template>

<style scoped>
:deep([data-slot="table-container"]) {
  overflow: visible !important;
}
</style>
