import { after } from 'next/server'
import { pushOpportunityToHub } from '@/lib/hub-sync'

// Call from a server action once a deal change has been saved. The push runs
// after the response is sent, so the rep never waits on Hub.
export function scheduleHubPush(opportunityId: string | null | undefined) {
  if (!opportunityId) return
  after(() => pushOpportunityToHub(opportunityId))
}
