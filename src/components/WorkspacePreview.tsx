import { Badge, Button } from '@fluentui/react-components'
import { ArrowSyncRegular, DocumentRegular, FolderRegular, SparkleRegular } from '@fluentui/react-icons'
import type { Opportunity } from '../types/opportunity'

const folders = [
  '01 Opportunity Intelligence',
  '02 Solicitation Documents',
  '03 Compliance Matrix',
  '04 Technical Proposal',
  '05 Management Proposal',
  '06 Past Performance',
  '07 Pricing',
  '08 Reviews',
  '09 Final Submission',
]

export function WorkspacePreview({ opportunity }: { opportunity: Opportunity | undefined }) {
  return (
    <>
      <section className="panel workspace-banner" aria-labelledby="workspace-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Workspace preview</p>
            <h2 id="workspace-heading">{opportunity?.name ?? 'Your proposal starts with an opportunity'}</h2>
            <p className="muted">{opportunity ? `${opportunity.id} / ${opportunity.customer}` : 'Select an opportunity on the dashboard to see its workspace context.'}</p>
          </div>
          <Badge appearance="outline">Not provisioned</Badge>
        </div>
        <p>This is a structural preview, not a created workspace. No proposal record or SharePoint folders exist.</p>
        <Button appearance="primary" icon={<FolderRegular />} disabled>Create Proposal Workspace</Button>
        <p className="action-note">Available in Phase 2 with Dataverse, SharePoint, and Power Automate.</p>
      </section>
      <div className="workspace-grid">
        <section className="panel" aria-labelledby="folders-heading">
          <div className="section-heading">
            <div><p className="eyebrow">Designed for collaboration</p><h2 id="folders-heading">Planned folder structure</h2></div>
            <Badge appearance="outline">Phase 2</Badge>
          </div>
          <p className="muted">Nine standard folders, one dedicated SharePoint site. These are planned folders only.</p>
          <ul className="folder-list">
            {folders.map((folder) => <li key={folder}><FolderRegular aria-hidden="true" /><span>{folder}</span></li>)}
          </ul>
        </section>
        <div className="panel-stack">
          <section className="panel" aria-labelledby="documents-heading">
            <div className="section-heading"><h2 id="documents-heading">Solicitation documents</h2><Badge appearance="outline">Phase 2</Badge></div>
            <div className="button-row">
              <Button icon={<FolderRegular />} disabled>Open Solicitation Documents</Button>
              <Button icon={<ArrowSyncRegular />} disabled>Refresh Documents</Button>
            </div>
            <div className="empty-state compact">
              <DocumentRegular className="empty-icon" aria-hidden="true" />
              <h3>No document connection</h3>
              <p>Document inventory will appear after provisioning and connecting SharePoint. Uploads will happen in SharePoint, not in this app.</p>
            </div>
            <p className="action-note">Future inventory: file name, type, modified date, version, and analysis status. Initial formats: PDF and DOCX.</p>
          </section>
          <section className="panel" aria-labelledby="analysis-heading">
            <div className="section-heading"><h2 id="analysis-heading">Document intelligence</h2><Badge appearance="outline">Phase 3</Badge></div>
            <p className="muted">Turn a solicitation package into traceable, proposed requirements for human review.</p>
            <Button icon={<SparkleRegular />} disabled>Analyze Proposal</Button>
            <p className="action-note">Not connected. No analysis has run. Analysis will begin only when explicitly requested in Phase 3.</p>
          </section>
        </div>
      </div>
    </>
  )
}
