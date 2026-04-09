<script setup lang="ts">
import NumberFlow from '@number-flow/vue'

const { setHeader } = usePageHeader()
setHeader({ title: 'Operations Dashboard', icon: 'i-lucide-layout-dashboard', description: 'Real-time operations monitoring and command center' })

// ─── Use the global prefetched data store ───────────────────
const store = useDashboardStore()
const {
  projects,
  events,
  userNameMap,
  customerNameMap,
  init,
} = store

// Add loading state logic
const loading = computed(() => !store.ready.value)


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
  if (['completed', 'complete', 'done', 'rcvd', 'closed', 'success'].some(k => s.includes(k)))
    return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
  if (['in progress', 'active', 'open', 'started'].some(k => s.includes(k)))
    return 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400'
  if (['pending', 'new', 'tbd', 'hold', 'submitted', 'requested', 'rolling'].some(k => s.includes(k)))
    return 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400'
  if (['cancel', 'n/a', 'rejected', 'failed', 'no approval'].some(k => s.includes(k)))
    return 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400'
  return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
}

function statusColorBg(status: string): string {
  const s = (status || '').toLowerCase()
  if (['completed', 'complete', 'done', 'rcvd', 'closed', 'success'].some(k => s.includes(k))) return 'bg-emerald-500'
  if (['in progress', 'active', 'open', 'started'].some(k => s.includes(k))) return 'bg-blue-500'
  if (['pending', 'new', 'tbd', 'hold', 'submitted', 'requested', 'rolling'].some(k => s.includes(k))) return 'bg-amber-500'
  if (['cancel', 'n/a', 'rejected', 'failed', 'no approval'].some(k => s.includes(k))) return 'bg-red-500'
  return 'bg-zinc-500'
}

function statusColorDot(status: string): string {
  return statusColorBg(status)
}

const totalProjects = computed(() => projects.value.length)
const activeProjects = computed(() => projects.value.filter(p => (p['Job Status'] || '').toLowerCase() === 'in progress').length)
const completedProjects = computed(() => projects.value.filter(p => (p['Job Status'] || '').toLowerCase() === 'closed').length)

