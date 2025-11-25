import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import './App.css'
import { createRequirement, fetchProjects } from './api'
import type {
  BillOfMaterialItem,
  DocumentSection,
  Project,
  Requirement,
  RequirementPayload,
} from './types'

const verificationOptions = ['Analysis', 'Inspection', 'Test', 'Demonstration']
const priorityOptions = ['High', 'Medium', 'Low']
const statusOptions = ['Proposed', 'Draft', 'Baseline']
const scopeOptions: Array<{ value: Requirement['scope']; label: string }> = [
  { value: 'system', label: '系统级要求' },
  { value: 'subsystem', label: '子系统要求' },
]

const statusLabels: Record<string, string> = {
  Proposed: '建议',
  Draft: '设计中',
  Baseline: '已冻结',
}

const priorityLabels: Record<string, string> = {
  High: '高',
  Medium: '中',
  Low: '低',
}

const verificationLabels: Record<string, string> = {
  Analysis: '分析',
  Inspection: '检视',
  Test: '测试',
  Demonstration: '演示',
}

const POLL_INTERVAL_MS = 5000

const requirementDefaults: RequirementPayload = {
  title: '',
  statement: '',
  rationale: '',
  verificationMethod: verificationOptions[0],
  status: statusOptions[0],
  owner: '',
  priority: priorityOptions[1],
  scope: 'system',
}

