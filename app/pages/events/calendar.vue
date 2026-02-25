<script setup lang="ts">
import { toast } from 'vue-sonner'

const { setHeader } = usePageHeader()
setHeader({ title: 'Events Calendar', icon: 'i-lucide-calendar-days' })

// ── State ────────────────────────────────────────────────────
const events = ref<any[]>([])
const loading = ref(true)
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

// ── Fetch ────────────────────────────────────────────────────
async function fetchEvents() {
  loading.value = true
  try {
    const data = await $fetch<{ success: boolean, events: any[], count: number }>('/api/bigquery/events')
    if (data.success) {
      events.value = data.events.map((e: any) => ({
        ...e,
        _startDate: parseDate(e['Start Date']),
        _endDate: parseDate(e['End Date']),
      }))
    }
  }
  catch (e: any) {
    toast.error('Failed to load events')
  }
  finally {
    loading.value = false
  }
}

onMounted(fetchEvents)

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
  return events.value.filter((e) => {
    if (!e._startDate) return false
    const eKey = e._startDate.toISOString().split('T')[0]
    return eKey === dateKey
  })
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

function eventsForDayFiltered(dateKey: string): any[] {
  return filteredEvents.value.filter((e) => {
    if (!e._startDate) return false
    return e._startDate.toISOString().split('T')[0] === dateKey
  })
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

const hours = Array.from({ length: 16 }, (_, i) => i + 6) // 6 AM to 9 PM

function eventsForWeekDay(date: Date): any[] {
  const key = date.toISOString().split('T')[0]
  return filteredEvents.value.filter((e) => {
    if (!e._startDate) return false
    return e._startDate.toISOString().split('T')[0] === key
  })
}

function eventTopPx(event: any): number {
  if (!event._startDate) return 0
  const h = event._startDate.getHours() - 6
  const m = event._startDate.getMinutes()
  return h * 60 + m // 1px per minute
}

function eventHeightPx(event: any): number {
  if (!event._startDate || !event._endDate) return 30
  const diff = (event._endDate.getTime() - event._startDate.getTime()) / (1000 * 60)
  return Math.max(diff, 20) // minimum 20px
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

          <Button variant="ghost" size="sm" class="h-7 w-7 p-0" @click="fetchEvents">
            <Icon name="i-lucide-refresh-cw" class="size-3.5" :class="{ 'animate-spin': loading }" />
          </Button>
        </div>
      </Teleport>

      <!-- Loading -->
      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <div class="flex flex-col items-center gap-3">
          <Icon name="i-lucide-loader-2" class="size-8 animate-spin text-primary" />
          <p class="text-sm text-muted-foreground">Loading events...</p>
        </div>
      </div>

      <!-- Calendar content -->
      <div v-else class="flex-1 min-h-0 flex flex-col">
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
                  @click.stop=""
                >
                  +{{ eventsForDayFiltered(day.key).length - 3 }} more
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ══════════ WEEK VIEW ══════════ -->
        <div v-else class="flex-1 min-h-0 overflow-auto">
          <div class="cal-week-grid">
            <!-- Time gutter -->
            <div class="cal-week-gutter">
              <div class="cal-week-gutter__header" />
              <div v-for="hour in hours" :key="hour" class="cal-week-gutter__cell">
                {{ hour > 12 ? hour - 12 : hour }}{{ hour >= 12 ? 'PM' : 'AM' }}
              </div>
            </div>

            <!-- Day columns -->
            <div
              v-for="date in weekDates"
              :key="date.toISOString()"
              class="cal-week-col"
              :class="{ 'cal-week-col--today': isToday(date) }"
            >
              <!-- Day header -->
              <div class="cal-week-col__header" :class="{ 'cal-week-col__header--today': isToday(date) }">
                <span class="text-[10px] uppercase font-medium text-muted-foreground">{{ weekDays[date.getDay()] }}</span>
                <span class="text-lg font-semibold leading-none" :class="isToday(date) ? 'text-primary' : ''">{{ date.getDate() }}</span>
              </div>

              <!-- Hour slots -->
              <div class="cal-week-col__body">
                <div v-for="hour in hours" :key="hour" class="cal-week-hour-slot" />

                <!-- Events overlay -->
                <div
                  v-for="evt in eventsForWeekDay(date)"
                  :key="evt['Event  ID']"
                  class="cal-week-event"
                  :class="[getEventColor(evt['Event Type']).bg, getEventColor(evt['Event Type']).text, getEventColor(evt['Event Type']).border]"
                  :style="{ top: eventTopPx(evt) + 'px', height: eventHeightPx(evt) + 'px' }"
                  draggable="true"
                  @dragstart="onDragStart($event, evt)"
                  @click.stop="openEventDetail(evt)"
                >
                  <div class="cal-week-event__content">
                    <span class="font-medium text-[10px] leading-tight">{{ evt['Event Type'] || 'Event' }}</span>
                    <span class="text-[9px] opacity-70">{{ formatTime(evt._startDate) }}</span>
                  </div>
                  <!-- Resize handle -->
                  <div class="cal-week-event__resize" @mousedown="onResizeStart($event, evt)" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Event Detail Modal ───────────────────────────────── -->
      <Dialog v-model:open="showDetail">
        <DialogContent class="max-w-lg">
          <DialogHeader>
            <DialogTitle class="flex items-center gap-2">
              <span
                class="size-3 rounded-full shrink-0"
                :class="getEventColor(selectedEvent?.['Event Type']).dot"
              />
              {{ selectedEvent?.['Event Type'] || 'Event' }}
              <Badge variant="outline" class="ml-auto text-[10px]">
                {{ selectedEvent?.['Event Status'] }}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {{ selectedEvent?.['Event Description'] || 'No description' }}
            </DialogDescription>
          </DialogHeader>

          <div v-if="selectedEvent" class="space-y-4 pt-2">
            <!-- Time -->
            <div class="grid grid-cols-2 gap-3">
              <div class="cal-detail-field">
                <span class="cal-detail-label">Start</span>
                <span class="cal-detail-value">{{ formatFullDateTime(selectedEvent._startDate) }}</span>
              </div>
              <div class="cal-detail-field">
                <span class="cal-detail-label">End</span>
                <span class="cal-detail-value">{{ formatFullDateTime(selectedEvent._endDate) }}</span>
              </div>
            </div>

            <Separator />

            <!-- Details grid -->
            <div class="grid grid-cols-2 gap-3">
              <div class="cal-detail-field">
                <span class="cal-detail-label">Event ID</span>
                <span class="cal-detail-value font-mono text-xs">{{ selectedEvent['Event  ID'] || '—' }}</span>
              </div>
              <div class="cal-detail-field">
                <span class="cal-detail-label">Project ID</span>
                <span class="cal-detail-value font-mono text-xs">{{ selectedEvent['Project ID'] || '—' }}</span>
              </div>
              <div class="cal-detail-field">
                <span class="cal-detail-label">Category</span>
                <span class="cal-detail-value">{{ selectedEvent.Category || '—' }}</span>
              </div>
              <div class="cal-detail-field">
                <span class="cal-detail-label">Branch</span>
                <span class="cal-detail-value">{{ selectedEvent.Branch || '—' }}</span>
              </div>
              <div class="cal-detail-field">
                <span class="cal-detail-label">Confirmed</span>
                <span class="cal-detail-value">{{ selectedEvent['Event Confirmed'] || '—' }}</span>
              </div>
              <div class="cal-detail-field">
                <span class="cal-detail-label">Vendor</span>
                <span class="cal-detail-value">{{ selectedEvent.Vendor || '—' }}</span>
              </div>
            </div>

            <Separator />

            <!-- Address & contact -->
            <div class="space-y-3">
              <div class="cal-detail-field">
                <span class="cal-detail-label">Address</span>
                <span class="cal-detail-value text-xs">{{ selectedEvent['Customer Address'] || selectedEvent['Event Address'] || '—' }}</span>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="cal-detail-field">
                  <span class="cal-detail-label">Phone</span>
                  <span class="cal-detail-value text-xs">{{ selectedEvent['Customer Phone'] || '—' }}</span>
                </div>
                <div class="cal-detail-field">
                  <span class="cal-detail-label">Email</span>
                  <span class="cal-detail-value text-xs truncate">{{ selectedEvent['Customer Email'] || '—' }}</span>
                </div>
              </div>
            </div>

            <!-- Crew -->
            <Separator />
            <div class="grid grid-cols-2 gap-3">
              <div class="cal-detail-field">
                <span class="cal-detail-label">Installers</span>
                <span class="cal-detail-value text-xs">{{ selectedEvent.Installers || '—' }}</span>
              </div>
              <div class="cal-detail-field">
                <span class="cal-detail-label">Technicians</span>
                <span class="cal-detail-value text-xs">{{ selectedEvent.Technicians || '—' }}</span>
              </div>
              <div class="cal-detail-field">
                <span class="cal-detail-label">SSA Tech</span>
                <span class="cal-detail-value text-xs">{{ selectedEvent['SSA Technician'] || '—' }}</span>
              </div>
              <div class="cal-detail-field">
                <span class="cal-detail-label">Electrician Crew</span>
                <span class="cal-detail-value text-xs">{{ selectedEvent['Electrician Crew'] || '—' }}</span>
              </div>
            </div>

            <!-- Note -->
            <div v-if="selectedEvent['Event Note']" class="mt-3">
              <span class="cal-detail-label">Notes</span>
              <div class="mt-1 p-3 rounded-lg bg-muted text-xs whitespace-pre-wrap leading-relaxed">
                {{ selectedEvent['Event Note'] }}
              </div>
            </div>

            <!-- Created by -->
            <div class="flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
              <span>Created by {{ selectedEvent['Create By'] || '—' }}</span>
              <span>{{ selectedEvent['Secondary Summary'] || '' }}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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

.cal-week-col__body {
  position: relative;
}

.cal-week-hour-slot {
  height: 60px;
  border-bottom: 1px solid var(--border);
}

/* ── Week event block ─────────────────────────────────────── */
.cal-week-event {
  position: absolute;
  left: 2px;
  right: 2px;
  border-radius: 0.375rem;
  border: 1px solid;
  cursor: grab;
  z-index: 5;
  overflow: hidden;
  transition: box-shadow 0.15s, transform 0.1s;
}

.cal-week-event:hover {
  z-index: 10;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  transform: scale(1.01);
}

.cal-week-event:active {
  cursor: grabbing;
}

.cal-week-event__content {
  display: flex;
  flex-direction: column;
  padding: 0.25rem 0.375rem;
  overflow: hidden;
}

.cal-week-event__resize {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 6px;
  cursor: s-resize;
  background: linear-gradient(transparent, rgba(0,0,0,0.06));
  border-radius: 0 0 0.375rem 0.375rem;
}

.cal-week-event__resize:hover {
  background: linear-gradient(transparent, rgba(0,0,0,0.15));
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
</style>
