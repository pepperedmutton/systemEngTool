import type { ComponentType } from 'react'
import GenericProjectPage from './generic'
import RpaPowerPage from './rpa-power'
import RpaProbePage from './rpa-probe'
import type { ProjectPageProps } from './types'

export const projectPages: Record<string, ComponentType<ProjectPageProps>> = {
  'rpa-probe': RpaProbePage,
  'rpa-power': RpaPowerPage,
}

export { GenericProjectPage }
export type { ProjectPageProps }
