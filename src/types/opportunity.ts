export interface Opportunity {
  id: string
  name: string
  customer: string
  estimatedValue: number
  salesStage: string
  owner: string
  proposalDueDate: string
}

export interface OpportunityProvider {
  list(signal?: AbortSignal): Promise<Opportunity[]>
}
