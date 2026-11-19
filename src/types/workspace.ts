export type ProvisioningStatus = 'Requested' | 'Provisioning' | 'Ready' | 'Failed'

export interface ProposalWorkspace {
  id: string
  status: ProvisioningStatus
  workspaceUrl?: string
  solicitationUrl?: string
  solicitationPath?: string
  error?: string
  correlationId?: string
}

export interface ProposalDocument {
  id: string
  name: string
  type: string
  modified: string
  version: string
  supported: boolean
}

export interface WorkspaceProvider {
  find(opportunityId: string): Promise<ProposalWorkspace | undefined>
  request(opportunityId: string): Promise<string>
  documents(workspace: ProposalWorkspace): Promise<ProposalDocument[]>
}
