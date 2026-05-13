'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function inviteUser(payload: {
  email: string
  role: string
  organizationId: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('organization_id', payload.organizationId)
    .single()

  if (!membership || (membership.role !== 'admin' && membership.role !== 'project_manager')) {
    throw new Error('Permissions insuffisantes')
  }

  const adminClient = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { error } = await adminClient.auth.admin.inviteUserByEmail(payload.email, {
    redirectTo: `${siteUrl}/auth/callback?next=/auth/invite`,
    data: {
      organization_id: payload.organizationId,
      member_role: payload.role,
    },
  })

  if (error) {
    if (error.message.includes('already been registered')) {
      throw new Error('Cet email est déjà utilisé.')
    }
    throw new Error(error.message)
  }

  revalidatePath('/admin/utilisateurs')
  return { success: true }
}

export async function updateMemberRole(userId: string, organizationId: string, role: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('organization_members')
    .update({ role })
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/utilisateurs')
}

export async function removeMember(userId: string, organizationId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/utilisateurs')
}

export async function createSite(payload: {
  name: string
  type: string
  city: string | null
  organizationId: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase.from('sites').insert({
    name: payload.name,
    type: payload.type,
    city: payload.city,
    organization_id: payload.organizationId,
    is_active: true,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/admin/sites')
  return { success: true }
}

export async function deleteSite(siteId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase.from('sites').delete().eq('id', siteId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/sites')
  return { success: true }
}

export async function createStudy(payload: {
  name: string
  referenceYear: number
  methodology: string
  organizationId: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase.from('studies').insert({
    name: payload.name,
    reference_year: payload.referenceYear,
    methodology: payload.methodology,
    organization_id: payload.organizationId,
    status: 'collecting',
    scopes: ['1', '2', '3'],
    created_by: user.id,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/admin/bilan')
  return { success: true }
}

export async function createReductionAction(payload: {
  organizationId: string
  studyId: string | null
  titre: string
  description: string | null
  scope: number
  priorite: string
  statut: string
  gainEstimeCo2e: number
  echeanceAnnee: number | null
  responsable: string | null
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase.from('reduction_actions').insert({
    organization_id: payload.organizationId,
    study_id: payload.studyId,
    titre: payload.titre,
    description: payload.description,
    scope: payload.scope,
    priorite: payload.priorite,
    statut: payload.statut,
    gain_estime_co2e: payload.gainEstimeCo2e,
    echeance_annee: payload.echeanceAnnee,
    responsable: payload.responsable,
    created_by: user.id,
    progress: 0,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/plan-reduction')
  return { success: true }
}

export async function deleteReductionAction(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase.from('reduction_actions').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/plan-reduction')
  return { success: true }
}

export async function updateReductionAction(id: string, updates: { progress?: number; statut?: string }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase
    .from('reduction_actions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/plan-reduction')
  return { success: true }
}
