<script setup lang="ts">
import { toast } from 'vue-sonner'

const { setHeader } = usePageHeader()
setHeader({ title: 'Events Calendar', icon: 'i-lucide-calendar-days' })

// ── Use store for instant data ───────────────────────────────
const store = useDashboardStore()
store.init()

// ── State ────────────────────────────────────────────────────
const events = computed(() =>
  (store.events.value || []).map((e: any) => ({
    ...e,
    _startDate: parseDate(e['Start Date']),
    _endDate: parseDate(e['End Date']),
  })),
)
const currentDate = ref(new Date())
const viewMode = ref<'month' | 'week'>('month')
const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

// ── Drag & drop state ────────────────────────────────────────
const draggingEvent = ref<any>(null)
const dragOverCell = ref<string | null>(null)
const resizingEvent = ref<any>(null)
const resizeStartY = ref(0)
const resizeOriginalEnd = ref<Date | null>(null)

// ── Event detail modal ───────────────────────────────────────
const showDetail = ref(false)
const selectedEvent = ref<any>(null)

function openEventDetail(evt: any) {
  selectedEvent.value = evt
  showDetail.value = true
}

// ── Day detail sheet ("+ more" view) ─────────────────────────
const showDaySheet = ref(false)
const daySheetDate = ref<Date | null>(null)
const daySheetKey = ref('')
const daySheetSearch = ref('')

function openDaySheet(date: Date, dateKey: string) {
  daySheetDate.value = date
  daySheetKey.value = dateKey
  daySheetSearch.value = ''
  showDaySheet.value = true
}

const daySheetEvents = computed(() => {
  const evts = eventsForDayFiltered(daySheetKey.value)
  if (!daySheetSearch.value) return evts
  const q = daySheetSearch.value.toLowerCase()
  return evts.filter(e =>
    (e['Event Type'] || '').toLowerCase().includes(q)
    || (e['Event Status'] || '').toLowerCase().includes(q)
    || (e['Customer Address'] || e['Event Address'] || '').toLowerCase().includes(q)
    || (e.Branch || '').toLowerCase().includes(q)
    || resolveVendor(e.Vendor || '').toLowerCase().includes(q)
    || (e['Event Description'] || '').toLowerCase().includes(q),
  )
})

const daySheetTypeSummary = computed(() => {
  const evts = eventsForDayFiltered(daySheetKey.value)
  const counts: Record<string, number> = {}
  evts.forEach(e => {
    const type = e['Event Type'] || 'Other'
    counts[type] = (counts[type] || 0) + 1
  })
  return Object.entries(counts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
})

function formatDaySheetDate(d: Date | null): string {
  if (!d) return ''
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function openEventFromSheet(evt: any) {
  showDaySheet.value = false
  nextTick(() => openEventDetail(evt))
}

// ── User name lookup from store ──────────────────────────────
const userNameMap = computed(() => ({ ...store.userNameMap.value }))

function resolveName(email: string): string {
  if (!email) return ''
  return userNameMap.value[email.toLowerCase()] || email
}

// ── Vendor name lookup from store ────────────────────────────
const vendorNameMap = computed(() => {
  const map: Record<string, string> = {}
  for (const v of (store.vendors.value || [])) {
    const rowId = v['Row ID'] || v['row_id'] || ''
    const name = v['Vendor Name'] || v['Company'] || ''
    if (rowId && name) map[rowId] = name
  }
  return map
})

function resolveVendor(vendorId: string): string {
  if (!vendorId) return ''
  return vendorNameMap.value[vendorId] || vendorId
}

// ── Date helpers ─────────────────────────────────────────────
function parseDate(val: any): Date | null {
  if (!val) return null
  const v = val?.value || val
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

const currentMonth = computed(() => currentDate.value.getMonth())
const currentYear = computed(() => currentDate.value.getFullYear())

const monthLabel = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

function prevMonth() {
  const d = new Date(currentDate.value)
  d.setMonth(d.getMonth() - 1)
  currentDate.value = d
}

function nextMonth() {
  const d = new Date(currentDate.value)
  d.setMonth(d.getMonth() + 1)
  currentDate.value = d
}

function goToday() {
  currentDate.value = new Date()
}

// Build calendar grid
const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const firstDay = new Date(year, month, 1)
  const startDow = firstDay.getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()

  const days: { date: Date, isCurrentMonth: boolean, key: string }[] = []

  // Previous month fill
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthDays - i)
    days.push({ date: d, isCurrentMonth: false, key: d.toISOString().split('T')[0]! })
  }

  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i)
    days.push({ date: d, isCurrentMonth: true, key: d.toISOString().split('T')[0]! })
  }

  // Next month fill (up to 42 total = 6 rows)
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i)
    days.push({ date: d, isCurrentMonth: false, key: d.toISOString().split('T')[0]! })
  }

  return days
})

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Get events for a specific day
function eventsForDay(dateKey: string): any[] {
  return eventsByDateKey.value.get(dateKey) || []
}

function isToday(date: Date): boolean {
  const today = new Date()
  return date.getDate() === today.getDate()
    && date.getMonth() === today.getMonth()
    && date.getFullYear() === today.getFullYear()
}

