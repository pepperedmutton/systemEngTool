import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import './App.css'
import { createRequirement, fetchProjects } from './api'
import ProjectSelection from './components/ProjectSelection'
import { GenericProjectPage, projectPages, type ProjectPageProps } from './pages'
import type { Project, Requirement, RequirementPayload } from './types'

const POLL_INTERVAL_MS = 5000

function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
  }, [])

  const handleSelectProject = (projectId: string | null) => {
    setSelectedProjectId(projectId)
  }

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )

  const handleRequirementCreate = async (
    projectId: string,
    payload: RequirementPayload,
  ): Promise<Requirement> => {
    const created = await createRequirement(projectId, payload)
    setProjects((current) =>
      current.map((project) => {
        if (project.id !== projectId) return project
        return {
          ...project,
          requirements: [...project.requirements, created],
          lastUpdated: new Date().toISOString(),
        }
      }),
    )
    return created
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

  const PageComponent: ComponentType<ProjectPageProps> =
    projectPages[selectedProject.id] ?? GenericProjectPage

  return (
    <PageComponent
      project={selectedProject}
      projects={projects}
      selectedProjectId={selectedProjectId}
      onSelectProject={(id) => handleSelectProject(id)}
      onBack={() => {
        handleSelectProject(null)
      }}
      onCreateRequirement={handleRequirementCreate}
    />
  )
}

export default App
