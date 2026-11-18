import { useEffect, useState } from 'react'
import {
  Badge, Button, Field, FluentProvider, MessageBar, MessageBarBody,
  MessageBarTitle, Select, Spinner, webDarkTheme, webLightTheme,
} from '@fluentui/react-components'
import {
  ArrowRightRegular, BoardRegular, BuildingRegular, CheckmarkCircleRegular,
  DocumentBulletListRegular, FolderRegular, GridRegular, ShieldCheckmarkRegular,
} from '@fluentui/react-icons'
import { OpportunityDetails } from './components/OpportunityDetails'
import { WorkspacePreview } from './components/WorkspacePreview'
import { opportunityProvider } from './services/opportunityService'
import type { Opportunity } from './types/opportunity'
import './App.css'

type Screen = 'dashboard' | 'workspace'
type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; opportunities: Opportunity[] }
  | { status: 'error'; message: string }

const isDark = document.documentElement.dataset.theme === 'dark'
const baseTheme = isDark ? webDarkTheme : webLightTheme
const theme = {
  ...baseTheme,
  fontFamilyBase: '"Segoe UI", Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif',
  colorBrandBackground: 'var(--cp-accent)',
  colorBrandBackgroundHover: 'var(--cp-accent-hover)',
  colorBrandBackgroundPressed: 'var(--cp-accent-hover)',
  colorNeutralForegroundOnBrand: 'var(--cp-accent-fg)',
  colorBrandForeground1: 'var(--cp-accent)',
  colorBrandForeground2: 'var(--cp-accent)',
  colorBrandBackground2: 'var(--cp-accent-soft)',
  colorBrandStroke1: 'var(--cp-accent)',
  colorCompoundBrandStroke: 'var(--cp-accent)',
  colorCompoundBrandStrokeHover: 'var(--cp-accent-hover)',
  colorStrokeFocus2: 'var(--cp-accent)',
  colorNeutralBackground1: 'var(--cp-surface)',
  colorNeutralBackground2: 'var(--cp-surface-soft)',
  colorNeutralForeground1: 'var(--cp-text)',
  colorNeutralForeground2: 'var(--cp-text-muted)',
  colorNeutralStroke1: 'var(--cp-border-strong)',
  borderRadiusMedium: '10px',
}

