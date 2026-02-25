import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)

        const escape = (v: string) => (v || '').replace(/'/g, "\\'")
        const projectId = nanoid(8)

        const sql = `
      INSERT INTO \`appsheet-417200.SWSCRMV4.Projects\`
        (\`Project ID\`, \`Customer name\`, \`Customer Address\`, \`Branch Name\`,
         \`Project Folder\`, \`Vendor Name\`, \`Project Type\`, \`Job Status\`,
         \`Project Status\`, \`Project Manager\`, \`Project Manager VA\`,
         \`Finance Manager\`, \`Finance Manager VA\`, \`Engineer\`,
         \`Permit Coordinator\`, \`Sales Rep\`, \`Project Equipment\`,
         \`Panels Amount\`, KW, Watt, Utillity, \`Solar Equipment\`,
         \`Inverter Type\`, \`Batteries Qty\`, \`Project Price\`,
         \`Contract Price\`, \`Project Net Amount\`, AHJ, Jurisdiction,
         \`Create By\`, TimeStamp, \`Customer ID\`, \`Customer Email\`, \`Customer Phone\`)
      VALUES (
        '${escape(projectId)}',
        '${escape(body.customerName)}',
        '${escape(body.customerAddress)}',
        '${escape(body.branchName)}',
        '${escape(body.projectFolder)}',
        '${escape(body.vendorName)}',
        '${escape(body.projectType)}',
        '${escape(body.jobStatus || 'In Progress')}',
        '${escape(body.projectStatus || 'NEW JOB')}',
        '${escape(body.projectManager)}',
        '${escape(body.projectManagerVA)}',
        '${escape(body.financeManager)}',
        '${escape(body.financeManagerVA)}',
        '${escape(body.engineer)}',
        '${escape(body.permitCoordinator)}',
        '${escape(body.salesRep)}',
        '${escape(body.projectEquipment)}',
        '${escape(body.panelsAmount)}',
        '${escape(body.kw)}',
        '${escape(body.watt)}',
        '${escape(body.utility)}',
        '${escape(body.solarEquipment)}',
        '${escape(body.inverterType)}',
        '${escape(body.batteriesQty)}',
        '${escape(body.projectPrice)}',
        '${escape(body.contractPrice)}',
        '${escape(body.projectNetAmount)}',
        '${escape(body.ahj)}',
        '${escape(body.jurisdiction)}',
        '${escape(body.createBy)}',
        CURRENT_TIMESTAMP(),
        '${escape(body.customerId)}',
        '${escape(body.customerEmail)}',
        '${escape(body.customerPhone)}'
      )
    `

        await queryBigQuery(sql)
        return { success: true, message: 'Project created successfully', projectId }
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        throw createError({ statusCode: 500, statusMessage: `Failed to create project: ${message}` })
    }
})
