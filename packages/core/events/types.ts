export type CoreEvent =
  | 'artifact.created'
  | 'artifact.updated'
  | 'artifact.approved'
  | 'artifact.published'

export interface Event {
  id: string
  type: CoreEvent
  timestamp: Date
  actorId: string
  payload: any
}
