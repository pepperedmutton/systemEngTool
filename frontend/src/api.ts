import type { Project, Requirement, RequirementPayload } from './types'

const configuredBase = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')
  : ''
const API_BASE_URL = configuredBase

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Request failed')
  }

  return (await response.json()) as T
}

export function fetchProjects(): Promise<Project[]> {
  return request<Project[]>('/projects')
}

export function createRequirement(
  projectId: string,
  payload: RequirementPayload,
): Promise<Requirement> {
  const body = JSON.stringify({
    title: payload.title,
    statement: payload.statement,
    rationale: payload.rationale,
    verification_method: payload.verificationMethod,
    status: payload.status,
    owner: payload.owner,
    priority: payload.priority,
    scope: payload.scope,
  })

  return request<Requirement>(`/projects/${projectId}/requirements`, {
    method: 'POST',
    body,
  })
}
