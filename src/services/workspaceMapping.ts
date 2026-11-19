import type { ProposalDocument, ProposalWorkspace } from '../types/workspace'

const site = new URL('https://0pnq2.sharepoint.com/sites/ProposalManagementDemo')
export const sharePointSite = site.href.replace(/\/$/, '')
export const documentsLibraryId = 'c597ef7f-3551-4541-85e6-5971185240d5'

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('The service returned an invalid record.')
  }
  return value as Record<string, unknown>
}

function text(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`The service response is missing ${name}.`)
  }
  return value
}

export function trustedSharePointUrl(value: unknown): string {
  const url = new URL(text(value, 'SharePoint URL'))
  if (url.origin !== site.origin || !url.pathname.startsWith(`${site.pathname}/`) || url.username || url.password) {
    throw new Error('The workspace URL is outside the configured SharePoint site.')
  }
  return url.href
}

export function parseWorkspace(value: unknown): ProposalWorkspace {
  const row = record(value)
  const status = row.new_provisioningstatus
  if (status !== 'Requested' && status !== 'Provisioning' && status !== 'Ready' && status !== 'Failed') {
    throw new Error('The proposal has an unknown provisioning status. Contact the solution maker.')
  }
  const workspace: ProposalWorkspace = {
    id: text(row.new_proposalid, 'proposal ID'),
    status,
    error: typeof row.new_provisioningerror === 'string' ? row.new_provisioningerror : undefined,
    correlationId: typeof row.new_correlationid === 'string' ? row.new_correlationid : undefined,
  }
  if (status === 'Ready') {
    workspace.workspaceUrl = trustedSharePointUrl(row.new_workspaceurl)
    workspace.solicitationUrl = trustedSharePointUrl(row.new_solicitationurl)
    workspace.solicitationPath = text(row.new_solicitationpath, 'solicitation path')
    if (!workspace.solicitationPath.startsWith(`${site.pathname}/`)) {
      throw new Error('The solicitation folder is outside the configured SharePoint site.')
    }
  }
  return workspace
}

export function parseDocuments(value: unknown): ProposalDocument[] {
  const response = record(value)
  if (!Array.isArray(response.value)) throw new Error('SharePoint did not return a document inventory.')
  if (response['@odata.nextLink'] || response.value.length >= 5000) {
    throw new Error('The folder exceeds the current inventory limit. No partial inventory is shown; reduce the file count and refresh.')
  }
  return response.value.map((entry) => {
    const raw = record(entry)
    const file = raw.dynamicProperties === undefined ? raw : record(raw.dynamicProperties)
    const name = text(file['{FilenameWithExtension}'], 'file name')
    const modified = text(file.Modified, `modified date for ${name}`)
    if (Number.isNaN(Date.parse(modified))) throw new Error(`SharePoint returned an invalid modified date for ${name}.`)
    const extension = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : ''
    return {
      id: text(file['{Identifier}'], `identifier for ${name}`),
      name, modified,
      type: extension ? extension.toUpperCase() : 'No extension',
      version: typeof file['{VersionNumber}'] === 'string' ? file['{VersionNumber}'] : 'Not provided by SharePoint',
      supported: extension === 'pdf' || extension === 'docx',
    }
  })
}
