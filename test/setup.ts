process.env.CDS_TYPESCRIPT = 'true'
// we need to disable the cds-plugin-ui5, because UI5 middlewares keep the test process running
process.env.CDS_PLUGIN_UI5_ACTIVE = 'false'
