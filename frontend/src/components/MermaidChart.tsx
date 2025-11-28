import { useEffect, useId, useRef } from 'react'
import mermaid from 'mermaid'

type MermaidChartProps = {
  chartCode: string
  className?: string
}

const MermaidChart = ({ chartCode, className = '' }: MermaidChartProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const reactId = useId()
  const renderIdRef = useRef(`mermaid-${reactId.replace(/:/g, '-')}`)

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
    })
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let isCancelled = false
    container.innerHTML = ''

    const renderChart = async () => {
      try {
        const { svg } = await mermaid.render(renderIdRef.current, chartCode)
        if (!isCancelled && container) {
          container.innerHTML = svg
        }
      } catch (err) {
        if (!isCancelled && container) {
          container.innerHTML = '<p class="mermaid-error">Mermaid 渲染失败</p>'
        }
        console.error('Failed to render Mermaid diagram', err)
      }
    }

    renderChart()

    return () => {
      isCancelled = true
      if (container) {
        container.innerHTML = ''
      }
    }
  }, [chartCode])

  return <div ref={containerRef} className={`mermaid-chart ${className}`.trim()} />
}

export default MermaidChart
