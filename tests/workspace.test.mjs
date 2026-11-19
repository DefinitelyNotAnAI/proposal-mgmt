import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseDocuments, parseWorkspace, trustedSharePointUrl } from '../src/services/workspaceMapping.ts'
import { clientData, workerClientData, workspaceFolderName } from '../power-platform/provisioning.mjs'
import { opportunityProvider } from '../src/services/opportunityService.ts'

const site = 'https://0pnq2.sharepoint.com/sites/ProposalManagementDemo'
const ready = {
  new_proposalid: 'demo-id', new_provisioningstatus: 'Ready',
  new_workspaceurl: `${site}/Shared%20Documents/Proposals/OPP-2026-001`,
  new_solicitationurl: `${site}/Shared%20Documents/Proposals/OPP-2026-001/02%20Solicitation%20Documents`,
  new_solicitationpath: '/sites/ProposalManagementDemo/Shared Documents/Proposals/OPP-2026-001/02 Solicitation Documents',
}

test('bundled opportunities load without a fetch and honor cancellation', async (context) => {
  context.mock.method(globalThis, 'fetch', () => { throw new Error('Mock opportunities must not depend on network access.') })
  const first = await opportunityProvider.list()
  assert.ok(first.length >= 3)
  first[0].name = 'Modified by caller'
  assert.notEqual((await opportunityProvider.list())[0].name, first[0].name)
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(() => opportunityProvider.list(controller.signal), { name: 'AbortError' })
})

test('only Ready workspaces expose validated SharePoint links', () => {
  assert.equal(parseWorkspace(ready).solicitationUrl, ready.new_solicitationurl)
  assert.equal(parseWorkspace({ ...ready, new_provisioningstatus: 'Failed' }).workspaceUrl, undefined)
  assert.throws(() => parseWorkspace({ ...ready, new_provisioningstatus: 'Success' }), /unknown provisioning status/)
  assert.throws(() => parseWorkspace({ ...ready, new_solicitationurl: 'https://example.com' }), /outside/)
  assert.throws(() => parseWorkspace({ ...ready, new_solicitationpath: '/sites/Other/Documents' }), /outside/)
  assert.throws(() => trustedSharePointUrl('javascript:alert(1)'), /outside/)
})

test('inventory preserves versions and identifies unsupported files without fabricated analysis', () => {
  const file = (name, version = '2.1') => ({
    '{FilenameWithExtension}': name, '{Identifier}': name,
    Modified: '2026-11-18T12:00:00Z', '{VersionNumber}': version,
  })
  const withoutVersion = file('NoExtension')
  delete withoutVersion['{VersionNumber}']
  const documents = parseDocuments({ value: [file('Solicitation.PDF'), { dynamicProperties: file('Instructions.docx') }, file('Notes.txt'), withoutVersion] })
  assert.deepEqual(documents.map((document) => document.supported), [true, true, false, false])
  assert.equal(documents[0].version, '2.1')
  assert.equal(documents[3].version, 'Not provided by SharePoint')
  assert.deepEqual(parseDocuments({ value: [] }), [])
  assert.throws(() => parseDocuments({ value: [file('a.pdf')], '@odata.nextLink': 'next' }), /partial inventory/)
  assert.throws(() => parseDocuments({}), /did not return/)
  assert.throws(() => parseDocuments({ value: [{ ...file('a.pdf'), Modified: 'invalid' }] }), /invalid modified date/)
})

test('workspace folder names remove SharePoint-unsafe characters and bound segment length', () => {
  const name = workspaceFolderName({ id: 'OPP-2026-001', name: 'Cloud: Operations / R&D? #1%.' })
  assert.ok(name.startsWith('OPP-2026-001 - '))
  assert.doesNotMatch(name, /["*:<>?/\\|#%']/)
  assert.ok(workspaceFolderName({ id: 'OPP-2026-001', name: 'a'.repeat(300) }).length <= 150)
})

test('request flow stays short and provisioning worker serializes and verifies folders', () => {
  const request = clientData.properties.definition
  const worker = workerClientData.properties.definition
  assert.equal(request.triggers.manual.kind, 'PowerAppV2')
  assert.equal(request.triggers.manual.runtimeConfiguration, undefined)
  assert.equal(request.actions.Provision.actions.Needs_provisioning, undefined)
  const run = worker.actions.Provision.actions
  assert.equal(worker.triggers.When_requested.inputs.parameters['subscriptionRequest/message'], 4)
  assert.equal(worker.triggers.When_requested.splitOn, undefined)
  assert.equal(worker.triggers.When_requested.runtimeConfiguration.concurrency.runs, 1)
  assert.deepEqual(run.Mark_ready.runAfter, { Ensure_folders: ['Succeeded'] })
  assert.ok(run.Ensure_folders.actions.Verify_folder)
  assert.deepEqual(run.Ensure_folders.actions.Folder_missing.expression, { equals: ["@outputs('Get_folder')?['statusCode']", 404] })
})
