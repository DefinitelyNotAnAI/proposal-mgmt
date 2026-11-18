import type { Opportunity, OpportunityProvider } from '../types/opportunity'

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
    const response = await fetch(new URL('../data/opportunities.json', import.meta.url), { signal })
    if (!response.ok) throw new Error(`Opportunity data could not be loaded (HTTP ${response.status}).`)
    const data: unknown = await response.json()
    if (!Array.isArray(data) || !data.every(isOpportunity)) {
      throw new Error('The local opportunity data is invalid. Check the demo data and try again.')
    }
    if (new Set(data.map((opportunity) => opportunity.id)).size !== data.length) {
      throw new Error('The local opportunity data contains duplicate opportunity IDs.')
    }
    return data
  },
}
