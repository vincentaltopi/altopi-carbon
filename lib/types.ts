export type UserRole = 'admin' | 'project_manager' | 'contributor' | 'viewer' | 'auditor'

export type StudyStatus = 'draft' | 'scoping' | 'collecting' | 'calculating' | 'validated' | 'archived'

export type StudyMethodology = 'BC2025' | 'BC_V8' | 'GHG_PROTOCOL' | 'ISO_14064'

export interface Organization {
  id: string
  name: string
  siren: string | null
  sector: string | null
  headcount: number | null
  created_at: string
}

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  organization_id: string | null
  organizations: Organization | null
}

export interface OrganizationMember {
  organization_id: string
  user_id: string
  role: UserRole
  invited_by: string | null
  invited_at: string | null
  joined_at: string | null
  profiles?: {
    id: string
    email: string
    full_name: string | null
  }
}

export interface Site {
  id: string
  organization_id: string
  name: string
  type: string
  address: string | null
  city: string | null
  country_code: string | null
  is_active: boolean
  created_at: string
}

export interface EmissionPost {
  id: string
  code: string
  order_index: number
  name: string
  scope: '1' | '2' | '3'
  category: string | null
  description: string | null
  is_mandatory: boolean
  methodology: string | null
}

export interface EmissionFactor {
  id: string
  name: string
  co2e_value: number
  unit: string
  source: string | null
  uncertainty_percentage: number | null
  category: string | null
  sub_category: string | null
}

export interface Study {
  id: string
  organization_id: string
  name: string
  reference_year: number
  status: StudyStatus
  methodology: StudyMethodology
  created_by: string | null
  created_at: string
}

export interface ActivityData {
  id: string
  study_id: string
  site_id: string | null
  emission_post_id: string
  emission_factor_id: string | null
  description: string | null
  quantity: number
  unit: string
  period_start: string | null
  period_end: string | null
  co2e_calculated: number | null
  contributor_id: string
  status: string
  created_at: string
  emission_posts?: Pick<EmissionPost, 'name' | 'scope' | 'order_index'>
  sites?: Pick<Site, 'name'> | null
  emission_factors?: Pick<EmissionFactor, 'name' | 'co2e_value' | 'unit'> | null
}
