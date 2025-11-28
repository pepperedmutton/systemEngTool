import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import { API_BASE_URL } from '../api'
import type {
  BillOfMaterialItem,
  DocumentSection,
  Project,
  Requirement,
  RequirementPayload,
} from '../types'

export const verificationOptions = ['Analysis', 'Inspection', 'Test', 'Demonstration']
export const priorityOptions = ['High', 'Medium', 'Low']
export const statusOptions = ['Proposed', 'Draft', 'Baseline']
export const scopeOptions: Array<{ value: Requirement['scope']; label: string }> = [
  { value: 'system', label: '系统级要求' },
  { value: 'subsystem', label: '子系统要求' },
]

export const statusLabels: Record<string, string> = {
  Proposed: '建议',
  Draft: '设计中',
  Baseline: '已冻结',
}

export const priorityLabels: Record<string, string> = {
  High: '高',
  Medium: '中',
  Low: '低',
}

export const verificationLabels: Record<string, string> = {
  Analysis: '分析',
  Inspection: '检视',
  Test: '测试',
  Demonstration: '演示',
}

export const requirementDefaults: RequirementPayload = {
  title: '',
  statement: '',
  rationale: '',
  verificationMethod: verificationOptions[0],
  status: statusOptions[0],
  owner: '',
  priority: priorityOptions[1],
  scope: 'system',
}

export function determineCurrentPhase(project: Project, skipEarlyStages: boolean) {
  if (skipEarlyStages) return 'sir' as const

  const lifecycle = project.lifecycleState.toLowerCase()
  const mission = project.missionPhase.toLowerCase()
  const combined = `${lifecycle} ${mission}`

  if (combined.includes('交付') || combined.includes('orr')) return 'orr' as const
  if (combined.includes('验证') || combined.includes('集成') || combined.includes('sir'))
    return 'sir' as const
  if (combined.includes('关键') || combined.includes('cdr') || combined.includes('冻结'))
    return 'cdr' as const

  return 'pdr' as const
}

export function DocumentPanel({
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

export function DocumentSectionTree({ sections }: { sections: DocumentSection[] }) {
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

export function RequirementPanel({
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
            通过需求确保设计满足验收、制造约束与验证策略（每个项目独立维护）。
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

export function RequirementList({ title, requirements }: { title: string; requirements: Requirement[] }) {
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

export function BOMPanel({ bom }: { bom: BillOfMaterialItem[] }) {
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

export function InterfacePanel({
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

export function ProjectSideNav({
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

export function StageSection({
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

export function IntegrationPanel({ subsystems, projectId }: { subsystems: string[]; projectId: string }) {
  const isRpaProbe = projectId?.toLowerCase().includes('rpa-probe')
  return (
    <div className="integration-panel">
      <p className="document-description">
        联调检查与工装/安全准备。当前仅列出子系统，可在此补充集成检查项与状态。
      </p>
      {isRpaProbe && (
        <div className="integration-card">
          <h3 className="eyebrow">任务与运行概念（RPA 探针扫描采样）</h3>
          <ol>
            <li>设定扫描区间与精度：在上位机配置起止电压、步进/分辨率、采样延时。</li>
            <li>循环执行每个偏压点：向扫描电源发送电压设置指令。</li>
            <li>等待 50 ms，确保高压输出稳定并减小瞬态对测量的影响。</li>
            <li>读取电流计测得的收集极电流。</li>
            <li>将偏压设定值与回读电流组成一对 I-V 数据，写入采样序列。</li>
            <li>完成全区间扫描后，在软件中输出完整 I-V 曲线，用于后续分析/存档。</li>
          </ol>
        </div>
      )}
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

export function DownloadLogButton({ projectId }: { projectId: string }) {
  const base = API_BASE_URL || ''
  const url = `${base}/projects/${projectId}/log`
  return (
    <a className="download-log" href={url} download>
      下载项目变更记录 (txt)
    </a>
  )
}

export function ProjectOverview({ project }: { project: Project }) {
  const progressLabel = project.missionPhase || project.lifecycleState
  return (
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
  )
}

export function HighlightCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="hv-card">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
