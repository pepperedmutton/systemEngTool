import {
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import MermaidChart from '../components/MermaidChart'
import {
  BOMPanel,
  determineCurrentPhase,
  DocumentPanel,
  IntegrationPanel,
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

const rpaProbeDiagram = `%%{init: { "flowchart": { "useMaxWidth": false, "nodeSpacing": 50, "rankSpacing": 80, "curve": "basis", "htmlLabels": true }, "themeVariables": { "fontSize": "20px" } } }%%
graph LR
    classDef usb stroke:#0075ff,stroke-width:2px,color:white,fill:#003f88;
    classDef hv stroke:#ff4d4d,stroke-width:2px,color:white,fill:#880000;
    classDef signal stroke:#00cc66,stroke-width:2px,color:white,fill:#004422;
    classDef box stroke:#666,stroke-width:2px,stroke-dasharray: 5 5,fill:none,color:#ccc;
    classDef iface stroke:#94a3b8,stroke-width:2px,color:#e2e8f0,fill:#0b1221;
    classDef mains stroke:#f59e0b,stroke-width:2px,color:#7c2d12,fill:#fef3c7;

    subgraph Host ["上位机层 (Host Layer)"]
        PC["上位机与自动化<br/>测量软件"]:::usb
    end

    subgraph Power ["供电层 (Power Layer)"]
        Mains["市电输入"]:::mains
    end

    subgraph Instruments ["实验仪器 (Instruments)"]
        ExtPS["外置高压扫描电源<br/>(实验仪器)"]:::hv
    end

      subgraph RPABox ["RPA 电控机箱 (RPA Control Box)"]
          direction TB
          BackIface["后端接口<br/>(USB / 市电)"]:::iface
          FrontIface["前端接口<br/>(RPA / 内部仪器)"]:::iface
          ExtCtrlIface["外部仪器控制接口"]:::iface
          GroundIface["接地接口"]:::iface
          BiasSource["屏蔽栅偏压源<br/>(机箱内)"]:::hv
          Ammeter["跨阻 / 电流计<br/>(机箱内)"]:::signal
      end
  
      subgraph Vacuum ["真空接口与探头 (Vacuum & Probe)"]
          Flange("穿舱法兰 & 舱内线束<br/>(Feedthrough)"):::box
          Probe("RPA 探头<br/>(四栅极 + 收集极)"):::signal
          VacuumChamber["真空舱体模块"]:::box
      end

    subgraph Motion ["运动控制 (Positioning)"]
        MotionCtrl["二维真空位移机构<br/>与控制台"]:::usb
    end

    PC == "USB 控制 / 测量回读（单线双向）" ==> BackIface
    Mains -- "市电 AC" --> BackIface

      BackIface -- "控制/供电" --> BiasSource
      BackIface -- "控制/供电" --> Ammeter
      BackIface -- "内部配线" --> FrontIface
      BackIface -- "内部配线" --> ExtCtrlIface
      ExtCtrlIface == "控制/联锁" ==> MotionCtrl
      ExtCtrlIface == "控制/联锁" ==> ExtPS
      BiasSource -- "屏蔽栅正极接地" --> GroundIface
  
      BiasSource -- "屏蔽栅偏压" --> FrontIface
      FrontIface -- "屏蔽栅偏压" --> Flange
      ExtPS -- "扫描偏压 V+/V-" --> Flange
      ExtPS -- "接地" --> VacuumChamber
      Flange -- "多路偏压输入" --> Probe
      GroundIface -- "接地" --> VacuumChamber
  
      Flange -- "收集极电流" --> FrontIface
      FrontIface -- "信号路由" --> Ammeter
      Ammeter -- "流量回读" --> BackIface

      ExtPS ~~~ RPABox
      RPABox ~~~ MotionCtrl
      
      linkStyle 0,2,3,4,5,6,7 stroke:#0075ff,stroke-width:2px;
  linkStyle 1 stroke:#f59e0b,stroke-width:2px;
  linkStyle 9,10,11,13 stroke:#ff4d4d,stroke-width:2px;
  linkStyle 8,12,14,15,16,17 stroke:#00cc66,stroke-width:2px;
`

function RpaProbePage({
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

  const currentPhase = useMemo(
    () => determineCurrentPhase(project, project.id.toLowerCase().includes('rpa')),
    [project],
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
    <div className="detail-shell project-page rpa-probe-page">
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
              <p className="eyebrow">系统图</p>
              <h3>RPA 探针链路（上位机 / 机箱 / 真空 / 运动）</h3>
              <p className="project-hero__lede">
                关注上位机、供电层、RPA 电控箱、真空接口与运动控制的完整路径，避免联锁遗漏。
              </p>
              <div className="page-pill">当前阶段：{currentPhase.toUpperCase()}</div>
              <DownloadLogButton projectId={project.id} />
            </div>
            <MermaidChart className="hero-chart" chartCode={rpaProbeDiagram} />
          </section>

          <ProjectOverview project={project} />

          <StageSection
            id="pdr"
            title="初步设计评审"
            description="确认探针方案、接口与性能预算具备可行性。"
            isCollapsed={false}
            onToggle={() => {}}
          >
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
          </StageSection>

          <StageSection
            id="cdr"
            title="关键设计评审"
            description="冻结关键设计项、需求与验证计划。"
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
            id="sir"
            title="系统集成评审"
            description="验证子系统接口、联调路径与安全措施。"
            isCollapsed={false}
            onToggle={() => {}}
          >
            <IntegrationPanel subsystems={project.subsystems} projectId={project.id} />
            <InterfacePanel subsystems={project.subsystems} interfaces={project.interfaces} />
          </StageSection>

          <StageSection
            id="orr"
            title="交付评审"
            description="聚焦交付件、物料与配置清单，确保可交付和可追溯。"
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

export default RpaProbePage
