import { New_proposalsService } from '../generated/services/New_proposalsService'
import { ProvisionProposalWorkspaceService } from '../generated/services/ProvisionProposalWorkspaceService'
import { SharePointService } from '../generated/services/SharePointService'
import type { WorkspaceProvider } from '../types/workspace'
import { documentsLibraryId, parseDocuments, parseWorkspace, sharePointSite } from './workspaceMapping'

function checkId(id: string) {
  if (!/^OPP-\d{4}-\d{3}$/.test(id)) throw new Error('Select a valid demo opportunity before requesting a workspace.')
}

export const workspaceProvider: WorkspaceProvider = {
  async find(opportunityId) {
    checkId(opportunityId)
    const result = await New_proposalsService.getAll({
      select: ['new_proposalid', 'new_provisioningstatus', 'new_workspaceurl', 'new_solicitationurl', 'new_solicitationpath', 'new_provisioningerror', 'new_correlationid'],
      filter: `new_opportunityid eq '${opportunityId}'`, top: 2,
    })
    if (!result.success) throw new Error('Unable to read proposal status. Open the app through Power Apps and check your Dataverse permissions.', { cause: result.error })
    if (!Array.isArray(result.data)) throw new Error('Dataverse did not return proposal status.')
    if (result.data.length > 1) throw new Error('Duplicate proposals were found. Ask the maker to check the opportunity unique key.')
    return result.data.length === 0 ? undefined : parseWorkspace(result.data[0])
  },
  async request(opportunityId) {
    checkId(opportunityId)
    const result = await ProvisionProposalWorkspaceService.Run({ text: opportunityId })
    if (!result.success) throw new Error('Workspace request failed. Refresh status before retrying; the request may have reached the server.', { cause: result.error })
    const id = result.data?.proposalid
    if (typeof id !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
      throw new Error('The flow did not return a valid proposal ID. Refresh status before retrying.')
    }
    return id
  },
  async documents(workspace) {
    if (workspace.status !== 'Ready' || !workspace.solicitationPath) {
      throw new Error('Documents are available only after workspace provisioning completes.')
    }
    const path = workspace.solicitationPath.replace(/'/g, "''")
    const result = await SharePointService.GetFileItems(
      sharePointSite, documentsLibraryId,
      `FSObjType eq 0 and FileDirRef eq '${path}'`, 'FileLeafRef asc', 5000, undefined, 'RecursiveAll',
    )
    if (!result.success) throw new Error('Unable to refresh documents. Check your SharePoint access, then try again.', { cause: result.error })
    if (result.skipToken) throw new Error('SharePoint returned a partial page. No partial inventory is shown; reduce the file count and refresh.')
    return parseDocuments(result.data)
  },
}