function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requirementForm, setRequirementForm] =
    useState<RequirementPayload>(requirementDefaults)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const initialLoadRef = useRef(true)

  useEffect(() => {
    let isMounted = true
    let intervalId: ReturnType<typeof setInterval> | null = null

    const loadProjects = async () => {
      try {
        if (initialLoadRef.current) {
          setIsLoading(true)
        }
        const data = await fetchProjects()
        if (!isMounted) return
        setProjects(data)
        setSelectedProjectId((current) => {
          if (!current) return current
          return data.some((project) => project.id === current) ? current : null
        })
      } catch (err) {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : '无法加载项目数据')
      } finally {
        if (isMounted) {
          setIsLoading(false)
          initialLoadRef.current = false
        }
      }
    }

    loadProjects()
    intervalId = setInterval(loadProjects, POLL_INTERVAL_MS)

    return () => {
      isMounted = false
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelectProject = (projectId: string | null) => {
    setSelectedProjectId(projectId)
    setRequirementForm(requirementDefaults)
    setFormError(null)
    setSuccessMessage(null)
  }

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )

  const systemRequirements = useMemo(
    () => selectedProject?.requirements.filter((item) => item.scope === 'system') ?? [],
    [selectedProject],
  )
  const subsystemRequirements = useMemo(
    () =>
      selectedProject?.requirements.filter((item) => item.scope === 'subsystem') ?? [],
    [selectedProject],
  )

  const handleRequirementSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    if (!selectedProject) {
      setFormError('请先选择一个项目')
      return
    }

    if (!requirementForm.title.trim() || !requirementForm.statement.trim()) {
      setFormError('标题和需求描述不能为空')
      return
    }

    try {
      setIsSaving(true)
      const payload = {
        ...requirementForm,
        title: requirementForm.title.trim(),
        statement: requirementForm.statement.trim(),
        rationale: requirementForm.rationale.trim(),
        owner: requirementForm.owner.trim(),
      }
      const created = await createRequirement(selectedProject.id, payload)
      const updateProject = (project: Project): Project => {
        if (project.id !== selectedProject.id) return project
        const requirements = [...project.requirements, created]
        return {
          ...project,
          requirements,
          lastUpdated: new Date().toISOString(),
        }
      }
      setProjects((current) => current.map(updateProject))
      setRequirementForm(requirementDefaults)
      setSuccessMessage('新增需求已保存')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRequirementChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target
    setRequirementForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  if (isLoading) {
    return (
      <div className="selection-shell">
        <header className="selection-header">
          <h1>等离子体探针系统工程工作台</h1>
          <p>正在加载项目...</p>
        </header>
      </div>
    )
  }

  if (error) {
    return (
      <div className="selection-shell">
        <header className="selection-header">
          <h1>等离子体探针系统工程工作台</h1>
          <p className="error">{error}</p>
        </header>
      </div>
    )
  }

  if (!selectedProject) {
    return (
      <ProjectSelection
        projects={projects}
        onSelect={(id) => handleSelectProject(id)}
      />
    )
  }

  return (
    <ProjectDetail
      project={selectedProject}
      projects={projects}
      selectedProjectId={selectedProjectId}
      onSelectProject={(id) => handleSelectProject(id)}
      onBack={() => {
        handleSelectProject(null)
      }}
      systemRequirements={systemRequirements}
      subsystemRequirements={subsystemRequirements}
      requirementForm={requirementForm}
      onRequirementChange={handleRequirementChange}
      onRequirementSubmit={handleRequirementSubmit}
      formError={formError}
      successMessage={successMessage}
      isSaving={isSaving}
    />
  )
}

function DocumentPanel({
  title,
  description,
  sections,
}: {
  title: string
  description: string
  sections: DocumentSection[]
}) {
  return (
    <article className="document-panel">
      <header>
        <p className="eyebrow">{title}</p>
        <p className="document-description">{description}</p>
      </header>
      <DocumentSectionTree sections={sections} />
    </article>
  )
}

function DocumentSectionTree({ sections }: { sections: DocumentSection[] }) {
  if (sections.length === 0) {
    return <p className="muted">暂未定义内容。</p>
  }

  return (
    <div className="document-tree">
      {sections.map((section) => (
        <div key={section.id} className="document-node">
          <div className="document-node__content">
            <h4>{section.title}</h4>
            <p>{section.summary}</p>
            {section.activities.length > 0 && (
              <ul>
                {section.activities.map((activity) => (
                  <li key={activity}>{activity}</li>
                ))}
              </ul>
            )}
          </div>
          {section.subSections.length > 0 && (
            <div className="document-node__children">
              <DocumentSectionTree sections={section.subSections} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function RequirementPanel({
  systemRequirements,
  subsystemRequirements,
  formState,
  onChange,
  onSubmit,
  formError,
  successMessage,
  isSaving,
}: {
  systemRequirements: Requirement[]
  subsystemRequirements: Requirement[]
  formState: RequirementPayload
  onChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  formError: string | null
  successMessage: string | null
  isSaving: boolean
}) {
  return (
    <section className="requirements">
      <div className="requirements__header">
        <div>
          <p className="eyebrow">系统与子系统需求</p>
          <p className="document-description">
            通过需求确保探针/后电路组合满足客户验收、制造约束与验证策略。
          </p>
        </div>
      </div>

      <div className="requirements__content">
        <div className="requirements__lists">
          <RequirementList title="系统级" requirements={systemRequirements} />
          <RequirementList title="子系统级" requirements={subsystemRequirements} />
        </div>

        <form className="requirement-form" onSubmit={onSubmit}>
          <h3>新增需求</h3>
          <label>
            范畴
            <select name="scope" value={formState.scope} onChange={onChange}>
              {scopeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            标题
            <input
              name="title"
              value={formState.title}
              onChange={onChange}
              placeholder="例如：接口兼容性"
              required
            />
          </label>
          <label>
            需求描述
            <textarea
              name="statement"
              rows={3}
              value={formState.statement}
              onChange={onChange}
              placeholder="说明该系统/子系统必须达到的性能或边界。"
              required
            />
          </label>
          <label>
            设计理由
            <textarea
              name="rationale"
              rows={2}
              value={formState.rationale}
              onChange={onChange}
              placeholder="关联客户合同、测试结果或风险。"
            />
          </label>
          <label>
            责任人/团队
            <input
              name="owner"
              value={formState.owner}
              onChange={onChange}
              placeholder="例如：后端电路、装配工程"
            />
          </label>

          <div className="form-grid">
            <label>
              验证方式
              <select
                name="verificationMethod"
                value={formState.verificationMethod}
                onChange={onChange}
              >
                {verificationOptions.map((option) => (
                  <option key={option} value={option}>
                    {verificationLabels[option] ?? option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              优先级
              <select name="priority" value={formState.priority} onChange={onChange}>
                {priorityOptions.map((option) => (
                  <option key={option} value={option}>
                    {priorityLabels[option] ?? option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              状态
              <select name="status" value={formState.status} onChange={onChange}>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {statusLabels[option] ?? option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {formError && <p className="error">{formError}</p>}
          {successMessage && <p className="success">{successMessage}</p>}

          <button type="submit" disabled={isSaving}>
            {isSaving ? '保存中...' : '保存需求'}
          </button>
        </form>
      </div>
    </section>
  )
}

function RequirementList({ title, requirements }: { title: string; requirements: Requirement[] }) {
  return (
    <div className="requirement-list">
      <h3 className="eyebrow">{title}</h3>
      {requirements.map((requirement) => (
        <div key={requirement.id} className="requirement-card">
          <div className="requirement-card__header">
            <h4>
              {requirement.id} · {requirement.title}
            </h4>
            <span className={`pill pill--${requirement.status.toLowerCase()}`}>
              {statusLabels[requirement.status] ?? requirement.status}
            </span>
          </div>
          <p>{requirement.statement}</p>
          <p className="muted">{requirement.rationale}</p>
          <div className="requirement-card__footer">
            <span>责任：{requirement.owner || '未指派'}</span>
            <span>
              验证：{verificationLabels[requirement.verificationMethod] ?? requirement.verificationMethod}
            </span>
            <span>优先级：{priorityLabels[requirement.priority] ?? requirement.priority}</span>
          </div>
        </div>
      ))}
      {requirements.length === 0 && <p className="muted">暂无记录。</p>}
    </div>
  )
}

function BOMPanel({ bom }: { bom: BillOfMaterialItem[] }) {
  return (
    <section className="bom-panel">
      <header>
        <p className="eyebrow">物料清单（BOM）</p>
        <p className="document-description">
          用于采购、生产准备的关键物料与供应商信息。
        </p>
      </header>
      {bom.length === 0 ? (
        <p className="muted">暂未录入 BOM。</p>
      ) : (
        <div className="bom-table-wrapper">
          <table className="bom-table">
            <thead>
              <tr>
                <th>料号</th>
                <th>名称</th>
                <th>描述</th>
                <th>数量</th>
                <th>供应商</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              {bom.map((item) => (
                <tr key={item.partNumber}>
                  <td>{item.partNumber}</td>
                  <td>{item.name}</td>
                  <td>{item.description}</td>
                  <td>
                    {item.quantity} {item.unit}
                  </td>
                  <td>{item.supplier}</td>
                  <td>{item.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function InterfacePanel({
  subsystems,
  interfaces,
}: {
  subsystems: string[]
  interfaces: {
    id: string
    fromSubsystem: string
    toSubsystem: string
    type: string
    description: string
  }[]
}) {
  return (
    <section className="interfaces-panel">
      <header>
        <p className="eyebrow">子系统与接口</p>
        <p className="document-description">机箱内部仪器以及与外部系统的接口定义。</p>
      </header>
      <div className="interfaces-content">
        <div className="subsystem-list">
          <h3 className="eyebrow">子系统</h3>
          <ul>
            {subsystems.map((item) => (
              <li key={item}>{item}</li>
            ))}
            {subsystems.length === 0 && <li className="muted">暂无子系统记录。</li>}
          </ul>
        </div>
        <div className="interface-table-wrapper">
          {interfaces.length === 0 ? (
            <p className="muted">尚未定义接口。</p>
          ) : (
            <table className="interface-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>来源</th>
                  <th>目标</th>
                  <th>类型</th>
                  <th>描述</th>
                </tr>
              </thead>
              <tbody>
                {interfaces.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.fromSubsystem}</td>
                    <td>{item.toSubsystem}</td>
                    <td>{item.type}</td>
                    <td>{item.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  )
}

function ProjectSelection({
  projects,
  onSelect,
}: {
  projects: Project[]
  onSelect: (projectId: string) => void
}) {
  return (
    <div className="selection-shell">
      <header className="selection-header">
        <p className="eyebrow">定制等离子体探针 · 系统工程设计阶段</p>
        <h1>请选择一个项目</h1>
        <p className="lede">AI 管线已同步以下项目，点击任意项目进入详情。</p>
      </header>
      <div className="project-selection-grid">
        {projects.map((project) => (
          <button key={project.id} className="selection-card" onClick={() => onSelect(project.id)}>
            <div className="selection-card__meta">
              <span>{project.missionPhase}</span>
              <span>{project.lifecycleState}</span>
            </div>
            <h3>{project.name}</h3>
            <p>{project.summary}</p>
            <div className="tag-row">
              {project.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          </button>
        ))}
        {projects.length === 0 && <p className="muted">暂无项目，请等待 AI 同步。</p>}
      </div>
    </div>
  )
}

function ProjectDetail({
  project,
  projects,
  selectedProjectId,
  onSelectProject,
  onBack,
  systemRequirements,
  subsystemRequirements,
  requirementForm,
  onRequirementChange,
  onRequirementSubmit,
  formError,
  successMessage,
  isSaving,
}: {
  project: Project
  onBack: () => void
  systemRequirements: Requirement[]
  subsystemRequirements: Requirement[]
  requirementForm: RequirementPayload
  onRequirementChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void
  onRequirementSubmit: (event: FormEvent<HTMLFormElement>) => void
  formError: string | null
  successMessage: string | null
  isSaving: boolean
  projects: Project[]
  selectedProjectId: string | null
  onSelectProject: (projectId: string) => void
}) {
  const [collapsedStages, setCollapsedStages] = useState<Record<string, boolean>>({})
  const skipEarlyStages = project.id.toLowerCase().includes('rpa')

  useEffect(() => {
    setCollapsedStages({})
  }, [project.id])

  const toggleStage = (stageId: string) => {
    setCollapsedStages((current) => ({
      ...current,
      [stageId]: !current[stageId],
    }))
  }

  const progressLabel = skipEarlyStages
    ? '系统集成评审'
    : project.missionPhase || project.lifecycleState

  return (
    <div className="detail-shell">
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
          <header className="project-details__header">
            <div>
              <p className="eyebrow">设计概览</p>
              <h2>{project.name}</h2>
              <p className="lede">{project.summary}</p>
            </div>
            <div className="project-details__meta">
              <div>
                <p className="meta-label">工作进度</p>
                <p>{progressLabel}</p>
              </div>
              <div>
                <p className="meta-label">上次更新</p>
                <p>{new Date(project.lastUpdated).toLocaleString()}</p>
              </div>
            </div>
            <div className="tag-row">
              {project.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          </header>

          <StageSection
            id="pdr"
            title="初步设计评审"
            description="确认探针方案、接口与性能预算具备可行性。"
            isCollapsed={!!collapsedStages.pdr}
            onToggle={() => toggleStage('pdr')}
          >
            {skipEarlyStages ? (
              <EmptyStageHint text="RPA 项目跳过初步设计阶段，此处留空。" />
            ) : (
              <div className="doc-grid">
                <DocumentPanel
                  title="功能分解"
                  sections={project.functionalDecomposition}
                  description="面向客户需求拆解测量、偏压、健康监控等功能。"
                />
                <DocumentPanel
                  title="物理分解"
                  sections={project.physicalDecomposition}
                  description="将功能落实到探针前端、后电路、结构件等实体。"
                />
              </div>
            )}
          </StageSection>

          <StageSection
            id="cdr"
            title="关键设计评审"
            description="冻结关键设计项、需求与验证计划。"
            isCollapsed={!!collapsedStages.cdr}
            onToggle={() => toggleStage('cdr')}
          >
            {skipEarlyStages ? (
              <EmptyStageHint text="RPA 项目跳过关键设计评审，此处留空。" />
            ) : (
              <>
                <RequirementPanel
                  systemRequirements={systemRequirements}
                  subsystemRequirements={subsystemRequirements}
                  formState={requirementForm}
                  onChange={onRequirementChange}
                  onSubmit={onRequirementSubmit}
                  formError={formError}
                  successMessage={successMessage}
                  isSaving={isSaving}
                />
                <InterfacePanel subsystems={project.subsystems} interfaces={project.interfaces} />
              </>
            )}
          </StageSection>

          <StageSection
            id="sir"
            title="系统集成评审"
            description="验证子系统接口、联调路径与安全措施。"
            isCollapsed={!!collapsedStages.sir}
            onToggle={() => toggleStage('sir')}
          >
            {skipEarlyStages ? (
              <InterfacePanel subsystems={project.subsystems} interfaces={project.interfaces} />
            ) : (
              <IntegrationPanel subsystems={project.subsystems} />
            )}
          </StageSection>

          <StageSection
            id="orr"
            title="交付评审"
            description="聚焦交付件、物料与配置清单，确保可交付和可追溯。"
            isCollapsed={!!collapsedStages.orr}
            onToggle={() => toggleStage('orr')}
          >
            <BOMPanel bom={project.bom} />
          </StageSection>
        </div>
      </div>
    </div>
  )
}

export default App

function ProjectSideNav({
  projects,
  currentProjectId,
  onSelect,
}: {
  projects: Project[]
  currentProjectId: string | null
  onSelect: (projectId: string) => void
}) {
  return (
    <aside className="side-nav">
      <div className="side-nav__header">
        <p className="eyebrow">项目导航</p>
        <h3>全部项目</h3>
      </div>
      <div className="side-nav__list">
        {projects.map((project) => {
          const isActive = project.id === currentProjectId
          return (
            <button
              key={project.id}
              className={`side-nav__item ${isActive ? 'is-active' : ''}`}
              onClick={() => onSelect(project.id)}
              aria-current={isActive ? 'true' : 'false'}
            >
              <span className="side-nav__title">{project.name}</span>
              <span className="side-nav__meta">
                {project.missionPhase} · {project.lifecycleState}
              </span>
            </button>
          )
        })}
        {projects.length === 0 && <p className="muted">暂无项目。</p>}
      </div>
    </aside>
  )
}

function StageSection({
  id,
  title,
  description,
  isCollapsed,
  onToggle,
  children,
}: {
  id: string
  title: string
  description: string
  isCollapsed: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <section className="stage-section" id={id}>
      <header className="stage-header">
        <div>
          <p className="eyebrow">{title}</p>
          <p className="stage-description">{description}</p>
        </div>
        <button className="collapse-button" onClick={onToggle} aria-expanded={!isCollapsed}>
          {isCollapsed ? '展开' : '折叠'}
        </button>
      </header>
      {!isCollapsed && <div className="stage-body">{children}</div>}
    </section>
  )
}

function EmptyStageHint({ text }: { text: string }) {
  return <p className="muted">{text}</p>
}

function IntegrationPanel({ subsystems }: { subsystems: string[] }) {
  return (
    <div className="integration-panel">
      <p className="document-description">
        联调检查与工装/安全准备。当前仅列出子系统，可在此补充集成检查项与状态。
      </p>
      <div className="subsystem-list">
        <h3 className="eyebrow">子系统清单</h3>
        <ul>
          {subsystems.map((item) => (
            <li key={item}>{item}</li>
          ))}
          {subsystems.length === 0 && <li className="muted">暂无子系统记录。</li>}
        </ul>
      </div>
    </div>
  )
}