// ─── Quick Links ────────────────────────────────────────────
const quickLinks = computed(() => [
  { label: 'All Projects', count: totalProjects.value, icon: 'i-lucide-folder-kanban', link: '/projects/all-projects', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { label: 'Events Calendar', count: events.value.length, icon: 'i-lucide-calendar-days', link: '/events/calendar', color: 'text-violet-500', bg: 'bg-violet-500/10' },
  { label: 'Project Chat', count: null, icon: 'i-lucide-message-circle', link: '/project-chats', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { label: 'Customers', count: Object.keys(customerNameMap.value).length, icon: 'i-lucide-users', link: '/customers', color: 'text-amber-500', bg: 'bg-amber-500/10' },
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
    .slice(0, 4)
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
    .slice(0, 6)
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
    .sort((a, b) => (b._date?.getTime() || 0) - (a._date?.getTime() || 0))
    .slice(0, 5)
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
    .slice(0, 4)
})

// ─── PTO / Permit alerts ────────────────────────────────────
const notifications = computed(() => {
  const items: { category: string, label: string, count: number, icon: string, color: string, isCritical: boolean }[] = []

  // PTO pending
  const ptoPending = projects.value.filter(p => {
    const s = (p['PTO Status'] || '').toLowerCase()
    return s === 'new' || s === 'requested' || s === 'submitted'
  }).length
  if (ptoPending > 0) items.push({ category: 'PTO', label: 'PTO Pending / Submitted', count: ptoPending, icon: 'i-lucide-clock', color: 'text-amber-500', isCritical: false })

  // Incomplete projects
  const incomplete = projects.value.filter(p => {
    const s = (p['Completion Status'] || '').toLowerCase()
    return s === 'incomplete' || s === 'pending'
  }).length
  if (incomplete > 0) items.push({ category: 'Projects', label: 'Pending Completion', count: incomplete, icon: 'i-lucide-alert-circle', color: 'text-red-500', isCritical: true })

  // New jobs
  const newJobs = projects.value.filter(p => (p['Project Status'] || '').toLowerCase() === 'new job').length
  if (newJobs > 0) items.push({ category: 'Projects', label: 'Awaiting Action', count: newJobs, icon: 'i-lucide-plus-circle', color: 'text-blue-500', isCritical: false })

  // On hold
  const onHold = projects.value.filter(p => (p['Project Status'] || '').toLowerCase() === 'on hold').length
  if (onHold > 0) items.push({ category: 'Projects', label: 'Currently On Hold', count: onHold, icon: 'i-lucide-pause-circle', color: 'text-orange-500', isCritical: true })

  // No approval
  const noApproval = projects.value.filter(p => (p['Project Status'] || '').toLowerCase() === 'no approval').length
  if (noApproval > 0) items.push({ category: 'Projects', label: 'Missing Approval', count: noApproval, icon: 'i-lucide-shield-alert', color: 'text-red-500', isCritical: true })

  return items
})

// event type colors
const eventColors: Record<string, string> = {
  Install: 'bg-emerald-500', SSA: 'bg-slate-500', Completion: 'bg-amber-500',
  'Final Inspection': 'bg-red-500', Service: 'bg-zinc-500', MPU: 'bg-violet-500',
  'Turn On': 'bg-blue-500', Stucco: 'bg-blue-400', REPAIR: 'bg-pink-500',
}
</script>

<template>
  <div class="w-full flex-1 min-h-0 overflow-auto flex flex-col">
    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="flex flex-col items-center gap-3">
        <Icon name="i-lucide-loader-2" class="size-8 animate-spin text-primary" />
        <p class="text-sm text-muted-foreground">Loading dashboard data…</p>
      </div>
    </div>

    <!-- Main Dashboard Content -->
    <div v-else class="max-w-7xl mx-auto p-4 md:p-6 space-y-6 w-full">

        <!-- ═══ METRICS ROW ═══ -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card class="border-border/50">
            <CardContent class="p-5 flex items-center justify-between">
              <div class="space-y-1">
                <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Projects</p>
                <div class="text-3xl font-bold font-mono tracking-tight">
                  <NumberFlow :value="totalProjects" />
                </div>
              </div>
              <div class="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Icon name="i-lucide-folder-kanban" class="size-5 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card class="border-border/50">
            <CardContent class="p-5 flex items-center justify-between">
              <div class="space-y-1">
                <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Rollout</p>
                <div class="text-3xl font-bold font-mono tracking-tight text-blue-500 dark:text-blue-400">
                  <NumberFlow :value="activeProjects" />
                </div>
              </div>
              <div class="size-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <Icon name="i-lucide-activity" class="size-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card class="border-border/50">
            <CardContent class="p-5 flex items-center justify-between">
              <div class="space-y-1">
                <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Completed Apps</p>
                <div class="text-3xl font-bold font-mono tracking-tight text-emerald-500 dark:text-emerald-400">
                  <NumberFlow :value="completedProjects" />
                </div>
              </div>
              <div class="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Icon name="i-lucide-check-circle" class="size-5 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- ═══ ROW 1: REVENUE PIPELINE & QUICK COMMANDS ═══ -->
        <div class="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <!-- REVENUE HORIZONTAL BAR CHART -->
          <Card class="col-span-full xl:col-span-8">
            <CardHeader class="pb-2">
              <CardTitle class="text-base font-semibold">Branch Revenue Flow</CardTitle>
              <p class="mt-0.5 text-xs text-muted-foreground">Top performing branches by realized value</p>
            </CardHeader>
            <CardContent class="pt-4">
              <div class="space-y-6">
                 <div v-for="item in branchBreakdown" :key="item.branch" class="space-y-2">
                    <div class="flex items-center justify-between text-sm">
                       <span class="font-medium font-mono tracking-tight">{{ item.branch }}</span>
                       <span class="font-bold tabular-nums">
                         {{ fmtCurrency(item.revenue) }} 
                         <span class="text-xs text-muted-foreground font-normal ml-1 border pl-1 pr-1.5 rounded-sm">
                           <Icon name="i-lucide-package" class="size-3 mr-1 inline-block -translate-y-[1px]" />
                           {{ item.count }}
                         </span>
                       </span>
                    </div>
                    <!-- Thick Bar -->
                    <div class="h-3.5 w-full rounded-sm bg-muted overflow-hidden border border-border/50">
                       <div class="h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-1000 ease-out relative"
                            :style="{ width: `${Math.max((item.revenue / (branchBreakdown[0]?.revenue || 1)) * 100, 2)}%` }">
                       </div>
                    </div>
                 </div>
              </div>
            </CardContent>
          </Card>

          <!-- COMMAND CENTER / QUICK LINKS -->
          <Card class="col-span-full xl:col-span-4">
            <CardHeader class="pb-2">
              <CardTitle class="text-base font-semibold">Command Center</CardTitle>
              <p class="mt-0.5 text-xs text-muted-foreground">Quick operations & reporting</p>
            </CardHeader>
            <CardContent>
              <div class="grid grid-cols-2 gap-2 mt-2">
                <NuxtLink v-for="link in quickLinks" :key="link.label" :to="link.link"
                  class="flex flex-col p-3 rounded-xl border border-border/50 bg-muted/10 hover:bg-muted/40 transition-all hover:scale-[1.02] hover:-translate-y-0.5 group">
                   <div class="flex items-center justify-between mb-3">
                     <div class="p-2 rounded-lg" :class="link.bg">
                       <Icon :name="link.icon" class="size-4.5" :class="link.color" />
                     </div>
                     <Icon name="i-lucide-arrow-up-right" class="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                   </div>
                   <p class="text-xs font-semibold px-0.5">{{ link.label }}</p>
                   <p v-if="link.count !== null" class="text-[10px] text-muted-foreground mt-0.5 font-mono px-0.5">{{ link.count }} registered</p>
                </NuxtLink>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- ═══ ROW 2: PIPELINE, KPIs, INCIDENTS ═══ -->
        <div class="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <!-- PIPELINE TIMELINE -->
          <Card class="col-span-full xl:col-span-6">
             <CardHeader class="pb-2">
                <div class="flex items-center justify-between">
                  <div>
                    <CardTitle class="text-base font-semibold">Deployment Pipeline</CardTitle>
                    <p class="mt-0.5 text-xs text-muted-foreground">Latest project rollouts across environments</p>
                  </div>
                  <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon name="i-lucide-git-branch" class="h-3.5 w-3.5 text-primary" />
                    <span>{{ recentProjects.length }} recent</span>
                  </div>
                </div>
             </CardHeader>
             <CardContent>
                <div class="relative border-l-2 border-border ml-3 mt-2">
                   <div v-for="(p, idx) in recentProjects" :key="p['Project ID']"
                        class="relative pl-6 pb-5" :class="{ 'pb-0': idx === recentProjects.length - 1 }">
                      
                      <!-- Dot -->
                      <div class="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-background" :class="statusColorDot(p['Project Status'])" />

                      <!-- Main Block -->
                      <div class="rounded-lg border border-border/50 bg-muted/20 p-3 transition-colors hover:bg-muted/40 cursor-pointer" @click="navigateTo(`/projects/${p['Project ID']}`)">
                         <div class="flex items-start justify-between gap-2">
                           <div class="flex items-center gap-2">
                             <Icon :name="['closed', 'completed'].some(k => (p['Project Status'] || '').toLowerCase().includes(k)) ? 'i-lucide-check' : 'i-lucide-clock'" 
                                   class="size-4 shrink-0" 
                                   :class="statusColorDot(p['Project Status']).replace('bg-', 'text-')" />
                             <span class="font-mono font-bold text-sm tracking-tight text-foreground truncate max-w-[150px] md:max-w-xs">{{ resolveCustomer(p['Customer ID']) }}</span>
                           </div>
                           <Badge variant="outline" class="text-[10px] shrink-0" :class="statusColor(p['Project Status'])">
                             {{ p['Project Status'] || 'Rolling' }}
                           </Badge>
                         </div>
                         <div class="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                            <div class="flex items-center gap-3">
                              <Badge variant="outline" class="text-[10px] font-mono rounded bg-background shadow-sm">{{ p['Project ID'] }}</Badge>
                              <span class="font-mono text-[11px] truncate tracking-tighter">{{ fmtCurrency(parsePrice(p['Project Price'])) }}</span>
                            </div>
                            <span class="text-[10px] shrink-0">{{ p._date?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) || 'Just now' }}</span>
                         </div>
                      </div>
                   </div>
                </div>
             </CardContent>
          </Card>

          <!-- KPI PROGRESS -->
          <Card class="col-span-full xl:col-span-3">
             <CardHeader class="pb-2">
                <CardTitle class="text-base font-semibold">Core Metrics</CardTitle>
                <p class="mt-0.5 text-xs text-muted-foreground">Capacity indicators</p>
             </CardHeader>
             <CardContent>
                <div class="space-y-5 mt-2">
                  <div v-for="item in projectStatusBreakdown" :key="item.status" class="space-y-1.5">
                    <div class="flex items-center justify-between">
                       <span class="text-xs font-semibold">{{ item.status }}</span>
                       <span class="text-sm font-mono font-bold">{{ item.count }}</span>
                    </div>
                    <div class="h-2 w-full rounded-full bg-muted overflow-hidden border border-border/30">
                       <div class="h-full rounded-full transition-all" :class="statusColorBg(item.status)" :style="{ width: `${item.pct}%` }"></div>
                    </div>
                  </div>
                </div>
             </CardContent>
          </Card>

          <!-- ACTIVE INCIDENTS -->
          <Card class="col-span-full xl:col-span-3">
             <CardHeader class="pb-2">
                <CardTitle class="text-base font-semibold">Active Incidents</CardTitle>
                <p class="mt-0.5 text-xs text-muted-foreground">Operations requiring attention</p>
             </CardHeader>
             <CardContent class="px-3">
                <div class="space-y-0">
                  <div v-for="(n, idx) in notifications" :key="idx"
                       class="flex gap-3 py-3 transition-colors hover:bg-muted/30 rounded-lg px-2"
                       :class="idx < notifications.length - 1 ? 'border-b border-border/50' : ''">
                    <div class="mt-1 shrink-0">
                       <div class="h-2.5 w-2.5 rounded-full" 
                            :class="[n.color.replace('text-', 'bg-'), n.isCritical ? 'animate-pulse' : '']" />
                    </div>
                    <div class="flex-1 min-w-0 space-y-1.5">
                      <p class="text-[13px] font-mono font-semibold leading-snug whitespace-nowrap overflow-hidden text-ellipsis">{{ n.label }}</p>
                      <div class="flex items-center justify-between gap-2">
                        <Badge variant="outline" class="text-[9px] uppercase tracking-wider" :class="[n.color.replace('text-', 'bg-').replace('-500', '-500/10'), n.color, n.color.replace('text-', 'border-').replace('-500', '-500/30')]">
                          {{ n.category }}
                        </Badge>
                        <span class="text-[11px] text-muted-foreground font-mono">{{ n.count }} items</span>
                      </div>
                    </div>
                  </div>
                  <div v-if="notifications.length === 0" class="py-8 text-center px-4">
                    <Icon name="i-lucide-check-circle-2" class="size-8 text-emerald-500/30 mx-auto mb-3" />
                    <p class="text-sm font-semibold text-foreground">Systems operational</p>
                    <p class="text-[11px] text-muted-foreground mt-1 text-balance">All operations are running smoothly without active incidents.</p>
                  </div>
                </div>
             </CardContent>
          </Card>
        </div>

        <!-- ═══ ROW 3: DISPATCH SCHEDULE & DISTRIBUTIONS ═══ -->
        <div class="grid grid-cols-1 xl:grid-cols-12 gap-4">
           <!-- DISPATCH SCHEDULE -->
           <Card class="col-span-full xl:col-span-7">
              <CardHeader class="pb-2">
                 <div class="flex items-center justify-between">
                   <div>
                     <CardTitle class="text-base font-semibold">Scheduled Dispatch</CardTitle>
                     <p class="mt-0.5 text-xs text-muted-foreground">Upcoming operations inside 7 days</p>
                   </div>
                   <NuxtLink to="/events/calendar" class="text-xs text-primary hover:underline flex items-center gap-1 font-medium bg-primary/10 px-2 py-1.5 rounded-md">
                     <Icon name="i-lucide-calendar" class="size-3.5" />
                     View all
                   </NuxtLink>
                 </div>
              </CardHeader>
              <CardContent>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                   <div v-for="evt in upcomingEvents" :key="evt['Event ID']" class="flex gap-4 p-3 rounded-lg border border-border/50 bg-muted/10 hover:bg-muted/40 transition-colors cursor-pointer group">
                      <div class="flex flex-col items-center justify-center min-w-[50px] p-1.5 rounded-md bg-background border border-border/60 shadow-sm group-hover:border-primary/40 transition-colors">
                         <span class="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">{{ evt._date?.toLocaleDateString('en-US', { month: 'short' }) }}</span>
                         <span class="text-xl font-bold font-mono tracking-tighter">{{ evt._date?.getDate() }}</span>
                      </div>
                      <div class="flex-1 min-w-0 flex flex-col justify-center">
                         <div class="flex items-center gap-2 mb-1">
                            <div class="size-2 rounded-full ring-2 ring-background shadow-xs shrink-0" :class="eventColors[evt['Event Type']] || 'bg-primary'" />
                            <p class="text-[13px] font-bold truncate tracking-tight">{{ evt['Event Type'] || 'Event' }}</p>
                         </div>
                         <p class="text-[11px] text-muted-foreground truncate">{{ evt['Customer Address'] || evt['Event Address'] || 'Pending Location' }}</p>
                         <p class="text-[10px] font-mono text-muted-foreground mt-1.5 flex items-center gap-1.5">
                           <Icon name="i-lucide-clock" class="size-3" />
                           {{ evt._date?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) }}
                         </p>
                      </div>
                   </div>
                   <div v-if="upcomingEvents.length === 0" class="col-span-full py-10 text-center border border-dashed border-border/60 rounded-lg bg-muted/5">
                     <Icon name="i-lucide-calendar-x" class="size-8 text-muted-foreground/30 mx-auto mb-3" />
                     <p class="text-sm font-medium">No operations scheduled</p>
                     <p class="text-[11px] text-muted-foreground mt-1">Your dispatch queue is clear for the next 7 days.</p>
                   </div>
                </div>
              </CardContent>
           </Card>

           <!-- PROJECT TYPES -->
           <Card class="col-span-full xl:col-span-5">
              <CardHeader class="pb-2">
                 <CardTitle class="text-base font-semibold">Service Distribution</CardTitle>
                 <p class="mt-0.5 text-xs text-muted-foreground">Portfolio composition by type</p>
              </CardHeader>
              <CardContent>
                 <div class="space-y-2 mt-2">
                    <div v-for="(item, idx) in projectTypeBreakdown" :key="item.type" 
                         class="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors">
                       <div class="flex items-center gap-3 min-w-0">
                          <div class="size-8 rounded-md bg-background border border-border/60 shadow-sm flex items-center justify-center shrink-0">
                             <Icon :name="item.type === 'Solar' ? 'i-lucide-sun' : item.type === 'R&R' ? 'i-lucide-rotate-ccw' : 'i-lucide-box'" class="size-4 text-primary" />
                          </div>
                          <span class="text-sm font-semibold truncate">{{ item.type }}</span>
                       </div>
                       <div class="flex items-center gap-3 shrink-0">
                          <div class="h-1.5 w-20 bg-muted/50 rounded-full overflow-hidden border border-border/20 hidden sm:block">
                             <div class="h-full bg-primary" :style="{ width: `${totalProjects > 0 ? (item.count / totalProjects) * 100 : 0}%` }"></div>
                          </div>
                          <Badge variant="secondary" class="font-mono font-bold text-xs shrink-0 w-10 justify-center bg-muted/50 text-foreground border-border/50">{{ item.count }}</Badge>
                       </div>
                    </div>
                 </div>
              </CardContent>
           </Card>
        </div>

    </div>
  </div>
</template>
