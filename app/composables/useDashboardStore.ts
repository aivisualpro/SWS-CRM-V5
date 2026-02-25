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

    // Customer name map (Customer ID → display name)
    _customerNameMap.value = Object.fromEntries(
        _customers.value
            .filter((c: any) => c['Customer ID'])
            .map((c: any) => [
                c['Customer ID'],
                [c['First Name'], c['Last Name']].filter(Boolean).join(' ') || c['Customer ID'],
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
        const [projData, eventData, userData, custData] = await Promise.all([
            $fetch<{ success: boolean, projects: any[] }>('/api/bigquery/projects').catch(() => ({ success: false, projects: [] })),
            $fetch<{ success: boolean, events: any[] }>('/api/bigquery/events').catch(() => ({ success: false, events: [] })),
            $fetch<{ success: boolean, users: any[] }>('/api/bigquery/users').catch(() => ({ success: false, users: [] })),
            $fetch<{ success: boolean, customers: any[] }>('/api/bigquery/customers').catch(() => ({ success: false, customers: [] })),
        ])
        if (projData.success) _projects.value = projData.projects
        if (eventData.success) _events.value = eventData.events
        if (userData.success) _users.value = userData.users
        if (custData.success) _customers.value = custData.customers
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
