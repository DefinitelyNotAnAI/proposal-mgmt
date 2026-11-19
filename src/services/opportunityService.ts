import type { Opportunity, OpportunityProvider } from '../types/opportunity'
import opportunities from '../data/opportunities.json' with { type: 'json' }

function isOpportunity(value: unknown): value is Opportunity {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  const textFields = ['id', 'name', 'customer', 'salesStage', 'owner'] as const
  if (!textFields.every((key) => typeof record[key] === 'string' && record[key].trim().length > 0)) {
    return false
  }
  const date = record.proposalDueDate
  return (
    typeof record.estimatedValue === 'number' &&
    Number.isFinite(record.estimatedValue) &&
    record.estimatedValue >= 0 &&
    typeof date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date
  )
}

export const opportunityProvider: OpportunityProvider = {
  async list(signal) {
    signal?.throwIfAborted()
    const data: unknown = opportunities
    if (!Array.isArray(data) || !data.every(isOpportunity)) {
      throw new Error('The local opportunity data is invalid. Check the demo data and try again.')
    }
    if (new Set(data.map((opportunity) => opportunity.id)).size !== data.length) {
      throw new Error('The local opportunity data contains duplicate opportunity IDs.')
    }
    return data.map((opportunity) => ({ ...opportunity }))
  },
}
