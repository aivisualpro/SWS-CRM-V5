/**
 * Global Dashboard Data Store
 *
 * Prefetches and caches all shared data (projects, events, users, customers)
 * at app startup. Every page consumes cached data instantly — no loading spinners.
 *
 * Data is auto-refreshed every 5 minutes in the background.
 */

const _projects = ref<any[]>([])
const _events = ref<any[]>([])
const _users = ref<any[]>([])
const _customers = ref<any[]>([])
const _notes = ref<any[]>([])
const _permits = ref<any[]>([])
const _finance = ref<any[]>([])
const _tasks = ref<any[]>([])
const _payments = ref<any[]>([])
const _tickets = ref<any[]>([])
const _vendors = ref<any[]>([])
const _salesReps = ref<any[]>([])
const _notifications = ref<any[]>([])
const _chatProjects = ref<any[]>([])
const _roles = ref<any[]>([])

const _userNameMap = ref<Record<string, string>>({})
const _customerNameMap = ref<Record<string, string>>({})
const _projectMap = ref<Record<string, any>>({})

const _ready = ref(false)
const _fetching = ref(false)
const _lastFetched = ref(0)

let _refreshTimer: ReturnType<typeof setInterval> | null = null

function _buildMaps() {
    // User name map (email → display name)
    _userNameMap.value = Object.fromEntries(
        _users.value
            .filter((u: any) => u.Email)
            .map((u: any) => [
                u.Email.toLowerCase(),
                [u['First Name'], u['Last Name']].filter(Boolean).join(' ') || u.Email,
            ]),
    )

    // Customer name map (Customer ID → display name, title-cased)
    const titleCase = (s: string) => s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    _customerNameMap.value = Object.fromEntries(
        _customers.value
            .filter((c: any) => c['Customer ID'])
            .map((c: any) => [
                c['Customer ID'],
                titleCase([c['First Name'], c['Last Name']].filter(Boolean).join(' ') || c['Customer ID']),
            ]),
    )

    // Project map (Project ID → project object)
    _projectMap.value = Object.fromEntries(
        _projects.value
            .filter((p: any) => p['Project ID'])
            .map((p: any) => [p['Project ID'], p]),
    )
}

async function _fetchAll() {
    if (_fetching.value) return
    _fetching.value = true
    try {
        const [projData, eventData, userData, custData, notesData, permitsData, finData, tasksData, paymentsData, ticketsData, vendorsData, salesRepsData, chatProjData, rolesData] = await Promise.all([
            $fetch<{ success: boolean, projects: any[] }>('/api/bigquery/projects').catch(() => ({ success: false, projects: [] })),
            $fetch<{ success: boolean, events: any[] }>('/api/bigquery/events').catch(() => ({ success: false, events: [] })),
            $fetch<{ success: boolean, users: any[] }>('/api/bigquery/users').catch(() => ({ success: false, users: [] })),
            $fetch<{ success: boolean, customers: any[] }>('/api/bigquery/customers').catch(() => ({ success: false, customers: [] })),
            $fetch<{ success: boolean, notes: any[] }>('/api/bigquery/notes').catch(() => ({ success: false, notes: [] })),
            $fetch<{ success: boolean, permits: any[] }>('/api/bigquery/permits').catch(() => ({ success: false, permits: [] })),
            $fetch<{ success: boolean, finance: any[] }>('/api/bigquery/project-finance').catch(() => ({ success: false, finance: [] })),
            $fetch<{ success: boolean, tasks: any[] }>('/api/bigquery/tasks').catch(() => ({ success: false, tasks: [] })),
            $fetch<{ success: boolean, payments: any[] }>('/api/bigquery/payments').catch(() => ({ success: false, payments: [] })),
            $fetch<{ success: boolean, tickets: any[] }>('/api/bigquery/tickets').catch(() => ({ success: false, tickets: [] })),
            $fetch<{ success: boolean, vendors: any[] }>('/api/bigquery/vendors').catch(() => ({ success: false, vendors: [] })),
            $fetch<{ success: boolean, salesReps: any[] }>('/api/bigquery/sales-reps').catch(() => ({ success: false, salesReps: [] })),
            $fetch<{ success: boolean, projects: any[] }>('/api/bigquery/chat-projects').catch(() => ({ success: false, projects: [] })),
            $fetch<{ success: boolean, roles: any[] }>('/api/bigquery/roles').catch(() => ({ success: false, roles: [] })),
        ])
        if (projData.success) _projects.value = projData.projects
        if (eventData.success) _events.value = eventData.events
        if (userData.success) _users.value = userData.users
        if (custData.success) _customers.value = custData.customers
        if (notesData.success) _notes.value = notesData.notes
        if (permitsData.success) _permits.value = permitsData.permits
        if (finData.success) _finance.value = finData.finance
        if (tasksData.success) _tasks.value = tasksData.tasks
        if (paymentsData.success) _payments.value = paymentsData.payments
        if (ticketsData.success) _tickets.value = ticketsData.tickets
        if (vendorsData.success) _vendors.value = vendorsData.vendors
        if (salesRepsData.success) _salesReps.value = salesRepsData.salesReps
        if (chatProjData.success) _chatProjects.value = chatProjData.projects
        if (rolesData.success) _roles.value = rolesData.roles
        _buildMaps()
        _lastFetched.value = Date.now()
    }
    catch { }
    finally {
        _fetching.value = false
        _ready.value = true
    }
}

export function useDashboardStore() {
    /**
     * Initialize the store — call once at app startup.
     * Safe to call multiple times; only the first call fetches.
     */
    function init() {
        if (_ready.value || _fetching.value) return
        _fetchAll()

        // Auto-refresh every 5 minutes (client-side only)
        if (import.meta.client && !_refreshTimer) {
            _refreshTimer = setInterval(() => {
                _fetchAll()
            }, 5 * 60 * 1000)
        }
    }

    /** Force-refresh all data */
    async function refresh() {
        _ready.value = false
        await _fetchAll()
    }

    return {
        // Reactive data
        projects: readonly(_projects),
        events: readonly(_events),
        users: readonly(_users),
        customers: readonly(_customers),
        notes: readonly(_notes),
        permits: readonly(_permits),
        finance: readonly(_finance),
        tasks: readonly(_tasks),
        payments: readonly(_payments),
        tickets: readonly(_tickets),
        vendors: readonly(_vendors),
        salesReps: readonly(_salesReps),
        notifications: readonly(_notifications),
        chatProjects: readonly(_chatProjects),
        roles: readonly(_roles),
        userNameMap: readonly(_userNameMap),
        customerNameMap: readonly(_customerNameMap),
        projectMap: readonly(_projectMap),

        // State
        ready: readonly(_ready),
        fetching: readonly(_fetching),
        lastFetched: readonly(_lastFetched),

        // Actions
        init,
        refresh,
    }
}
