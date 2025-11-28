import type { Project, Requirement, RequirementPayload } from '../types'

export type ProjectPageProps = {
  project: Project
  projects: Project[]
  selectedProjectId: string | null
  onSelectProject: (projectId: string) => void
  onBack: () => void
  onCreateRequirement: (projectId: string, payload: RequirementPayload) => Promise<Requirement>
}
