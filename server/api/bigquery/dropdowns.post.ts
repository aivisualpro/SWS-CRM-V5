import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const escape = (v: string) => (v || '').replace(/'/g, "\\'")

    const rowId = nanoid(8)

    const sql = `
      INSERT INTO \`appsheet-417200.SWSCRMV4.Dropdowns\`
        (ROWID, Name, Type, Color, Icon)
      VALUES (
        '${rowId}',
        '${escape(body.name)}',
        '${escape(body.type)}',
        '${escape(body.color)}',
        '${escape(body.icon)}'
      )
    `
    await queryBigQuery(sql)
    return { success: true, message: 'Dropdown created successfully' }
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw createError({ statusCode: 500, statusMessage: `Failed to create dropdown: ${message}` })
  }
})
