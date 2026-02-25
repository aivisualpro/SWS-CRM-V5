<script setup lang="ts">
import NumberFlow from '@number-flow/vue'

const { setHeader } = usePageHeader()
setHeader({ title: 'Home', icon: 'i-lucide-layout-dashboard', description: 'Overview of your solar operations' })

// ─── Use the global prefetched data store ───────────────────
const {
  projects,
  events,
  userNameMap,
  customerNameMap,
  init,
} = useDashboardStore()

// Ensure store is initialized (in case plugin hasn't run yet)
init()

// ─── Helpers ────────────────────────────────────────────────
function parsePrice(val: any): number {
  if (!val) return 0
  return Number.parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0
}

function parseDate(val: any): Date | null {
  if (!val) return null
  const v = val?.value || val
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

function resolveName(email: string): string {
  if (!email) return ''
  return userNameMap.value[email.toLowerCase()] || email.split('@')[0] || email
}

function resolveCustomer(id: string): string {
  if (!id) return '—'
  return customerNameMap.value[id] || id
}

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function statusColor(status: string): string {
  const s = (status || '').toLowerCase()
  if (['completed', 'complete', 'done', 'rcvd', 'closed'].some(k => s.includes(k)))
    return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
  if (['in progress', 'active', 'open', 'started'].some(k => s.includes(k)))
    return 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400'
  if (['pending', 'new', 'tbd', 'hold', 'submitted', 'requested'].some(k => s.includes(k)))
    return 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400'
  if (['cancel', 'n/a', 'rejected'].some(k => s.includes(k)))
    return 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400'
  return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
}

const totalProjects = computed(() => projects.value.length)
const activeProjects = computed(() => projects.value.filter(p => (p['Job Status'] || '').toLowerCase() === 'in progress').length)
const completedProjects = computed(() => projects.value.filter(p => (p['Job Status'] || '').toLowerCase() === 'closed').length)

// ─── Quick Links ────────────────────────────────────────────
const quickLinks = computed(() => [
  { label: 'All Projects', count: totalProjects.value, icon: 'i-lucide-folder-kanban', link: '/projects/all-projects', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { label: 'Events Calendar', count: events.value.length, icon: 'i-lucide-calendar-days', link: '/events/calendar', color: 'text-violet-500', bg: 'bg-violet-500/10' },
  { label: 'Project Chat', count: null, icon: 'i-lucide-message-circle', link: '/projects/chat', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { label: 'Customers', count: Object.keys(customerNameMap.value).length, icon: 'i-lucide-users', link: '/customers', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { label: 'Sales Report', count: null, icon: 'i-lucide-trending-up', link: '/reports/sales', color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { label: 'Financial Report', count: null, icon: 'i-lucide-pie-chart', link: '/reports/financial', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
])

// ─── Project status breakdown ───────────────────────────────
const projectStatusBreakdown = computed(() => {
  const counts: Record<string, number> = {}
  projects.value.forEach(p => {
    const s = p['Job Status'] || 'Unknown'
    counts[s] = (counts[s] || 0) + 1
  })
  return Object.entries(counts)
    .map(([status, count]) => ({ status, count, pct: totalProjects.value > 0 ? ((count / totalProjects.value) * 100).toFixed(1) : '0' }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
})

// ─── Upcoming Events (next 7 days) ──────────────────────────
const upcomingEvents = computed(() => {
  const now = new Date()
  const weekLater = new Date(now.getTime() + 7 * 86400000)
  return events.value
    .map(e => {
      const d = parseDate(e['Start Date'])
      return { ...e, _date: d }
    })
    .filter(e => e._date && e._date >= now && e._date <= weekLater)
    .sort((a, b) => a._date!.getTime() - b._date!.getTime())
    .slice(0, 8)
})

// ─── Recent Projects (last 14 days) ─────────────────────────
const recentProjects = computed(() => {
  const now = new Date()
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000)
  return projects.value
    .map(p => {
      const d = parseDate(p.TimeStamp)
      return { ...p, _date: d }
    })
    .filter(p => p._date && p._date >= twoWeeksAgo)
    .sort((a, b) => b._date!.getTime() - a._date!.getTime())
    .slice(0, 6)
})

// ─── Project Type breakdown ─────────────────────────────────
const projectTypeBreakdown = computed(() => {
  const counts: Record<string, number> = {}
  projects.value.forEach(p => {
    const t = p['Project Type'] || 'Other'
    counts[t] = (counts[t] || 0) + 1
  })
  return Object.entries(counts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
})

// ─── Branch breakdown ───────────────────────────────────────
const branchBreakdown = computed(() => {
  const counts: Record<string, { count: number, revenue: number }> = {}
  projects.value.forEach(p => {
    const b = p['Branch Name'] || 'Other'
    if (!counts[b]) counts[b] = { count: 0, revenue: 0 }
    counts[b]!.count++
    counts[b]!.revenue += parsePrice(p['Project Price'])
  })
  return Object.entries(counts)
    .map(([branch, data]) => ({ branch, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
})

// ─── PTO / Permit alerts ────────────────────────────────────
const notifications = computed(() => {
  const items: { category: string, label: string, count: number, icon: string, color: string }[] = []

  // PTO pending
  const ptoPending = projects.value.filter(p => {
    const s = (p['PTO Status'] || '').toLowerCase()
    return s === 'new' || s === 'requested' || s === 'submitted'
  }).length
  if (ptoPending > 0) items.push({ category: 'PTO', label: 'PTO Pending / Submitted', count: ptoPending, icon: 'i-lucide-clock', color: 'text-amber-500' })

  // Incomplete projects
  const incomplete = projects.value.filter(p => {
    const s = (p['Completion Status'] || '').toLowerCase()
    return s === 'incomplete' || s === 'pending'
  }).length
  if (incomplete > 0) items.push({ category: 'Projects', label: 'Incomplete / Pending Completion', count: incomplete, icon: 'i-lucide-alert-circle', color: 'text-red-500' })

  // New jobs
  const newJobs = projects.value.filter(p => (p['Project Status'] || '').toLowerCase() === 'new job').length
  if (newJobs > 0) items.push({ category: 'Projects', label: 'New Jobs Awaiting Action', count: newJobs, icon: 'i-lucide-plus-circle', color: 'text-blue-500' })

  // On hold
  const onHold = projects.value.filter(p => (p['Project Status'] || '').toLowerCase() === 'on hold').length
  if (onHold > 0) items.push({ category: 'Projects', label: 'Projects On Hold', count: onHold, icon: 'i-lucide-pause-circle', color: 'text-orange-500' })

  // No approval
  const noApproval = projects.value.filter(p => (p['Project Status'] || '').toLowerCase() === 'no approval').length
  if (noApproval > 0) items.push({ category: 'Projects', label: 'No Approval', count: noApproval, icon: 'i-lucide-shield-alert', color: 'text-red-500' })

  return items
})

// event type colors
const eventColors: Record<string, string> = {
  Install: 'bg-emerald-500', SSA: 'bg-slate-500', Completion: 'bg-orange-500',
  'Final Inspection': 'bg-red-500', Service: 'bg-zinc-500', MPU: 'bg-violet-500',
  'Turn On': 'bg-amber-500', Stucco: 'bg-blue-500', REPAIR: 'bg-pink-500',
}
</script>

<template>
  <div class="w-full flex-1 min-h-0 overflow-auto">
    <div class="max-w-7xl mx-auto p-4 md:p-6 space-y-6">


        <!-- ═══ MAIN GRID ═══ -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <!-- LEFT COLUMN (2/3) -->
          <div class="lg:col-span-2 space-y-4">

            <!-- Quick Links -->
            <Card>
              <CardHeader class="pb-2">
                <CardTitle class="text-sm font-semibold flex items-center gap-2">
                  <Icon name="i-lucide-star" class="size-4 text-amber-500" />
                  Quick Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <NuxtLink
                    v-for="link in quickLinks"
                    :key="link.label"
                    :to="link.link"
                    class="flex items-center gap-3 p-3 rounded-xl border hover:bg-muted/50 hover:shadow-sm transition-all group"
                  >
                    <div class="flex items-center justify-center size-9 rounded-lg shrink-0" :class="link.bg">
                      <Icon :name="link.icon" class="size-4.5 transition-transform group-hover:scale-110" :class="link.color" />
                    </div>
                    <div class="min-w-0">
                      <p class="text-xs font-semibold truncate">{{ link.label }}</p>
                      <p v-if="link.count !== null" class="text-[10px] text-muted-foreground tabular-nums">{{ link.count.toLocaleString() }} items</p>
                    </div>
                  </NuxtLink>
                </div>
              </CardContent>
            </Card>

            <!-- Project Status Breakdown + Branch Revenue -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Job Status -->
              <Card>
                <CardHeader class="pb-2">
                  <CardTitle class="text-sm font-semibold flex items-center gap-2">
                    <Icon name="i-lucide-activity" class="size-4 text-blue-500" />
                    Project Status
                  </CardTitle>
                </CardHeader>
                <CardContent class="space-y-2">
                  <div v-for="item in projectStatusBreakdown" :key="item.status" class="flex items-center gap-3">
                    <Badge variant="outline" :class="statusColor(item.status)" class="text-[10px] w-28 justify-center shrink-0">
                      {{ item.status }}
                    </Badge>
                    <div class="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div class="h-full rounded-full bg-primary/60 transition-all" :style="{ width: `${item.pct}%` }" />
                    </div>
                    <span class="text-xs font-semibold tabular-nums w-12 text-right">{{ item.count.toLocaleString() }}</span>
                  </div>
                </CardContent>
              </Card>

              <!-- Branch Revenue -->
              <Card>
                <CardHeader class="pb-2">
                  <CardTitle class="text-sm font-semibold flex items-center gap-2">
                    <Icon name="i-lucide-building-2" class="size-4 text-violet-500" />
                    Revenue by Branch
                  </CardTitle>
                </CardHeader>
                <CardContent class="space-y-2.5">
                  <div v-for="item in branchBreakdown" :key="item.branch" class="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div class="flex items-center gap-2">
                      <span class="size-2 rounded-full bg-primary" />
                      <span class="text-xs font-medium">{{ item.branch }}</span>
                    </div>
                    <div class="flex items-center gap-3">
                      <span class="text-[10px] text-muted-foreground tabular-nums">{{ item.count }} projects</span>
                      <span class="text-xs font-bold tabular-nums">{{ fmtCurrency(item.revenue) }}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <!-- Recent Projects -->
            <Card>
              <CardHeader class="pb-2">
                <div class="flex items-center justify-between">
                  <CardTitle class="text-sm font-semibold flex items-center gap-2">
                    <Icon name="i-lucide-clock" class="size-4 text-cyan-500" />
                    Recent Projects
                    <Badge variant="outline" class="text-[9px] ml-1">Last 14 days</Badge>
                  </CardTitle>
                  <NuxtLink to="/projects/all-projects" class="text-xs text-primary hover:underline">View all →</NuxtLink>
                </div>
              </CardHeader>
              <CardContent class="p-0">
                <Table>
                  <TableBody>
                    <TableRow
                      v-for="p in recentProjects"
                      :key="p['Project ID']"
                      class="cursor-pointer hover:bg-muted/50 transition-colors"
                      @click="navigateTo(`/projects/${p['Project ID']}`)"
                    >
                      <TableCell class="py-2.5">
                        <div class="flex items-center gap-3">
                          <Avatar class="size-8 border shrink-0">
                            <AvatarFallback class="text-[9px] font-medium bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-blue-700 dark:text-blue-300">
                              {{ resolveCustomer(p['Customer ID']).substring(0, 2).toUpperCase() }}
                            </AvatarFallback>
                          </Avatar>
                          <div class="min-w-0">
                            <p class="text-xs font-semibold truncate">{{ resolveCustomer(p['Customer ID']) }}</p>
                            <p class="text-[10px] text-muted-foreground font-mono">{{ p['Project ID'] }}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell class="py-2.5">
                        <Badge variant="outline" :class="statusColor(p['Project Status'])" class="text-[9px]">
                          {{ p['Project Status'] || '—' }}
                        </Badge>
                      </TableCell>
                      <TableCell class="py-2.5 text-right">
                        <span class="text-xs font-semibold tabular-nums">{{ fmtCurrency(parsePrice(p['Project Price'])) }}</span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <!-- RIGHT COLUMN (1/3) -->
          <div class="space-y-4">

            <!-- Notifications / Alerts -->
            <Card>
              <CardHeader class="pb-2">
                <CardTitle class="text-sm font-semibold flex items-center gap-2">
                  <Icon name="i-lucide-bell" class="size-4 text-red-500" />
                  Notifications
                  <Badge class="ml-auto text-[9px] bg-red-500/10 text-red-500 border-red-500/20" variant="outline">
                    {{ notifications.length }}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent class="space-y-1">
                <div v-for="(n, i) in notifications" :key="i" class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <Icon :name="n.icon" class="size-4 shrink-0" :class="n.color" />
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium truncate">{{ n.label }}</p>
                    <p class="text-[10px] text-muted-foreground">{{ n.category }}</p>
                  </div>
                  <Badge variant="outline" class="text-[10px] tabular-nums shrink-0">
                    {{ n.count }}
                  </Badge>
                </div>
                <div v-if="notifications.length === 0" class="py-6 text-center">
                  <Icon name="i-lucide-check-circle" class="size-8 text-emerald-500/30 mx-auto mb-2" />
                  <p class="text-xs text-muted-foreground">All clear!</p>
                </div>
              </CardContent>
            </Card>

            <!-- Upcoming Events -->
            <Card>
              <CardHeader class="pb-2">
                <div class="flex items-center justify-between">
                  <CardTitle class="text-sm font-semibold flex items-center gap-2">
                    <Icon name="i-lucide-calendar-days" class="size-4 text-violet-500" />
                    Upcoming Events
                  </CardTitle>
                  <NuxtLink to="/events/calendar" class="text-xs text-primary hover:underline">View all →</NuxtLink>
                </div>
              </CardHeader>
              <CardContent class="space-y-1">
                <div v-for="(evt, i) in upcomingEvents" :key="i" class="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div class="size-2 rounded-full shrink-0" :class="eventColors[evt['Event Type']] || 'bg-primary'" />
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium truncate">{{ evt['Event Type'] || 'Event' }}</p>
                    <p class="text-[10px] text-muted-foreground truncate">{{ evt['Customer Address'] || evt['Event Address'] || '' }}</p>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-[10px] font-semibold tabular-nums">
                      {{ evt._date?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
                    </p>
                    <p class="text-[9px] text-muted-foreground tabular-nums">
                      {{ evt._date?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) }}
                    </p>
                  </div>
                </div>
                <div v-if="upcomingEvents.length === 0" class="py-6 text-center">
                  <Icon name="i-lucide-calendar-x" class="size-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p class="text-xs text-muted-foreground">No upcoming events</p>
                </div>
              </CardContent>
            </Card>

            <!-- Project Type Distribution -->
            <Card>
              <CardHeader class="pb-2">
                <CardTitle class="text-sm font-semibold flex items-center gap-2">
                  <Icon name="i-lucide-layers" class="size-4 text-amber-500" />
                  Project Types
                </CardTitle>
              </CardHeader>
              <CardContent class="space-y-2">
                <div v-for="item in projectTypeBreakdown" :key="item.type" class="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div class="flex items-center gap-2 min-w-0">
                    <Icon :name="item.type === 'Solar' ? 'i-lucide-sun' : item.type === 'R&R' ? 'i-lucide-rotate-ccw' : 'i-lucide-box'" class="size-3.5 text-muted-foreground shrink-0" />
                    <span class="text-xs font-medium truncate">{{ item.type }}</span>
                  </div>
                  <span class="text-xs font-bold tabular-nums shrink-0">{{ item.count.toLocaleString() }}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

    </div>
  </div>
</template>
