export interface DocumentSection {
  id: string
  title: string
  summary: string
  activities: string[]
  subSections: DocumentSection[]
}

export interface Requirement {
  id: string
  title: string
  statement: string
  rationale: string
  verificationMethod: string
  status: string
  owner: string
  priority: string
  scope: 'system' | 'subsystem'
}

export interface Project {
  id: string
  name: string
  missionPhase: string
  lifecycleState: string
  sponsor: string
  summary: string
  lastUpdated: string
  tags: string[]
  functionalDecomposition: DocumentSection[]
  physicalDecomposition: DocumentSection[]
  requirements: Requirement[]
  bom: BillOfMaterialItem[]
  subsystems: string[]
  interfaces: InterfaceDefinition[]
}

export interface RequirementPayload {
  title: string
  statement: string
  rationale: string
  verificationMethod: string
  status: string
  owner: string
  priority: string
  scope: 'system' | 'subsystem'
}

export interface BillOfMaterialItem {
  partNumber: string
  name: string
  description: string
  quantity: number
  unit: string
  supplier: string
  notes: string
}

export interface InterfaceDefinition {
  id: string
  fromSubsystem: string
  toSubsystem: string
  type: string
  description: string
}
