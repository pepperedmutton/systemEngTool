import type { FC } from 'react'

type Anchor = 'left' | 'right' | 'top' | 'bottom'

type DiagramNode = {
  id: string
  label: string[]
  x: number
  y: number
  width: number
  height: number
}

type DiagramEdge = {
  id: string
  from: string
  to: string
  label: string
  fromAnchor?: Anchor
  toAnchor?: Anchor
  labelOffsetX?: number
  labelOffsetY?: number
  midX?: number
  midY?: number
}

const nodes: DiagramNode[] = [
  {
    id: 'hv-scan',
    label: ['外置高压扫描电源', '（提供偏压）'],
    x: 60,
    y: 80,
    width: 250,
    height: 80,
  },
  {
    id: 'psu',
    label: ['24 V 开关电源'],
    x: 60,
    y: 240,
    width: 250,
    height: 80,
  },
  {
    id: 'control',
    label: ['机箱接口/控制面板'],
    x: 330,
    y: 120,
    width: 360,
    height: 90,
  },
  {
    id: 'feedthrough',
    label: ['穿舱法兰与舱内线束'],
    x: 780,
    y: 210,
    width: 240,
    height: 80,
  },
  {
    id: 'probe',
    label: ['RPA探头', '（四栅极 + 收集极）'],
    x: 1150,
    y: 210,
    width: 220,
    height: 90,
  },
  {
    id: 'tia',
    label: ['跨阻/电流计', '（机箱内）'],
    x: 360,
    y: 240,
    width: 300,
    height: 70,
  },
  {
    id: 'screen-bias',
    label: ['屏蔽栅偏压源', '（机箱内）'],
    x: 360,
    y: 330,
    width: 300,
    height: 70,
  },
  {
    id: 'host',
    label: ['上位机与自动化', '测量软件'],
    x: 40,
    y: 430,
    width: 220,
    height: 90,
  },
  {
    id: 'stage',
    label: ['二维真空位移机构', '与控制台'],
    x: 440,
    y: 560,
    width: 260,
    height: 80,
  },
]

const chassisBox = {
  x: 320,
  y: 80,
  width: 420,
  height: 360,
  label: 'RPA 探针电控机箱（集成电流计 + 栅偏压源）',
}

const edges: DiagramEdge[] = [
  {
    id: 'hv-to-feedthrough',
    from: 'hv-scan',
    to: 'feedthrough',
    label: '扫描偏压 V+/V-',
    toAnchor: 'top',
    midX: 560,
  },
  {
    id: 'psu-to-control',
    from: 'psu',
    to: 'control',
    label: '24 V DC 供电',
    labelOffsetY: -8,
    midX: 240,
  },
  {
    id: 'stage-to-control',
    from: 'stage',
    to: 'control',
    label: 'USB-232 位置控制',
    fromAnchor: 'top',
    toAnchor: 'bottom',
    labelOffsetY: -10,
    midX: 520,
  },
  {
    id: 'screen-bias-to-feedthrough',
    from: 'screen-bias',
    to: 'feedthrough',
    label: '屏蔽栅偏压',
    toAnchor: 'left',
    labelOffsetY: -6,
    midX: 700,
  },
  {
    id: 'feedthrough-to-probe',
    from: 'feedthrough',
    to: 'probe',
    label: '穿舱线束 -> 四栅极/收集极',
    midX: 1010,
  },
  {
    id: 'control-to-feedthrough',
    from: 'control',
    to: 'feedthrough',
    label: '机箱背板分配 BNC/pin',
    midX: 640,
  },
  {
    id: 'feedthrough-to-tia',
    from: 'feedthrough',
    to: 'tia',
    label: '收集极电流返回',
    fromAnchor: 'bottom',
    toAnchor: 'right',
    labelOffsetY: 12,
    midX: 720,
  },
  {
    id: 'control-to-host',
    from: 'control',
    to: 'host',
    label: 'USB 控制/遥测',
    labelOffsetY: -14,
    midX: 220,
    midY: 220,
  },
  {
    id: 'tia-to-host',
    from: 'tia',
    to: 'host',
    label: '电流表测量回读',
    midX: 240,
    midY: 360,
  },
  {
    id: 'hv-to-host',
    from: 'hv-scan',
    to: 'host',
    label: '高压源程控/回读',
    fromAnchor: 'right',
    toAnchor: 'top',
    labelOffsetY: -10,
    midX: 240,
    midY: 140,
  },
]

