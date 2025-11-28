import { useMemo } from 'react'
import MermaidChart from '../components/MermaidChart'
import {
  determineCurrentPhase,
  ProjectOverview,
  ProjectSideNav,
} from './common'
import { DownloadLogButton } from './common'
import type { ProjectPageProps } from './types'

const rpaPowerDiagram = `%%{init: { "flowchart": { "useMaxWidth": true, "nodeSpacing": 70, "rankSpacing": 90, "curve": "basis", "htmlLabels": true }, "themeVariables": { "fontSize": "22px" } } }%%
graph TD
    RPAPower["RPA 电源<br/>(PDR: 架构草案)"]:::core
    HostLink["上位机通信"]:::iface
    BiasLink["RPA 偏压"]:::hv
    GroundLink["接地"]:::ground
    PowerLink["自身供电"]:::power

    RPAPower --> HostLink
    RPAPower --> BiasLink
    RPAPower --> GroundLink
    RPAPower --> PowerLink

    classDef core stroke:#38bdf8,stroke-width:3px,fill:#0b1221,color:#e2e8f0,font-size:22px;
    classDef iface stroke:#94a3b8,stroke-width:2px,fill:#0b1221,color:#e2e8f0;
    classDef hv stroke:#ff4d4d,stroke-width:2px,fill:#1d0a0a,color:#ffe4e6;
    classDef ground stroke:#00cc66,stroke-width:2px,fill:#0b2d1c,color:#d1fae5;
    classDef power stroke:#f59e0b,stroke-width:2px,fill:#3b2500,color:#fde68a;
`

function RpaPowerPage({
  project,
  projects,
  selectedProjectId,
  onSelectProject,
  onBack,
}: ProjectPageProps) {
  const currentPhase = useMemo(
    () => determineCurrentPhase(project, false),
    [project.lifecycleState, project.missionPhase],
  )

  const groupedRequirements = useMemo(() => {
    const buckets: Record<string, typeof project.requirements> = {
      通信接口: [],
      偏压输出: [],
      供电接口: [],
      接地与屏蔽: [],
      未标注子系统: [],
    }
    for (const req of project.requirements) {
      const owner = req.owner && buckets[req.owner] !== undefined ? req.owner : '未标注子系统'
      buckets[owner].push(req)
    }
    return [
      { title: '通信接口', items: buckets['通信接口'] },
      { title: '偏压输出', items: buckets['偏压输出'] },
      { title: '供电接口', items: buckets['供电接口'] },
      { title: '接地与屏蔽', items: buckets['接地与屏蔽'] },
      { title: '未标注子系统', items: buckets['未标注子系统'] },
    ].filter((group) => group.items.length > 0)
  }, [project.requirements])

  return (
    <div className="detail-shell project-page rpa-power-page">
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

          <section className="mermaid-panel project-hero">
            <div className="project-hero__header">
              <p className="eyebrow">高压链路</p>
              <h3>RPA 电源 · PDR 系统图</h3>
              <p className="project-hero__lede">当前仅提供顶层系统图，其余内容尚未开展。</p>
              <div className="page-pill">阶段：{currentPhase.toUpperCase()}</div>
              <DownloadLogButton projectId={project.id} />
            </div>
            <MermaidChart className="hero-chart" chartCode={rpaPowerDiagram} />
          </section>

          <ProjectOverview project={project} />
          <section className="requirements bullet-requirements">
            <header>
              <p className="eyebrow">需求列表</p>
            </header>
            {groupedRequirements.map((group) => (
              <div key={group.title} className="bullet-group">
                <p className="bullet-group__title">{group.title}</p>
                <ul>
                  {group.items.map((req) => (
                    <li key={req.id}>
                      <strong>{req.id}</strong> · {req.title}：{req.statement}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {groupedRequirements.length === 0 && (
              <ul>
                <li className="muted">暂无需求。</li>
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default RpaPowerPage
