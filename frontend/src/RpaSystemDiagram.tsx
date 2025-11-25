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
}

const nodes: DiagramNode[] = [
  {
    id: 'hv-scan',
    label: ['外置高压扫描电源', '（提供偏压）'],
    x: 30,
    y: 60,
    width: 220,
    height: 72,
  },
  {
    id: 'psu',
    label: ['24 V 开关电源'],
    x: 30,
    y: 210,
    width: 220,
    height: 70,
  },
  {
    id: 'control',
    label: ['RPA探针电控机箱', '（含电流计 + 屏蔽栅偏压源）'],
    x: 300,
    y: 120,
    width: 250,
    height: 90,
  },
  {
    id: 'feedthrough',
    label: ['穿舱法兰与舱内线束'],
    x: 610,
    y: 150,
    width: 200,
    height: 70,
  },
  {
    id: 'probe',
    label: ['RPA探头', '（四栅极 + 收集极）'],
    x: 890,
    y: 150,
    width: 210,
    height: 80,
  },
  {
    id: 'tia',
    label: ['跨阻/电流计', '（机箱内）'],
    x: 330,
    y: 240,
    width: 210,
    height: 70,
  },
  {
    id: 'screen-bias',
    label: ['屏蔽栅偏压源', '（机箱内）'],
    x: 330,
    y: 330,
    width: 210,
    height: 70,
  },
  {
    id: 'daq',
    label: ['信号采集与处理模块', '（数采卡）'],
    x: 610,
    y: 250,
    width: 210,
    height: 80,
  },
  {
    id: 'host',
    label: ['上位机与自动化', '测量软件'],
    x: 890,
    y: 250,
    width: 210,
    height: 80,
  },
  {
    id: 'stage',
    label: ['二维真空位移机构', '与控制台'],
    x: 330,
    y: 430,
    width: 220,
    height: 80,
  },
]

const edges: DiagramEdge[] = [
  {
    id: 'hv-to-feedthrough',
    from: 'hv-scan',
    to: 'feedthrough',
    label: '扫描偏压 V+/V-',
    toAnchor: 'top',
  },
  {
    id: 'psu-to-control',
    from: 'psu',
    to: 'control',
    label: '24 V DC 供电',
    labelOffsetY: -8,
  },
  {
    id: 'stage-to-control',
    from: 'stage',
    to: 'control',
    label: 'USB-232 位置控制',
    fromAnchor: 'top',
    toAnchor: 'bottom',
    labelOffsetY: -10,
  },
  {
    id: 'screen-bias-to-feedthrough',
    from: 'screen-bias',
    to: 'feedthrough',
    label: '屏蔽栅偏压',
    toAnchor: 'left',
    labelOffsetY: -6,
  },
  {
    id: 'feedthrough-to-probe',
    from: 'feedthrough',
    to: 'probe',
    label: '穿舱线束 -> 四栅极/收集极',
  },
  {
    id: 'control-to-feedthrough',
    from: 'control',
    to: 'feedthrough',
    label: '机箱背板分配 BNC/pin',
  },
  {
    id: 'feedthrough-to-tia',
    from: 'feedthrough',
    to: 'tia',
    label: '收集极电流返回',
    fromAnchor: 'bottom',
    toAnchor: 'right',
    labelOffsetY: 12,
  },
  {
    id: 'tia-to-daq',
    from: 'tia',
    to: 'daq',
    label: '模拟输出',
  },
  {
    id: 'daq-to-host',
    from: 'daq',
    to: 'host',
    label: 'USB 数据采集',
  },
  {
    id: 'control-to-host',
    from: 'control',
    to: 'host',
    label: 'USB 控制/遥测',
    labelOffsetY: -14,
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

      <svg viewBox="0 0 1120 520" className="rpa-diagram__svg">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L10,3.5 L0,7 Z" fill="#38bdf8" />
          </marker>
        </defs>

        {edges.map((edge) => {
          const points = getEdgePoints(edge)
          if (!points) return null
          const labelX = (points.start.x + points.end.x) / 2 + (edge.labelOffsetX ?? 0)
          const labelY =
            (points.start.y + points.end.y) / 2 + (edge.labelOffsetY ?? -6)

          return (
            <g key={edge.id} className="rpa-edge">
              <line
                x1={points.start.x}
                y1={points.start.y}
                x2={points.end.x}
                y2={points.end.y}
                stroke="#38bdf8"
                strokeWidth="2.2"
                markerEnd="url(#arrowhead)"
              />
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