const nodeMap = new Map(nodes.map((node) => [node.id, node]))

function getAnchorPoint(node: DiagramNode, anchor: Anchor) {
  switch (anchor) {
    case 'left':
      return { x: node.x, y: node.y + node.height / 2 }
    case 'right':
      return { x: node.x + node.width, y: node.y + node.height / 2 }
    case 'top':
      return { x: node.x + node.width / 2, y: node.y }
    case 'bottom':
      return { x: node.x + node.width / 2, y: node.y + node.height }
    default:
      return { x: node.x + node.width, y: node.y + node.height / 2 }
  }
}

function getEdgePoints(edge: DiagramEdge) {
  const fromNode = nodeMap.get(edge.from)
  const toNode = nodeMap.get(edge.to)
  if (!fromNode || !toNode) return null

  const inferredAnchor = toNode.x > fromNode.x ? 'right' : 'left'
  const fromAnchor = edge.fromAnchor ?? inferredAnchor
  const toAnchor = edge.toAnchor ?? (toNode.x > fromNode.x ? 'left' : 'right')

  const start = getAnchorPoint(fromNode, fromAnchor)
  const end = getAnchorPoint(toNode, toAnchor)

  return { start, end }
}

function buildPolylinePoints(
  start: { x: number; y: number },
  end: { x: number; y: number },
  edge: DiagramEdge,
) {
  const midX = edge.midX ?? (start.x + end.x) / 2
  const midY = edge.midY ?? end.y
  return `${start.x},${start.y} ${midX},${start.y} ${midX},${midY} ${end.x},${end.y}`
}

const RpaSystemDiagram: FC = () => {
  return (
    <div className="rpa-diagram" role="figure" aria-label="RPA 系统级方块图">
      <div className="rpa-diagram__header">
        <p className="eyebrow">系统级方块图</p>
        <h3>RPA 测量链路</h3>
        <p className="rpa-diagram__lede">
          展示 RPA 探头、偏压、采集链路与上位机之间的主要接口。
        </p>
      </div>

      <svg viewBox="0 0 1400 720" className="rpa-diagram__svg">

        <g className="rpa-chassis">
          <rect
            x={chassisBox.x}
            y={chassisBox.y}
            width={chassisBox.width}
            height={chassisBox.height}
            rx="14"
            ry="14"
          />
          <text x={chassisBox.x + chassisBox.width / 2} y={chassisBox.y + 18}>
            {chassisBox.label}
          </text>
        </g>

        {edges.map((edge) => {
          const points = getEdgePoints(edge)
          if (!points) return null
          const polylinePoints = buildPolylinePoints(points.start, points.end, edge)
          const labelX = (edge.midX ?? (points.start.x + points.end.x) / 2) + (edge.labelOffsetX ?? 0)
          const labelY =
            (edge.midY ?? (points.start.y + points.end.y) / 2) + (edge.labelOffsetY ?? -6)

          return (
            <g key={edge.id} className="rpa-edge">
              <polyline points={polylinePoints} stroke="#38bdf8" strokeWidth="2.4" fill="none" />
              <text x={labelX} y={labelY} className="rpa-edge__label">
                {edge.label}
              </text>
            </g>
          )
        })}

        {nodes.map((node) => (
          <g key={node.id} className="rpa-node">
            <rect
              x={node.x}
              y={node.y}
              width={node.width}
              height={node.height}
              rx="12"
              ry="12"
            />
            <text className="rpa-node__label">
              {node.label.map((line, index) => {
                const lineHeight = 16
                const startY = node.y + node.height / 2 - ((node.label.length - 1) * lineHeight) / 2
                return (
                  <tspan
                    key={line}
                    x={node.x + node.width / 2}
                    y={startY + index * lineHeight}
                  >
                    {line}
                  </tspan>
                )
              })}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

export default RpaSystemDiagram
