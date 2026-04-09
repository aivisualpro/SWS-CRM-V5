export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const search = (query.search as string || '').trim()

    let sql = 'SELECT * FROM `appsheet-417200.SWSCRMV4.Dropdowns`'

    if (search) {
      sql += ` WHERE LOWER(IFNULL(Name, '')) LIKE LOWER(@search)
               OR LOWER(IFNULL(Type, '')) LIKE LOWER(@search)`
    }

    sql += ' ORDER BY Name ASC'

    const params = search ? { search: `%${search}%` } : undefined
    const rows = await queryBigQuery(sql, params)

    return { success: true, count: rows.length, dropdowns: rows }
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw createError({ statusCode: 500, statusMessage: `Failed to fetch dropdowns: ${message}` })
  }
})
