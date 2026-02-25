export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const search = (query.search as string || '').trim()
    const category = (query.category as string || '').trim()

    let sql = 'SELECT * FROM `appsheet-417200.SWSCRMV4.Events`'
    const conditions: string[] = []

    if (search) {
      conditions.push(`(
        LOWER(IFNULL(\`Event  ID\`, '')) LIKE LOWER(@search)
        OR LOWER(IFNULL(\`Event Type\`, '')) LIKE LOWER(@search)
        OR LOWER(IFNULL(\`Event Status\`, '')) LIKE LOWER(@search)
        OR LOWER(IFNULL(\`Event Description\`, '')) LIKE LOWER(@search)
        OR LOWER(IFNULL(\`Customer Address\`, '')) LIKE LOWER(@search)
        OR LOWER(IFNULL(\`Project ID\`, '')) LIKE LOWER(@search)
        OR LOWER(IFNULL(\`Create By\`, '')) LIKE LOWER(@search)
        OR LOWER(IFNULL(Branch, '')) LIKE LOWER(@search)
      )`)
    }

    if (category) {
      conditions.push(`LOWER(IFNULL(Category, '')) = LOWER(@category)`)
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`
    }

    sql += ' ORDER BY `Start Date` DESC'

    const params: Record<string, string> = {}
    if (search) params.search = `%${search}%`
    if (category) params.category = category

    const rows = await queryBigQuery(sql, Object.keys(params).length > 0 ? params : undefined)

    return { success: true, count: rows.length, events: rows }
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw createError({ statusCode: 500, statusMessage: `Failed to fetch events: ${message}` })
  }
})
