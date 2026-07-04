export type ArtifactType =
  | 'landing'
  | 'email'
  | 'campaign'
  | 'asset'

export type ArtifactStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'published'

export interface Artifact {
  id: string
  type: ArtifactType
  status: ArtifactStatus
  title: string
  content: unknown
  version: number
  createdAt: Date
  updatedAt: Date
  createdBy: string
}
