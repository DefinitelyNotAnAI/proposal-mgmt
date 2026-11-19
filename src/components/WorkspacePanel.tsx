import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge, Button, MessageBar, MessageBarBody, Spinner } from '@fluentui/react-components'
import { ArrowSyncRegular, FolderRegular, SparkleRegular } from '@fluentui/react-icons'
import folders from '../data/workspaceFolders.json'
import { workspaceProvider } from '../services/workspaceService'
import type { Opportunity } from '../types/opportunity'
import type { ProposalDocument, ProposalWorkspace } from '../types/workspace'

type State = { opportunityId: string; workspace?: ProposalWorkspace; loaded: boolean; error?: string }
type Inventory = { proposalId: string; documents?: ProposalDocument[]; loading: boolean; error?: string }
const errorText = (error: unknown) => error instanceof Error ? error.message : 'An unexpected workspace error occurred.'

export function WorkspacePanel({ opportunity, compact, onOpen }: {
  opportunity: Opportunity | undefined
  compact: boolean
  onOpen: () => void
}) {
  const id = opportunity?.id ?? ''
  const [state, setState] = useState<State>({ opportunityId: '', loaded: false })
  const [busy, setBusy] = useState(false)
  const [inventory, setInventory] = useState<Inventory>({ proposalId: '', loading: false })
  const generation = useRef(0)
  const statusRequest = useRef(0)
  const submission = useRef(false)
  const inventoryRequest = useRef(0)
  const current = state.opportunityId === id ? state : { opportunityId: id, loaded: false }
  const workspace = current.workspace
  const pending = workspace?.status === 'Requested' || workspace?.status === 'Provisioning'

  const refresh = useCallback(async (token: number) => {
    const request = ++statusRequest.current
    try {
      const result = await workspaceProvider.find(id)
      if (generation.current === token && statusRequest.current === request) setState({ opportunityId: id, workspace: result, loaded: true })
    } catch (error: unknown) {
      if (generation.current === token && statusRequest.current === request) {
        setState((previous) => ({
          opportunityId: id, loaded: true,
          workspace: previous.opportunityId === id ? previous.workspace : undefined,
          error: errorText(error),
        }))
      }
    }
  }, [id])

  useEffect(() => {
    const token = ++generation.current
    if (id) void refresh(token)
    return () => { generation.current = token + 1 }
  }, [id, refresh])

  useEffect(() => {
    if (!pending || current.error || busy) return
    const token = generation.current
    const timer = window.setTimeout(() => { void refresh(token) }, 5000)
    return () => window.clearTimeout(timer)
  }, [pending, current.error, busy, state, refresh])

  async function requestWorkspace() {
    if (!id || submission.current) return
    const token = generation.current
    submission.current = true
    setBusy(true)
    try {
      await workspaceProvider.request(id)
      await refresh(token)
    } catch (error: unknown) {
      if (generation.current === token) setState((previous) => ({
        ...previous, opportunityId: id, loaded: true, error: errorText(error),
      }))
    } finally {
      submission.current = false
      setBusy(false)
    }
  }

  const refreshDocuments = useCallback(async (proposal: ProposalWorkspace) => {
    const token = generation.current
    const request = ++inventoryRequest.current
    setInventory({ proposalId: proposal.id, loading: true })
    try {
      const documents = await workspaceProvider.documents(proposal)
      if (generation.current === token && inventoryRequest.current === request) {
        setInventory({ proposalId: proposal.id, documents, loading: false })
      }
    } catch (error: unknown) {
      if (generation.current === token && inventoryRequest.current === request) {
        setInventory({ proposalId: proposal.id, loading: false, error: errorText(error) })
      }
    }
  }, [])

  useEffect(() => {
    if (!compact && workspace?.status === 'Ready') void refreshDocuments(workspace)
  }, [compact, workspace, refreshDocuments])

  const ready = workspace?.status === 'Ready'
  const canCreate = Boolean(id && current.loaded && !current.error && !busy && !pending && !ready)
  const documents = inventory.proposalId === workspace?.id ? inventory : undefined
  const label = !id ? 'Select an opportunity' : !current.loaded ? 'Checking status' : current.error ? 'Status unavailable' : workspace?.status ?? 'Not provisioned'

  return (
    <>
      <section className={`panel ${compact ? 'next-step' : 'workspace-banner'}`} aria-labelledby="workspace-heading">
        <div>
          <p className="eyebrow">02 / Proposal workspace</p>
          <h2 id="workspace-heading">{compact ? 'One opportunity. One organized workspace.' : opportunity?.name ?? 'Select an opportunity on the dashboard'}</h2>
          <p className="muted">{opportunity ? `${opportunity.id} / ${opportunity.customer}` : 'Select a fictional opportunity before creating a real workspace.'}</p>
          <div className="status-line" role="status"><Badge appearance="outline">{label}</Badge>
            <span>{ready ? 'SharePoint workspace provisioned.' : pending ? 'Provisioning continues on the server. You can leave and return.' : workspace?.status === 'Failed' ? 'Partial work is retained. Retry resumes the same workspace.' : 'No successful provisioning is implied until Dataverse reports Ready.'}</span>
          </div>
          {id && !current.loaded && <Spinner size="tiny" label="Reading Dataverse status..." />}
          {current.error && <MessageBar intent="error"><MessageBarBody>{current.error} Displayed status may be stale. Use Refresh Status to recover.</MessageBarBody></MessageBar>}
          {workspace?.status === 'Failed' && <MessageBar intent="error"><MessageBarBody>{workspace.error || 'Provisioning failed. Inspect the flow run, correct the issue, then retry.'} {workspace.correlationId && `Run: ${workspace.correlationId}`}</MessageBarBody></MessageBar>}
        </div>
        <div className="next-actions">
          <Button appearance="primary" icon={<FolderRegular />} disabled={!canCreate} onClick={() => { void requestWorkspace() }}>
            {busy ? 'Submitting request...' : workspace?.status === 'Failed' ? 'Retry Provisioning' : 'Create Proposal Workspace'}
          </Button>
          <p className="action-note">Creates real Dataverse and SharePoint resources. No templates configured.</p>
          <Button icon={<ArrowSyncRegular />} disabled={!id || busy} onClick={() => { void refresh(generation.current) }}>Refresh Status</Button>
          {compact && <Button appearance="transparent" onClick={onOpen}>Open proposal workspace</Button>}
          {!compact && ready && <a className="workspace-link" href={workspace.workspaceUrl} target="_blank" rel="noopener noreferrer">Open SharePoint Workspace</a>}
        </div>
      </section>
      {!compact && <div className="workspace-grid">
        <section className="panel" aria-labelledby="folders-heading">
          <div className="section-heading"><h2 id="folders-heading">Standard folder structure</h2><Badge appearance="outline">{ready ? 'Provisioned' : 'Planned'}</Badge></div>
          <p className="muted">{ready ? 'These folders were verified during provisioning. Live changes can be inspected in SharePoint.' : 'Folders are planned until provisioning reports Ready.'}</p>
          <ul className="folder-list">{folders.map((folder) => <li key={folder}><FolderRegular aria-hidden="true" /><span>{folder}</span></li>)}</ul>
        </section>
        <div className="panel-stack">
          <section className="panel" aria-labelledby="documents-heading">
            <h2 id="documents-heading">Solicitation documents</h2>
            <p className="muted">Upload PDF and DOCX files in SharePoint, then refresh. Only direct files in the solicitation folder are listed.</p>
            <div className="button-row">
              {ready ? <a className="workspace-link" href={workspace.solicitationUrl} target="_blank" rel="noopener noreferrer">Open Solicitation Documents</a> : <Button icon={<FolderRegular />} disabled>Open Solicitation Documents</Button>}
              <Button icon={<ArrowSyncRegular />} disabled={!ready || documents?.loading} onClick={() => { if (workspace) void refreshDocuments(workspace) }}>Refresh Documents</Button>
            </div>
            {documents?.loading && <div className="loading-state"><Spinner size="small" label="Refreshing SharePoint documents..." /></div>}
            {documents?.error && <MessageBar intent="error"><MessageBarBody>{documents.error}</MessageBarBody></MessageBar>}
            {documents?.documents && (documents.documents.length === 0 ? <div className="empty-state compact"><h3>No solicitation documents yet</h3><p>Open the SharePoint folder to upload files. No React upload interface is provided.</p></div> : <div className="inventory-scroll"><table className="inventory-table">
              <caption>SharePoint document inventory</caption>
              <thead><tr><th scope="col">File</th><th scope="col">Modified</th><th scope="col">Version</th><th scope="col">Analysis status</th></tr></thead>
              <tbody>{documents.documents.map((document) => <tr key={document.id}><td>{document.name}<small>{document.type}</small></td><td>{new Date(document.modified).toLocaleString()}</td><td>{document.version}</td><td>{document.supported ? 'Unavailable - Phase 3' : 'Unsupported file type'}</td></tr>)}</tbody>
            </table></div>)}
            {!ready && <div className="empty-state compact"><h3>Workspace not ready</h3><p>Document inventory becomes available after successful provisioning.</p></div>}
          </section>
          <section className="panel" aria-labelledby="analysis-heading">
            <div className="section-heading"><h2 id="analysis-heading">Document intelligence</h2><Badge appearance="outline">Phase 3</Badge></div>
            <p className="muted">Analysis and human validation are not implemented. No document analysis has run.</p>
            <Button icon={<SparkleRegular />} disabled>Analyze Proposal</Button>
          </section>
        </div>
      </div>}
    </>
  )
}
