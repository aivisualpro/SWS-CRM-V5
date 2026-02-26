/**
 * GET /api/bigquery/chat-projects
 * Returns distinct Project IDs that have chat messages,
 * along with the latest message info for sidebar display.
 * Caches for 5 minutes.
 */

let _cache: { data: any[], timestamp: number } | null = null
const CACHE_TTL = 300_000

export default defineEventHandler(async () => {
    try {
        if (_cache && Date.now() - _cache.timestamp < CACHE_TTL) {
            return { success: true, projects: _cache.data, cached: true }
        }

        // Get latest message per project from both tables
        const sql = `
            SELECT \`Project ID\`, Email, Chat, TimeStamp
            FROM (
                SELECT \`Project ID\`, Email, Chat, TimeStamp,
                    ROW_NUMBER() OVER (PARTITION BY \`Project ID\` ORDER BY TimeStamp DESC) as rn
                FROM (
                    SELECT \`Project ID\`, Email, Chat, TimeStamp FROM \`appsheet-417200.SWSCRMV4.Chat\`
                    UNION ALL
                    SELECT \`Project ID\`, Email, Chat, TimeStamp FROM \`appsheet-417200.SWSCRMV4.ChatClosed\`
                )
            )
            WHERE rn = 1
            ORDER BY TimeStamp DESC
        `

        const rows = await queryBigQuery(sql)
        _cache = { data: rows, timestamp: Date.now() }

        return { success: true, projects: rows }
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        throw createError({ statusCode: 500, statusMessage: `Failed to fetch chat projects: ${message}` })
    }
})