// ── Event type colors ────────────────────────────────────────
const typeColorMap: Record<string, { bg: string, text: string, border: string, dot: string }> = {
  Install: { bg: 'bg-emerald-500/12', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
  SSA: { bg: 'bg-slate-500/12', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-500/30', dot: 'bg-slate-500' },
  Completion: { bg: 'bg-orange-500/12', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-500/30', dot: 'bg-orange-500' },
  'Final Inspection': { bg: 'bg-red-500/12', text: 'text-red-700 dark:text-red-300', border: 'border-red-500/30', dot: 'bg-red-500' },
  Service: { bg: 'bg-zinc-500/12', text: 'text-zinc-700 dark:text-zinc-300', border: 'border-zinc-500/30', dot: 'bg-zinc-600' },
  MPU: { bg: 'bg-violet-500/12', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-500/30', dot: 'bg-violet-500' },
  'Turn On': { bg: 'bg-amber-500/12', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  'Fire Inspection': { bg: 'bg-rose-500/12', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-500/30', dot: 'bg-rose-500' },
  Stucco: { bg: 'bg-blue-500/12', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-500/30', dot: 'bg-blue-500' },
  Corrections: { bg: 'bg-orange-600/12', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-600/30', dot: 'bg-orange-600' },
  REPAIR: { bg: 'bg-pink-500/12', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-500/30', dot: 'bg-pink-500' },
  REMOVAL: { bg: 'bg-teal-500/12', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-500/30', dot: 'bg-teal-500' },
  'Remove & Re-Install': { bg: 'bg-purple-500/12', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-500/30', dot: 'bg-purple-500' },
  Troubleshooting: { bg: 'bg-cyan-500/12', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-500/30', dot: 'bg-cyan-500' },
}

const defaultColor = { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20', dot: 'bg-primary' }

function getEventColor(eventType: string) {
  if (!eventType) return defaultColor
  // Try exact match first, then case-insensitive
  return typeColorMap[eventType]
    || typeColorMap[Object.keys(typeColorMap).find(k => k.toLowerCase() === eventType.toLowerCase()) || '']
    || defaultColor
}

function formatTime(date: Date | null): string {
  if (!date) return ''
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatFullDate(date: Date | null): string {
  if (!date) return '—'
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function formatFullDateTime(date: Date | null): string {
  if (!date) return '—'
  return `${formatFullDate(date)} ${formatTime(date)}`
}

// ── Drag & Drop ──────────────────────────────────────────────
function onDragStart(evt: DragEvent, event: any) {
  draggingEvent.value = event
  if (evt.dataTransfer) {
    evt.dataTransfer.effectAllowed = 'move'
    evt.dataTransfer.setData('text/plain', event['Event  ID'])
  }
}

function onDragOver(evt: DragEvent, dateKey: string) {
  evt.preventDefault()
  dragOverCell.value = dateKey
}

function onDragLeave() {
  dragOverCell.value = null
}

function onDrop(evt: DragEvent, dateKey: string) {
  evt.preventDefault()
  dragOverCell.value = null

  if (!draggingEvent.value) return

  const oldStart = draggingEvent.value._startDate
  const oldEnd = draggingEvent.value._endDate
  if (!oldStart) return

  // Calculate duration
  const duration = oldEnd ? (oldEnd.getTime() - oldStart.getTime()) : 15 * 60 * 1000

  // New start date (keep the time, change the date)
  const parts = dateKey.split('-').map(Number)
  const newStart = new Date(parts[0]!, parts[1]! - 1, parts[2]!, oldStart.getHours(), oldStart.getMinutes())
  const newEnd = new Date(newStart.getTime() + duration)

  // Update locally
  draggingEvent.value._startDate = newStart
  draggingEvent.value._endDate = newEnd

  toast.success(`Moved "${draggingEvent.value['Event Type'] || 'Event'}" to ${formatFullDate(newStart)}`)
  draggingEvent.value = null
}

// ── Resize (week view) ──────────────────────────────────────
function onResizeStart(evt: MouseEvent, event: any) {
  evt.preventDefault()
  evt.stopPropagation()
  resizingEvent.value = event
  resizeStartY.value = evt.clientY
  resizeOriginalEnd.value = event._endDate ? new Date(event._endDate) : null

  const onMouseMove = (e: MouseEvent) => {
    if (!resizingEvent.value || !resizeOriginalEnd.value) return
    const deltaY = e.clientY - resizeStartY.value
    const minutesDelta = Math.round(deltaY / 1.5) * 15 // 15-min increments
    const newEnd = new Date(resizeOriginalEnd.value.getTime() + minutesDelta * 60 * 1000)
    // Minimum 15 minutes
    if (newEnd.getTime() > resizingEvent.value._startDate.getTime() + 15 * 60 * 1000) {
      resizingEvent.value._endDate = newEnd
    }
  }

  const onMouseUp = () => {
    if (resizingEvent.value) {
      toast.success(`Resized to ${formatTime(resizingEvent.value._endDate)}`)
    }
    resizingEvent.value = null
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

// ── Event type filter ────────────────────────────────────────
const eventTypes = computed(() => {
  const types = new Set(events.value.map(e => e['Event Type']).filter(Boolean))
  return Array.from(types).sort()
})

const activeFilters = ref<Set<string>>(new Set())

function toggleFilter(type: string) {
  if (activeFilters.value.has(type)) {
    activeFilters.value.delete(type)
  }
  else {
    activeFilters.value.add(type)
  }
  // Trigger reactivity
  activeFilters.value = new Set(activeFilters.value)
}

const filteredEvents = computed(() => {
  if (activeFilters.value.size === 0) return events.value
  return events.value.filter(e => activeFilters.value.has(e['Event Type']))
})

// Pre-index events by date key for O(1) lookups instead of O(n) per cell
const eventsByDateKey = computed(() => {
  const map = new Map<string, any[]>()
  for (const e of filteredEvents.value) {
    if (!e._startDate) continue
    const key = e._startDate.toISOString().split('T')[0]!
    const arr = map.get(key)
    if (arr) arr.push(e)
    else map.set(key, [e])
  }
  return map
})

function eventsForDayFiltered(dateKey: string): any[] {
  return eventsByDateKey.value.get(dateKey) || []
}

// ── Week view helpers ────────────────────────────────────────
const weekStart = computed(() => {
  const d = new Date(currentDate.value)
  const dow = d.getDay()
  d.setDate(d.getDate() - dow)
  d.setHours(0, 0, 0, 0)
  return d
})

const weekDates = computed(() => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.value)
    d.setDate(d.getDate() + i)
    return d
  })
})

function eventsForWeekDay(date: Date): any[] {
  const key = date.toISOString().split('T')[0]!
  return eventsByDateKey.value.get(key) || []
}

// Group events by hour for agenda-style week view
function groupEventsByHour(date: Date): { hour: number, label: string, events: any[] }[] {
  const dayEvents = eventsForWeekDay(date)
  if (!dayEvents.length) return []
  const groups: Record<number, any[]> = {}
  for (const evt of dayEvents) {
    const h = evt._startDate ? evt._startDate.getHours() : 0
    if (!groups[h]) groups[h] = []
    groups[h].push(evt)
  }
  return Object.entries(groups)
    .map(([h, evts]) => {
      const hour = Number(h)
      const hh = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      const ampm = hour >= 12 ? 'PM' : 'AM'
      return { hour, label: `${hh}:00 ${ampm}`, events: evts.sort((a: any, b: any) => (a._startDate?.getTime() || 0) - (b._startDate?.getTime() || 0)) }
    })
    .sort((a, b) => a.hour - b.hour)
}

function prevWeek() {
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() - 7)
  currentDate.value = d
}

function nextWeek() {
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() + 7)
  currentDate.value = d
}

// Week label for header
const weekLabel = computed(() => {
  const start = weekDates.value[0]!
  const end = weekDates.value[6]!
  const sameMonth = start.getMonth() === end.getMonth()
  if (sameMonth) {
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' })}`
  }
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
})

// ── Stats ────────────────────────────────────────────────────
const totalEventsThisMonth = computed(() => {
  return events.value.filter((e) => {
    if (!e._startDate) return false
    return e._startDate.getMonth() === currentMonth.value && e._startDate.getFullYear() === currentYear.value
  }).length
})
</script>

<template>
  <EventsLayout>
    <div class="w-full h-full flex flex-col min-h-0">
      <!-- Teleport controls to header -->
      <Teleport v-if="isMounted" to="#header-toolbar">
        <div class="flex items-center gap-2">
          <!-- View mode toggle -->
          <div class="flex items-center rounded-lg border bg-card overflow-hidden">
            <button
              class="px-3 py-1.5 text-xs font-medium transition-colors"
              :class="viewMode === 'month' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
              @click="viewMode = 'month'"
            >
              Month
            </button>
            <button
              class="px-3 py-1.5 text-xs font-medium transition-colors"
              :class="viewMode === 'week' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
              @click="viewMode = 'week'"
            >
              Week
            </button>
          </div>

          <Separator orientation="vertical" class="h-4" />

          <!-- Navigation -->
          <div class="flex items-center gap-1">
            <Button variant="ghost" size="sm" class="h-7 w-7 p-0" @click="viewMode === 'month' ? prevMonth() : prevWeek()">
              <Icon name="i-lucide-chevron-left" class="size-4" />
            </Button>
            <button
              class="px-3 py-1 text-sm font-semibold hover:bg-muted rounded-md transition-colors min-w-[160px] text-center"
              @click="goToday"
            >
              {{ monthLabel }}
            </button>
            <Button variant="ghost" size="sm" class="h-7 w-7 p-0" @click="viewMode === 'month' ? nextMonth() : nextWeek()">
              <Icon name="i-lucide-chevron-right" class="size-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" class="h-7 text-xs" @click="goToday">
            Today
          </Button>

          <span class="text-xs text-muted-foreground tabular-nums hidden lg:inline">
            {{ totalEventsThisMonth }} events
          </span>

          <Button variant="ghost" size="sm" class="h-7 w-7 p-0" @click="store.refresh()">
            <Icon name="i-lucide-refresh-cw" class="size-3.5" />
          </Button>
        </div>
      </Teleport>

      <!-- Calendar content -->
      <div class="flex-1 min-h-0 flex flex-col">
        <!-- Filter chips -->
        <div class="flex items-center gap-1.5 px-3 py-2 border-b overflow-x-auto no-scrollbar shrink-0">
          <button
            v-for="type in eventTypes"
            :key="type"
            class="cal-chip"
            :class="[
              activeFilters.size === 0 || activeFilters.has(type)
                ? `${getEventColor(type).bg} ${getEventColor(type).text} ${getEventColor(type).border}`
                : 'bg-muted/50 text-muted-foreground/50 border-transparent'
            ]"
            @click="toggleFilter(type)"
          >
            <span class="size-1.5 rounded-full shrink-0" :class="getEventColor(type).dot" />
            {{ type }}
          </button>
        </div>

        <!-- ══════════ MONTH VIEW ══════════ -->
        <div v-if="viewMode === 'month'" class="flex-1 min-h-0 overflow-hidden flex flex-col">
          <!-- Week day headers -->
          <div class="grid grid-cols-7 shrink-0 border-b">
            <div v-for="day in weekDays" :key="day" class="cal-header-cell">
              {{ day }}
            </div>
          </div>

          <!-- Calendar grid -->
          <div class="grid grid-cols-7 flex-1 min-h-0 auto-rows-fr overflow-y-auto">
            <div
              v-for="day in calendarDays"
              :key="day.key"
              class="cal-day-cell"
              :class="{
                'cal-day-cell--other': !day.isCurrentMonth,
                'cal-day-cell--today': isToday(day.date),
                'cal-day-cell--dragover': dragOverCell === day.key,
              }"
              @dragover="onDragOver($event, day.key)"
              @dragleave="onDragLeave"
              @drop="onDrop($event, day.key)"
            >
              <!-- Date number -->
              <div class="cal-day-number" :class="{ 'cal-day-number--today': isToday(day.date) }">
                {{ day.date.getDate() }}
              </div>

              <!-- Events -->
              <div class="cal-day-events">
                <div
                  v-for="evt in eventsForDayFiltered(day.key).slice(0, 3)"
                  :key="evt['Event  ID']"
                  class="cal-event"
                  :class="[getEventColor(evt['Event Type']).bg, getEventColor(evt['Event Type']).text, getEventColor(evt['Event Type']).border]"
                  draggable="true"
                  @dragstart="onDragStart($event, evt)"
                  @click.stop="openEventDetail(evt)"
                >
                  <span class="size-1.5 rounded-full shrink-0" :class="getEventColor(evt['Event Type']).dot" />
                  <span class="truncate">{{ formatTime(evt._startDate) }} {{ evt['Event Type'] || 'Event' }}</span>
                </div>
                <button
                  v-if="eventsForDayFiltered(day.key).length > 3"
                  class="cal-event-more"
                  @click.stop="openDaySheet(day.date, day.key)"
                >
                  +{{ eventsForDayFiltered(day.key).length - 3 }} more
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ══════════ WEEK VIEW (Agenda Style) ══════════ -->
        <div v-else class="flex-1 min-h-0 overflow-hidden flex flex-col">
          <!-- Week range label -->
          <div class="shrink-0 px-3 py-1.5 border-b bg-muted/20">
            <span class="text-xs font-medium text-muted-foreground">{{ weekLabel }}</span>
          </div>

          <!-- Day columns -->
          <div class="flex-1 min-h-0 grid grid-cols-7 divide-x overflow-hidden">
            <div
              v-for="date in weekDates"
              :key="date.toISOString()"
              class="flex flex-col min-h-0 min-w-0"
              :class="isToday(date) ? 'bg-primary/[0.02]' : ''"
            >
              <!-- Day header -->
              <div class="shrink-0 px-2 py-2 border-b text-center space-y-0.5" :class="isToday(date) ? 'bg-primary/5 border-primary/20' : 'bg-card/50'">
                <div class="text-[10px] uppercase font-medium" :class="isToday(date) ? 'text-primary' : 'text-muted-foreground'">{{ weekDays[date.getDay()] }}</div>
                <div class="text-lg font-bold leading-none" :class="isToday(date) ? 'text-primary' : ''" >{{ date.getDate() }}</div>
                <div class="text-[9px] tabular-nums font-medium" :class="eventsForWeekDay(date).length > 0 ? 'text-primary' : 'text-muted-foreground/40'">
                  {{ eventsForWeekDay(date).length }} event{{ eventsForWeekDay(date).length !== 1 ? 's' : '' }}
                </div>
              </div>

              <!-- Day content (scrollable) -->
              <div class="flex-1 min-h-0 overflow-y-auto">
                <!-- Empty state -->
                <div v-if="eventsForWeekDay(date).length === 0" class="flex items-center justify-center h-full">
                  <span class="text-[10px] text-muted-foreground/30">No events</span>
                </div>

                <!-- Grouped by hour -->
                <div v-else class="pb-2">
                  <div v-for="group in groupEventsByHour(date)" :key="group.hour" class="week-hour-group">
                    <!-- Hour header -->
                    <div class="week-hour-header">
                      <span class="text-[9px] font-semibold tabular-nums text-muted-foreground/60">{{ group.label }}</span>
                      <span class="text-[8px] tabular-nums text-muted-foreground/40 bg-muted/60 rounded-full px-1.5 py-0">{{ group.events.length }}</span>
                    </div>

                    <!-- Events -->
                    <div class="space-y-0.5 px-1">
                      <button
                        v-for="evt in group.events"
                        :key="evt['Event  ID']"
                        class="week-event-card group"
                        :class="[getEventColor(evt['Event Type']).bg, getEventColor(evt['Event Type']).border]"
                        @click.stop="openEventDetail(evt)"
                      >
                        <div class="week-event-dot" :class="getEventColor(evt['Event Type']).dot" />
                        <div class="flex-1 min-w-0 text-left">
                          <div class="flex items-center gap-1">
                            <span class="text-[10px] font-semibold truncate" :class="getEventColor(evt['Event Type']).text">
                              {{ evt['Event Type'] || 'Event' }}
                            </span>
                            <Badge v-if="evt['Event Status']" variant="outline" class="week-event-status-badge" :class="evt['Event Status']?.toLowerCase() === 'pending' ? 'border-amber-400/30 text-amber-600 dark:text-amber-400' : evt['Event Status']?.toLowerCase() === 'confirmed' ? 'border-emerald-400/30 text-emerald-600 dark:text-emerald-400' : ''">
                              {{ evt['Event Status'] }}
                            </Badge>
                          </div>
                          <div class="text-[9px] text-muted-foreground tabular-nums mt-0.5">
                            {{ formatTime(evt._startDate) }}<template v-if="evt._endDate"> – {{ formatTime(evt._endDate) }}</template>
                          </div>
                          <div v-if="evt['Customer Address'] || evt['Event Address'] || evt.Vendor" class="flex items-center gap-1 mt-0.5 text-[9px] text-muted-foreground/60 truncate">
                            <Icon v-if="evt['Customer Address'] || evt['Event Address']" name="i-lucide-map-pin" class="size-2.5 shrink-0" />
                            <span v-if="evt['Customer Address'] || evt['Event Address']" class="truncate">{{ evt['Customer Address'] || evt['Event Address'] }}</span>
                            <template v-if="evt.Vendor">
                              <span class="text-muted-foreground/20">·</span>
                              <span class="truncate">{{ resolveVendor(evt.Vendor) }}</span>
                            </template>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Event Detail Modal ───────────────────────────────── -->
      <Dialog v-model:open="showDetail">
        <DialogContent class="max-w-2xl">
          <DialogHeader>
            <DialogTitle class="flex items-center gap-2">
              <span
                class="size-3 rounded-full shrink-0"
                :class="getEventColor(selectedEvent?.['Event Type']).dot"
              />
              {{ selectedEvent?.['Event Type'] || 'Event' }}
              <Badge v-if="selectedEvent?.['Event Status']" variant="outline" class="ml-auto text-[10px]">
                {{ selectedEvent['Event Status'] }}
              </Badge>
            </DialogTitle>
            <DialogDescription v-if="selectedEvent?.['Event Description']">
              {{ selectedEvent['Event Description'] }}
            </DialogDescription>
          </DialogHeader>

          <div v-if="selectedEvent" class="space-y-4 pt-2">
            <!-- Time -->
            <div class="grid grid-cols-2 gap-4">
              <div v-if="selectedEvent._startDate" class="cal-detail-field">
                <span class="cal-detail-label">Start</span>
                <span class="cal-detail-value">{{ formatFullDateTime(selectedEvent._startDate) }}</span>
              </div>
              <div v-if="selectedEvent._endDate" class="cal-detail-field">
                <span class="cal-detail-label">End</span>
                <span class="cal-detail-value">{{ formatFullDateTime(selectedEvent._endDate) }}</span>
              </div>
            </div>

            <Separator />

            <!-- Details grid -->
            <div class="grid grid-cols-3 gap-4">
              <div v-if="selectedEvent['Event  ID']" class="cal-detail-field">
                <span class="cal-detail-label">Event ID</span>
                <span class="cal-detail-value font-mono text-xs">{{ selectedEvent['Event  ID'] }}</span>
              </div>
              <div v-if="selectedEvent['Project ID']" class="cal-detail-field">
                <span class="cal-detail-label">Project ID</span>
                <span class="cal-detail-value font-mono text-xs">{{ selectedEvent['Project ID'] }}</span>
              </div>
              <div v-if="selectedEvent.Category" class="cal-detail-field">
                <span class="cal-detail-label">Category</span>
                <span class="cal-detail-value">{{ selectedEvent.Category }}</span>
              </div>
              <div v-if="selectedEvent.Branch" class="cal-detail-field">
                <span class="cal-detail-label">Branch</span>
                <span class="cal-detail-value">{{ selectedEvent.Branch }}</span>
              </div>
              <div v-if="selectedEvent['Event Confirmed']" class="cal-detail-field">
                <span class="cal-detail-label">Confirmed</span>
                <span class="cal-detail-value">{{ selectedEvent['Event Confirmed'] }}</span>
              </div>
              <div v-if="selectedEvent.Vendor" class="cal-detail-field">
                <span class="cal-detail-label">Vendor</span>
                <span class="cal-detail-value">{{ resolveVendor(selectedEvent.Vendor) }}</span>
              </div>
            </div>

            <!-- Address & contact -->
            <template v-if="selectedEvent['Customer Address'] || selectedEvent['Event Address'] || selectedEvent['Customer Phone'] || selectedEvent['Customer Email']">
              <Separator />
              <div class="grid grid-cols-3 gap-4">
                <div v-if="selectedEvent['Customer Address'] || selectedEvent['Event Address']" class="cal-detail-field col-span-3">
                  <span class="cal-detail-label">Address</span>
                  <span class="cal-detail-value text-xs">{{ selectedEvent['Customer Address'] || selectedEvent['Event Address'] }}</span>
                </div>
                <div v-if="selectedEvent['Customer Phone']" class="cal-detail-field">
                  <span class="cal-detail-label">Phone</span>
                  <span class="cal-detail-value text-xs">{{ selectedEvent['Customer Phone'] }}</span>
                </div>
                <div v-if="selectedEvent['Customer Mobile']" class="cal-detail-field">
                  <span class="cal-detail-label">Mobile</span>
                  <span class="cal-detail-value text-xs">{{ selectedEvent['Customer Mobile'] }}</span>
                </div>
                <div v-if="selectedEvent['Customer Email']" class="cal-detail-field">
                  <span class="cal-detail-label">Customer</span>
                  <span class="cal-detail-value text-xs">{{ resolveName(selectedEvent['Customer Email']) }}</span>
                </div>
              </div>
            </template>

            <!-- Crew -->
            <template v-if="selectedEvent.Installers || selectedEvent.Technicians || selectedEvent['SSA Technician'] || selectedEvent['Electrician Crew'] || selectedEvent['Troubleshooting Tech']">
              <Separator />
              <div class="grid grid-cols-3 gap-4">
                <div v-if="selectedEvent.Installers" class="cal-detail-field">
                  <span class="cal-detail-label">Installers</span>
                  <span class="cal-detail-value text-xs">{{ resolveName(selectedEvent.Installers) }}</span>
                </div>
                <div v-if="selectedEvent.Technicians" class="cal-detail-field">
                  <span class="cal-detail-label">Technicians</span>
                  <span class="cal-detail-value text-xs">{{ resolveName(selectedEvent.Technicians) }}</span>
                </div>
                <div v-if="selectedEvent['SSA Technician']" class="cal-detail-field">
                  <span class="cal-detail-label">SSA Technician</span>
                  <span class="cal-detail-value text-xs">{{ resolveName(selectedEvent['SSA Technician']) }}</span>
                </div>
                <div v-if="selectedEvent['Electrician Crew']" class="cal-detail-field">
                  <span class="cal-detail-label">Electrician Crew</span>
                  <span class="cal-detail-value text-xs">{{ resolveName(selectedEvent['Electrician Crew']) }}</span>
                </div>
                <div v-if="selectedEvent['Troubleshooting Tech']" class="cal-detail-field">
                  <span class="cal-detail-label">Troubleshooting Tech</span>
                  <span class="cal-detail-value text-xs">{{ resolveName(selectedEvent['Troubleshooting Tech']) }}</span>
                </div>
              </div>
            </template>

            <!-- Note -->
            <template v-if="selectedEvent['Event Note']">
              <Separator />
              <div>
                <span class="cal-detail-label">Notes</span>
                <div class="mt-1 p-3 rounded-lg bg-muted text-xs whitespace-pre-wrap leading-relaxed">
                  {{ selectedEvent['Event Note'] }}
                </div>
              </div>
            </template>

            <!-- Reason of Change -->
            <div v-if="selectedEvent['Reason of Change']" class="cal-detail-field">
              <span class="cal-detail-label">Reason of Change</span>
              <span class="cal-detail-value text-xs">{{ selectedEvent['Reason of Change'] }}</span>
            </div>

            <!-- Created by -->
            <div v-if="selectedEvent['Create By'] || selectedEvent['Secondary Summary']" class="flex items-center justify-between pt-2 text-[11px] text-muted-foreground border-t">
              <span v-if="selectedEvent['Create By']">Created by {{ resolveName(selectedEvent['Create By']) }}</span>
              <span v-if="selectedEvent['Secondary Summary']">{{ selectedEvent['Secondary Summary'] }}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <!-- ── Day Detail Sheet ("+ more" view) ──────────────── -->
      <Sheet v-model:open="showDaySheet">
        <SheetContent side="right" class="!w-full !max-w-lg sm:!max-w-lg p-0 flex flex-col">
          <!-- Header -->
          <div class="shrink-0 border-b px-5 pt-5 pb-4 space-y-3">
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center size-10 rounded-xl bg-primary/10">
                <Icon name="i-lucide-calendar-days" class="size-5 text-primary" />
              </div>
              <div class="flex-1 min-w-0">
                <SheetTitle class="text-base font-semibold leading-tight">
                  {{ formatDaySheetDate(daySheetDate) }}
                </SheetTitle>
                <SheetDescription class="text-xs text-muted-foreground mt-0.5">
                  {{ eventsForDayFiltered(daySheetKey).length }} events scheduled
                </SheetDescription>
              </div>
            </div>

            <!-- Type summary pills -->
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="ts in daySheetTypeSummary"
                :key="ts.type"
                class="day-sheet-type-pill"
                :class="[getEventColor(ts.type).bg, getEventColor(ts.type).text, getEventColor(ts.type).border]"
                @click="daySheetSearch = daySheetSearch === ts.type ? '' : ts.type"
              >
                <span class="size-1.5 rounded-full shrink-0" :class="getEventColor(ts.type).dot" />
                {{ ts.type }}
                <span class="day-sheet-type-count">{{ ts.count }}</span>
              </button>
            </div>

            <!-- Search -->
            <div class="relative">
              <Icon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                v-model="daySheetSearch"
                type="text"
                placeholder="Search events..."
                class="w-full h-8 pl-9 pr-3 rounded-lg border bg-muted/30 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              >
              <button
                v-if="daySheetSearch"
                class="absolute right-2 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
                @click="daySheetSearch = ''"
              >
                <Icon name="i-lucide-x" class="size-3 text-muted-foreground" />
              </button>
            </div>
          </div>

          <!-- Events list -->
          <div class="flex-1 min-h-0 overflow-y-auto">
            <div v-if="daySheetEvents.length === 0" class="flex flex-col items-center justify-center py-16 px-6 text-center">
              <Icon name="i-lucide-calendar-x" class="size-10 text-muted-foreground/40 mb-3" />
              <p class="text-sm font-medium text-muted-foreground">No matching events</p>
              <p class="text-xs text-muted-foreground/60 mt-1">Try adjusting your search term</p>
            </div>

            <div v-else class="divide-y">
              <button
                v-for="(evt, idx) in daySheetEvents"
                :key="evt['Event  ID'] || idx"
                class="day-sheet-event-card group"
                @click="openEventFromSheet(evt)"
              >
                <!-- Left accent bar -->
                <div class="day-sheet-accent" :class="getEventColor(evt['Event Type']).dot" />

                <!-- Content -->
                <div class="flex-1 min-w-0 py-3 pr-4">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold" :class="getEventColor(evt['Event Type']).text">
                      {{ evt['Event Type'] || 'Event' }}
                    </span>
                    <Badge v-if="evt['Event Status']" variant="outline" class="text-[9px] px-1.5 py-0 h-4">
                      {{ evt['Event Status'] }}
                    </Badge>
                    <span class="text-[10px] text-muted-foreground ml-auto tabular-nums shrink-0">
                      {{ formatTime(evt._startDate) }}
                      <template v-if="evt._endDate"> – {{ formatTime(evt._endDate) }}</template>
                    </span>
                  </div>

                  <!-- Details row -->
                  <div class="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    <span v-if="evt['Customer Address'] || evt['Event Address']" class="flex items-center gap-1 truncate max-w-[200px]">
                      <Icon name="i-lucide-map-pin" class="size-3 shrink-0" />
                      {{ evt['Customer Address'] || evt['Event Address'] }}
                    </span>
                    <span v-if="evt.Branch" class="flex items-center gap-1 shrink-0">
                      <Icon name="i-lucide-building-2" class="size-3 shrink-0" />
                      {{ evt.Branch }}
                    </span>
                    <span v-if="evt.Vendor" class="flex items-center gap-1 shrink-0">
                      <Icon name="i-lucide-hard-hat" class="size-3 shrink-0" />
                      {{ resolveVendor(evt.Vendor) }}
                    </span>
                  </div>

                  <!-- Crew row -->
                  <div v-if="evt.Installers || evt.Technicians" class="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/70">
                    <span v-if="evt.Installers" class="flex items-center gap-1">
                      <Icon name="i-lucide-users" class="size-2.5 shrink-0" />
                      {{ resolveName(evt.Installers) }}
                    </span>
                    <span v-if="evt.Technicians" class="flex items-center gap-1">
                      <Icon name="i-lucide-wrench" class="size-2.5 shrink-0" />
                      {{ resolveName(evt.Technicians) }}
                    </span>
                  </div>
                </div>

                <!-- Arrow -->
                <Icon name="i-lucide-chevron-right" class="size-4 text-muted-foreground/30 group-hover:text-foreground/60 transition-colors shrink-0 mr-3" />
              </button>
            </div>
          </div>

          <!-- Footer -->
          <div class="shrink-0 border-t px-5 py-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{{ daySheetEvents.length }} of {{ eventsForDayFiltered(daySheetKey).length }} events</span>
            <Button variant="ghost" size="sm" class="h-7 text-xs" @click="showDaySheet = false">
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  </EventsLayout>
</template>

<style scoped>
/* ── Calendar base ───────────────────────────────────────── */
.cal-header-cell {
  padding: 0.5rem;
  text-align: center;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted-foreground);
}

.cal-day-cell {
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 0.25rem;
  min-height: 100px;
  display: flex;
  flex-direction: column;
  transition: background 0.15s;
  cursor: default;
}

.cal-day-cell:nth-child(7n) {
  border-right: none;
}

.cal-day-cell--other {
  opacity: 0.35;
}

.cal-day-cell--today {
  background: var(--primary);
  background: oklch(from var(--primary) l c h / 5%);
}

.cal-day-cell--dragover {
  background: oklch(from var(--primary) l c h / 12%) !important;
  outline: 2px dashed var(--primary);
  outline-offset: -2px;
}

.cal-day-number {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--muted-foreground);
  line-height: 1;
  padding: 0.125rem 0.25rem;
  text-align: right;
}

.cal-day-number--today {
  background: var(--primary);
  color: var(--primary-foreground);
  border-radius: 9999px;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  font-weight: 700;
}

.cal-day-events {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 0.125rem;
  overflow: hidden;
}

/* ── Event pill (month view) ─────────────────────────────── */
.cal-event {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.375rem;
  font-size: 0.625rem;
  font-weight: 500;
  cursor: grab;
  transition: all 0.15s;
  border: 1px solid transparent;
  white-space: nowrap;
  overflow: hidden;
  line-height: 1.3;
}

.cal-event:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.cal-event:active {
  cursor: grabbing;
}

.cal-event-more {
  font-size: 0.625rem;
  color: var(--muted-foreground);
  padding: 0 0.375rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: none;
}

.cal-event-more:hover {
  color: var(--foreground);
}

/* ── Filter chips ─────────────────────────────────────────── */
.cal-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 500;
  border: 1px solid;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s;
}

.cal-chip:hover {
  opacity: 0.8;
}

/* ── Week view ────────────────────────────────────────────── */
.cal-week-grid {
  display: grid;
  grid-template-columns: 56px repeat(7, 1fr);
  min-width: 700px;
}

.cal-week-gutter {
  border-right: 1px solid var(--border);
}

.cal-week-gutter__header {
  height: 52px;
  border-bottom: 1px solid var(--border);
}

.cal-week-gutter__cell {
  height: 60px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 0 0.5rem;
  font-size: 0.625rem;
  color: var(--muted-foreground);
  font-weight: 500;
  border-bottom: 1px solid var(--border);
}

.cal-week-col {
  border-right: 1px solid var(--border);
}

.cal-week-col:last-child {
  border-right: none;
}

.cal-week-col--today {
  background: oklch(from var(--primary) l c h / 3%);
}

.cal-week-col__header {
  height: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--border);
  gap: 0.125rem;
}

.cal-week-col__header--today {
  border-bottom: 2px solid var(--primary);
}

/* ── Week Agenda View ───────────────────────────────────── */
.week-hour-group {
  border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
}

.week-hour-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.3rem 0.5rem;
  position: sticky;
  top: 0;
  z-index: 2;
  background: color-mix(in srgb, var(--sidebar-background, var(--background)) 95%, transparent);
  backdrop-filter: blur(8px);
}

.week-event-card {
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
  width: 100%;
  padding: 0.3rem 0.375rem;
  border-radius: 0.375rem;
  border: 1px solid;
  cursor: pointer;
  transition: all 0.12s;
  text-align: left;
}

.week-event-card:hover {
  transform: translateX(1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.week-event-dot {
  width: 5px;
  height: 5px;
  border-radius: 9999px;
  flex-shrink: 0;
  margin-top: 4px;
}

.week-event-status-badge {
  font-size: 7px !important;
  padding: 0 4px !important;
  height: 13px !important;
  line-height: 13px !important;
  font-weight: 600;
}

/* ── Detail modal ─────────────────────────────────────────── */
.cal-detail-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.cal-detail-label {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--muted-foreground);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.cal-detail-value {
  font-size: 0.8125rem;
  color: var(--foreground);
}

/* ── Day Sheet ───────────────────────────────────────────── */
.day-sheet-type-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 500;
  border: 1px solid;
  cursor: pointer;
  transition: all 0.15s;
}

.day-sheet-type-pill:hover {
  opacity: 0.8;
  transform: scale(1.03);
}

.day-sheet-type-count {
  font-size: 0.5625rem;
  font-weight: 700;
  opacity: 0.7;
  min-width: 1rem;
  text-align: center;
  padding: 0 0.15rem;
  background: rgba(0,0,0,0.06);
  border-radius: 9999px;
}

:root.dark .day-sheet-type-count {
  background: rgba(255,255,255,0.08);
}

.day-sheet-event-card {
  display: flex;
  align-items: center;
  gap: 0;
  width: 100%;
  text-align: left;
  transition: background 0.15s;
  cursor: pointer;
  position: relative;
}

.day-sheet-event-card:hover {
  background: var(--muted);
}

.day-sheet-accent {
  width: 3px;
  align-self: stretch;
  border-radius: 0 2px 2px 0;
  margin-right: 12px;
  flex-shrink: 0;
}
</style>
