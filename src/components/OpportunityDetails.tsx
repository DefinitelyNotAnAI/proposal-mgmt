import { Badge } from '@fluentui/react-components'
import type { Opportunity } from '../types/opportunity'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})
const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' })

export function OpportunityDetails({ opportunity }: { opportunity: Opportunity }) {
  return (
    <section className="panel" aria-labelledby="opportunity-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{opportunity.id}</p>
          <h2 id="opportunity-heading">{opportunity.name}</h2>
          <p className="muted">{opportunity.customer}</p>
        </div>
        <Badge appearance="tint">{opportunity.salesStage}</Badge>
      </div>
      <dl className="detail-grid">
        <div><dt>Estimated contract value</dt><dd className="value">{currency.format(opportunity.estimatedValue)}</dd></div>
        <div><dt>Proposal due date</dt><dd>{date.format(new Date(`${opportunity.proposalDueDate}T00:00:00Z`))}</dd></div>
        <div><dt>Opportunity owner</dt><dd>{opportunity.owner}</dd></div>
        <div><dt>Opportunity source</dt><dd>Local demo data <span className="muted">(fictional)</span></dd></div>
      </dl>
    </section>
  )
}
