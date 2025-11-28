import {
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import {
  BOMPanel,
  DocumentPanel,
  InterfacePanel,
  ProjectOverview,
  ProjectSideNav,
  RequirementPanel,
  requirementDefaults,
  StageSection,
} from './common'
import { DownloadLogButton } from './common'
import type { ProjectPageProps } from './types'
import type { RequirementPayload } from '../types'

function GenericProjectPage({
  project,
  projects,
  selectedProjectId,
  onSelectProject,
  onBack,
  onCreateRequirement,
}: ProjectPageProps) {
  const [formState, setFormState] = useState<RequirementPayload>(requirementDefaults)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const systemRequirements = useMemo(
    () => project.requirements.filter((item) => item.scope === 'system'),
    [project.requirements],
  )
  const subsystemRequirements = useMemo(
    () => project.requirements.filter((item) => item.scope === 'subsystem'),
    [project.requirements],
  )

  const handleRequirementChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target
    setFormState((current: RequirementPayload) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleRequirementSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    if (!formState.title.trim() || !formState.statement.trim()) {
      setFormError('标题和需求描述不能为空')
      return
    }

    try {
      setIsSaving(true)
      const payload: RequirementPayload = {
        ...formState,
        title: formState.title.trim(),
        statement: formState.statement.trim(),
        rationale: formState.rationale.trim(),
        owner: formState.owner.trim(),
      }
      await onCreateRequirement(project.id, payload)
      setFormState(requirementDefaults)
      setSuccessMessage('新增需求已保存')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="detail-shell project-page generic-project-page">
      <div className="detail-layout">
        <ProjectSideNav
          projects={projects}
          currentProjectId={selectedProjectId}
          onSelect={onSelectProject}
        />
        <div className="detail-main">
          <button className="back-button" onClick={onBack}>
            ← 返回项目列表
          </button>

          <section className="mermaid-panel project-hero generic-hero">
            <div className="project-hero__header">
              <p className="eyebrow">项目概览</p>
              <h3>{project.name}</h3>
              <p className="project-hero__lede">
                该项目尚未定义专属系统图。可按需添加新的 Mermaid 代码或保持纯数据视图。
              </p>
              <DownloadLogButton projectId={project.id} />
            </div>
            <div className="mermaid-placeholder">
              <p>独立页面，不与其他项目共用图形/资源。</p>
              <p>在数据文件 {project.id}.json 中填充分解/接口，即可在此呈现。</p>
            </div>
          </section>

          <ProjectOverview project={project} />

          <StageSection
            id="design"
            title="设计资料"
            description="功能与物理分解、早期设计稿。"
            isCollapsed={false}
            onToggle={() => {}}
          >
            <div className="doc-grid">
              <DocumentPanel
                title="功能分解"
                sections={project.functionalDecomposition}
                description="梳理系统功能与活动。"
              />
              <DocumentPanel
                title="物理分解"
                sections={project.physicalDecomposition}
                description="拆解为硬件/软件/接口等物理元素。"
              />
            </div>
          </StageSection>

          <StageSection
            id="requirements"
            title="需求与接口"
            description="维护需求列表与接口定义。"
            isCollapsed={false}
            onToggle={() => {}}
          >
            <RequirementPanel
              systemRequirements={systemRequirements}
              subsystemRequirements={subsystemRequirements}
              formState={formState}
              onChange={handleRequirementChange}
              onSubmit={handleRequirementSubmit}
              formError={formError}
              successMessage={successMessage}
              isSaving={isSaving}
            />
            <InterfacePanel subsystems={project.subsystems} interfaces={project.interfaces} />
          </StageSection>

          <StageSection
            id="delivery"
            title="交付物与 BOM"
            description="项目专属物料与交付件，独立于其他项目。"
            isCollapsed={false}
            onToggle={() => {}}
          >
            <BOMPanel bom={project.bom} />
          </StageSection>
        </div>
      </div>
    </div>
  )
}

export default GenericProjectPage
