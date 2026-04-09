export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    if (!body.rowId) throw createError({ statusCode: 400, statusMessage: 'ROWID is required' })
    const escape = (v: string) => (v || '').replace(/'/g, "\\'")

    const sql = `
      UPDATE \`appsheet-417200.SWSCRMV4.Dropdowns\`
      SET
        Name = '${escape(body.name)}',
        Type = '${escape(body.type)}',
        Color = '${escape(body.color)}',
        Icon = '${escape(body.icon)}'
      WHERE ROWID = '${escape(body.rowId)}'
    `
    await queryBigQuery(sql)
    return { success: true, message: 'Dropdown updated successfully' }
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw createError({ statusCode: 500, statusMessage: `Failed to update dropdown: ${message}` })
  }
})
