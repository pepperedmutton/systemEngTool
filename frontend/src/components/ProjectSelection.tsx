import type { Project } from '../types'

export default function ProjectSelection({
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