function App() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [selectedId, setSelectedId] = useState('')
  const [selectionError, setSelectionError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    opportunityProvider.list(controller.signal).then(
      (opportunities) => {
        if (!controller.signal.aborted) setLoad({ status: 'ready', opportunities })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setLoad({
            status: 'error',
            message: error instanceof Error ? error.message : 'An unexpected error occurred while loading demo opportunities.',
          })
        }
      },
    )
    return () => controller.abort()
  }, [attempt])

  const opportunities = load.status === 'ready' ? load.opportunities : []
  const selected = opportunities.find((opportunity) => opportunity.id === selectedId)

  function retry() {
    setLoad({ status: 'loading' })
    setAttempt((value) => value + 1)
  }

  return (
    <FluentProvider theme={theme} className="app">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="app-header">
        <div className="brand"><span className="brand-icon"><BoardRegular /></span><span>Proposal Management Center</span></div>
        <div className="header-meta"><span className="header-description">From opportunity to submission</span><Badge appearance="outline">Phase 1 / Demo</Badge></div>
      </header>
      <div className="app-layout">
        <aside className="sidebar">
          <p className="nav-caption">PROPOSAL OPERATIONS</p>
          <nav aria-label="Primary navigation">
            <Button appearance="subtle" icon={<GridRegular />} className={`nav-item ${screen === 'dashboard' ? 'active' : ''}`} aria-current={screen === 'dashboard' ? 'page' : undefined} onClick={() => setScreen('dashboard')}>Opportunity dashboard</Button>
            <Button appearance="subtle" icon={<FolderRegular />} className={`nav-item ${screen === 'workspace' ? 'active' : ''}`} aria-current={screen === 'workspace' ? 'page' : undefined} onClick={() => setScreen('workspace')}>Proposal workspace <span className="nav-tag">Preview</span></Button>
            <div className="future-nav"><Button appearance="subtle" icon={<DocumentBulletListRegular />} className="nav-item" disabled>Requirements analysis</Button><span>Phase 3</span></div>
            <div className="future-nav"><Button appearance="subtle" icon={<ShieldCheckmarkRegular />} className="nav-item" disabled>Proposal governance</Button><span>Phase 4</span></div>
          </nav>
          <div className="sidebar-note">
            <span className="small-icon"><CheckmarkCircleRegular /></span>
            <h3>A connected process.<br />A focused beginning.</h3>
            <p>Explore opportunities and preview the workspace. Integrations arrive in later phases.</p>
            <Badge appearance="outline">Local data only</Badge>
          </div>
          <p className="sidebar-footer">Power Apps Code Apps<br /><span>Application foundation</span></p>
        </aside>
        <main id="main-content" tabIndex={-1}>
          <div className="page-heading">
            <div><p className="eyebrow">Proposal Management Center / {screen === 'dashboard' ? 'Overview' : 'Workspace'}</p><h1>{screen === 'dashboard' ? 'Opportunity dashboard' : 'Proposal workspace'}</h1><p className="page-description">{screen === 'dashboard' ? 'Start with the right opportunity. Build toward a winning proposal.' : 'A structured home for your next proposal. Preview what comes next.'}</p></div>
            <Badge appearance="tint">Application foundation</Badge>
          </div>
          <MessageBar className="demo-notice" intent="info">
            <MessageBarBody><MessageBarTitle>Demo environment.</MessageBarTitle> All opportunities are fictional. Dynamics 365 and backend services are not connected. Not production-ready or GCC High-compliant.</MessageBarBody>
          </MessageBar>

          {screen === 'dashboard' ? (
            <>
              <section className="journey" aria-label="Proposal lifecycle">
                <div className="journey-step current"><span className="step-number">01</span><div><strong>Select opportunity</strong><small>Available now</small></div></div>
                <div className="journey-step"><span className="step-number">02</span><div><strong>Create workspace</strong><small>Phase 2</small></div></div>
                <div className="journey-step"><span className="step-number">03</span><div><strong>Analyze requirements</strong><small>Phase 3</small></div></div>
                <div className="journey-step"><span className="step-number">04</span><div><strong>Govern &amp; review</strong><small>Phase 4</small></div></div>
              </section>
              <section className="panel selector-panel" aria-labelledby="selector-heading">
                <div className="section-heading"><div><p className="eyebrow">01 / Discover</p><h2 id="selector-heading">Choose your opportunity</h2></div><BuildingRegular className="section-icon" aria-hidden="true" /></div>
                <p className="muted">Review the customer, value, and timeline before planning a proposal workspace.</p>
                {load.status === 'loading' && <div className="loading-state" role="status"><Spinner size="small" label="Loading demo opportunities..." /></div>}
                {load.status === 'error' && <MessageBar intent="error"><MessageBarBody><MessageBarTitle>Unable to load opportunities.</MessageBarTitle>{load.message} <Button size="small" onClick={retry}>Retry</Button></MessageBarBody></MessageBar>}
                {load.status === 'ready' && opportunities.length === 0 && <MessageBar intent="warning"><MessageBarBody><MessageBarTitle>No demo opportunities available.</MessageBarTitle> Add fictional opportunities to the local data file, then retry. <Button size="small" onClick={retry}>Retry</Button></MessageBarBody></MessageBar>}
                <Field label="Dynamics 365 Opportunities (Demo Data)" validationState={selectionError ? 'error' : 'none'} validationMessage={selectionError} className="opportunity-field">
                  <Select value={selectedId} disabled={load.status !== 'ready' || opportunities.length === 0} onChange={(event) => {
                    const id = event.target.value
                    if (id && !opportunities.some((opportunity) => opportunity.id === id)) {
                      setSelectionError('Choose an opportunity from the demo list.')
                      setSelectedId('')
                      return
                    }
                    setSelectionError('')
                    setSelectedId(id)
                  }}>
                    <option value="">Select an opportunity</option>
                    {opportunities.map((opportunity) => <option key={opportunity.id} value={opportunity.id}>{opportunity.name} | {opportunity.customer}</option>)}
                  </Select>
                </Field>
                <p className="action-note">{load.status === 'ready' ? `${opportunities.length} fictional opportunities` : 'Local opportunity provider'} / No Dynamics 365 connection</p>
              </section>
              <div aria-live="polite" aria-atomic="true" className="selection-summary">{selected ? `Selected ${selected.name}, ${selected.customer}, owned by ${selected.owner}.` : 'No opportunity selected.'}</div>
              {selected ? <OpportunityDetails opportunity={selected} /> : <section className="panel empty-state"><BuildingRegular className="empty-icon" aria-hidden="true" /><h2>Your next proposal starts here</h2><p>Select a demo opportunity above to explore its details and prepare for workspace creation.</p></section>}
              <section className="panel next-step" aria-labelledby="next-heading">
                <div><p className="eyebrow">02 / Prepare</p><h2 id="next-heading">One opportunity. One organized workspace.</h2><p className="muted">A shared structure for intelligence, documents, compliance, and submission.</p><div className="status-line"><Badge appearance="outline">Not provisioned</Badge><span>No proposal record has been created.</span></div></div>
                <div className="next-actions"><Button appearance="primary" icon={<FolderRegular />} disabled>Create Proposal Workspace</Button><p className="action-note">Provisioning becomes available in Phase 2.</p><Button appearance="transparent" icon={<ArrowRightRegular />} iconPosition="after" onClick={() => setScreen('workspace')}>Explore workspace preview</Button></div>
              </section>
            </>
          ) : <WorkspacePreview opportunity={selected} />}
          <footer className="page-footer"><span>Proposal Management Center</span><span>Phase 1 foundation / No live integrations</span></footer>
        </main>
      </div>
    </FluentProvider>
  )
}

export default App
